import assert from "node:assert/strict";
import test from "node:test";

import {
    createRecommendationSnapshot,
    evaluateScheduleCandidate,
    formatRecommendationRange,
    recommendSchedule
} from "../apps/web/creators/chikage/trpg/v2/js/recommendationEngine.js";

const slot = {
    id: "slot-a",
    starts_at: "2026-09-18T11:00:00.000Z",
    start_minute: 1200,
    end_minute: 1440
};

const participants = [
    { id: "kp", role: "owner", required: true },
    { id: "a", role: "participant", required: true },
    { id: "b", role: "participant", required: true }
];

function response(participantId, answer, ranges = []){
    return { participant_id: participantId, slot_id: "slot-a", answer, ranges };
}

test("all YES produces a full common candidate window and a recommendation", () => {
    const result = evaluateScheduleCandidate({
        slot,
        participants,
        responses: [response("kp", "yes"), response("a", "yes"), response("b", "yes")],
        preferredMinutes: 240
    });

    assert.equal(result.classification, "recommended");
    assert.deepEqual(result.commonRanges, [{ startMinute: 1200, endMinute: 1440 }]);
    assert.equal(result.continuousMinutes, 240);
});

test("partial response ranges intersect continuously and support multiple ranges", () => {
    const result = evaluateScheduleCandidate({
        slot,
        participants,
        responses: [
            response("kp", "yes"),
            response("a", "maybe", [{ startMinute: 1260, endMinute: 1440 }]),
            response("b", "maybe", [{ startMinute: 1200, endMinute: 1290 }, { startMinute: 1320, endMinute: 1410 }])
        ]
    });

    assert.deepEqual(result.commonRanges, [{ startMinute: 1260, endMinute: 1290 }, { startMinute: 1320, endMinute: 1410 }]);
    assert.equal(result.continuousMinutes, 90);
    assert.equal(result.classification, "usable");
});

test("a disjoint total is never misrepresented as one continuous preferred duration", () => {
    const result = evaluateScheduleCandidate({
        slot,
        participants,
        responses: [
            response("kp", "yes"),
            response("a", "maybe", [{ startMinute: 1200, endMinute: 1320 }, { startMinute: 1380, endMinute: 1440 }]),
            response("b", "yes")
        ],
        preferredMinutes: 180,
        minimumMinutes: 60
    });

    assert.equal(result.continuousMinutes, 120);
    assert.equal(result.meetsPreferred, false);
    assert.equal(result.meetsMinimum, true);
});

test("no, unknown, unanswered, and stale required responses have distinct recommendation states", () => {
    const base = [response("kp", "yes"), response("a", "yes")];
    assert.equal(evaluateScheduleCandidate({ slot, participants, responses: [...base, response("b", "no")] }).classification, "blocked");
    assert.equal(evaluateScheduleCandidate({ slot, participants, responses: [...base, response("b", "maybe")] }).classification, "pending");
    assert.equal(evaluateScheduleCandidate({ slot, participants, responses: base }).classification, "pending");
    assert.equal(evaluateScheduleCandidate({ slot, participants, responses: [...base, { ...response("b", "yes"), stale: true }] }).classification, "stale");
});

test("optional viewers do not block required-member availability", () => {
    const result = evaluateScheduleCandidate({
        slot,
        participants: [...participants.slice(0, 2), { id: "viewer", role: "viewer", required: false }],
        responses: [response("kp", "yes"), response("a", "yes"), response("viewer", "no")]
    });

    assert.equal(result.classification, "usable");
    assert.equal(result.requiredCount, 2);
});

test("legacy participant required flags do not silently exclude a normal PL", () => {
    const result = evaluateScheduleCandidate({
        slot,
        participants: [{ id: "kp", role: "owner", required: true }, { id: "pl", role: "participant", required: false }],
        responses: [response("kp", "yes")]
    });

    assert.equal(result.requiredCount, 2);
    assert.equal(result.counts.unanswered, 1);
    assert.equal(result.classification, "pending");
});

test("recommendation ranking keeps exact ties together and favours full confirmed availability", () => {
    const slots = [
        { ...slot, id: "slot-b", starts_at: "2026-09-19T11:00:00.000Z" },
        { ...slot, id: "slot-c", starts_at: "2026-09-20T11:00:00.000Z" }
    ];
    const responses = slots.flatMap(item => [
        { participant_id: "kp", slot_id: item.id, answer: "yes" },
        { participant_id: "a", slot_id: item.id, answer: "yes" },
        { participant_id: "b", slot_id: item.id, answer: item.id === "slot-c" ? "maybe" : "yes" }
    ]);
    const result = recommendSchedule({ slots, participants, responses, preferredMinutes: 240 });

    assert.equal(result.recommended.length, 1);
    assert.equal(result.recommended[0].slot.id, "slot-b");
    assert.equal(result.other[0].classification, "pending");
});

test("overnight ranges format and snapshot includes relevant update timestamps", () => {
    assert.equal(formatRecommendationRange({ startMinute: 1320, endMinute: 1560 }), "22:00 - 翌02:00");
    assert.equal(createRecommendationSnapshot({
        slots: [{ updated_at: "2026-08-26T00:00:00.000Z" }],
        participants: [{ updated_at: "2026-08-26T01:00:00.000Z" }],
        responses: [{ updated_at: "2026-08-26T02:00:00.000Z", ranges: [{ updated_at: "2026-08-26T03:00:00.000Z" }] }]
    }), "2026-08-26T03:00:00.000Z");
});

test("recommendation remains practical for fifty independent candidates", () => {
    const slots = Array.from({ length: 50 }, (_, index) => ({
        ...slot,
        id: `slot-${index}`,
        starts_at: `2026-10-${String((index % 28) + 1).padStart(2, "0")}T11:00:00.000Z`
    }));
    const responses = slots.flatMap(item => participants.map(participant => ({
        participant_id: participant.id,
        slot_id: item.id,
        answer: "yes"
    })));
    const startedAt = performance.now();
    const result = recommendSchedule({ slots, participants, responses, preferredMinutes: 240 });

    assert.equal(result.recommendations.length, 50);
    assert.ok(performance.now() - startedAt < 100, "Fifty candidates should not block the Scheduler UI.");
});
