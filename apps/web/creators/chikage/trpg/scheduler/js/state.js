import {
    DEFAULT_SLOT_END,
    DEFAULT_SLOT_START,
    addDays,
    toDateKey
} from "./schedulerMath.js";

export function createInitialState(today = new Date()){
    const first = createScheduleRecord({
        title: "千景卓 日程調整",
        today
    });

    return {
        schemaVersion: 3,
        currentUserId: "local-user",
        activeScheduleId: first.id,
        activeParticipantId: first.participants[0].id,
        schedules: [first],
        save: {
            status: "saved",
            message: ""
        }
    };
}

export function createScheduleRecord(options = {}){
    const today = options.today instanceof Date ? options.today : new Date();
    const start = addDays(startOfDay(today), 7);
    const end = addDays(start, 13);
    const id = text(options.id, 80) || createId("schedule");
    const ownerParticipantId = createId("participant");

    return {
        id,
        title: text(options.title, 80) || "日程調整",
        description: text(options.description, 240),
        startDate: validDate(options.startDate) ? options.startDate : toDateKey(start),
        endDate: validDate(options.endDate) ? options.endDate : toDateKey(end),
        startMinute: minute(options.startMinute, DEFAULT_SLOT_START),
        endMinute: minute(options.endMinute, DEFAULT_SLOT_END),
        totalMinutes: number(options.totalMinutes, 0),
        sessionMinutes: number(options.sessionMinutes, 180),
        status: text(options.status, 24) || "collecting",
        ownerUserId: text(options.ownerUserId, 80) || "local-user",
        updatedAt: isoTime(options.updatedAt) || new Date().toISOString(),
        heldSlotId: text(options.heldSlotId, 120),
        confirmedSlotId: text(options.confirmedSlotId, 120),
        participants: normalizeParticipants(options.participants, ownerParticipantId),
        responses: {},
        dirty: createDirtyState()
    };
}

export function normalizeState(value){
    const fallback = createInitialState();
    const source = value && typeof value === "object" ? value : {};

    if(source.schemaVersion === 2 || source.schedule){
        return normalizeCollection({
            schemaVersion: 3,
            currentUserId: "local-user",
            activeScheduleId: source.schedule?.id,
            activeParticipantId: source.activeParticipantId,
            schedules: [fromLegacySchedule(source)]
        }, fallback);
    }

    return normalizeCollection(source, fallback);
}

export function createId(prefix){
    return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function markDirty(target, keys){
    target.dirty ??= createDirtyState();
    keys.forEach(key => {
        target.dirty[key] = true;
    });
}

export function markClean(target, keys){
    target.dirty ??= createDirtyState();
    keys.forEach(key => {
        target.dirty[key] = false;
    });
}

export function setSaveStatus(state, status, message = ""){
    state.save = {
        status,
        message
    };
}

export function createScheduleFromSharePayload(payload, currentUserId = "local-user"){
    const guestParticipantId = createId("participant");
    const schedule = createScheduleRecord({
        id: payload.i,
        title: payload.t,
        startDate: payload.s,
        endDate: payload.e,
        startMinute: payload.sm,
        endMinute: payload.em,
        ownerUserId: "owner-remote",
        status: "collecting",
        participants: [
            {
                id: createId("participant"),
                userId: "owner-remote",
                displayName: "主催者",
                role: "owner",
                required: true
            },
            {
                id: guestParticipantId,
                userId: currentUserId,
                displayName: "ゲスト",
                role: "guest",
                required: false
            }
        ]
    });

    return {
        schedule,
        activeParticipantId: guestParticipantId
    };
}

export function ensureLocalGuestParticipant(schedule, currentUserId = "local-user"){
    const existing = schedule.participants.find(participant => {
        return participant.userId === currentUserId && participant.role !== "owner";
    });

    if(existing){
        return existing.id;
    }

    const participant = {
        id: createId("participant"),
        userId: currentUserId,
        displayName: "ゲスト",
        role: "guest",
        required: false
    };

    schedule.participants.push(participant);
    return participant.id;
}

function normalizeCollection(source, fallback){
    const schedules = normalizeSchedules(source.schedules);
    const activeScheduleId = schedules.some(item => item.id === source.activeScheduleId)
        ? source.activeScheduleId
        : schedules[0]?.id ?? fallback.activeScheduleId;
    const activeSchedule = schedules.find(item => item.id === activeScheduleId) ?? schedules[0];
    const activeParticipantId = activeSchedule?.participants.some(item => item.id === source.activeParticipantId)
        ? source.activeParticipantId
        : activeSchedule?.participants[0]?.id ?? "";

    return {
        schemaVersion: 3,
        currentUserId: text(source.currentUserId, 80) || "local-user",
        activeScheduleId,
        activeParticipantId,
        schedules,
        save: {
            status: "saved",
            message: ""
        }
    };
}

function normalizeSchedules(value){
    const source = Array.isArray(value) ? value : [];
    const used = new Set();
    const schedules = [];

    source.forEach(item => {
        const schedule = normalizeSchedule(item);

        if(!schedule || used.has(schedule.id)){
            return;
        }

        used.add(schedule.id);
        schedules.push(schedule);
    });

    return schedules.length > 0 ? schedules : [createScheduleRecord()];
}

function normalizeSchedule(value){
    if(!value || typeof value !== "object"){
        return null;
    }

    const fallback = createScheduleRecord();
    const id = text(value.id, 80) || fallback.id;
    const participants = normalizeParticipants(value.participants);

    return {
        id,
        title: text(value.title, 80) || fallback.title,
        description: text(value.description, 240),
        startDate: validDate(value.startDate) ? value.startDate : fallback.startDate,
        endDate: validDate(value.endDate) ? value.endDate : fallback.endDate,
        startMinute: minute(value.startMinute, fallback.startMinute),
        endMinute: minute(value.endMinute, fallback.endMinute),
        totalMinutes: number(value.totalMinutes, 0),
        sessionMinutes: number(value.sessionMinutes, fallback.sessionMinutes),
        status: normalizeStatus(value.status),
        ownerUserId: text(value.ownerUserId, 80) || "local-user",
        updatedAt: isoTime(value.updatedAt) || fallback.updatedAt,
        heldSlotId: text(value.heldSlotId, 120),
        confirmedSlotId: text(value.confirmedSlotId, 120),
        participants,
        responses: normalizeResponses(value.responses, participants),
        dirty: createDirtyState()
    };
}

function fromLegacySchedule(source){
    const schedule = source.schedule && typeof source.schedule === "object" ? source.schedule : {};

    return {
        ...schedule,
        status: schedule.status === "draft" ? "collecting" : schedule.status,
        participants: source.participants,
        responses: source.responses,
        heldSlotId: source.heldSlotId,
        confirmedSlotId: source.confirmedSlotId,
        updatedAt: new Date().toISOString()
    };
}

function normalizeParticipants(value, ownerParticipantId = ""){
    const source = Array.isArray(value) ? value : [];
    const used = new Set();
    const participants = [];

    source.forEach((item, index) => {
        const id = text(item?.id, 80) || (index === 0 && ownerParticipantId ? ownerParticipantId : createId("participant"));
        const displayName = text(item?.displayName, 40);

        if(!displayName || used.has(id)){
            return;
        }

        used.add(id);
        participants.push({
            id,
            userId: text(item?.userId, 80) || (index === 0 ? "local-user" : ""),
            displayName,
            role: normalizeRole(item?.role, index),
            required: Boolean(item?.required)
        });
    });

    return participants.length > 0
        ? participants
        : [{
            id: ownerParticipantId || createId("participant"),
            userId: "local-user",
            displayName: "ゲスト",
            role: "owner",
            required: true
        }];
}

function normalizeResponses(value, participants){
    const participantIds = new Set(participants.map(item => item.id));
    const responses = {};
    const source = value && typeof value === "object" ? value : {};

    Object.entries(source).forEach(([participantId, slots]) => {
        if(!participantIds.has(participantId) || !slots || typeof slots !== "object"){
            return;
        }

        responses[participantId] = {};
        Object.entries(slots).forEach(([slotId, response]) => {
            responses[participantId][slotId] = {
                answer: ["yes", "maybe", "no", "unknown"].includes(response?.answer) ? response.answer : "unknown",
                note: text(response?.note, 120),
                ranges: Array.isArray(response?.ranges) ? response.ranges.slice(0, 4).map(normalizeRange).filter(Boolean) : []
            };
        });
    });

    return responses;
}

function normalizeRange(range){
    const startMinute = minute(range?.startMinute, -1);
    const endMinute = minute(range?.endMinute, -1);

    if(startMinute < 0 || endMinute <= startMinute){
        return null;
    }

    return {
        startMinute,
        endMinute
    };
}

function createDirtyState(){
    return {
        slots: true,
        summaries: true,
        dashboard: true,
        plans: true
    };
}

function normalizeRole(value, index){
    if(["owner", "participant", "guest", "viewer"].includes(value)){
        return value;
    }

    if(value === "organizer" || value === "kp"){
        return "owner";
    }

    if(value === "pl"){
        return "participant";
    }

    return index === 0 ? "owner" : "participant";
}

function normalizeStatus(value){
    const status = text(value, 24);

    return ["draft", "collecting", "ready", "held", "confirmed", "archived"].includes(status)
        ? status
        : "collecting";
}

function startOfDay(date){
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
}

function validDate(value){
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function text(value, maxLength){
    return String(value ?? "").trim().slice(0, maxLength);
}

function minute(value, fallback){
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue >= 0 && numberValue <= 30 * 60
        ? numberValue
        : fallback;
}

function number(value, fallback){
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : fallback;
}

function isoTime(value){
    const textValue = text(value, 40);
    const time = Date.parse(textValue);

    return Number.isNaN(time) ? "" : new Date(time).toISOString();
}
