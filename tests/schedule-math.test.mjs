import test from "node:test";
import assert from "node:assert/strict";

import {
    buildCompletionPlans,
    createSlots,
    deriveScheduleSummary,
    getResponseCompleteness,
    summarizeResponses
} from "../apps/web/creators/chikage/trpg/scheduler/js/schedulerMath.js";

import {
    normalizeState
} from "../apps/web/creators/chikage/trpg/scheduler/js/state.js";

test("Schedule math creates compact date slots from a simple date range", () => {
    const slots = createSlots({
        startDate: "2026-08-24",
        endDate: "2026-08-30",
        startMinute: 19 * 60,
        endMinute: 24 * 60
    });

    assert.equal(slots.length, 7);
    assert.equal(slots[0].id, "slot-2026-08-24-1140-1440");
    assert.equal(slots[6].date, "2026-08-30");
});

test("Schedule math ranks candidate slots without DOM state", () => {
    const slots = createSlots({
        startDate: "2026-08-24",
        endDate: "2026-08-25",
        startMinute: 19 * 60,
        endMinute: 24 * 60
    });
    const participants = [
        { id: "a", displayName: "A", required: true },
        { id: "b", displayName: "B", required: false }
    ];
    const responses = {
        a: {
            [slots[0].id]: { answer: "yes" },
            [slots[1].id]: { answer: "no" }
        },
        b: {
            [slots[0].id]: { answer: "maybe" },
            [slots[1].id]: { answer: "yes" }
        }
    };
    const summaries = summarizeResponses(slots, participants, responses);

    assert.equal(summaries[0].slot.id, slots[0].id);
    assert.deepEqual(summaries[0].counts, {
        yes: 1,
        maybe: 1,
        no: 0,
        unknown: 0
    });
});

test("Schedule math builds completion plans only from viable summaries", () => {
    const slots = createSlots({
        startDate: "2026-08-24",
        endDate: "2026-08-30",
        startMinute: 19 * 60,
        endMinute: 24 * 60
    });
    const participants = [
        { id: "a", displayName: "A", required: true }
    ];
    const responses = {
        a: Object.fromEntries(slots.map(slot => [slot.id, { answer: "yes" }]))
    };
    const summaries = summarizeResponses(slots, participants, responses);
    const plans = buildCompletionPlans(summaries, {
        totalMinutes: 9 * 60,
        sessionMinutes: 3 * 60
    });

    assert.ok(plans.length >= 1);
    assert.equal(plans[0].items.length, 3);
});

test("Schedule summary prioritizes action required over role defaults", () => {
    const schedule = {
        id: "schedule-a",
        title: "四季送り",
        startDate: "2026-08-24",
        endDate: "2026-08-25",
        startMinute: 19 * 60,
        endMinute: 24 * 60,
        status: "collecting",
        ownerUserId: "user-a",
        participants: [
            { id: "owner", userId: "user-a", displayName: "Owner", role: "owner", required: true },
            { id: "guest", userId: "", displayName: "Guest", role: "participant", required: false }
        ],
        responses: {
            guest: {
                "slot-2026-08-24-1140-1440": { answer: "yes" },
                "slot-2026-08-25-1140-1440": { answer: "yes" }
            }
        }
    };
    const summary = deriveScheduleSummary(schedule, "owner");

    assert.equal(summary.isOwner, true);
    assert.equal(summary.action.key, "needs_response");
    assert.equal(summary.myResponse.remaining, 2);
});

test("Schedule summary exposes ready to decide only after all responses", () => {
    const schedule = {
        id: "schedule-b",
        title: "日程調整",
        startDate: "2026-08-24",
        endDate: "2026-08-24",
        startMinute: 19 * 60,
        endMinute: 24 * 60,
        status: "collecting",
        ownerUserId: "user-a",
        participants: [
            { id: "owner", userId: "user-a", displayName: "Owner", role: "owner", required: true },
            { id: "guest", userId: "", displayName: "Guest", role: "participant", required: false }
        ],
        responses: {
            owner: {
                "slot-2026-08-24-1140-1440": { answer: "yes" }
            },
            guest: {
                "slot-2026-08-24-1140-1440": { answer: "maybe" }
            }
        }
    };
    const slots = createSlots(schedule);
    const summary = deriveScheduleSummary(schedule, "owner");

    assert.deepEqual(getResponseCompleteness(slots, "owner", schedule.responses), {
        total: 1,
        answered: 1,
        remaining: 0,
        complete: true
    });
    assert.equal(summary.action.key, "ready_to_decide");
});

test("State migration wraps the v2 single schedule into a collection", () => {
    const state = normalizeState({
        schemaVersion: 2,
        schedule: {
            id: "legacy-schedule",
            title: "旧日程",
            startDate: "2026-08-24",
            endDate: "2026-08-24",
            startMinute: 19 * 60,
            endMinute: 24 * 60
        },
        participants: [
            { id: "legacy-owner", displayName: "KP", role: "organizer", required: true }
        ],
        responses: {},
        activeParticipantId: "legacy-owner"
    });

    assert.equal(state.schemaVersion, 3);
    assert.equal(state.schedules.length, 1);
    assert.equal(state.schedules[0].id, "legacy-schedule");
    assert.equal(state.schedules[0].participants[0].role, "owner");
    assert.equal(state.activeScheduleId, "legacy-schedule");
});
