import {
    createParticipantInsertPayloads,
    createResponseUpsertPayloads,
    createScheduleInsertPayload,
    createSlotInsertPayloads
} from "./scheduleDbMapper.js";

export class SupabaseScheduleRepository {
    constructor(client){
        if(!client){
            throw new Error("Supabase client is required.");
        }

        this.client = client;
    }

    async createSchedule(schedule, ownerId){
        const { data: created, error: scheduleError } = await this.client
            .from("schedules")
            .insert(createScheduleInsertPayload(schedule, ownerId))
            .select("id, share_id")
            .single();

        assertOk(scheduleError);

        const slots = createSlotInsertPayloads(schedule, created.id);
        if(slots.length > 0){
            assertOk((await this.client.from("schedule_slots").insert(slots)).error);
        }

        const participants = createParticipantInsertPayloads(schedule, created.id, ownerId);
        if(participants.length > 0){
            assertOk((await this.client.from("schedule_participants").insert(participants)).error);
        }

        return {
            id: created.id,
            shareId: created.share_id
        };
    }

    async getCurrentUser(){
        const { data, error } = await this.client.auth.getUser();

        assertOk(error);
        return data?.user ?? null;
    }

    onAuthStateChange(callback){
        return this.client.auth.onAuthStateChange((_event, session) => {
            callback(session?.user ?? null);
        });
    }

    async sendOwnerLoginLink(email, redirectTo){
        const { error } = await this.client.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: redirectTo
            }
        });

        assertOk(error);
        return {
            sent: true
        };
    }

    async loadDashboard(){
        const { data, error } = await this.client
            .from("schedules")
            .select("id, share_id, title, status, updated_at, last_activity_at, expires_at")
            .order("last_activity_at", { ascending: false });

        assertOk(error);
        return data ?? [];
    }

    async loadSchedule(scheduleId){
        return this.#loadOwnerBundle(scheduleId);
    }

    async loadSharedSchedule(shareId){
        const { data, error } = await this.client.rpc("schedule_public_view", {
            p_share_id: shareId
        });

        assertOk(error);
        return data;
    }

    async joinGuest(shareId, displayName){
        const { data, error } = await this.client.rpc("schedule_guest_join", {
            p_share_id: shareId,
            p_display_name: displayName
        });

        assertOk(error);
        return data;
    }

    async loadGuestView(shareId, participantId, guestToken){
        const { data, error } = await this.client.rpc("schedule_guest_view", {
            p_share_id: shareId,
            p_participant_id: participantId,
            p_guest_token: guestToken
        });

        assertOk(error);
        return data;
    }

    async updateGuestName(shareId, participantId, guestToken, displayName){
        const { data, error } = await this.client.rpc("schedule_guest_update_name", {
            p_share_id: shareId,
            p_participant_id: participantId,
            p_guest_token: guestToken,
            p_display_name: displayName
        });

        assertOk(error);
        return data;
    }

    async upsertResponse({
        shareId,
        participantId,
        guestToken,
        slotId,
        answer,
        note = "",
        ranges = []
    }){
        const { data, error } = await this.client.rpc("schedule_guest_upsert_response", {
            p_share_id: shareId,
            p_participant_id: participantId,
            p_guest_token: guestToken,
            p_slot_id: slotId,
            p_answer: answer,
            p_note: note,
            p_ranges: ranges
        });

        assertOk(error);
        return data;
    }

    async updateParticipant(participantId, fields){
        const allowed = {};
        if("displayName" in fields){
            allowed.display_name = String(fields.displayName ?? "").trim().slice(0, 80);
        }
        if("required" in fields){
            allowed.required = Boolean(fields.required);
        }
        if("role" in fields && ["owner", "participant", "guest", "viewer"].includes(fields.role)){
            allowed.role = fields.role;
        }

        const { data, error } = await this.client
            .from("schedule_participants")
            .update(allowed)
            .eq("id", participantId)
            .select()
            .single();

        assertOk(error);
        return data;
    }

    async confirmSlots(scheduleId, items){
        const { data, error } = await this.client.rpc("schedule_owner_confirm_slots", {
            p_schedule_id: scheduleId,
            p_items: items
        });

        assertOk(error);
        return data;
    }

    async deleteSchedule(scheduleId){
        const { error } = await this.client
            .from("schedules")
            .delete()
            .eq("id", scheduleId);

        assertOk(error);
        return {
            id: scheduleId,
            deleted: true
        };
    }

    async importLocalSchedule(schedule, ownerId){
        const created = await this.createSchedule(schedule, ownerId);
        const bundle = await this.#loadOwnerBundle(created.id);
        const participantIdMap = createIdMap(schedule.participants, bundle.participants);
        const slotIdMap = createSlotIdMap(schedule, bundle.slots);
        const responses = createResponseUpsertPayloads(schedule, participantIdMap, slotIdMap);

        for(const response of responses){
            const { data: createdResponse, error } = await this.client
                .from("schedule_responses")
                .upsert({
                    schedule_id: created.id,
                    participant_id: response.participant_id,
                    slot_id: response.slot_id,
                    answer: response.answer,
                    note: response.note
                }, {
                    onConflict: "participant_id,slot_id"
                })
                .select("id")
                .single();

            assertOk(error);

            if(response.ranges.length > 0){
                const rangeRows = response.ranges.map((range, index) => ({
                    response_id: createdResponse.id,
                    start_minute: range.startMinute,
                    end_minute: range.endMinute,
                    answer: range.answer,
                    sort_order: index
                }));
                assertOk((await this.client.from("schedule_response_ranges").insert(rangeRows)).error);
            }
        }

        return created;
    }

    async #loadOwnerBundle(scheduleId){
        const [scheduleResult, slotsResult, participantsResult, responsesResult, confirmedResult] = await Promise.all([
            this.client.from("schedules").select("*").eq("id", scheduleId).single(),
            this.client.from("schedule_slots").select("*").eq("schedule_id", scheduleId).order("sort_order"),
            this.client.from("schedule_participants").select("*").eq("schedule_id", scheduleId).order("sort_order"),
            this.client.from("schedule_responses").select("*, schedule_response_ranges(*)").eq("schedule_id", scheduleId),
            this.client.from("schedule_confirmed_slots").select("*").eq("schedule_id", scheduleId).order("sequence")
        ]);

        [scheduleResult, slotsResult, participantsResult, responsesResult, confirmedResult]
            .forEach(result => assertOk(result.error));

        return {
            schedule: scheduleResult.data,
            slots: slotsResult.data ?? [],
            participants: participantsResult.data ?? [],
            responses: responsesResult.data ?? [],
            confirmedSlots: confirmedResult.data ?? []
        };
    }
}

export function createGuestTokenStore(storage = globalThis.localStorage){
    const key = "relmua_schedule_guest_tokens_v1";

    return {
        load(){
            try{
                const parsed = JSON.parse(storage.getItem(key) || "{}");
                return parsed && typeof parsed === "object" ? parsed : {};
            }catch{
                return {};
            }
        },
        save(tokens){
            storage.setItem(key, JSON.stringify(tokens));
        },
        remember(shareId, credential){
            const tokens = this.load();
            tokens[shareId] = {
                participantId: credential.participantId,
                guestToken: credential.guestToken
            };
            this.save(tokens);
        }
    };
}

export function createMigrationMapStore(storage = globalThis.localStorage){
    const key = "relmua_schedule_db_map_v1";

    return {
        load(){
            try{
                const parsed = JSON.parse(storage.getItem(key) || "{}");
                return parsed && typeof parsed === "object" ? parsed : {};
            }catch{
                return {};
            }
        },
        remember(localScheduleId, dbSchedule){
            const map = this.load();
            map[localScheduleId] = {
                id: dbSchedule.id,
                shareId: dbSchedule.shareId,
                importedAt: new Date().toISOString()
            };
            storage.setItem(key, JSON.stringify(map));
            return map[localScheduleId];
        }
    };
}

function assertOk(error){
    if(error){
        throw new Error(error.message || "Schedule database operation failed.");
    }
}

function createIdMap(localItems = [], dbItems = []){
    const map = new Map();
    localItems.forEach((localItem, index) => {
        if(dbItems[index]?.id){
            map.set(localItem.id, dbItems[index].id);
        }
    });
    return map;
}

function createSlotIdMap(localSchedule, dbSlots = []){
    const map = new Map();
    const localSlots = createSlotList(localSchedule);

    localSlots.forEach(localSlot => {
        const dbSlot = dbSlots.find(slot => {
            return slot.local_date === localSlot.date &&
                Number(slot.start_minute) === localSlot.startMinute &&
                Number(slot.end_minute) === localSlot.endMinute;
        });

        if(dbSlot?.id){
            map.set(localSlot.id, dbSlot.id);
        }
    });

    return map;
}

function createSlotList(schedule){
    return createSlotInsertPayloads(schedule, "00000000-0000-0000-0000-000000000000")
        .map(slot => ({
            id: `slot-${slot.local_date}-${slot.start_minute}-${slot.end_minute}`,
            date: slot.local_date,
            startMinute: slot.start_minute,
            endMinute: slot.end_minute
        }));
}
