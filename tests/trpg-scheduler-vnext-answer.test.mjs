import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createSessionActions } from "../apps/web/creators/chikage/trpg/v2/js/runtime/sessionActions.js";

const ROOT = new URL("../", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

function createAnswerContext(overrides = {}){
    const calls = [];
    const appState = {
        busy: false,
        user: null,
        activeGuest: {
            shareId: "guest-share-123456",
            participantId: "participant-1",
            guestToken: "guest-token"
        },
        activeDetail: null,
        partialResponseDrafts: {},
        responseFeedback: null,
        repository: {
            async upsertResponse(payload){
                calls.push(payload);
                return { source: "guest-view", call: calls.length };
            }
        },
        ...overrides
    };
    let renderCount = 0;
    const actions = createSessionActions({
        appState,
        setBusy(value){ appState.busy = value; },
        createScheduleBundleViewModel(view){ return view; },
        async loadDashboard(){},
        renderDetail(){ renderCount += 1; },
        renderError(error){ throw new Error(`unexpected renderError: ${error}`); },
        reportSchedulerError(){},
        toUserMessage(error){ return String(error?.message ?? error); }
    });
    return {
        actions,
        appState,
        calls,
        renderCount: () => renderCount
    };
}

test("Scheduler vNext bulk maybe preserves an existing detailed maybe range", async () => {
    const detail = {
        ownParticipantId: "participant-1",
        shareId: "guest-share-123456",
        slots: [
            { id: "slot-a", status: "active" },
            { id: "slot-b", status: "active" }
        ],
        responses: [{
            participant_id: "participant-1",
            slot_id: "slot-a",
            answer: "maybe",
            note: "22時からなら可",
            ranges: [{ startMinute: 1320, endMinute: 1440 }]
        }]
    };
    const context = createAnswerContext({ activeDetail: detail });

    await context.actions.answerSlots(detail, "maybe");

    assert.equal(context.calls.length, 2);
    assert.deepEqual(context.calls[0], {
        shareId: "guest-share-123456",
        participantId: "participant-1",
        guestToken: "guest-token",
        slotId: "slot-a",
        answer: "maybe",
        note: "22時からなら可",
        ranges: [{ startMinute: 1320, endMinute: 1440 }]
    });
    assert.deepEqual(context.calls[1].ranges, []);
    assert.equal(context.appState.busy, false);
    assert.equal(context.renderCount(), 1);
});

test("Scheduler vNext bulk yes clears detailed maybe ranges intentionally", async () => {
    const detail = {
        ownParticipantId: "participant-1",
        shareId: "guest-share-123456",
        slots: [{ id: "slot-a", status: "active" }],
        responses: [{
            participant_id: "participant-1",
            slot_id: "slot-a",
            answer: "maybe",
            note: "遅れるかも",
            ranges: [{ startMinute: 1320, endMinute: 1440 }]
        }]
    };
    const context = createAnswerContext({ activeDetail: detail });

    await context.actions.answerSlots(detail, "yes");

    assert.equal(context.calls.length, 1);
    assert.equal(context.calls[0].answer, "yes");
    assert.deepEqual(context.calls[0].ranges, []);
    assert.equal(context.calls[0].note, "遅れるかも");
});

test("Scheduler vNext answer layer exposes guest-first and bulk answer affordances", async () => {
    const source = await read("apps/web/creators/chikage/trpg/v2/js/answerExperience.js");

    assert.match(source, /名前を入れて回答する/);
    assert.match(source, /全部○/);
    assert.match(source, /全部△/);
    assert.match(source, /全部×/);
    assert.match(source, /時間を指定/);
    assert.match(source, /保存中…/);
    assert.match(source, /保存済み/);
    assert.match(source, /保存できませんでした/);
    assert.match(source, /relmua:scheduler-answer/);
    assert.match(source, /relmua:scheduler-bulk-answer/);
});

test("Scheduler vNext answer CSS keeps three large answer targets and a focused join route", async () => {
    const css = await read("apps/web/creators/chikage/trpg/v2/css/trpg-vnext-answer.css");

    assert.match(css, /\.vnext-answer-card \.v2-answer-grid[\s\S]+grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
    assert.match(css, /\.vnext-answer-card \.v2-answer[\s\S]+min-height:\s*58px/);
    assert.match(css, /scheduler-vnext-answer-route\.scheduler-v6-page[\s\S]+scheduler-v6-intro/);
    assert.match(css, /scheduler-vnext-answer-route\.trpg-overview-v7[\s\S]+trpg-overview-hero/);
    assert.doesNotMatch(css, /position:\s*sticky/);
});

test("Scheduler and Overview load the vNext answer layer after their existing presentation CSS", async () => {
    const scheduler = await read("apps/web/creators/chikage/trpg/scheduler/index.html");
    const overview = await read("apps/web/creators/chikage/trpg/index.html");

    assert.ok(scheduler.indexOf("scheduler-v6.css") < scheduler.indexOf("trpg-vnext-answer.css"));
    assert.ok(overview.indexOf("trpg-overview-v7.css") < overview.indexOf("trpg-vnext-answer.css"));
    assert.match(scheduler, /v2\/js\/app\.js[^\n]+[\s\S]+v2\/js\/answerExperience\.js/);
    assert.match(overview, /v2\/js\/app\.js[^\n]*[\s\S]+v2\/js\/answerExperience\.js/);
});
