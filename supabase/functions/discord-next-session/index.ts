import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import nacl from "https://esm.sh/tweetnacl@1.0.3";
import {
    createInteractionResponse,
    selectNearestFutureSession,
    verifyDiscordRequestSignature
} from "./botCore.js";

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

    const response = await createInteractionResponse(interaction, {
        findNextSessionForDiscordUser
    });

    return json(response.body, response.status);
});

async function findNextSessionForDiscordUser(discordUserId: string, now = new Date()){
    const client = createSupabaseAdminClient();
    const { data: profile, error: profileError } = await client
        .from("profiles")
        .select("id")
        .eq("discord_user_id", discordUserId)
        .maybeSingle();

    if(profileError){
        throw profileError;
    }

    if(!profile?.id){
        return null;
    }

    const { data: participants, error: participantError } = await client
        .from("schedule_participants")
        .select("schedule_id, role")
        .eq("user_id", profile.id);

    if(participantError){
        throw participantError;
    }

    const scheduleIds = [...new Set((participants ?? []).map(item => item.schedule_id).filter(Boolean))];
    if(scheduleIds.length === 0){
        return null;
    }

    const { data: confirmedSlots, error: confirmedError } = await client
        .from("schedule_confirmed_slots")
        .select("schedule_id, status, starts_at, ends_at")
        .in("schedule_id", scheduleIds)
        .eq("status", "confirmed")
        .gte("starts_at", now.toISOString())
        .order("starts_at", { ascending: true })
        .limit(20);

    if(confirmedError){
        throw confirmedError;
    }

    const confirmedScheduleIds = [...new Set((confirmedSlots ?? []).map(item => item.schedule_id).filter(Boolean))];
    if(confirmedScheduleIds.length === 0){
        return null;
    }

    const { data: schedules, error: scheduleError } = await client
        .from("schedules")
        .select("id, title, owner_id")
        .in("id", confirmedScheduleIds);

    if(scheduleError){
        throw scheduleError;
    }

    const scheduleMap = new Map((schedules ?? []).map(schedule => [schedule.id, schedule]));
    const participantMap = new Map((participants ?? []).map(participant => [participant.schedule_id, participant]));
    const candidates = (confirmedSlots ?? []).map(slot => {
        const schedule = scheduleMap.get(slot.schedule_id);
        const participant = participantMap.get(slot.schedule_id);

        if(!schedule || !participant){
            return null;
        }

        return {
            title: schedule.title,
            role: schedule.owner_id === profile.id || participant.role === "owner" ? "KP" : "PL",
            status: slot.status,
            startsAt: slot.starts_at,
            endsAt: slot.ends_at
        };
    }).filter(Boolean);

    return selectNearestFutureSession(candidates, now);
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
