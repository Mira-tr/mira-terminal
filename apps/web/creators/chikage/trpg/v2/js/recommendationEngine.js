const MAX_MINUTE = 30 * 60;

export function evaluateScheduleCandidate({
    slot,
    participants = [],
    responses = [],
    preferredMinutes = 0,
    minimumMinutes = 0
}){
    const candidateRange = slotRange(slot);
    const required = participants.filter(isRequiredParticipant);
    const participantStates = required.map(participant => {
        const response = responses.find(item => same(item.participant_id ?? item.participantId, participant.id) && same(item.slot_id ?? item.slotId, slot.id));
        return describeParticipantResponse(participant, response, candidateRange);
    });
    const counts = countStates(participantStates);
    const confirmedStates = participantStates.filter(item => item.kind === "yes" || item.kind === "partial");
    const hasHardBlocker = counts.no > 0 || counts.stale > 0;
    const commonRanges = hasHardBlocker
        ? []
        : intersectRangeSets(candidateRange ? [candidateRange] : [], confirmedStates.map(item => item.ranges));
    const continuousMinutes = commonRanges.reduce((maximum, range) => Math.max(maximum, range.endMinute - range.startMinute), 0);
    const allRequiredConfirmed = required.length > 0 && counts.no === 0 && counts.unknown === 0 && counts.unanswered === 0 && counts.stale === 0;
    const normalizedPreferred = normalizeMinutes(preferredMinutes);
    const normalizedMinimum = normalizeMinutes(minimumMinutes);
    const meetsMinimum = allRequiredConfirmed && continuousMinutes >= normalizedMinimum;
    const meetsPreferred = allRequiredConfirmed && normalizedPreferred > 0 && continuousMinutes >= normalizedPreferred;
    const classification = classifyCandidate({
        counts,
        allRequiredConfirmed,
        meetsMinimum,
        meetsPreferred,
        continuousMinutes,
        normalizedMinimum,
        normalizedPreferred
    });

    return {
        slot,
        candidateRange,
        requiredCount: required.length,
        participantStates,
        counts,
        commonRanges,
        continuousMinutes,
        allRequiredConfirmed,
        meetsMinimum,
        meetsPreferred,
        classification,
        reasons: buildReasons({
            counts,
            requiredCount: required.length,
            allRequiredConfirmed,
            continuousMinutes,
            minimumMinutes: normalizedMinimum,
            preferredMinutes: normalizedPreferred,
            classification
        })
    };
}

export function recommendSchedule({
    slots = [],
    participants = [],
    responses = [],
    preferredMinutes = 0,
    minimumMinutes = 0
}){
    const items = slots.map(slot => evaluateScheduleCandidate({
        slot,
        participants,
        responses,
        preferredMinutes,
        minimumMinutes
    })).sort(compareRecommendations);
    const bestRank = items[0] ? recommendationRank(items[0]) : null;

    return {
        recommendations: items,
        recommended: bestRank
            ? items.filter(item => sameRank(recommendationRank(item), bestRank))
            : [],
        other: bestRank
            ? items.filter(item => !sameRank(recommendationRank(item), bestRank))
            : []
    };
}

export function createRecommendationSnapshot({
    slots = [],
    participants = [],
    responses = []
}){
    const timestamps = [
        ...slots,
        ...participants,
        ...responses,
        ...responses.flatMap(item => Array.isArray(item.ranges ?? item.schedule_response_ranges) ? (item.ranges ?? item.schedule_response_ranges) : [])
    ].map(item => Date.parse(item?.updated_at ?? item?.updatedAt ?? "")).filter(Number.isFinite);
    return timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : "";
}

export function formatRecommendationRange(range){
    if(!range){
        return "共通時間はありません";
    }

    return `${formatMinute(range.startMinute)} - ${range.endMinute >= 1440 ? `翌${formatMinute(range.endMinute - 1440)}` : formatMinute(range.endMinute)}`;
}

function describeParticipantResponse(participant, response, candidateRange){
    const answer = String(response?.answer ?? "").toLowerCase();
    const stale = Boolean(response?.stale ?? response?.is_stale ?? response?.isStale);

    if(stale){
        return { participant, kind: "stale", ranges: [] };
    }
    if(!response){
        return { participant, kind: "unanswered", ranges: [] };
    }
    if(answer === "no"){
        return { participant, kind: "no", ranges: [] };
    }
    if(answer === "yes"){
        return { participant, kind: "yes", ranges: candidateRange ? [candidateRange] : [] };
    }

    const ranges = normalizeRanges(response.ranges ?? response.schedule_response_ranges)
        .filter(range => rangeWithin(range, candidateRange));
    return ranges.length
        ? { participant, kind: "partial", ranges }
        : { participant, kind: "unknown", ranges: [] };
}

function countStates(states){
    return states.reduce((counts, item) => {
        counts[item.kind] += 1;
        return counts;
    }, {
        yes: 0,
        partial: 0,
        no: 0,
        unknown: 0,
        unanswered: 0,
        stale: 0
    });
}

function classifyCandidate({ counts, allRequiredConfirmed, meetsMinimum, meetsPreferred, continuousMinutes, normalizedMinimum, normalizedPreferred }){
    if(counts.no > 0){
        return "blocked";
    }
    if(counts.stale > 0){
        return "stale";
    }
    if(!allRequiredConfirmed){
        return "pending";
    }
    if(meetsPreferred){
        return "recommended";
    }
    if(meetsMinimum || (normalizedMinimum === 0 && continuousMinutes > 0)){
        return "usable";
    }
    if(normalizedPreferred > 0 || normalizedMinimum > 0){
        return "short";
    }
    return "usable";
}

function buildReasons({ counts, requiredCount, allRequiredConfirmed, continuousMinutes, minimumMinutes, preferredMinutes, classification }){
    const reasons = [];

    if(classification === "blocked"){
        reasons.push(`必須参加者${counts.no}人が参加不可です`);
    }
    if(counts.stale > 0){
        reasons.push(`${counts.stale}人の再回答が必要です`);
    }
    if(counts.unanswered > 0){
        reasons.push(`${counts.unanswered}人が未回答です`);
    }
    if(counts.unknown > 0){
        reasons.push(`${counts.unknown}人の予定が未確定です`);
    }
    if(allRequiredConfirmed){
        reasons.push(`${requiredCount}/${requiredCount}人が参加可能です`);
    }
    if(continuousMinutes > 0){
        reasons.push(`${formatDuration(continuousMinutes)}連続で確保できます`);
    }
    if(preferredMinutes > 0){
        reasons.push(continuousMinutes >= preferredMinutes && allRequiredConfirmed
            ? `希望${formatDuration(preferredMinutes)}を満たしています`
            : `希望${formatDuration(preferredMinutes)}より${formatDuration(Math.max(0, preferredMinutes - continuousMinutes))}短い候補です`);
    }else if(minimumMinutes > 0 && continuousMinutes < minimumMinutes){
        reasons.push(`最低${formatDuration(minimumMinutes)}に届きません`);
    }

    return reasons;
}

function compareRecommendations(left, right){
    const leftRank = recommendationRank(left);
    const rightRank = recommendationRank(right);
    for(let index = 0; index < leftRank.length; index += 1){
        if(leftRank[index] !== rightRank[index]){
            return rightRank[index] - leftRank[index];
        }
    }
    return String(left.slot?.starts_at ?? left.slot?.startsAt ?? "").localeCompare(String(right.slot?.starts_at ?? right.slot?.startsAt ?? ""));
}

function recommendationRank(item){
    const quality = item.classification === "recommended" ? 5
        : item.classification === "usable" ? 4
            : item.classification === "short" ? 3
                : item.classification === "pending" ? 2
                    : item.classification === "stale" ? 1 : 0;
    return [
        quality,
        item.meetsPreferred ? 1 : 0,
        item.meetsMinimum ? 1 : 0,
        -item.counts.no,
        -item.counts.stale,
        -item.counts.unknown,
        -item.counts.unanswered,
        item.continuousMinutes
    ];
}

function sameRank(left, right){
    return left.every((value, index) => value === right[index]);
}

function intersectRangeSets(seed, rangeSets){
    return rangeSets.reduce((current, ranges) => intersectRanges(current, ranges), normalizeRanges(seed));
}

function intersectRanges(left, right){
    const intersections = [];
    normalizeRanges(left).forEach(leftRange => {
        normalizeRanges(right).forEach(rightRange => {
            const startMinute = Math.max(leftRange.startMinute, rightRange.startMinute);
            const endMinute = Math.min(leftRange.endMinute, rightRange.endMinute);
            if(endMinute > startMinute){
                intersections.push({ startMinute, endMinute });
            }
        });
    });
    return normalizeRanges(intersections);
}

function normalizeRanges(ranges){
    return (Array.isArray(ranges) ? ranges : [])
        .map(range => ({
            startMinute: Number(range?.startMinute ?? range?.start_minute),
            endMinute: Number(range?.endMinute ?? range?.end_minute)
        }))
        .filter(range => Number.isInteger(range.startMinute) && Number.isInteger(range.endMinute) && range.startMinute >= 0 && range.endMinute > range.startMinute && range.endMinute <= MAX_MINUTE)
        .sort((left, right) => left.startMinute - right.startMinute)
        .reduce((merged, range) => {
            const previous = merged.at(-1);
            if(previous && range.startMinute <= previous.endMinute){
                previous.endMinute = Math.max(previous.endMinute, range.endMinute);
            }else{
                merged.push({ ...range });
            }
            return merged;
        }, []);
}

function slotRange(slot){
    const startMinute = Number(slot?.start_minute ?? slot?.startMinute);
    const endMinute = Number(slot?.end_minute ?? slot?.endMinute);
    return Number.isInteger(startMinute) && Number.isInteger(endMinute) && startMinute >= 0 && endMinute > startMinute && endMinute <= MAX_MINUTE
        ? { startMinute, endMinute }
        : null;
}

function rangeWithin(range, boundary){
    return Boolean(boundary) && range.startMinute >= boundary.startMinute && range.endMinute <= boundary.endMinute;
}

function isRequiredParticipant(participant){
    // V3.2 deliberately treats every non-viewer in an existing round as
    // required. The stored flag predates this round model and is not a safe
    // signal for legacy account or guest participants.
    return participant?.role !== "viewer";
}

function normalizeMinutes(value){
    const minutes = Number(value);
    return Number.isFinite(minutes) && minutes > 0 ? Math.min(MAX_MINUTE, Math.round(minutes)) : 0;
}

function formatDuration(minutes){
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return hours > 0 ? `${hours}時間${remainder ? `${remainder}分` : ""}` : `${remainder}分`;
}

function formatMinute(minute){
    const safe = Math.max(0, Math.min(1439, Number(minute) || 0));
    return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function same(left, right){
    return String(left ?? "") === String(right ?? "");
}
