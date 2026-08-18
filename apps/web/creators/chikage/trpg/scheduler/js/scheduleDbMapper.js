import {
    createSlots
} from "./schedulerMath.js";

export function createScheduleInsertPayload(schedule, ownerId){
    return {
        owner_id: ownerId,
        title: text(schedule?.title, 120) || "日程調整",
        description: text(schedule?.description, 2000),
        timezone: text(schedule?.timezone, 80) || "Asia/Tokyo",
        status: normalizeStatus(schedule?.status),
        total_minutes: nonNegativeInteger(schedule?.totalMinutes, 0),
        session_minutes: boundedInteger(schedule?.sessionMinutes, 1, 1800, 180),
        max_participants: 50,
        schema_version: 1
    };
}

export function createSlotInsertPayloads(schedule, dbScheduleId){
    return createSlots(schedule).map(slot => mapSlotToDb(slot, dbScheduleId));
}

export function createParticipantInsertPayloads(schedule, dbScheduleId, ownerId){
    const participants = Array.isArray(schedule?.participants) ? schedule.participants : [];

    return participants.map((participant, index) => ({
        schedule_id: dbScheduleId,
        user_id: participant.role === "owner" ? ownerId : null,
        display_name: text(participant.displayName, 80) || `参加者${index + 1}`,
        role: normalizeRole(participant.role, index),
        required: Boolean(participant.required),
        sort_order: index
    }));
}

export function createResponseUpsertPayloads(schedule, participantIdMap, slotIdMap){
    const rows = [];
    const responses = schedule?.responses && typeof schedule.responses === "object" ? schedule.responses : {};

    Object.entries(responses).forEach(([localParticipantId, slotResponses]) => {
        const participantId = participantIdMap.get(localParticipantId);

        if(!participantId || !slotResponses || typeof slotResponses !== "object"){
            return;
        }

        Object.entries(slotResponses).forEach(([localSlotId, response]) => {
            const slotId = slotIdMap.get(localSlotId);
            const answer = normalizeAnswer(response?.answer);

            if(!slotId || answer === "unknown"){
                return;
            }

            rows.push({
                participant_id: participantId,
                slot_id: slotId,
                answer,
                note: text(response?.note, 120),
                ranges: normalizeRanges(response?.ranges)
            });
        });
    });

    return rows;
}

export function mapDbScheduleBundleToState(bundle){
    const schedule = bundle?.schedule && typeof bundle.schedule === "object" ? bundle.schedule : {};
    const slots = (Array.isArray(bundle?.slots) ? bundle.slots : []).map(mapDbSlotToState);
    const participants = Array.isArray(bundle?.participants) ? bundle.participants : [];
    const responses = {};

    (Array.isArray(bundle?.responses) ? bundle.responses : []).forEach(response => {
        const participantId = text(response.participantId ?? response.participant_id, 80);
        const slotId = text(response.slotId ?? response.slot_id, 80);

        if(!participantId || !slotId){
            return;
        }

        responses[participantId] ??= {};
        responses[participantId][slotId] = {
            answer: normalizeAnswer(response.answer),
            note: text(response.note, 120),
            ranges: normalizeRanges(response.ranges ?? response.schedule_response_ranges)
        };
    });

    const firstSlot = slots[0];
    const lastSlot = slots[slots.length - 1] || firstSlot;
    const confirmedSlots = Array.isArray(bundle?.confirmedSlots ?? bundle?.confirmed_slots)
        ? bundle.confirmedSlots ?? bundle.confirmed_slots
        : [];
    const confirmed = confirmedSlots.find(item => (item.status ?? "") === "confirmed") ?? confirmedSlots[0];

    return {
        id: text(schedule.id, 80),
        shareId: text(schedule.shareId ?? schedule.share_id, 120),
        title: text(schedule.title, 120) || "日程調整",
        description: text(schedule.description, 2000),
        timezone: text(schedule.timezone, 80) || "Asia/Tokyo",
        status: normalizeStatus(schedule.status),
        totalMinutes: nonNegativeInteger(schedule.totalMinutes, 0),
        sessionMinutes: boundedInteger(schedule.sessionMinutes, 1, 1800, 180),
        ownerUserId: text(schedule.ownerUserId ?? schedule.owner_id, 80),
        startDate: firstSlot?.date || "",
        endDate: lastSlot?.date || firstSlot?.date || "",
        startMinute: firstSlot?.startMinute ?? 1140,
        endMinute: firstSlot?.endMinute ?? 1440,
        updatedAt: text(schedule.updatedAt ?? schedule.updated_at ?? schedule.lastActivityAt ?? schedule.last_activity_at, 40) || new Date().toISOString(),
        heldSlotId: text(confirmed?.status === "held" ? confirmed.slotId ?? confirmed.slot_id : "", 120),
        confirmedSlotId: text(confirmed?.status === "confirmed" ? confirmed.slotId ?? confirmed.slot_id : "", 120),
        slots,
        participants: participants.map(mapDbParticipantToState),
        responses,
        dirty: {
            slots: false,
            summaries: true,
            dashboard: true,
            plans: true
        }
    };
}

function mapSlotToDb(slot, dbScheduleId){
    return {
        schedule_id: dbScheduleId,
        local_date: slot.date,
        start_minute: slot.startMinute,
        end_minute: slot.endMinute,
        starts_at: toInstant(slot.date, slot.startMinute),
        ends_at: toInstant(slot.date, slot.endMinute),
        sort_order: slot.order,
        label: ""
    };
}

function mapDbSlotToState(slot){
    return {
        id: text(slot.id, 80),
        date: text(slot.localDate ?? slot.local_date, 10),
        startMinute: boundedInteger(slot.startMinute ?? slot.start_minute, 0, 1800, 0),
        endMinute: boundedInteger(slot.endMinute ?? slot.end_minute, 1, 1800, 1),
        order: nonNegativeInteger(slot.sortOrder ?? slot.sort_order, 0),
        label: text(slot.label, 120)
    };
}

function mapDbParticipantToState(participant, index){
    return {
        id: text(participant.id ?? participant.participantId, 80),
        userId: text(participant.userId ?? participant.user_id, 80),
        displayName: text(participant.displayName ?? participant.display_name, 80) || `参加者${index + 1}`,
        role: normalizeRole(participant.role, index),
        required: Boolean(participant.required)
    };
}

function toInstant(dateKey, minute){
    const base = new Date(`${dateKey}T00:00:00+09:00`);
    return new Date(base.getTime() + minute * 60 * 1000).toISOString();
}

function normalizeRanges(value){
    return (Array.isArray(value) ? value : [])
        .slice(0, 4)
        .map(range => ({
            startMinute: boundedInteger(range?.startMinute ?? range?.start_minute, 0, 1800, -1),
            endMinute: boundedInteger(range?.endMinute ?? range?.end_minute, 0, 1800, -1),
            answer: normalizeNullableAnswer(range?.answer),
            sortOrder: nonNegativeInteger(range?.sortOrder ?? range?.sort_order, 0)
        }))
        .filter(range => range.startMinute >= 0 && range.endMinute > range.startMinute)
        .map(({ startMinute, endMinute, answer, sortOrder }) => ({
            startMinute,
            endMinute,
            answer,
            sortOrder
        }));
}

function normalizeStatus(value){
    return ["draft", "collecting", "ready", "held", "confirmed", "archived", "expired"].includes(value)
        ? value
        : "collecting";
}

function normalizeRole(value, index){
    if(["owner", "participant", "guest", "viewer"].includes(value)){
        return value;
    }

    return index === 0 ? "owner" : "participant";
}

function normalizeAnswer(value){
    return ["yes", "maybe", "no", "unknown"].includes(value) ? value : "unknown";
}

function normalizeNullableAnswer(value){
    return ["yes", "maybe", "no"].includes(value) ? value : null;
}

function boundedInteger(value, min, max, fallback){
    const next = Number(value);
    return Number.isInteger(next) && next >= min && next <= max ? next : fallback;
}

function nonNegativeInteger(value, fallback){
    return boundedInteger(value, 0, Number.MAX_SAFE_INTEGER, fallback);
}

function text(value, maxLength){
    return String(value ?? "").trim().slice(0, maxLength);
}
