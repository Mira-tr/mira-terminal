import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import {
    classifyDiscordDelivery,
    expectedDiscordApplicationId,
    groupDeliveries,
    renderNotification
} from "./notificationCore.js";

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };

Deno.serve(async request => {
    if(request.method !== "POST" || !sameSecret(
        request.headers.get("x-relmua-notification-dispatch-key") ?? "",
        Deno.env.get("RELMUA_NOTIFICATION_DISPATCH_KEY") ?? ""
    )){
        return json({ error: "invalid request" }, 401);
    }

    const botToken = Deno.env.get("DISCORD_BOT_TOKEN") ?? "";
    const environment = Deno.env.get("RELMUA_DISCORD_ENVIRONMENT") ?? "";
    const expectedApplicationId = expectedDiscordApplicationId(environment);
    if(!botToken || !expectedApplicationId || !await tokenMatchesApplication(botToken, expectedApplicationId)){
        return json({ error: "notification delivery unavailable" }, 503);
    }

    const supabase = adminClient();
    const { data, error } = await supabase.rpc("trpg_v11_take_notification_deliveries", { p_limit: 20 });
    if(error) return json({ error: "notification queue unavailable" }, 503);

    const groups = groupDeliveries(data);
    let sent = 0;
    let retried = 0;
    let failed = 0;
    for(const deliveries of groups){
        const result = await sendGroup(botToken, deliveries);
        const ids = deliveries.map(item => item.id);
        const completion = await supabase.rpc("trpg_v11_finish_notification_deliveries", {
            p_delivery_ids: ids,
            p_outcome: result.outcome,
            p_retry_after_seconds: result.retryAfterSeconds,
            p_error_code: result.errorCode
        });
        if(completion.error) return json({ error: "notification completion unavailable" }, 503);
        if(result.outcome === "sent") sent += ids.length;
        if(result.outcome === "retry") retried += ids.length;
        if(result.outcome === "failed") failed += ids.length;
    }
    return json({ claimed: data.length, sent, retried, failed });
});

async function sendGroup(botToken: string, deliveries: any[]){
    const first = deliveries[0] ?? {};
    const recipientId = String(first.discordUserId ?? "").trim();
    if(!recipientId) return { outcome: "failed", retryAfterSeconds: null, errorCode: "discord_recipient_unavailable" };

    const channelResponse = await discordFetch(botToken, "https://discord.com/api/v10/users/@me/channels", {
        method: "POST",
        body: JSON.stringify({ recipient_id: recipientId })
    });
    if(!channelResponse.ok){
        return classifyDiscordDelivery(channelResponse.status, await safeJson(channelResponse), first.attempts);
    }
    const channel = await safeJson(channelResponse);
    const channelId = String(channel?.id ?? "").trim();
    if(!channelId) return { outcome: "retry", retryAfterSeconds: 300, errorCode: "discord_channel_unavailable" };

    const messageResponse = await discordFetch(botToken, `https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: "POST",
        body: JSON.stringify(renderNotification(deliveries))
    });
    return classifyDiscordDelivery(messageResponse.status, await safeJson(messageResponse), first.attempts);
}

async function tokenMatchesApplication(botToken: string, expectedApplicationId: string){
    const response = await discordFetch(botToken, "https://discord.com/api/v10/oauth2/applications/@me");
    if(!response.ok) return false;
    const payload = await safeJson(response);
    return sameSecret(String(payload?.application?.id ?? payload?.id ?? ""), expectedApplicationId);
}

function discordFetch(botToken: string, url: string, init: RequestInit = {}){
    return fetch(url, {
        ...init,
        headers: {
            authorization: `Bot ${botToken}`,
            "content-type": "application/json",
            ...(init.headers ?? {})
        }
    });
}

function adminClient(){
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if(!url || !key) throw new Error("Supabase function secrets are not configured.");
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function safeJson(response: Response){
    try{ return await response.json(); }catch{ return {}; }
}

function sameSecret(left: string, right: string){
    if(!left || !right || left.length !== right.length) return false;
    let mismatch = 0;
    for(let index = 0; index < left.length; index += 1){ mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index); }
    return mismatch === 0;
}

function json(payload: unknown, status = 200){
    return new Response(JSON.stringify(payload), { status, headers: jsonHeaders });
}
