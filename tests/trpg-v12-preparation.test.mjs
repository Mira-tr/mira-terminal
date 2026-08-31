import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
    movePreparationItem,
    summarizePreparation
} from "../apps/web/creators/chikage/trpg/v2/js/preparationModel.js";
import {
    createDashboardViewModel,
    createScheduleBundleViewModel
} from "../apps/web/creators/chikage/trpg/v2/js/sessionViewModel.js";
import {
    createInteractionResponse,
    DISCORD_INTERACTION_TYPE
} from "../supabase/functions/discord-next-session/botCore.js";

const SCHEDULE_ID = "11111111-1111-4111-8111-111111111111";
const ROUND_ID = "22222222-2222-4222-8222-222222222222";
const SESSION_ID = "33333333-3333-4333-833333333333";
const ITEM_ID = "44444444-4444-4444-8444-444444444444";
const OTHER_ITEM_ID = "55555555-5555-4555-8555-555555555555";

test("Preparation migration is additive and owns server-side authorization", async () => {
    const sql = await read("supabase/migrations/20260831150000_trpg_v12_preparation.sql");
    [
        "create table public.schedule_preparation_items",
        "trpg_v12_preparation_context",
        "trpg_v12_create_preparation_item",
        "trpg_v12_update_preparation_item",
        "trpg_v12_set_preparation_status",
        "trpg_v12_archive_preparation_item",
        "trpg_v12_reorder_preparation_items",
        "trpg_v12_bot_schedule_context",
        "trpg_v12_bot_set_preparation_status",
        "schedule_preparation_items_member_select"
    ].forEach(value => assert.match(sql, new RegExp(value.replaceAll(".", "\\."), "i")));
    assert.match(sql, /assignee.user_id is null or assignee.role not in \('owner', 'participant'\)/);
    assert.match(sql, /target_schedule\.owner_id <> actor_id and saved_item\.assignee_participant_id is distinct from actor_participant_id/);
    assert.match(sql, /revoke all on table public\.schedule_preparation_items from anon, authenticated/);
    assert.doesNotMatch(sql, /drop table|drop column|truncate|delete from public\.(?!schedule_preparation_items)/i);
});

test("web Preparation stays compact and reaches the same Dashboard source of truth", async () => {
    const [app, repository, css] = await Promise.all([
        read("apps/web/creators/chikage/trpg/v2/js/app.js"),
        read("apps/web/creators/chikage/trpg/scheduler/js/supabaseRepository.js"),
        read("apps/web/creators/chikage/trpg/v2/css/trpg-v2-home.css")
    ]);
    assert.match(app, /function preparationBlock/);
    assert.match(app, /function preparingBlock/);
    assert.match(app, /function savePreparationItem/);
    assert.match(app, /function setPreparationStatus/);
    assert.match(app, /function reorderPreparation/);
    assert.match(repository, /trpg_v12_preparation_context/);
    assert.match(repository, /trpg_v12_create_preparation_item/);
    assert.match(repository, /trpg_v12_reorder_preparation_items/);
    assert.match(css, /\.v2-preparation-summary/);
    assert.match(css, /\.v2-preparation-list/);
    assert.match(css, /min-height: 44px/);
});

test("Preparation progress keeps table, assignee, and completed states distinct", () => {
    const summary = summarizePreparation(items(), "participant-me");
    assert.equal(summary.total, 2);
    assert.equal(summary.done, 1);
    assert.equal(summary.pending, 1);
    assert.equal(summary.ownPendingCount, 1);
    assert.equal(summary.ownPending[0].id, ITEM_ID);

    const detail = createScheduleBundleViewModel({
        schedule: { id: SCHEDULE_ID, owner_id: "account-me", title: "準備監査卓" },
        me: { participantId: "participant-me", role: "participant" },
        participants: [{ id: "participant-me", user_id: "account-me", role: "participant" }],
        rounds: [{ id: ROUND_ID, schedule_id: SCHEDULE_ID, sequence: 2, status: "open" }],
        sessions: [{ id: SESSION_ID, schedule_id: SCHEDULE_ID, round_id: ROUND_ID, sequence: 3, status: "scheduled" }],
        preparation: { items: items() }
    }, "account-me");
    assert.equal(detail.preparation.ownPendingCount, 1);
    assert.equal(detail.preparationItems[0].round_id, ROUND_ID);
    assert.equal(detail.preparationItems[0].session_id, SESSION_ID);
});

test("Preparation reorder changes only the active item order", () => {
    const reordered = movePreparationItem(items(), OTHER_ITEM_ID, -1);
    assert.deepEqual(reordered.map(item => item.id), [OTHER_ITEM_ID, ITEM_ID]);
    assert.deepEqual(reordered.map(item => item.sort_order), [0, 1]);
});

test("Dashboard shows assigned preparation separately from response action requirements", () => {
    const dashboard = createDashboardViewModel({
        schedules: [{ id: SCHEDULE_ID, title: "準備監査卓", owner_id: "owner", status: "scheduled" }],
        participants: [{ id: "participant-me", schedule_id: SCHEDULE_ID, user_id: "account-me", role: "participant", sort_order: 0 }],
        preparationItems: items().map(item => ({ ...item, schedule_id: SCHEDULE_ID }))
    }, "account-me", new Date("2030-01-01T00:00:00.000Z"));
    assert.equal(dashboard.actionRequired.length, 0);
    assert.equal(dashboard.preparationActionRequired.length, 1);
    assert.equal(dashboard.preparing[0].preparation.pending, 1);
});

test("Discord table Hub exposes Preparation and completes only a server-authorized item", async () => {
    const seen = [];
    const hub = await createInteractionResponse(component(`v10:hub:${SCHEDULE_ID}`), handlers(seen));
    assert.match(hub.body.data.content, /準備\n1 \/ 2 完了/);
    assert.equal(hub.body.data.components.at(-2).components[0].custom_id, `v12:prep:${SCHEDULE_ID}`);

    const preparation = await createInteractionResponse(component(`v12:prep:${SCHEDULE_ID}`), handlers(seen));
    assert.match(preparation.body.data.content, /あなたの未完了/);
    assert.equal(preparation.body.data.components[0].components[0].custom_id, `v12:prep-done:${SCHEDULE_ID}:${ITEM_ID}`);

    const completed = await createInteractionResponse(component(`v12:prep-done:${SCHEDULE_ID}:${ITEM_ID}`), handlers(seen));
    assert.equal(completed.body.type, 7);
    assert.deepEqual(seen, [{ scheduleId: SCHEDULE_ID, itemId: ITEM_ID, done: true }]);
});

test("forged Preparation table or item IDs are delegated to the authorized server handler", async () => {
    const seen = [];
    const response = await createInteractionResponse(component(`v12:prep-done:${SCHEDULE_ID}:${OTHER_ITEM_ID}`), {
        ...handlers(seen),
        async setPreparationStatus(){ throw new Error("participant access denied"); }
    });
    assert.equal(response.body.data.content, "この卓を操作する権限を確認できませんでした。");
    assert.deepEqual(seen, []);
});

function items(){
    return [
        {
            id: ITEM_ID,
            scheduleId: SCHEDULE_ID,
            title: "HO確認",
            category: "handout",
            status: "pending",
            assigneeParticipantId: "participant-me",
            assigneeDisplayName: "PL",
            roundId: ROUND_ID,
            sessionId: SESSION_ID,
            sessionSequence: 3,
            sortOrder: 1,
            canComplete: true
        },
        {
            id: OTHER_ITEM_ID,
            scheduleId: SCHEDULE_ID,
            title: "会場準備",
            category: "venue",
            status: "done",
            sortOrder: 2
        }
    ];
}

function component(customId){
    return {
        type: DISCORD_INTERACTION_TYPE.messageComponent,
        data: { custom_id: customId },
        user: { id: "discord-user" }
    };
}

function handlers(seen){
    return {
        async getScheduleContext(){ return context(); },
        async setPreparationStatus(_discordUserId, value){
            seen.push(value);
            return context({ preparation: { ...context().preparation, done: 2, pending: 0, ownPending: 0, items: items().map(item => ({ ...item, status: "done", canComplete: false })) } });
        }
    };
}

function context(overrides = {}){
    return {
        schedule: { id: SCHEDULE_ID, title: "準備監査卓", totalMinutes: 240 },
        me: { role: "participant" },
        participants: [{ id: "participant-me", displayName: "PL", required: true }],
        rounds: [],
        slots: [],
        responses: [],
        sessions: [],
        preparation: { total: 2, done: 1, pending: 1, ownPending: 1, items: items() },
        ...overrides
    };
}

async function read(path){
    return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}
