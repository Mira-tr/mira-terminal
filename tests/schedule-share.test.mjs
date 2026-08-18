import test from "node:test";
import assert from "node:assert/strict";

import {
    encodeSchedulePayload,
    normalizeSchedulePayload,
    readSharePayload
} from "../apps/web/creators/chikage/trpg/scheduler/js/share.js";

import {
    createScheduleFromSharePayload,
    ensureLocalGuestParticipant
} from "../apps/web/creators/chikage/trpg/scheduler/js/state.js";

const schedule = {
    id: "schedule-abc123",
    title: "千景卓 日程調整",
    startDate: "2026-09-01",
    endDate: "2026-09-14",
    startMinute: 1140,
    endMinute: 1440,
    ownerUserId: "local-user",
    confirmedSlotId: "slot-2026-09-02-1140-1440",
    participants: [
        { displayName: "千景", role: "owner", required: true },
        { displayName: "太郎", role: "participant", required: false },
        { displayName: "花子", role: "participant", required: true }
    ],
    responses: {
        "participant-secret": {
            "slot-2026-09-01-1140-1440": {
                answer: "yes",
                ranges: [{ startMinute: 1200, endMinute: 1380 }]
            }
        }
    }
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

test("Share payload never leaks participants, answers, availability, status, or owner-only fields", () => {
    const encoded = encodeSchedulePayload(schedule);
    const route = readSharePayload(`#g=${encoded}`);
    const json = JSON.stringify(route.data);

    assert.equal("p" in route.data, false);
    assert.equal("participants" in route.data, false);
    assert.equal("responses" in route.data, false);
    assert.equal("availability" in route.data, false);
    assert.equal("confirmedSlotId" in route.data, false);
    assert.equal("ownerUserId" in route.data, false);
    assert.equal(json.includes("太郎"), false);
    assert.equal(json.includes("花子"), false);
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
    assert.equal(readSharePayload("#%E0%A4%A"), null);
});

test("Share payload supports Japanese, emoji, and compact 60 day ranges", () => {
    const encoded = encodeSchedulePayload({
        ...schedule,
        title: "拝啓、願い郵便局の皆様へ 第二陣 🌙",
        startDate: "2026-09-01",
        endDate: "2026-10-30"
    });
    const route = readSharePayload(`#g=${encoded}`);

    assert.equal(route.data.t, "拝啓、願い郵便局の皆様へ 第二陣 🌙");
    assert.equal(route.data.s, "2026-09-01");
    assert.equal(route.data.e, "2026-10-30");
    assert.ok(encoded.length < 400);
});

test("Missing, impossible, or oversized payloads are rejected", () => {
    assert.equal(normalizeSchedulePayload({ v: 2, i: "x" }), null);
    assert.equal(normalizeSchedulePayload({
        v: 2,
        i: "x",
        t: "bad",
        s: "2026-09-30",
        e: "2026-09-01",
        sm: 1200,
        em: 1140
    }), null);
    assert.equal(readSharePayload(`#g=${"a".repeat(4097)}`), null);
});

test("Guest schedules imported from payload do not include remote participant names", () => {
    const route = readSharePayload(`#g=${encodeSchedulePayload(schedule)}`);
    const imported = createScheduleFromSharePayload(route.data, "guest-user");

    assert.equal(imported.schedule.title, schedule.title);
    assert.equal(imported.schedule.ownerUserId, "owner-remote");
    assert.deepEqual(imported.schedule.participants.map(participant => participant.displayName), ["主催者", "ゲスト"]);
    assert.equal(imported.schedule.participants[1].userId, "guest-user");
});

test("Opening the same shared schedule again reuses the local guest participant", () => {
    const route = readSharePayload(`#g=${encodeSchedulePayload(schedule)}`);
    const imported = createScheduleFromSharePayload(route.data, "guest-user");
    const firstId = ensureLocalGuestParticipant(imported.schedule, "guest-user");
    const secondId = ensureLocalGuestParticipant(imported.schedule, "guest-user");

    assert.equal(firstId, imported.activeParticipantId);
    assert.equal(secondId, imported.activeParticipantId);
    assert.equal(imported.schedule.participants.filter(participant => participant.userId === "guest-user").length, 1);
});
