import test from "node:test";
import assert from "node:assert/strict";

import { el, feedbackMessage } from "../apps/web/creators/chikage/trpg/v2/js/runtime/dom.js";
import { readRoute, createInviteUrl } from "../apps/web/creators/chikage/trpg/v2/js/runtime/navigation.js";
import { createAvailabilityController } from "../apps/web/creators/chikage/trpg/v2/js/runtime/availabilityController.js";
import { createPreparationActions } from "../apps/web/creators/chikage/trpg/v2/js/runtime/preparationActions.js";
import { createSchedulerActions } from "../apps/web/creators/chikage/trpg/v2/js/runtime/schedulerActions.js";
import { createSessionActions } from "../apps/web/creators/chikage/trpg/v2/js/runtime/sessionActions.js";

async function withGlobals(values, callback){
    const originals = new Map();

    for(const [key, value] of Object.entries(values)){
        originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
        Object.defineProperty(globalThis, key, {
            value,
            configurable: true,
            writable: true
        });
    }

    try{
        return await callback();
    }finally{
        for(const [key, descriptor] of originals){
            if(descriptor){
                Object.defineProperty(globalThis, key, descriptor);
            }else{
                delete globalThis[key];
            }
        }
    }
}

function createBusyRecorder(appState, events = []){
    return value => {
        appState.busy = value;
        events.push(`busy:${value}`);
    };
}

test("TRPG navigation preserves invite, schedule, and home routes", async () => {
    await withGlobals({
        location: {
            href: "https://relmua.com/creators/chikage/trpg/v2/?schedule=123e4567-e89b-12d3-a456-426614174000",
            hash: "",
            origin: "https://relmua.com",
            pathname: "/creators/chikage/trpg/v2/"
        }
    }, () => {
        assert.deepEqual(readRoute(), {
            type: "schedule",
            scheduleId: "123e4567-e89b-12d3-a456-426614174000",
            shareId: ""
        });
        assert.equal(createInviteUrl("abcdefghijklmnop"), "https://relmua.com/creators/chikage/trpg/v2/#/join/abcdefghijklmnop");
    });

    await withGlobals({
        location: {
            href: "https://relmua.com/creators/chikage/trpg/v2/#/join/ABCDEFGHIJKLMNOP",
            hash: "#/join/ABCDEFGHIJKLMNOP",
            origin: "https://relmua.com",
            pathname: "/creators/chikage/trpg/v2/"
        }
    }, () => {
        assert.deepEqual(readRoute(), {
            type: "join",
            shareId: "ABCDEFGHIJKLMNOP"
        });
    });

    await withGlobals({
        location: {
            href: "https://relmua.com/creators/chikage/trpg/v2/?invite=short",
            hash: "",
            origin: "https://relmua.com",
            pathname: "/creators/chikage/trpg/v2/"
        }
    }, () => {
        assert.deepEqual(readRoute(), {
            type: "home",
            shareId: ""
        });
    });
});

test("TRPG DOM helper wires events without using HTML strings", async () => {
    class FakeNode {}
    class FakeTextNode extends FakeNode {
        constructor(text){
            super();
            this.text = text;
        }
    }
    class FakeElement extends FakeNode {
        constructor(tagName){
            super();
            this.tagName = tagName;
            this.className = "";
            this.children = [];
            this.listeners = new Map();
            this.attributes = new Map();
            this.disabled = false;
        }
        addEventListener(type, handler){
            this.listeners.set(type, handler);
        }
        setAttribute(name, value){
            this.attributes.set(name, value);
        }
        append(child){
            this.children.push(child);
        }
    }

    const document = {
        createElement(tagName){
            return new FakeElement(tagName);
        },
        createTextNode(text){
            return new FakeTextNode(text);
        }
    };

    await withGlobals({ document, Node: FakeNode }, () => {
        let clicks = 0;
        const button = el("button", {
            className: "v2-action",
            disabled: true,
            "aria-label": "Open session",
            onClick(){ clicks += 1; }
        }, "OPEN");

        assert.equal(button.className, "v2-action");
        assert.equal(button.disabled, true);
        assert.equal(button.attributes.get("aria-label"), "Open session");
        assert.equal(button.children[0].text, "OPEN");
        button.listeners.get("click")({ currentTarget: button });
        assert.equal(clicks, 1);

        const feedback = feedbackMessage({ kind: "error", text: "failed" });
        assert.equal(feedback.attributes.get("role"), "alert");
        assert.equal(feedback.children[0].text, "failed");
    });
});

test("Session answer persists account response, clears draft, and refreshes dashboard", async () => {
    const events = [];
    let payload;
    const appState = {
        busy: false,
        user: { id: "user-1" },
        activeGuest: null,
        partialResponseDrafts: { "slot-1": { ranges: [{ startMinute: 600, endMinute: 720 }] } },
        repository: {
            async upsertAccountResponse(next){
                payload = next;
                events.push("repository");
                return { source: "account-view" };
            }
        }
    };

    const actions = createSessionActions({
        appState,
        setBusy: createBusyRecorder(appState, events),
        createScheduleBundleViewModel(view, userId){
            return { view, userId };
        },
        async loadDashboard(){ events.push("dashboard"); },
        renderDetail(){ events.push("render"); },
        renderError(error){ throw new Error(`unexpected renderError: ${error}`); },
        toUserMessage(error){ return String(error?.message ?? error); }
    });

    const ranges = [{ startMinute: 600, endMinute: 720 }];
    await actions.answerSlot({ shareId: "abcdefghijklmnop" }, { id: "slot-1" }, "partial", ranges, "after 10");

    assert.deepEqual(payload, {
        shareId: "abcdefghijklmnop",
        slotId: "slot-1",
        answer: "partial",
        note: "after 10",
        ranges
    });
    assert.equal("slot-1" in appState.partialResponseDrafts, false);
    assert.deepEqual(appState.activeDetail, {
        view: { source: "account-view" },
        userId: "user-1"
    });
    assert.deepEqual(events, ["busy:true", "repository", "dashboard", "render", "busy:false"]);
});

test("Session answer keeps guest credentials scoped to guest response and skips account dashboard", async () => {
    const events = [];
    let payload;
    const appState = {
        busy: false,
        user: null,
        activeGuest: {
            shareId: "guest-share-123456",
            participantId: "participant-1",
            guestToken: "guest-token"
        },
        partialResponseDrafts: { "slot-2": {} },
        repository: {
            async upsertResponse(next){
                payload = next;
                events.push("repository");
                return { source: "guest-view" };
            }
        }
    };

    const actions = createSessionActions({
        appState,
        setBusy: createBusyRecorder(appState, events),
        createScheduleBundleViewModel(view, userId){ return { view, userId }; },
        async loadDashboard(){ events.push("dashboard"); },
        renderDetail(){ events.push("render"); },
        renderError(error){ throw new Error(`unexpected renderError: ${error}`); },
        toUserMessage(error){ return String(error?.message ?? error); }
    });

    await actions.answerSlot({ shareId: "ignored-account-share" }, { id: "slot-2" }, "yes");

    assert.deepEqual(payload, {
        shareId: "guest-share-123456",
        participantId: "participant-1",
        guestToken: "guest-token",
        slotId: "slot-2",
        answer: "yes",
        note: "",
        ranges: []
    });
    assert.equal(events.includes("dashboard"), false);
    assert.deepEqual(events, ["busy:true", "repository", "render", "busy:false"]);
});

test("Scheduler candidate add keeps repository payload and refresh order stable", async () => {
    const events = [];
    let payload;
    const freshComposer = { month: "2026-10", selections: {} };
    const appState = {
        busy: false,
        candidateComposer: { month: "2026-09" },
        candidateScheduleId: "",
        repository: {
            async addTrpgV6Candidates(next){
                payload = next;
                events.push("repository");
            }
        }
    };

    const actions = createSchedulerActions({
        appState,
        buildCandidateBatch(composer, totalMinutes){
            assert.equal(composer, appState.candidateComposer);
            assert.equal(totalMinutes, 240);
            return {
                ok: true,
                candidates: [{ startsAt: "2026-09-20T10:00:00+09:00", endsAt: "2026-09-20T14:00:00+09:00" }]
            };
        },
        createCandidateComposer(){ return freshComposer; },
        setBusy: createBusyRecorder(appState, events),
        async reloadActiveDetail(){ events.push("reload"); },
        async loadDashboard(){ events.push("dashboard"); },
        renderDetail(){ events.push("render"); },
        reportSchedulerError(){ events.push("error"); },
        candidateErrorMessage(error){ return String(error?.message ?? error); }
    });

    const detail = {
        scheduleId: "schedule-1",
        activeRound: { id: "round-1" },
        schedule: { total_minutes: 240 }
    };

    await actions.addCandidateBatch(detail);

    assert.deepEqual(payload, {
        scheduleId: "schedule-1",
        roundId: "round-1",
        candidates: [{ startsAt: "2026-09-20T10:00:00+09:00", endsAt: "2026-09-20T14:00:00+09:00" }]
    });
    assert.equal(appState.candidateComposer, freshComposer);
    assert.equal(appState.candidateScheduleId, "schedule-1");
    assert.deepEqual(appState.candidateFeedback, {
        kind: "success",
        text: "1件の候補日を追加しました。"
    });
    assert.deepEqual(events, ["busy:true", "repository", "reload", "dashboard", "render", "busy:false"]);
});

test("Scheduler invalid candidate draft stops before mutation", async () => {
    let repositoryCalls = 0;
    const events = [];
    const appState = {
        busy: false,
        candidateComposer: {},
        repository: {
            async addTrpgV6Candidates(){ repositoryCalls += 1; }
        }
    };

    const actions = createSchedulerActions({
        appState,
        buildCandidateBatch(){ return { ok: false, errors: ["候補日を選択してください。"] }; },
        setBusy: createBusyRecorder(appState, events),
        renderDetail(){ events.push("render"); }
    });

    await actions.addCandidateBatch({ scheduleId: "schedule-1", activeRound: { id: "round-1" }, schedule: { total_minutes: 180 } });

    assert.equal(repositoryCalls, 0);
    assert.deepEqual(appState.candidateFeedback, { kind: "error", text: "候補日を選択してください。" });
    assert.deepEqual(events, ["render"]);
});

test("Scheduler recommendation confirmation preserves snapshot and selected ranges", async () => {
    const events = [];
    let payload;
    const appState = {
        busy: false,
        confirmRecommendation: { snapshotAt: "2026-09-11T00:00:00.000Z" },
        repository: {
            async confirmTrpgV6RecommendationPlan(next){
                payload = next;
                events.push("repository");
            }
        }
    };

    const actions = createSchedulerActions({
        appState,
        setBusy: createBusyRecorder(appState, events),
        async reloadActiveDetail(){ events.push("reload"); },
        async loadDashboard(){ events.push("dashboard"); },
        renderDetail(){ events.push("render"); },
        reportSchedulerError(){ events.push("error"); },
        recommendationSnapshotForConfirmation(){ return "fallback-snapshot"; },
        recommendationErrorMessage(error){ return String(error?.message ?? error); }
    });

    const plan = {
        primary: [
            { item: { slot: { id: "slot-a" } }, startMinute: 600, endMinute: 720 },
            { item: { slot: { id: "slot-b" } }, startMinute: 780, endMinute: 900 }
        ]
    };

    await actions.confirmRecommendationPlan({ scheduleId: "schedule-1", activeRound: { id: "round-1" } }, plan);

    assert.deepEqual(payload, {
        scheduleId: "schedule-1",
        roundId: "round-1",
        items: [
            { slotId: "slot-a", startMinute: 600, endMinute: 720 },
            { slotId: "slot-b", startMinute: 780, endMinute: 900 }
        ],
        snapshotAt: "2026-09-11T00:00:00.000Z"
    });
    assert.equal(appState.confirmRecommendation, null);
    assert.deepEqual(events, ["busy:true", "repository", "reload", "dashboard", "render", "busy:false"]);
});

test("Preparation status mutation refreshes detail and dashboard after repository success", async () => {
    const events = [];
    let payload;
    const appState = {
        busy: false,
        repository: {
            async setTrpgV12PreparationStatus(next){
                payload = next;
                events.push("repository");
            }
        }
    };

    const actions = createPreparationActions({
        appState,
        setBusy: createBusyRecorder(appState, events),
        async reloadActiveDetail(){ events.push("reload"); },
        async loadDashboard(){ events.push("dashboard"); },
        renderDetail(){ events.push("render"); },
        reportSchedulerError(){ events.push("error"); },
        preparationErrorMessage(error){ return String(error?.message ?? error); }
    });

    await actions.setPreparationStatus({ scheduleId: "schedule-1" }, { id: "prep-1" }, true);

    assert.deepEqual(payload, {
        scheduleId: "schedule-1",
        itemId: "prep-1",
        done: true
    });
    assert.deepEqual(appState.preparationFeedback, {
        kind: "success",
        text: "準備を完了にしました。"
    });
    assert.deepEqual(events, ["busy:true", "repository", "reload", "dashboard", "render", "busy:false"]);
});

test("Availability save validates before mutation and normalizes saved state", async () => {
    const events = [];
    let savedPayload;
    let renderCount = 0;
    const appState = {
        busy: false,
        availabilityEditor: { weekly: [], exceptions: {} },
        availabilityFeedback: null,
        availabilityNewDate: "",
        repository: {
            async saveTrpgV31PersonalAvailability(payload){
                savedPayload = payload;
                events.push("repository");
                return { weekly: [{ weekday: 1 }], exceptions: {} };
            }
        }
    };

    const normalized = source => ({ ...source, normalized: true, exceptions: source.exceptions ?? {} });
    const inert = () => ({ node: true });
    const root = {
        replaceChildren(){ renderCount += 1; }
    };

    const controller = createAvailabilityController({
        appState,
        root,
        WEEKDAY_LABELS: [],
        validateAvailabilityPayload(){
            return { ok: true, payload: { weekly: [{ weekday: 1 }], exceptions: [] } };
        },
        createPersonalAvailabilityModel: normalized,
        el: inert,
        sectionBlock: inert,
        textButton: inert,
        emptyState: inert,
        feedbackMessage: inert,
        actionButton: inert,
        setBusy: createBusyRecorder(appState, events),
        reportSchedulerError(){ events.push("error"); }
    });

    await controller.savePersonalAvailability();

    assert.deepEqual(savedPayload, { weekly: [{ weekday: 1 }], exceptions: [] });
    assert.equal(appState.personalAvailability.normalized, true);
    assert.equal(appState.availabilityEditor.normalized, true);
    assert.deepEqual(appState.availabilityFeedback, {
        kind: "success",
        text: "自分の予定を保存しました。"
    });
    assert.equal(renderCount, 1);
    assert.deepEqual(events, ["busy:true", "repository", "busy:false"]);
});

test("Availability validation failure renders feedback without repository mutation", async () => {
    let repositoryCalls = 0;
    let renderCount = 0;
    const appState = {
        busy: false,
        availabilityEditor: { weekly: [], exceptions: {} },
        availabilityFeedback: null,
        availabilityNewDate: "",
        repository: {
            async saveTrpgV31PersonalAvailability(){ repositoryCalls += 1; }
        }
    };
    const inert = () => ({ node: true });

    const controller = createAvailabilityController({
        appState,
        root: { replaceChildren(){ renderCount += 1; } },
        WEEKDAY_LABELS: [],
        validateAvailabilityPayload(){ return { ok: false, errors: ["時間帯を確認してください。"] }; },
        el: inert,
        sectionBlock: inert,
        textButton: inert,
        emptyState: inert,
        feedbackMessage: inert,
        actionButton: inert,
        setBusy(){ throw new Error("setBusy should not be called"); }
    });

    await controller.savePersonalAvailability();

    assert.equal(repositoryCalls, 0);
    assert.deepEqual(appState.availabilityFeedback, {
        kind: "error",
        text: "時間帯を確認してください。"
    });
    assert.equal(renderCount, 1);
});
