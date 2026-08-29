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
        let sessionResult;

        try{
            sessionResult = await this.client.auth.getSession();
        }catch(error){
            if(isAuthSessionMissing(error)){
                return null;
            }

            throw error;
        }

        if(isAuthSessionMissing(sessionResult.error)){
            return null;
        }

        assertOk(sessionResult.error);

        if(!sessionResult.data?.session){
            return null;
        }

        let userResult;

        try{
            userResult = await this.client.auth.getUser();
        }catch(error){
            if(isAuthSessionMissing(error)){
                return null;
            }

            throw error;
        }

        if(isAuthSessionMissing(userResult.error)){
            return null;
        }

        assertOk(userResult.error);
        return userResult.data?.user ?? sessionResult.data.session.user ?? null;
    }

    onAuthStateChange(callback){
        return this.client.auth.onAuthStateChange((event, session) => {
            callback(session?.user ?? null, event);
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

    async signInWithDiscord(redirectTo){
        const { data, error } = await this.client.auth.signInWithOAuth({
            provider: "discord",
            options: {
                redirectTo
            }
        });

        assertOk(error);
        return data;
    }

    async signOut(){
        const { error } = await this.client.auth.signOut();

        assertOk(error);
        return {
            signedOut: true
        };
    }

    async ensureTrpgV2Profile(){
        const { data, error } = await this.client.rpc("trpg_v2_upsert_profile_from_auth");

        assertOk(error);
        return data;
    }

    async createTrpgV2Session({
        title,
        totalMinutes = 240,
        memo = ""
    }){
        const { data, error } = await this.client.rpc("trpg_v2_create_session", {
            p_title: title,
            p_total_minutes: totalMinutes,
            p_memo: memo
        });

        assertOk(error);
        return data;
    }

    async loadTrpgV2Dashboard(){
        const { data: schedules, error: scheduleError } = await this.client
            .from("schedules")
            .select("id, share_id, title, description, status, owner_id, created_by, total_minutes, session_minutes, updated_at, last_activity_at")
            .order("last_activity_at", { ascending: false });

        assertOk(scheduleError);

        const scheduleIds = (schedules ?? []).map(schedule => schedule.id).filter(Boolean);
        if(scheduleIds.length === 0){
            return createEmptyDashboardBundle();
        }

        const [participantsResult, roundsResult, slotsResult, responsesResult, confirmedResult, sessionsResult] = await Promise.all([
            this.client
                .from("schedule_participants")
                .select("id, schedule_id, user_id, display_name, role, required, sort_order")
                .in("schedule_id", scheduleIds)
                .order("sort_order"),
            this.client
                .from("schedule_rounds")
                .select("id, schedule_id, sequence, status, title, purpose, target_minutes, created_at, opened_at, confirmed_at, closed_at")
                .in("schedule_id", scheduleIds)
                .order("sequence"),
            this.client
                .from("schedule_slots")
                .select("id, schedule_id, round_id, local_date, start_minute, end_minute, starts_at, ends_at, sort_order, label, status, revision")
                .in("schedule_id", scheduleIds)
                .order("sort_order"),
            this.client
                .from("schedule_responses")
                .select("id, schedule_id, participant_id, slot_id, answer, note, candidate_revision, updated_at")
                .in("schedule_id", scheduleIds),
            this.client
                .from("schedule_confirmed_slots")
                .select("id, schedule_id, slot_id, sequence, status, local_date, start_minute, end_minute, starts_at, ends_at")
                .in("schedule_id", scheduleIds)
                .order("sequence"),
            this.client
                .from("schedule_sessions")
                .select("id, schedule_id, round_id, candidate_id, sequence, status, local_date, start_minute, end_minute, starts_at, ends_at, memo")
                .in("schedule_id", scheduleIds)
                .order("sequence")
        ]);

        [participantsResult, roundsResult, slotsResult, responsesResult, confirmedResult, sessionsResult]
            .forEach(result => assertOk(result.error));

        return {
            schedules: schedules ?? [],
            participants: participantsResult.data ?? [],
            rounds: roundsResult.data ?? [],
            slots: slotsResult.data ?? [],
            responses: responsesResult.data ?? [],
            confirmedSlots: confirmedResult.data ?? [],
            sessions: sessionsResult.data ?? []
        };
    }

    async addTrpgV2Candidate({
        scheduleId,
        startsAt,
        endsAt,
        label = ""
    }){
        const { data, error } = await this.client.rpc("trpg_v2_add_candidate", {
            p_schedule_id: scheduleId,
            p_starts_at: startsAt,
            p_ends_at: endsAt,
            p_label: label
        });

        assertOk(error);
        return data;
    }

    async addTrpgV2Candidates({
        scheduleId,
        candidates
    }){
        const { data, error } = await this.client.rpc("trpg_v2_add_candidates", {
            p_schedule_id: scheduleId,
            p_candidates: candidates
        });

        assertOk(error);
        return data;
    }

    async addTrpgV6Candidates({ scheduleId, roundId, candidates }){
        const { data, error } = await this.client.rpc("trpg_v6_add_candidates", {
            p_schedule_id: scheduleId,
            p_round_id: roundId,
            p_candidates: candidates
        });

        assertOk(error);
        return data;
    }

    async createTrpgV6Round({ scheduleId, title = "", purpose = "", targetMinutes = null, open = true }){
        const { data, error } = await this.client.rpc("trpg_v6_create_round", {
            p_schedule_id: scheduleId,
            p_title: title,
            p_purpose: purpose,
            p_target_minutes: targetMinutes,
            p_open: open
        });

        assertOk(error);
        return data;
    }

    async updateTrpgV5Candidate({
        scheduleId,
        slotId,
        startsAt,
        endsAt,
        label = ""
    }){
        const { data, error } = await this.client.rpc("trpg_v5_update_candidate", {
            p_schedule_id: scheduleId,
            p_slot_id: slotId,
            p_starts_at: startsAt,
            p_ends_at: endsAt,
            p_label: label
        });

        assertOk(error);
        return data;
    }

    async updateTrpgV5CandidateTimes({ scheduleId, slotIds, startMinute, endMinute }){
        const { data, error } = await this.client.rpc("trpg_v5_bulk_update_candidate_times", {
            p_schedule_id: scheduleId,
            p_slot_ids: slotIds,
            p_start_minute: startMinute,
            p_end_minute: endMinute
        });

        assertOk(error);
        return data;
    }

    async retireTrpgV5Candidate({ scheduleId, slotId }){
        const { data, error } = await this.client.rpc("trpg_v5_retire_candidate", {
            p_schedule_id: scheduleId,
            p_slot_id: slotId
        });

        assertOk(error);
        return data;
    }

    async restoreTrpgV5Candidate({ scheduleId, slotId }){
        const { data, error } = await this.client.rpc("trpg_v5_restore_candidate", {
            p_schedule_id: scheduleId,
            p_slot_id: slotId
        });

        assertOk(error);
        return data;
    }

    async updateTrpgV2SessionDisplayName({
        scheduleId,
        displayName
    }){
        const { data, error } = await this.client.rpc("trpg_v2_update_session_display_name", {
            p_schedule_id: scheduleId,
            p_display_name: displayName
        });

        assertOk(error);
        return data;
    }

    async updateTrpgV4AccountDisplayName(displayName){
        const { data, error } = await this.client.rpc("trpg_v4_update_account_display_name", {
            p_display_name: displayName
        });

        assertOk(error);
        return data;
    }

    async loadTrpgV31PersonalAvailability(){
        const { data, error } = await this.client.rpc("trpg_v31_get_personal_availability");

        assertOk(error);
        return data;
    }

    async saveTrpgV31PersonalAvailability({
        weekly,
        exceptions
    }){
        const { data, error } = await this.client.rpc("trpg_v31_save_personal_availability", {
            p_weekly: weekly,
            p_exceptions: exceptions
        });

        assertOk(error);
        return data;
    }

    async transferTrpgV2Kp(scheduleId, newOwnerUserId){
        const { data, error } = await this.client.rpc("trpg_v2_transfer_kp", {
            p_schedule_id: scheduleId,
            p_new_owner_user_id: newOwnerUserId
        });

        assertOk(error);
        return data;
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

    async loadAccountView(shareId){
        const { data, error } = await this.client.rpc("schedule_account_view", {
            p_share_id: shareId
        });

        assertOk(error);
        return data;
    }

    async joinAccount(shareId, displayName){
        const { data, error } = await this.client.rpc("schedule_account_join", {
            p_share_id: shareId,
            p_display_name: displayName
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

    async upsertAccountResponse({
        shareId,
        slotId,
        answer,
        note = "",
        ranges = []
    }){
        const { data, error } = await this.client.rpc("schedule_account_upsert_response", {
            p_share_id: shareId,
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

    async confirmTrpgV32Recommendation({
        scheduleId,
        slotId,
        startMinute,
        endMinute,
        snapshotAt
    }){
        const { data, error } = await this.client.rpc("trpg_v32_confirm_recommendation", {
            p_schedule_id: scheduleId,
            p_slot_id: slotId,
            p_start_minute: startMinute,
            p_end_minute: endMinute,
            p_snapshot_at: snapshotAt
        });

        assertOk(error);
        return data;
    }

    async confirmTrpgV4RecommendationPlan({
        scheduleId,
        items,
        snapshotAt
    }){
        const { data, error } = await this.client.rpc("trpg_v4_confirm_recommendation_plan", {
            p_schedule_id: scheduleId,
            p_items: items,
            p_snapshot_at: snapshotAt
        });

        assertOk(error);
        return data;
    }

    async confirmTrpgV6RecommendationPlan({ scheduleId, roundId, items, snapshotAt }){
        const { data, error } = await this.client.rpc("trpg_v6_confirm_recommendation_plan", {
            p_schedule_id: scheduleId,
            p_round_id: roundId,
            p_items: items,
            p_snapshot_at: snapshotAt
        });

        assertOk(error);
        return data;
    }

    async updateTrpgV6SessionStatus({ scheduleId, sessionId, status, memo = "" }){
        const { data, error } = await this.client.rpc("trpg_v6_update_session_status", {
            p_schedule_id: scheduleId,
            p_session_id: sessionId,
            p_status: status,
            p_memo: memo
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
        const [scheduleResult, roundsResult, slotsResult, participantsResult, responsesResult, confirmedResult, sessionsResult] = await Promise.all([
            this.client.from("schedules").select("*").eq("id", scheduleId).single(),
            this.client.from("schedule_rounds").select("*").eq("schedule_id", scheduleId).order("sequence"),
            this.client.from("schedule_slots").select("*").eq("schedule_id", scheduleId).order("sort_order"),
            this.client.from("schedule_participants").select("*").eq("schedule_id", scheduleId).order("sort_order"),
            this.client.from("schedule_responses").select("*, schedule_response_ranges(*)").eq("schedule_id", scheduleId),
            this.client.from("schedule_confirmed_slots").select("*").eq("schedule_id", scheduleId).order("sequence"),
            this.client.from("schedule_sessions").select("*").eq("schedule_id", scheduleId).order("sequence")
        ]);

        [scheduleResult, roundsResult, slotsResult, participantsResult, responsesResult, confirmedResult, sessionsResult]
            .forEach(result => assertOk(result.error));

        return {
            schedule: scheduleResult.data,
            rounds: roundsResult.data ?? [],
            slots: slotsResult.data ?? [],
            participants: participantsResult.data ?? [],
            responses: responsesResult.data ?? [],
            confirmedSlots: confirmedResult.data ?? [],
            sessions: sessionsResult.data ?? []
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

function createEmptyDashboardBundle(){
    return {
        schedules: [],
        participants: [],
        rounds: [],
        slots: [],
        responses: [],
        confirmedSlots: [],
        sessions: []
    };
}

function isAuthSessionMissing(error){
    if(!error){
        return false;
    }

    return error.name === "AuthSessionMissingError" ||
        error.message === "Auth session missing!" ||
        error.message === "Auth session missing";
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
