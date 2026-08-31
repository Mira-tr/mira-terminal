import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
    classifyDiscordDelivery,
    expectedDiscordApplicationId,
    groupDeliveries,
    renderNotification
} from "../supabase/functions/discord-notification-dispatch/notificationCore.js";
import {
    DISCORD_INTERACTION_TYPE,
    SETTINGS_COMMAND_NAME,
    createInteractionResponse
} from "../supabase/functions/discord-next-session/botCore.js";

const SCHEDULE_ID = "11111111-1111-4111-8111-111111111111";
const ROUND_ID = "22222222-2222-4222-8222-222222222222";
const SLOT_ID = "33333333-3333-4333-833333333333";

test("V11 defaults and environment identities stay explicit", async () => {
    const migration = await read("supabase/migrations/20260831024929_trpg_v11_discord_notifications.sql");
    assert.match(migration, /session_confirmed boolean not null default true/);
    assert.match(migration, /response_stale boolean not null default true/);
    assert.match(migration, /session_same_day boolean not null default false/);
    assert.match(migration, /schedule_notification_deliveries/);
    assert.match(migration, /unique/);
    assert.match(migration, /trpg_v11_enqueue_scheduled_notifications/);
    assert.match(migration, /cron\.schedule\('relmua-v11-discord-notifications'/);
    assert.match(migration, /enable row level security/);
    assert.equal(expectedDiscordApplicationId("production").slice(-4), "6614");
    assert.equal(expectedDiscordApplicationId("staging").slice(-4), "6702");
    assert.equal(expectedDiscordApplicationId("other"), undefined);
});

test("session confirmation is one compact multi-session DM without reserve data", () => {
    const message = renderNotification([delivery({
        type: "session_confirmed",
        sessions: [
            session("2026-09-12T12:00:00Z", "2026-09-12T16:00:00Z"),
            session("2026-09-19T12:00:00Z", "2026-09-19T16:00:00Z")
        ]
    })]);
    assert.match(message.content, /日程が決まりました/);
    assert.match(message.content, /DM監査卓/);
    assert.equal(message.components[0].components[0].custom_id, "v10:upcoming");
    assert.equal(message.components[0].components[1].custom_id, `v11:table:${SCHEDULE_ID}`);
    assert.doesNotMatch(message.content, /予備/);
});

test("stale deliveries are grouped and enter the existing response flow", () => {
    const grouped = groupDeliveries([
        delivery({ type: "response_stale", slotId: SLOT_ID }),
        delivery({ type: "response_stale", slotId: "44444444-4444-4444-8444-444444444444" })
    ]);
    assert.equal(grouped.length, 1);
    const message = renderNotification(grouped[0]);
    assert.match(message.content, /2件の候補が変更/);
    assert.equal(message.components[0].components[0].custom_id, `v11:stale:${SCHEDULE_ID}:${SLOT_ID}`);
});

test("round, reminder, and session reminders expose one clear next action", () => {
    assert.equal(renderNotification([delivery({ type: "round_opened", candidateCount: 6 })]).components[0].components[0].custom_id, `v11:answer:${SCHEDULE_ID}`);
    assert.equal(renderNotification([delivery({ type: "response_reminder", outstandingCount: 3 })]).components[0].components[0].label, "回答する");
    assert.match(renderNotification([delivery({ type: "session_day_before", sessions: [session()] })]).content, /明日は/);
    assert.match(renderNotification([delivery({ type: "session_same_day", sessions: [session()] })]).content, /今日は/);
});

test("Discord delivery classification retries transient failures and honors 429", () => {
    assert.deepEqual(classifyDiscordDelivery(200, {}, 1), { outcome: "sent", retryAfterSeconds: null, errorCode: null });
    assert.deepEqual(classifyDiscordDelivery(403, {}, 1), { outcome: "failed", retryAfterSeconds: null, errorCode: "discord_delivery_unavailable" });
    assert.deepEqual(classifyDiscordDelivery(503, {}, 2), { outcome: "retry", retryAfterSeconds: 120, errorCode: "discord_transient_error" });
    assert.deepEqual(classifyDiscordDelivery(429, { retry_after: 17.2 }, 1), { outcome: "retry", retryAfterSeconds: 18, errorCode: "discord_rate_limited" });
});

test("settings command stays account-bound and updates its existing message", async () => {
    const seen = [];
    const response = await createInteractionResponse(command(SETTINGS_COMMAND_NAME), settingsHandlers(seen));
    assert.match(response.body.data.content, /Discord通知/);
    assert.match(response.body.data.content, /当日リマインド  OFF/);
    assert.equal(response.body.data.components[0].components[0].custom_id, "v11:settings");

    const updated = await createInteractionResponse(component("v11:settings", ["sessionSameDay:on"]), settingsHandlers(seen));
    assert.equal(updated.body.type, 7);
    assert.deepEqual(seen, [{ key: "sessionSameDay", enabled: true }]);
    assert.match(updated.body.data.content, /当日リマインド  ON/);
});

test("notification dispatcher remains server-only and fail-closed", async () => {
    const source = await read("supabase/functions/discord-notification-dispatch/index.ts");
    assert.match(source, /RELMUA_NOTIFICATION_DISPATCH_KEY/);
    assert.match(source, /DISCORD_BOT_TOKEN/);
    assert.match(source, /tokenMatchesApplication/);
    assert.match(source, /trpg_v11_take_notification_deliveries/);
    assert.match(source, /trpg_v11_finish_notification_deliveries/);
    assert.doesNotMatch(source, /share_id|guest_token|schedule_guest_credentials/i);
    const config = await read("supabase/config.toml");
    assert.match(config, /\[functions\.discord-notification-dispatch\]\s+verify_jwt = false/);
    const commands = await read("scripts/register-discord-dm-scheduler-commands.mjs");
    assert.match(commands, /name: "設定"/);
    assert.match(commands, /Registered \$\{commands\.length\}/);
});

function command(name){
    return { type: DISCORD_INTERACTION_TYPE.applicationCommand, data: { name }, user: { id: "discord-user" } };
}

function component(customId, values){
    return { type: DISCORD_INTERACTION_TYPE.messageComponent, data: { custom_id: customId, values }, user: { id: "discord-user" } };
}

function settingsHandlers(seen){
    const current = {
        sessionConfirmed: true,
        responseStale: true,
        roundOpened: true,
        responseReminder: true,
        sessionDayBefore: true,
        sessionSameDay: false
    };
    return {
        async getNotificationPreferences(){ return current; },
        async setNotificationPreference(_id, key, enabled){ seen.push({ key, enabled }); return { ...current, [key]: enabled }; }
    };
}

function delivery(overrides = {}){
    return {
        id: "55555555-5555-4555-8555-555555555555",
        profileId: "66666666-6666-4666-8666-666666666666",
        type: "session_confirmed",
        scheduleId: SCHEDULE_ID,
        roundId: ROUND_ID,
        sessionId: null,
        slotId: SLOT_ID,
        attempts: 1,
        scheduleTitle: "DM監査卓",
        candidateCount: 0,
        outstandingCount: 0,
        sessions: [],
        ...overrides
    };
}

function session(startsAt = "2026-09-12T12:00:00Z", endsAt = "2026-09-12T16:00:00Z"){
    return { startsAt, endsAt };
}

async function read(path){
    return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}
