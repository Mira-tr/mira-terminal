import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import nacl from "https://esm.sh/tweetnacl@1.0.3";
import {
    createInteractionResponse,
    selectNearestFutureSession,
    verifyDiscordRequestSignature
} from "./botCore.js";
import { evaluateAvailabilityForSlot } from "../../../apps/web/creators/chikage/trpg/v2/js/availabilityModel.js";
import { recommendMultiDayPlan } from "../../../apps/web/creators/chikage/trpg/v2/js/recommendationEngine.js";

const jsonHeaders = {
    "content-type": "application/json; charset=utf-8"
};

Deno.serve(async request => {
    if(request.method !== "POST"){
        return json({ error: "method not allowed" }, 405);
    }

    const body = await request.text();
    const publicKey = Deno.env.get("DISCORD_PUBLIC_KEY") ?? "";
    const signature = request.headers.get("x-signature-ed25519") ?? "";
    const timestamp = request.headers.get("x-signature-timestamp") ?? "";
    const signatureOk = verifyDiscordRequestSignature({
        body,
        timestamp,
        signature,
        publicKey,
        verifyDetached: nacl.sign.detached.verify
    });

    if(!signatureOk){
        return json({ error: "invalid request" }, 401);
    }

    let interaction: unknown;
    try{
        interaction = JSON.parse(body);
    }catch{
        return json({ error: "bad request" }, 400);
    }

    const response = await createInteractionResponse(interaction, createHandlers());
    return json(response.body, response.status);
});

function createHandlers(){
    const getContext = (discordUserId: string, scheduleId: string) => scheduleContext(discordUserId, scheduleId);
    const saveResponse = async (discordUserId: string, input: ResponseInput) => {
        await call("trpg_v10_bot_upsert_response", {
            p_discord_user_id: discordUserId,
            p_schedule_id: input.scheduleId,
            p_slot_id: input.slotId,
            p_answer: input.answer,
            p_note: String(input.note ?? "").slice(0, 120),
            p_ranges: Array.isArray(input.ranges) ? input.ranges : []
        });
        return getContext(discordUserId, input.scheduleId);
    };

    return {
        async findNextSessionForDiscordUser(discordUserId: string, now = new Date()){
            const payload = await upcomingSessions(discordUserId, 5);
            return selectNearestFutureSession(payload.sessions, now);
        },
        async findUpcomingSessionsForDiscordUser(discordUserId: string, limit = 5){
            return upcomingSessions(discordUserId, limit);
        },
        async getNotificationPreferences(discordUserId: string){
            return call("trpg_v11_bot_notification_preferences", { p_discord_user_id: discordUserId });
        },
        async setNotificationPreference(discordUserId: string, key: string, enabled: boolean){
            return call("trpg_v11_bot_set_notification_preference", {
                p_discord_user_id: discordUserId,
                p_key: key,
                p_enabled: enabled
            });
        },
        async listSchedulesForDiscordUser(discordUserId: string, offset = 0){
            return call("trpg_v10_bot_list_schedules", {
                p_discord_user_id: discordUserId,
                p_limit: 25,
                p_offset: offset
            });
        },
        async getScheduleContext(discordUserId: string, scheduleId: string){
            return getContext(discordUserId, scheduleId);
        },
        async saveResponse(discordUserId: string, input: ResponseInput){
            return saveResponse(discordUserId, input);
        },
        async saveMemo(discordUserId: string, input: MemoInput){
            const context = await getContext(discordUserId, input.scheduleId);
            const response = ownResponse(context, input.slotId);
            if(!response || response.stale){
                throw new Error("response is not current");
            }
            return saveResponse(discordUserId, {
                ...input,
                answer: response.answer,
                ranges: response.ranges ?? []
            });
        },
        async getAvailabilityDraft(discordUserId: string, scheduleId: string){
            const context = await getContext(discordUserId, scheduleId);
            const availability = await call("trpg_v10_bot_personal_availability", {
                p_discord_user_id: discordUserId
            });
            const confirmedSlots = await call("trpg_v10_bot_confirmed_slots", {
                p_discord_user_id: discordUserId
            });
            return {
                context,
                suggestions: draftResponses(context, availability, confirmedSlots.confirmedSlots)
            };
        },
        async applyAvailabilityDraft(discordUserId: string, scheduleId: string){
            const context = await getContext(discordUserId, scheduleId);
            const availability = await call("trpg_v10_bot_personal_availability", {
                p_discord_user_id: discordUserId
            });
            const confirmedSlots = await call("trpg_v10_bot_confirmed_slots", {
                p_discord_user_id: discordUserId
            });
            const suggestions = draftResponses(context, availability, confirmedSlots.confirmedSlots);
            for(const suggestion of suggestions){
                await call("trpg_v10_bot_upsert_response", {
                    p_discord_user_id: discordUserId,
                    p_schedule_id: scheduleId,
                    p_slot_id: suggestion.slot.id,
                    p_answer: suggestion.answer,
                    p_note: "",
                    p_ranges: suggestion.ranges
                });
            }
            return getContext(discordUserId, scheduleId);
        },
        async getRecommendation(discordUserId: string, scheduleId: string){
            const context = await getContext(discordUserId, scheduleId);
            if(!context?.bot?.isOwner){
                throw new Error("owner access denied");
            }
            return {
                context,
                plan: recommendationForContext(context)
            };
        },
        async confirmRecommendation(discordUserId: string, scheduleId: string, roundId: string){
            const context = await getContext(discordUserId, scheduleId);
            if(!context?.bot?.isOwner || String(openRound(context)?.id) !== String(roundId)){
                throw new Error("owner access denied");
            }
            const plan = recommendationForContext(context);
            if(!plan.meetsPreferred || !plan.primary.length){
                throw new Error("recommendation is stale");
            }
            await call("trpg_v10_bot_confirm_recommendation", {
                p_discord_user_id: discordUserId,
                p_schedule_id: scheduleId,
                p_round_id: roundId,
                p_items: plan.primary.map(item => ({
                    slotId: item.item.slot.id,
                    startMinute: item.startMinute,
                    endMinute: item.endMinute
                })),
                p_snapshot_at: new Date().toISOString()
            });
            return getContext(discordUserId, scheduleId);
        }
    };
}

async function scheduleContext(discordUserId: string, scheduleId: string){
    return call("trpg_v10_bot_schedule_context", {
        p_discord_user_id: discordUserId,
        p_schedule_id: scheduleId
    });
}

async function upcomingSessions(discordUserId: string, limit: number){
    return call("trpg_v10_bot_upcoming_sessions", {
        p_discord_user_id: discordUserId,
        p_limit: Math.max(1, Math.min(10, Number(limit) || 5))
    });
}

async function call(functionName: string, parameters: Record<string, unknown>){
    const { data, error } = await createSupabaseAdminClient().rpc(functionName, parameters);
    if(error){
        throw new Error(error.message || "Scheduler operation failed");
    }
    return data;
}

function draftResponses(context: ScheduleContext, availability: unknown, confirmedSlots: unknown){
    return array(context?.slots)
        .filter(slot => {
            const response = ownResponse(context, slot.id);
            return !response || response.stale;
        })
        .map(slot => ({
            slot,
            ...evaluateAvailabilityForSlot({
                availability,
                slot,
                confirmedSlots: array(confirmedSlots),
                scheduleId: context?.schedule?.id ?? ""
            })
        }))
        .filter(item => ["yes", "maybe", "no"].includes(item.answer));
}

function recommendationForContext(context: ScheduleContext){
    const round = openRound(context);
    return recommendMultiDayPlan({
        slots: array(context?.slots),
        participants: array(context?.participants),
        responses: array(context?.bot?.allResponses),
        preferredMinutes: Number(round?.targetMinutes ?? context?.schedule?.totalMinutes ?? context?.schedule?.sessionMinutes ?? 0),
        reserveCount: 2
    });
}

function ownResponse(context: ScheduleContext, slotId: string){
    return array(context?.responses).find(item => String(item?.slotId) === String(slotId));
}

function openRound(context: ScheduleContext){
    return array(context?.rounds).find(item => ["draft", "open"].includes(String(item?.status))) ?? null;
}

function createSupabaseAdminClient(){
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if(!supabaseUrl || !serviceRoleKey){
        throw new Error("Supabase function secrets are not configured.");
    }
    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });
}

function json(payload: unknown, status = 200){
    return new Response(JSON.stringify(payload), {
        status,
        headers: jsonHeaders
    });
}

function array(value: unknown): any[]{
    return Array.isArray(value) ? value : [];
}

type Range = {
    startMinute: number;
    endMinute: number;
    answer?: string;
};

type ResponseInput = {
    scheduleId: string;
    slotId: string;
    answer: string;
    note?: string;
    ranges?: Range[];
};

type MemoInput = {
    scheduleId: string;
    slotId: string;
    note?: string;
};

type ScheduleContext = any;
