import test from "node:test";
import assert from "node:assert/strict";

import {
    encodeSchedulePayload,
    readSharePayload
} from "../apps/web/creators/chikage/trpg/scheduler/js/share.js";

const schedule = {
    id: "schedule-abc123",
    title: "千景卓 日程調整",
    startDate: "2026-09-01",
    endDate: "2026-09-14",
    startMinute: 1140,
    endMinute: 1440,
    participants: [
        { displayName: "千景", role: "owner", required: true },
        { displayName: "太郎", role: "participant", required: false }
    ]
};

test("Share payload round-trips the schedule definition through a URL hash", () => {
    const encoded = encodeSchedulePayload(schedule);
    const route = readSharePayload(`#g=${encoded}`);

    assert.equal(route.type, "payload");
    assert.equal(route.scheduleId, schedule.id);
    assert.equal(route.data.t, schedule.title);
    assert.equal(route.data.s, schedule.startDate);
    assert.equal(route.data.e, schedule.endDate);
    assert.equal(route.data.sm, schedule.startMinute);
    assert.equal(route.data.em, schedule.endMinute);
});

test("Share payload never leaks answers and only carries owner/required names", () => {
    const encoded = encodeSchedulePayload(schedule);
    const route = readSharePayload(`#g=${encoded}`);

    assert.deepEqual(route.data.p, ["千景"]);
    assert.equal("responses" in route.data, false);
});

test("Plain id hashes remain supported for organizers returning to a schedule", () => {
    const route = readSharePayload("#schedule-xyz");

    assert.equal(route.type, "id");
    assert.equal(route.scheduleId, "schedule-xyz");
});

test("Empty or malformed hashes resolve to no route", () => {
    assert.equal(readSharePayload("#"), null);
    assert.equal(readSharePayload(""), null);
    assert.equal(readSharePayload("#g=!!!not-base64!!!"), null);
});
