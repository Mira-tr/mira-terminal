import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { renderNotification } from "../supabase/functions/discord-notification-dispatch/notificationCore.js";
import {
    DISCORD_INTERACTION_TYPE,
    SETTINGS_COMMAND_NAME,
    createInteractionResponse
} from "../supabase/functions/discord-next-session/botCore.js";

const SCHEDULE_ID = "11111111-1111-4111-8111-111111111111";

test("V13 adds an ON-by-default preparation preference without creating a new dispatcher", async () => {
    const migration = await read("supabase/migrations/20260831161117_trpg_v13_preparation_notifications.sql");

    assert.match(migration, /preparation_reminder boolean not null default true/);
    assert.match(migration, /'preparation_reminder'/);
    assert.match(migration, /session_day_before:%s:%s/);
    assert.match(migration, /case when coalesce\(preference\.session_day_before, true\) then 'session_day_before' else 'preparation_reminder' end/);
    assert.match(migration, /trpg_v13_pending_preparation_for_session/);
    assert.match(migration, /preparation_completed/);
    assert.doesNotMatch(migration, /drop table|drop column|truncate|delete from/i);
});

test("a day-before delivery folds assigned pending preparation into one focused DM", () => {
    const message = renderNotification([delivery({
        type: "session_day_before",
        preparationCount: 5,
        preparationItems: [{ title: "HO確認" }, { title: "立ち絵提出" }, { title: "キャラシ確認" }]
    })]);

    assert.match(message.content, /明日は「DM監査卓」です/);
    assert.match(message.content, /残り 5件/);
    assert.match(message.content, /ほか2件/);
    assert.equal(message.components[0].components[0].custom_id, `v12:prep:${SCHEDULE_ID}`);
    assert.equal(message.components[0].components[1].custom_id, `v11:table:${SCHEDULE_ID}`);
});

test("a preparation-only reminder keeps its table context and never exposes internal identifiers", () => {
    const message = renderNotification([delivery({
        type: "preparation_reminder",
        preparationCount: 1,
        preparationItems: [{ title: "立ち絵提出" }]
    })]);

    assert.match(message.content, /残り 1件/);
    assert.equal(message.components[0].components[0].label, "準備を見る");
    assert.doesNotMatch(message.content, /11111111|profileId|discordUserId/i);
});

test("a normal day-before delivery remains unchanged when no assigned work is pending", () => {
    const message = renderNotification([delivery({ type: "session_day_before" })]);

    assert.equal(message.components[0].components[0].label, "卓を見る");
    assert.equal(message.components[0].components[1].label, "次の卓を見る");
    assert.doesNotMatch(message.content, /あなたの準備/);
});

test("notification settings expose and persist the preparation reminder preference", async () => {
    const current = {
        sessionConfirmed: true,
        responseStale: true,
        roundOpened: true,
        responseReminder: true,
        sessionDayBefore: true,
        sessionSameDay: false,
        preparationReminder: true
    };
    const changes = [];
    const handlers = {
        async getNotificationPreferences(){ return current; },
        async setNotificationPreference(_discordUserId, key, enabled){
            changes.push({ key, enabled });
            return { ...current, [key]: enabled };
        }
    };

    const settings = await createInteractionResponse(command(SETTINGS_COMMAND_NAME), handlers);
    assert.match(settings.body.data.content, /準備リマインド  ON/);
    const updated = await createInteractionResponse(component("v11:settings", ["preparationReminder:off"]), handlers);
    assert.deepEqual(changes, [{ key: "preparationReminder", enabled: false }]);
    assert.match(updated.body.data.content, /準備リマインド  OFF/);
});

function delivery(overrides = {}){
    return {
        type: "session_day_before",
        scheduleId: SCHEDULE_ID,
        scheduleTitle: "DM監査卓",
        sessions: [{ startsAt: "2026-09-12T12:00:00Z", endsAt: "2026-09-12T16:00:00Z" }],
        preparationCount: 0,
        preparationItems: [],
        ...overrides
    };
}

function command(name){
    return { type: DISCORD_INTERACTION_TYPE.applicationCommand, data: { name }, user: { id: "discord-user" } };
}

function component(customId, values){
    return { type: DISCORD_INTERACTION_TYPE.messageComponent, data: { custom_id: customId, values }, user: { id: "discord-user" } };
}

async function read(path){
    return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}
