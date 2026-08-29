import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    createDashboardViewModel,
    createScheduleBundleViewModel
} from "../apps/web/creators/chikage/trpg/v2/js/sessionViewModel.js";

const ROOT = new URL("../", import.meta.url);
const MIGRATION_PATH = "supabase/migrations/20260830120000_trpg_v6_round_sessions.sql";

test("Scheduler V6 adds durable rounds and sessions without destructive schema work", async () => {
    const sql = await read(MIGRATION_PATH);

    [
        "create table if not exists public.schedule_rounds",
        "create table if not exists public.schedule_sessions",
        "trpg_v6_create_round",
        "trpg_v6_add_candidates",
        "trpg_v6_confirm_recommendation_plan",
        "trpg_v6_update_session_status"
    ].forEach(value => assert.match(sql, new RegExp(value.replaceAll(".", "\\."), "i")));

    assert.match(sql, /insert into public\.schedule_rounds \(schedule_id, sequence,[\s\S]+schedule\.id,[\s\S]+\n\s*1,/);
    assert.match(sql, /update public\.schedule_slots[\s\S]+set round_id =/);
    assert.match(sql, /insert into public\.schedule_sessions[\s\S]+from public\.schedule_confirmed_slots/);
    assert.match(sql, /round_item\.status = 'open'/);
    assert.doesNotMatch(sql, /drop table|drop column|truncate|delete from public\.schedule_slots/i);
});

test("Schedule detail isolates active Round candidates and responses while retaining session history", () => {
    const detail = createScheduleBundleViewModel({
        schedule: { id: "schedule-a", owner_id: "owner-a", title: "長期卓" },
        me: { participantId: "member-a", role: "owner" },
        rounds: [
            { id: "round-1", sequence: 1, status: "confirmed", target_minutes: 360 },
            { id: "round-2", sequence: 2, status: "open", target_minutes: 240 }
        ],
        slots: [
            { id: "slot-old", round_id: "round-1", status: "active", revision: 1, sort_order: 0 },
            { id: "slot-current", round_id: "round-2", status: "active", revision: 2, sort_order: 1 }
        ],
        participants: [{ id: "member-a", role: "owner", display_name: "KP", sort_order: 0 }],
        responses: [
            { participant_id: "member-a", slot_id: "slot-old", answer: "yes", candidate_revision: 1 },
            { participant_id: "member-a", slot_id: "slot-current", answer: "maybe", candidate_revision: 2 }
        ],
        sessions: [{
            id: "session-1",
            round_id: "round-1",
            sequence: 1,
            status: "scheduled",
            starts_at: "2030-01-02T11:00:00.000Z",
            ends_at: "2030-01-02T14:00:00.000Z"
        }]
    }, "owner-a");

    assert.equal(detail.activeRound.id, "round-2");
    assert.deepEqual(detail.slots.map(slot => slot.id), ["slot-current"]);
    assert.deepEqual(detail.responses.map(response => response.slot_id), ["slot-current"]);
    assert.equal(detail.sessions.length, 1);
});

test("Dashboard derives NEXT SESSION from durable scheduled sessions and ACTION REQUIRED from the open Round", () => {
    const dashboard = createDashboardViewModel({
        schedules: [{ id: "schedule-a", share_id: "share-a", title: "長期卓", owner_id: "owner-a", status: "collecting" }],
        participants: [{ id: "member-a", schedule_id: "schedule-a", user_id: "owner-a", role: "owner", sort_order: 0 }],
        rounds: [
            { id: "round-1", schedule_id: "schedule-a", sequence: 1, status: "confirmed" },
            { id: "round-2", schedule_id: "schedule-a", sequence: 2, status: "open" }
        ],
        slots: [
            { id: "slot-old", schedule_id: "schedule-a", round_id: "round-1", status: "active", revision: 1, sort_order: 0 },
            { id: "slot-current", schedule_id: "schedule-a", round_id: "round-2", status: "active", revision: 1, sort_order: 1 }
        ],
        responses: [{ schedule_id: "schedule-a", participant_id: "member-a", slot_id: "slot-old", answer: "yes", candidate_revision: 1 }],
        sessions: [{
            id: "session-a",
            schedule_id: "schedule-a",
            round_id: "round-1",
            sequence: 1,
            status: "scheduled",
            starts_at: "2030-01-02T11:00:00.000Z",
            ends_at: "2030-01-02T14:00:00.000Z"
        }]
    }, "owner-a", new Date("2030-01-01T00:00:00.000Z"));

    assert.equal(dashboard.nextSession.title, "長期卓");
    assert.equal(dashboard.actionRequired[0].unansweredCount, 1);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
