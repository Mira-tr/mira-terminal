import test from "node:test";
import assert from "node:assert/strict";

import {
    addAvailabilityRange,
    createPersonalAvailabilityModel,
    evaluateAvailabilityForSlot,
    removeAvailabilityRange,
    toAvailabilityPayload,
    updateAvailabilityRange,
    updateExceptionState,
    updateWeeklyState,
    validateAvailabilityPayload
} from "../apps/web/creators/chikage/trpg/v2/js/availabilityModel.js";

test("weekly availability supports multiple windows and serializes only explicit settings", () => {
    let model = createPersonalAvailabilityModel();
    model = updateWeeklyState(model, 6, "available");
    model = updateAvailabilityRange(model, "weekly", 6, 0, {
        startMinute: 13 * 60,
        endMinute: 18 * 60
    });
    model = addAvailabilityRange(model, "weekly", 6);
    model = updateAvailabilityRange(model, "weekly", 6, 1, {
        startMinute: 21 * 60,
        endMinute: 27 * 60
    });

    const payload = toAvailabilityPayload(model);

    assert.deepEqual(payload.weekly, [{
        weekday: 6,
        state: "available",
        ranges: [{
            startMinute: 780,
            endMinute: 1080
        }, {
            startMinute: 1260,
            endMinute: 1620
        }]
    }]);
    assert.equal(validateAvailabilityPayload(payload).ok, true);
});

test("specific date exceptions override weekly availability and can be explicitly unavailable", () => {
    let model = createPersonalAvailabilityModel();
    model = updateWeeklyState(model, 5, "available");
    model = updateAvailabilityRange(model, "weekly", 5, 0, {
        startMinute: 20 * 60,
        endMinute: 24 * 60
    });
    model = updateExceptionState(model, "2026-11-20", "unavailable");

    const draft = evaluateAvailabilityForSlot({
        availability: model,
        slot: {
            localDate: "2026-11-20",
            startMinute: 20 * 60,
            endMinute: 24 * 60,
            startsAt: "2026-11-20T11:00:00.000Z",
            endsAt: "2026-11-20T15:00:00.000Z"
        }
    });

    assert.equal(draft.answer, "no");
    assert.equal(draft.source, "exception");
});

test("confirmed sessions subtract busy time and produce an explicit partial draft", () => {
    let model = createPersonalAvailabilityModel();
    model = updateWeeklyState(model, 6, "available");
    model = updateAvailabilityRange(model, "weekly", 6, 0, {
        startMinute: 20 * 60,
        endMinute: 26 * 60
    });

    const draft = evaluateAvailabilityForSlot({
        availability: model,
        scheduleId: "candidate-session",
        slot: {
            localDate: "2026-11-21",
            startMinute: 20 * 60,
            endMinute: 26 * 60,
            startsAt: "2026-11-21T11:00:00.000Z",
            endsAt: "2026-11-21T17:00:00.000Z"
        },
        confirmedSlots: [{
            scheduleId: "other-session",
            status: "confirmed",
            startsAt: "2026-11-21T13:00:00.000Z",
            endsAt: "2026-11-21T15:00:00.000Z"
        }]
    });

    assert.equal(draft.answer, "maybe");
    assert.equal(draft.source, "confirmed-busy");
    assert.deepEqual(draft.ranges, [{
        startMinute: 1200,
        endMinute: 1320
    }, {
        startMinute: 1440,
        endMinute: 1560
    }]);
});

test("availability validation rejects overlapping and invalid ranges", () => {
    const invalid = {
        weekly: [{
            weekday: 1,
            state: "available",
            ranges: [{
                startMinute: 1200,
                endMinute: 1320
            }, {
                startMinute: 1300,
                endMinute: 1500
            }]
        }],
        exceptions: []
    };

    assert.equal(validateAvailabilityPayload(invalid).ok, false);

    let model = createPersonalAvailabilityModel(invalid);
    model = removeAvailabilityRange(model, "weekly", 1, 1);
    assert.equal(validateAvailabilityPayload(model).ok, true);
});
