export const ANSWERS = Object.freeze(["yes", "maybe", "no", "unknown"]);
export const DEFAULT_SLOT_START = 19 * 60;
export const DEFAULT_SLOT_END = 24 * 60;

export function createDateRange(startDate, endDate, maxDays = 60){
    const start = parseDateKey(startDate);
    const end = parseDateKey(endDate);

    if(!start || !end || end < start){
        return [];
    }

    const dates = [];

    for(let date = start; date <= end && dates.length < maxDays; date = addDays(date, 1)){
        dates.push(toDateKey(date));
    }

    return dates;
}

export function createSlots(settings){
    const startMinute = normalizeMinute(settings?.startMinute, DEFAULT_SLOT_START);
    const endMinute = normalizeMinute(settings?.endMinute, DEFAULT_SLOT_END);
    const safeEnd = endMinute > startMinute ? endMinute : startMinute + 180;

    return createDateRange(settings?.startDate, settings?.endDate, settings?.maxDays ?? 60)
        .map((date, index) => ({
            id: `slot-${date}-${startMinute}-${safeEnd}`,
            date,
            startMinute,
            endMinute: safeEnd,
            order: index
        }));
}

export function summarizeResponses(slots, participants, responses){
    const participantList = Array.isArray(participants) ? participants : [];
    const responseMap = responses && typeof responses === "object" ? responses : {};

    return slots.map(slot => {
        const counts = {
            yes: 0,
            maybe: 0,
            no: 0,
            unknown: 0
        };
        const perParticipant = participantList.map(participant => {
            const answer = normalizeAnswer(responseMap[participant.id]?.[slot.id]?.answer);
            counts[answer] += 1;

            return {
                participantId: participant.id,
                displayName: participant.displayName,
                required: Boolean(participant.required),
                answer
            };
        });
        const requiredOk = perParticipant
            .filter(item => item.required)
            .every(item => item.answer === "yes" || item.answer === "maybe");
        const score = counts.yes * 100 + counts.maybe * 45 - counts.no * 80 - counts.unknown * 12 +
            (requiredOk ? 25 : -50);

        return {
            slot,
            counts,
            perParticipant,
            requiredOk,
            score
        };
    }).sort((a, b) => b.score - a.score || a.slot.order - b.slot.order);
}

export function findUnansweredParticipants(slots, participants, responses){
    const responseMap = responses && typeof responses === "object" ? responses : {};

    return participants.filter(participant => {
        return slots.some(slot => normalizeAnswer(responseMap[participant.id]?.[slot.id]?.answer) === "unknown");
    });
}

export function getResponseCompleteness(slots, participantId, responses){
    const responseMap = responses && typeof responses === "object" ? responses : {};
    const answers = responseMap[participantId] ?? {};
    const total = slots.length;
    const answered = slots.filter(slot => normalizeAnswer(answers[slot.id]?.answer) !== "unknown").length;

    return {
        total,
        answered,
        remaining: Math.max(0, total - answered),
        complete: total > 0 && answered === total
    };
}

export function deriveScheduleSummary(schedule, activeParticipantId){
    const slots = createSlots(schedule);
    const participants = Array.isArray(schedule?.participants) ? schedule.participants : [];
    const responses = schedule?.responses && typeof schedule.responses === "object" ? schedule.responses : {};
    const activeParticipant = participants.find(item => item.id === activeParticipantId) ?? participants[0] ?? null;
    const myResponse = activeParticipant
        ? getResponseCompleteness(slots, activeParticipant.id, responses)
        : { total: slots.length, answered: 0, remaining: slots.length, complete: false };
    const answeredParticipants = participants.filter(participant => {
        return getResponseCompleteness(slots, participant.id, responses).answered > 0;
    }).length;
    const unansweredParticipants = findUnansweredParticipants(slots, participants, responses);
    const isOwner = activeParticipant?.role === "owner" || schedule?.ownerUserId === activeParticipant?.userId;
    const allDone = participants.length > 0 && unansweredParticipants.length === 0;
    const confirmed = schedule?.status === "confirmed" || Boolean(schedule?.confirmedSlotId);
    const action = derivePrimaryAction({
        isOwner,
        confirmed,
        allDone,
        myResponse,
        unansweredCount: unansweredParticipants.length
    });

    return {
        scheduleId: schedule?.id ?? "",
        title: schedule?.title ?? "日程調整",
        status: confirmed ? "confirmed" : allDone ? "ready" : "collecting",
        action,
        isOwner,
        participantCount: participants.length,
        answeredParticipants,
        unansweredCount: unansweredParticipants.length,
        unansweredNames: unansweredParticipants.map(item => item.displayName),
        myResponse,
        nextSlot: slots[0] ?? null,
        confirmedSlotId: schedule?.confirmedSlotId ?? "",
        updatedAt: schedule?.updatedAt ?? ""
    };
}

export function buildCompletionPlans(summaries, options = {}){
    const requiredCount = Math.max(1, Math.ceil(
        Number(options.totalMinutes || 0) / Math.max(1, Number(options.sessionMinutes || 180))
    ));
    const candidates = summaries
        .filter(summary => summary.counts.yes > 0 && summary.counts.no === 0)
        .slice()
        .sort((a, b) => b.score - a.score || a.slot.order - b.slot.order);

    if(candidates.length < requiredCount){
        return [];
    }

    const safest = candidates.slice(0, requiredCount);
    const earliest = candidates
        .slice()
        .sort((a, b) => a.slot.date.localeCompare(b.slot.date) || a.slot.startMinute - b.slot.startMinute)
        .slice(0, requiredCount);

    return dedupePlans([
        createPlan("おすすめ", safest),
        createPlan("早期完走", earliest)
    ]);
}

function derivePrimaryAction({ isOwner, confirmed, allDone, myResponse, unansweredCount }){
    if(confirmed){
        return {
            key: "confirmed",
            label: "確定済み",
            priority: 4
        };
    }

    if(!myResponse.complete){
        return {
            key: "needs_response",
            label: `あなたの回答が未完了 あと${myResponse.remaining}候補`,
            priority: 1
        };
    }

    if(isOwner && allDone){
        return {
            key: "ready_to_decide",
            label: "全員回答済み。日程を決められます",
            priority: 1
        };
    }

    if(isOwner){
        return {
            key: "waiting",
            label: `あと${unansweredCount}人`,
            priority: 2
        };
    }

    return {
        key: "waiting",
        label: "他の参加者を待っています",
        priority: 3
    };
}

export function normalizeAnswer(value){
    return ANSWERS.includes(value) ? value : "unknown";
}

export function answerLabel(answer){
    return {
        yes: "○",
        maybe: "△",
        no: "×",
        unknown: "未"
    }[normalizeAnswer(answer)];
}

export function formatSlot(slot){
    return `${formatDateLabel(slot.date)} ${formatMinute(slot.startMinute)}-${formatMinute(slot.endMinute)}`;
}

export function formatDateLabel(dateKey){
    const date = parseDateKey(dateKey);
    const labels = ["日", "月", "火", "水", "木", "金", "土"];

    if(!date){
        return dateKey;
    }

    return `${date.getMonth() + 1}/${date.getDate()}(${labels[date.getDay()]})`;
}

export function formatMinute(minute){
    const hours = Math.floor(minute / 60);
    const minutes = minute % 60;

    return `${hours}:${String(minutes).padStart(2, "0")}`;
}

export function toDateKey(date){
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");
}

export function addDays(date, amount){
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
}

export function parseDateKey(value){
    if(typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)){
        return null;
    }

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeMinute(value, fallback){
    const minute = Number(value);
    return Number.isFinite(minute) && minute >= 0 && minute <= 30 * 60
        ? minute
        : fallback;
}

function createPlan(label, summaries){
    const score = Math.round(summaries.reduce((sum, summary) => sum + summary.score, 0) / summaries.length);

    return {
        key: summaries.map(summary => summary.slot.id).join("|"),
        label,
        score,
        items: summaries.map(summary => summary.slot)
    };
}

function dedupePlans(plans){
    const used = new Set();

    return plans.filter(plan => {
        if(used.has(plan.key)){
            return false;
        }

        used.add(plan.key);
        return true;
    });
}
