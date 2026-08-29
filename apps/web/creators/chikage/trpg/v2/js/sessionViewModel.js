export const ANSWER_LABELS = {
    yes: "○",
    maybe: "△",
    no: "×",
    unknown: "未"
};

export const SESSION_STATUS_LABELS = {
    draft: "DRAFT",
    collecting: "SCHEDULING",
    ready: "SCHEDULING",
    held: "SCHEDULED",
    confirmed: "SCHEDULED",
    archived: "COMPLETED",
    expired: "CANCELLED"
};

export function createDashboardViewModel(bundle, userId, now = new Date()){
    const schedules = array(bundle?.schedules);
    const participants = array(bundle?.participants);
    const rounds = array(bundle?.rounds);
    const slots = array(bundle?.slots);
    const responses = array(bundle?.responses);
    const confirmedSlots = array(bundle?.confirmedSlots);
    const sessions = array(bundle?.sessions);

    const sessionItems = schedules.map(schedule => {
        const scheduleParticipants = participants
            .filter(participant => participant.schedule_id === schedule.id)
            .sort(sortByOrder);
        const ownParticipant = scheduleParticipants.find(participant => participant.user_id === userId) ?? null;
        const allScheduleSlots = slots
            .filter(slot => slot.schedule_id === schedule.id);
        const activeRound = findActiveRound(rounds, schedule.id);
        const slotById = new Map(allScheduleSlots.map(slot => [text(slot.id), slot]));
        const scheduleSlots = allScheduleSlots
            .filter(slot => normalizeCandidateStatus(slot.status) === "active" && (!activeRound || text(slot.round_id) === text(activeRound.id)))
            .sort(sortByOrder);
        const scheduleConfirmedSlots = confirmedSlots
            .filter(slot => slot.schedule_id === schedule.id)
            .sort(sortBySequence);
        const ownResponses = ownParticipant
            ? responses.filter(response => {
                return response.participant_id === ownParticipant.id && isCurrentCandidateResponse(response, slotById);
            })
            : [];
        const unansweredSlots = scheduleSlots.filter(slot => {
            return !ownResponses.some(response => response.slot_id === slot.id);
        });
        const scheduleSessions = sessions
            .filter(session => session.schedule_id === schedule.id)
            .sort(sortBySequence);
        const nextConfirmed = findNextSession(scheduleSessions, now) ?? findNextConfirmedSlot(scheduleConfirmedSlots, now);

        return {
            schedule,
            shareId: text(schedule.share_id),
            title: text(schedule.title) || "無題の卓",
            status: normalizeStatus(schedule.status),
            statusLabel: SESSION_STATUS_LABELS[normalizeStatus(schedule.status)],
            role: schedule.owner_id === userId ? "KP" : "PL",
            isOwner: schedule.owner_id === userId,
            ownParticipant,
            participants: scheduleParticipants,
            rounds: rounds.filter(roundItem => roundItem.schedule_id === schedule.id).sort(sortBySequence),
            activeRound,
            slots: scheduleSlots,
            responses: responses.filter(response => response.schedule_id === schedule.id && isCurrentCandidateResponse(response, slotById)),
            confirmedSlots: scheduleConfirmedSlots,
            sessions: scheduleSessions,
            nextConfirmed,
            unansweredCount: unansweredSlots.length
        };
    });

    return {
        nextSession: sessionItems
            .filter(item => item.nextConfirmed)
            .sort((a, b) => new Date(a.nextConfirmed.starts_at) - new Date(b.nextConfirmed.starts_at))[0] ?? null,
        actionRequired: sessionItems.filter(item => item.unansweredCount > 0 && item.slots.length > 0),
        hosting: sessionItems.filter(item => item.isOwner),
        playing: sessionItems.filter(item => !item.isOwner),
        sessions: sessionItems
    };
}

export function createScheduleBundleViewModel(bundle, userId = ""){
    const schedule = bundle?.schedule ?? {};
    const scheduleId = text(schedule.id);
    const rounds = array(bundle?.rounds)
        .map(normalizeRound)
        .sort(sortBySequence);
    const allSlots = array(bundle?.slots)
        .map(slot => ({
            ...slot,
            status: normalizeCandidateStatus(slot?.status),
            revision: normalizeRevision(slot?.revision)
        }))
        .sort(sortByOrder);
    const usesRoundData = rounds.length > 0 || allSlots.some(slot => text(slot.round_id ?? slot.roundId));
    const activeRound = rounds.find(roundItem => roundItem.status === "open") ?? rounds.find(roundItem => roundItem.status === "draft") ?? null;
    const slots = usesRoundData && activeRound
        ? allSlots.filter(slot => text(slot.round_id ?? slot.roundId) === text(activeRound.id))
        : allSlots;
    const participants = array(bundle?.participants).sort(sortByOrder);
    const allResponses = normalizeBundleResponses(bundle, scheduleId, allSlots);
    const responses = allResponses.filter(response => {
        const slot = allSlots.find(candidate => text(candidate.id) === text(response.slot_id ?? response.slotId));
        return Boolean(slot) && (!usesRoundData || (Boolean(activeRound) && text(slot.round_id ?? slot.roundId) === text(activeRound.id)));
    });
    const confirmedSlots = array(bundle?.confirmedSlots).sort(sortBySequence);
    const sessions = array(bundle?.sessions).map(normalizeSession).sort(sortBySequence);
    const me = bundle?.me ?? null;
    const isOwner = Boolean(schedule.owner_id && schedule.owner_id === userId) ||
        Boolean(schedule.ownerId && schedule.ownerId === userId) ||
        me?.role === "owner";
    const ownParticipantId = text(me?.participantId ?? participants.find(participant => participant.user_id === userId)?.id);

    return {
        schedule,
        scheduleId,
        shareId: text(schedule.shareId ?? schedule.share_id),
        title: text(schedule.title) || "無題の卓",
        status: normalizeStatus(schedule.status),
        statusLabel: SESSION_STATUS_LABELS[normalizeStatus(schedule.status)],
        isOwner,
        roleLabel: isOwner ? "KP" : "PL",
        me,
        ownParticipantId,
        participants,
        rounds,
        activeRound,
        allSlots,
        slots,
        responses,
        allResponses,
        confirmedSlots,
        sessions,
        nextConfirmed: findNextSession(sessions, new Date()) ?? findNextConfirmedSlot(confirmedSlots, new Date())
    };
}

function normalizeBundleResponses(bundle, scheduleId, slots = []){
    const slotById = new Map(slots.map(slot => [text(slot?.id), slot]));
    const normalizeResponse = response => {
        const slotId = text(response?.slot_id ?? response?.slotId);
        const slot = slotById.get(slotId);
        const responseRevision = normalizeRevision(response?.candidate_revision ?? response?.candidateRevision);

        return {
            ...response,
            schedule_id: response.schedule_id ?? response.scheduleId ?? scheduleId,
            participant_id: response.participant_id ?? response.participantId,
            slot_id: slotId,
            candidate_revision: responseRevision,
            stale: Boolean(response?.stale ?? response?.is_stale ?? response?.isStale) ||
                !slot || slot.status === "retired" || responseRevision !== normalizeRevision(slot.revision),
            ranges: array(response.ranges ?? response.schedule_response_ranges)
        };
    };

    const responses = array(bundle?.responses).map(normalizeResponse);
    const me = bundle?.me ?? null;
    const participantId = text(me?.participantId ?? me?.participant_id);

    array(me?.responses).forEach(response => {
        const slotId = text(response.slot_id ?? response.slotId);
        if(!participantId || !slotId){
            return;
        }

        const exists = responses.some(item => {
            return text(item.participant_id ?? item.participantId) === participantId &&
                text(item.slot_id ?? item.slotId) === slotId;
        });

        if(!exists){
            responses.push(normalizeResponse({
                ...response,
                schedule_id: response.schedule_id ?? response.scheduleId ?? scheduleId,
                participant_id: participantId,
                slot_id: slotId
            }));
        }
    });

    return responses;
}

function isCurrentCandidateResponse(response, slotById){
    const slot = slotById.get(text(response?.slot_id ?? response?.slotId));
    return Boolean(slot) && normalizeCandidateStatus(slot.status) === "active" &&
        normalizeRevision(response?.candidate_revision ?? response?.candidateRevision) === normalizeRevision(slot.revision);
}

function normalizeRound(roundItem){
    return {
        ...roundItem,
        id: text(roundItem?.id),
        schedule_id: roundItem?.schedule_id ?? roundItem?.scheduleId,
        sequence: Number(roundItem?.sequence ?? 0),
        status: text(roundItem?.status) || "draft",
        target_minutes: Number(roundItem?.target_minutes ?? roundItem?.targetMinutes ?? 0),
        title: text(roundItem?.title),
        purpose: text(roundItem?.purpose)
    };
}

function normalizeSession(sessionItem){
    return {
        ...sessionItem,
        id: text(sessionItem?.id),
        schedule_id: sessionItem?.schedule_id ?? sessionItem?.scheduleId,
        round_id: sessionItem?.round_id ?? sessionItem?.roundId,
        sequence: Number(sessionItem?.sequence ?? 0),
        status: text(sessionItem?.status) || "scheduled",
        starts_at: sessionItem?.starts_at ?? sessionItem?.startsAt,
        ends_at: sessionItem?.ends_at ?? sessionItem?.endsAt,
        local_date: sessionItem?.local_date ?? sessionItem?.localDate,
        start_minute: Number(sessionItem?.start_minute ?? sessionItem?.startMinute ?? 0),
        end_minute: Number(sessionItem?.end_minute ?? sessionItem?.endMinute ?? 0)
    };
}

function findActiveRound(rounds, scheduleId){
    const matching = array(rounds)
        .filter(roundItem => roundItem.schedule_id === scheduleId && ["open", "draft"].includes(text(roundItem.status)))
        .sort((left, right) => Number(right.sequence ?? 0) - Number(left.sequence ?? 0));
    return matching[0] ?? null;
}

function findNextSession(sessions, now){
    return array(sessions)
        .filter(sessionItem => sessionItem.status === "scheduled" && new Date(sessionItem.starts_at).getTime() >= now.getTime())
        .sort((left, right) => new Date(left.starts_at) - new Date(right.starts_at))[0] ?? null;
}

export function summarizeSlotResponses(slotId, participants, responses){
    const slotResponses = array(responses).filter(response => {
        return (response.slot_id === slotId || response.slotId === slotId) && !response.stale;
    });
    const yes = slotResponses.filter(response => normalizeAnswer(response.answer) === "yes").length;
    const maybe = slotResponses.filter(response => normalizeAnswer(response.answer) === "maybe").length;
    const no = slotResponses.filter(response => normalizeAnswer(response.answer) === "no").length;
    const answered = yes + maybe + no;
    const unknown = Math.max(0, array(participants).length - answered);

    return {
        yes,
        maybe,
        no,
        answered,
        unknown
    };
}

export function findResponseForParticipant(responses, participantId, slotId){
    return array(responses).find(response => {
        return (response.participant_id === participantId || response.participantId === participantId) &&
            (response.slot_id === slotId || response.slotId === slotId);
    }) ?? null;
}

export function formatDateLockup(slot){
    const startsAt = text(slot?.starts_at ?? slot?.startsAt);
    const date = startsAt ? new Date(startsAt) : new Date(`${text(slot?.local_date ?? slot?.localDate)}T00:00:00+09:00`);

    if(Number.isNaN(date.getTime())){
        return {
            month: "---",
            day: "--",
            weekday: "---"
        };
    }

    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Tokyo",
        month: "short",
        day: "2-digit",
        weekday: "short"
    });
    const parts = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));

    return {
        month: (parts.month || "---").toUpperCase(),
        day: parts.day || "--",
        weekday: (parts.weekday || "---").toUpperCase()
    };
}

export function formatTimeRange(slot){
    const startMinute = Number(slot?.start_minute ?? slot?.startMinute ?? 0);
    const endMinute = Number(slot?.end_minute ?? slot?.endMinute ?? 0);
    const endLabel = endMinute >= 24 * 60
        ? `翌${formatMinute(endMinute - 24 * 60)}`
        : formatMinute(endMinute);
    return `${formatMinute(startMinute)} - ${endLabel}`;
}

export function datetimeLocalToIso(value){
    const textValue = text(value);
    if(!textValue){
        return "";
    }

    const date = new Date(textValue);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function normalizeAnswer(value){
    return ["yes", "maybe", "no", "unknown"].includes(value) ? value : "unknown";
}

export function normalizeStatus(value){
    return Object.hasOwn(SESSION_STATUS_LABELS, value) ? value : "collecting";
}

function findNextConfirmedSlot(slots, now){
    return array(slots)
        .filter(slot => normalizeConfirmedStatus(slot.status) === "confirmed")
        .filter(slot => new Date(slot.starts_at ?? slot.startsAt).getTime() >= now.getTime())
        .sort((a, b) => new Date(a.starts_at ?? a.startsAt) - new Date(b.starts_at ?? b.startsAt))[0] ?? null;
}

function normalizeConfirmedStatus(value){
    return value === "held" ? "held" : "confirmed";
}

function normalizeCandidateStatus(value){
    return value === "retired" ? "retired" : "active";
}

function normalizeRevision(value){
    const revision = Number(value);
    return Number.isInteger(revision) && revision >= 1 ? revision : 1;
}

function formatMinute(value){
    const total = Number.isFinite(value) ? Math.max(0, value) : 0;
    const hour = Math.floor(total / 60);
    const minute = total % 60;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function sortByOrder(a, b){
    return Number(a?.sort_order ?? a?.sortOrder ?? 0) - Number(b?.sort_order ?? b?.sortOrder ?? 0);
}

function sortBySequence(a, b){
    return Number(a?.sequence ?? 0) - Number(b?.sequence ?? 0);
}

function array(value){
    return Array.isArray(value) ? value : [];
}

function text(value){
    return String(value ?? "").trim();
}
