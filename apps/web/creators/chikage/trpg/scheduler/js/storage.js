import {
    normalizeState
} from "./state.js";

const STORAGE_KEY = "relmua_schedule_v3";
const LEGACY_STORAGE_KEY = "relmua_schedule_v2";

export function createLocalStorageAdapter(storage = globalThis.localStorage){
    return {
        load(){
            try{
                const raw = storage.getItem(STORAGE_KEY) ?? storage.getItem(LEGACY_STORAGE_KEY);
                return normalizeState(JSON.parse(raw ?? "null"));
            }catch{
                return normalizeState(null);
            }
        },
        save(state){
            try{
                storage.setItem(STORAGE_KEY, JSON.stringify(toPersistedState(state)));
                return {
                    ok: true
                };
            }catch(error){
                return {
                    ok: false,
                    message: error?.message ?? "保存できませんでした"
                };
            }
        },
        clear(){
            try{
                storage.removeItem(STORAGE_KEY);
                storage.removeItem(LEGACY_STORAGE_KEY);
            }catch{
                // Ignore storage cleanup failures in the static prototype.
            }
        }
    };
}

export function toPersistedState(state){
    return {
        schemaVersion: 3,
        currentUserId: state.currentUserId,
        activeScheduleId: state.activeScheduleId,
        activeParticipantId: state.activeParticipantId,
        schedules: state.schedules.map(schedule => ({
            id: schedule.id,
            title: schedule.title,
            description: schedule.description,
            startDate: schedule.startDate,
            endDate: schedule.endDate,
            startMinute: schedule.startMinute,
            endMinute: schedule.endMinute,
            totalMinutes: schedule.totalMinutes,
            sessionMinutes: schedule.sessionMinutes,
            status: schedule.status,
            source: schedule.source,
            shareId: schedule.shareId,
            timezone: schedule.timezone,
            slots: schedule.slots,
            ownerUserId: schedule.ownerUserId,
            updatedAt: schedule.updatedAt,
            heldSlotId: schedule.heldSlotId,
            confirmedSlotId: schedule.confirmedSlotId,
            participants: schedule.participants,
            responses: schedule.responses
        }))
    };
}
