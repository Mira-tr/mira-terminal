import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    DISCORD_INTERACTION_TYPE,
    DISCORD_RESPONSE_TYPE,
    NEXT_SESSION_COMMAND_NAME,
    RESPONSE_COMMAND_NAME,
    ROUND_COMMAND_NAME,
    SCHEDULE_COMMAND_NAME,
    UPCOMING_COMMAND_NAME,
    createInteractionResponse,
    parsePartialRanges,
    selectNearestFutureSession
} from "../supabase/functions/discord-next-session/botCore.js";

const ROOT = new URL("../", import.meta.url);
const SCHEDULE_ID = "11111111-1111-4111-8111-111111111111";
const SLOT_ONE = "22222222-2222-4222-8222-222222222222";
const SLOT_TWO = "33333333-3333-4333-8333-333333333333";
const ROUND_ID = "44444444-4444-4444-8444-444444444444";

test("DM-first commands use the interaction sender without guild context", async () => {
    const seen = [];
    const response = await createInteractionResponse(command(SCHEDULE_COMMAND_NAME), handlers({
        async listSchedulesForDiscordUser(discordUserId){
            seen.push(discordUserId);
            return scheduleList();
        }
    }));

    assert.deepEqual(seen, ["discord-user"]);
    assert.equal(response.body.type, DISCORD_RESPONSE_TYPE.channelMessageWithSource);
    assert.equal(response.body.data.flags, 64);
    assert.equal(response.body.data.components[0].components[0].type, 3);
    assert.equal(response.body.data.components[0].components[0].options.length, 1);
    assert.equal(response.body.data.components[0].components[0].custom_id, "v10:pick:0:hub");
});

test("table hub makes the current status and next action primary", async () => {
    const response = await createInteractionResponse(component("v10:pick:0:hub", [SCHEDULE_ID]), handlers());

    assert.match(response.body.data.content, /DM監査卓/);
    assert.match(response.body.data.content, /日程調整 #1/);
    assert.match(response.body.data.content, /あなた: 未回答 2件/);
    assert.equal(response.body.data.components[0].components[0].label, "回答する");
    assert.ok(response.body.data.components.flatMap(row => row.components).some(item => item.label === "卓一覧"));
});

test("response and round shortcuts skip irrelevant table lists when one schedule matches", async () => {
    const responseShortcut = await createInteractionResponse(command(RESPONSE_COMMAND_NAME), handlers());
    assert.match(responseShortcut.body.data.content, /日程調整 #1/);
    assert.equal(responseShortcut.body.data.components[0].components[0].label, "○");

    const roundShortcut = await createInteractionResponse(command(ROUND_COMMAND_NAME), handlers());
    assert.match(roundShortcut.body.data.content, /日程調整 #1/);
});

test("schedule command components stay inside Discord's legacy limits", async () => {
    const response = await createInteractionResponse(command(SCHEDULE_COMMAND_NAME), handlers());
    const components = response.body.data.components;

    assert.ok(components.length <= 5);
    components.forEach(row => {
        assert.ok(row.components.length <= 5);
        row.components.forEach(component => {
            if(component.custom_id){
                assert.ok(component.custom_id.length <= 100);
            }
            if(component.type === 3){
                assert.ok(component.options.length <= 25);
            }
        });
    });
});

test("round picker loads a membership-revalidated schedule context", async () => {
    const seen = [];
    const response = await createInteractionResponse(component("v10:pick:0:round", [SCHEDULE_ID]), handlers({
        async getScheduleContext(discordUserId, scheduleId){
            seen.push({ discordUserId, scheduleId });
            return context();
        }
    }));

    assert.deepEqual(seen, [{ discordUserId: "discord-user", scheduleId: SCHEDULE_ID }]);
    assert.equal(response.body.type, DISCORD_RESPONSE_TYPE.updateMessage);
    assert.match(response.body.data.content, /日程調整 #1/);
    assert.match(response.body.data.content, /現在: 未回答/);
});

test("yes and no responses save only the sender's current candidate answer", async () => {
    const saved = [];
    const response = await createInteractionResponse(component(`v10:answer:yes:${SCHEDULE_ID}:${SLOT_ONE}`), handlers({
        async saveResponse(discordUserId, input){
            saved.push({ discordUserId, input });
            return context({ responses: [{ slotId: SLOT_ONE, answer: "yes", ranges: [], note: "", stale: false }] });
        }
    }));

    assert.equal(response.body.type, DISCORD_RESPONSE_TYPE.updateMessage);
    assert.deepEqual(saved, [{
        discordUserId: "discord-user",
        input: { scheduleId: SCHEDULE_ID, slotId: SLOT_ONE, answer: "yes", note: "", ranges: [] }
    }]);
});

test("partial response modal accepts up to four ranges and an optional memo", async () => {
    const response = await createInteractionResponse(component(`v10:partial:${SCHEDULE_ID}:${SLOT_ONE}`), handlers());

    assert.equal(response.body.type, DISCORD_RESPONSE_TYPE.modal);
    assert.equal(response.body.data.components.length, 5);
    assert.equal(response.body.data.custom_id, `v10:submit-partial:${SCHEDULE_ID}:${SLOT_ONE}`);
    assert.deepEqual(parsePartialRanges({
        range1: "22:00-翌02:00",
        range2: "翌03:00-翌04:00"
    }), {
        ok: true,
        value: [
            { startMinute: 1320, endMinute: 1560, answer: "maybe" },
            { startMinute: 1620, endMinute: 1680, answer: "maybe" }
        ]
    });
    assert.equal(parsePartialRanges({ range1: "21:00-20:00" }).ok, false);
});

test("modal partial submission preserves answer, memo, and all entered ranges", async () => {
    const saved = [];
    const response = await createInteractionResponse(modalSubmit(`v10:submit-partial:${SCHEDULE_ID}:${SLOT_ONE}`, {
        range1: "22:00-翌02:00",
        range2: "",
        range3: "",
        range4: "",
        memo: "少し遅れます"
    }), handlers({
        async saveResponse(discordUserId, input){
            saved.push({ discordUserId, input });
            return context({ responses: [{ slotId: SLOT_ONE, answer: "maybe", note: input.note, ranges: input.ranges, stale: false }] });
        }
    }));

    assert.equal(response.body.type, DISCORD_RESPONSE_TYPE.channelMessageWithSource);
    assert.equal(saved[0].input.answer, "maybe");
    assert.equal(saved[0].input.note, "少し遅れます");
    assert.deepEqual(saved[0].input.ranges, [{ startMinute: 1320, endMinute: 1560, answer: "maybe" }]);
});

test("memo edits retain the current answer and ranges through the server handler", async () => {
    const saved = [];
    const response = await createInteractionResponse(modalSubmit(`v10:submit-memo:${SCHEDULE_ID}:${SLOT_ONE}`, {
        memo: "仕事次第です"
    }), handlers({
        async saveMemo(discordUserId, input){
            saved.push({ discordUserId, input });
            return context({ responses: [{ slotId: SLOT_ONE, answer: "no", note: input.note, ranges: [], stale: false }] });
        }
    }));

    assert.equal(response.body.type, DISCORD_RESPONSE_TYPE.channelMessageWithSource);
    assert.deepEqual(saved, [{
        discordUserId: "discord-user",
        input: { scheduleId: SCHEDULE_ID, slotId: SLOT_ONE, note: "仕事次第です" }
    }]);
});

test("stale responses are never rendered as current and prompt re-answer", async () => {
    const response = await createInteractionResponse(component(`v10:show:${SCHEDULE_ID}:0`), handlers({
        async getScheduleContext(){
            return context({ responses: [{ slotId: SLOT_ONE, answer: "maybe", note: "old", ranges: [], stale: true }] });
        }
    }));

    assert.match(response.body.data.content, /再回答が必要/);
    assert.match(response.body.data.content, /以前の回答は集計に使われません/);
});

test("availability draft is review-only until the explicit apply interaction", async () => {
    let applied = 0;
    const draftResponse = await createInteractionResponse(component(`v10:draft:${SCHEDULE_ID}`), handlers({
        async getAvailabilityDraft(){
            return {
                context: context(),
                suggestions: [{ slot: context().slots[0], answer: "yes", ranges: [] }]
            };
        },
        async applyAvailabilityDraft(){
            applied += 1;
            return context();
        }
    }));

    assert.equal(applied, 0);
    assert.match(draftResponse.body.data.content, /まだ保存されていません/);
    const applyResponse = await createInteractionResponse(component(`v10:apply-draft:${SCHEDULE_ID}`), handlers({
        async applyAvailabilityDraft(){
            applied += 1;
            return context();
        }
    }));
    assert.equal(applied, 1);
    assert.equal(applyResponse.body.type, DISCORD_RESPONSE_TYPE.updateMessage);
});

test("KP-only recommendation and confirmation use fresh server handlers", async () => {
    const confirmed = [];
    const recommendation = await createInteractionResponse(component(`v10:recommend:${SCHEDULE_ID}`), handlers({
        async getRecommendation(){
            return {
                context: context({ owner: true }),
                plan: plan()
            };
        }
    }));
    assert.match(recommendation.body.data.content, /おすすめ/);
    assert.match(recommendation.body.data.content, /予備/);

    const confirmResponse = await createInteractionResponse(component(`v10:confirm:${SCHEDULE_ID}:${ROUND_ID}`), handlers({
        async confirmRecommendation(discordUserId, scheduleId, roundId){
            confirmed.push({ discordUserId, scheduleId, roundId });
            return context({ owner: true, rounds: [{ id: ROUND_ID, status: "confirmed", sequence: 1 }], sessions: [{ sequence: 1, status: "scheduled", startsAt: "2026-09-01T12:00:00Z", endsAt: "2026-09-01T16:00:00Z" }] });
        }
    }));
    assert.match(confirmResponse.body.data.content, /日程を確定しました/);
    assert.deepEqual(confirmed, [{ discordUserId: "discord-user", scheduleId: SCHEDULE_ID, roundId: ROUND_ID }]);
});

test("PL cannot receive a confirmation action from a forged component handler", async () => {
    const response = await createInteractionResponse(component(`v10:confirm:${SCHEDULE_ID}:${ROUND_ID}`), handlers({
        async confirmRecommendation(){
            throw new Error("owner access denied");
        }
    }));
    assert.match(response.body.data.content, /権限/);
});

test("upcoming and next session use V6 scheduled session truth and ignore held rows", async () => {
    const nearest = selectNearestFutureSession([
        { title: "Past", role: "PL", status: "scheduled", startsAt: "2026-08-20T12:00:00Z" },
        { title: "Held", role: "PL", status: "held", startsAt: "2026-09-02T12:00:00Z" },
        { title: "Nearest", role: "KP", status: "scheduled", startsAt: "2026-09-01T12:00:00Z" }
    ], new Date("2026-08-30T00:00:00Z"));
    assert.equal(nearest.title, "Nearest");

    const upcoming = await createInteractionResponse(command(UPCOMING_COMMAND_NAME), handlers({
        async findUpcomingSessionsForDiscordUser(){
            return { sessions: [nearest] };
        }
    }));
    assert.match(upcoming.body.data.content, /今後の予定/);
    assert.match(upcoming.body.data.content, /Nearest/);

    const next = await createInteractionResponse(command(NEXT_SESSION_COMMAND_NAME), handlers({
        async findNextSessionForDiscordUser(){ return { ...nearest, scheduleId: SCHEDULE_ID }; }
    }));
    assert.match(next.body.data.content, /次の卓/);
    assert.equal(next.body.data.components[0].components[0].label, "卓を見る");
});

test("V10 database wrappers are service-only, actor-bound, and delegate to existing Scheduler RPCs", async () => {
    const migration = await read("supabase/migrations/20260830170000_trpg_v10_discord_dm_scheduler.sql");

    assert.match(migration, /trpg_v10_bot_resolve_account/);
    assert.match(migration, /profiles profile\s+where profile\.discord_user_id/);
    assert.match(migration, /set_config\('request\.jwt\.claim\.sub'/);
    assert.match(migration, /schedule_account_upsert_response/);
    assert.match(migration, /trpg_v6_confirm_recommendation_plan/);
    assert.match(migration, /schedule_participants participant[\s\S]*participant\.user_id = actor_id/);
    assert.match(migration, /revoke all on function public\.trpg_v10_bot_upsert_response/);
    assert.match(migration, /grant execute on function public\.trpg_v10_bot_upsert_response[\s\S]*to service_role/);
    assert.doesNotMatch(migration, /schedule_guest_credentials[\s\S]*discord/i);
});

test("Edge handler remains signature-gated and exposes no secrets or guest credentials", async () => {
    const source = await read("supabase/functions/discord-next-session/index.ts");
    assert.match(source, /DISCORD_PUBLIC_KEY/);
    assert.match(source, /verifyDiscordRequestSignature/);
    assert.match(source, /trpg_v10_bot_upsert_response/);
    assert.match(source, /trpg_v10_bot_confirm_recommendation/);
    assert.doesNotMatch(source, /DISCORD_BOT_TOKEN/);
    assert.doesNotMatch(source, /schedule_guest_credentials/);
});

test("Global command registration explicitly supports personal installs, DM contexts, and fail-closed environments", async () => {
    const source = await read("scripts/register-discord-dm-scheduler-commands.mjs");
    assert.match(source, /integration_types:\s*\[0,\s*1\]/);
    assert.match(source, /contexts:\s*\[0,\s*1,\s*2\]/);
    assert.match(source, /--environment production or --environment staging/);
    assert.match(source, /production:\s*"1540825749945196614"/);
    assert.match(source, /staging:\s*"1540646111042076702"/);
    assert.match(source, /DISCORD_BOT_TOKEN does not belong to the expected/);
    assert.match(source, /Production Scheduler commands must be registered globally/);
});

function command(name){
    return {
        type: DISCORD_INTERACTION_TYPE.applicationCommand,
        data: { name },
        user: { id: "discord-user" }
    };
}

function component(customId, values = []){
    return {
        type: DISCORD_INTERACTION_TYPE.messageComponent,
        data: { custom_id: customId, values },
        user: { id: "discord-user" }
    };
}

function modalSubmit(customId, values){
    return {
        type: DISCORD_INTERACTION_TYPE.modalSubmit,
        data: {
            custom_id: customId,
            components: Object.entries(values).map(([id, value]) => ({
                components: [{ custom_id: id, value }]
            }))
        },
        user: { id: "discord-user" }
    };
}

function handlers(overrides = {}){
    return {
        async findNextSessionForDiscordUser(){ return null; },
        async findUpcomingSessionsForDiscordUser(){ return { sessions: [] }; },
        async listSchedulesForDiscordUser(){ return scheduleList(); },
        async getScheduleContext(){ return context(); },
        async saveResponse(){ return context(); },
        async saveMemo(){ return context(); },
        async getAvailabilityDraft(){ return { context: context(), suggestions: [] }; },
        async applyAvailabilityDraft(){ return context(); },
        async getRecommendation(){ return { context: context({ owner: true }), plan: plan() }; },
        async confirmRecommendation(){ return context({ owner: true }); },
        ...overrides
    };
}

function scheduleList(){
    return {
        totalCount: 1,
        schedules: [{
            scheduleId: SCHEDULE_ID,
            title: "DM監査卓",
            role: "participant",
            roundSequence: 1,
            roundStatus: "open",
            unansweredCount: 2
        }]
    };
}

function context({ responses = [], owner = false, rounds = null, sessions = [] } = {}){
    return {
        schedule: { id: SCHEDULE_ID, title: "DM監査卓", totalMinutes: 240, sessionMinutes: 240 },
        rounds: rounds ?? [{ id: ROUND_ID, sequence: 1, status: "open", targetMinutes: 240 }],
        slots: [{ id: SLOT_ONE, localDate: "2026-09-01", startMinute: 1200, endMinute: 1440 }, { id: SLOT_TWO, localDate: "2026-09-02", startMinute: 1260, endMinute: 1500 }],
        participants: [{ id: "participant-a", displayName: "千景", role: owner ? "owner" : "participant", required: true, answered: false }, { id: "participant-b", displayName: "PL", role: "participant", required: true, answered: false }],
        summaries: [{ slotId: SLOT_ONE, answered: 0 }, { slotId: SLOT_TWO, answered: 0 }],
        responses,
        sessions,
        me: { role: owner ? "owner" : "participant" },
        bot: { isOwner: owner, allResponses: responses }
    };
}

function plan(){
    return {
        meetsPreferred: true,
        totalMinutes: 240,
        primary: [{ item: { slot: context().slots[0] }, startMinute: 1200, endMinute: 1440, minutes: 240 }],
        reserve: [{ item: { slot: context().slots[1] } }]
    };
}

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
