import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createDashboardViewModel } from "../apps/web/creators/chikage/trpg/v2/js/sessionViewModel.js";

const ROOT = new URL("../", import.meta.url);

test("TRPG V8 prioritizes stale answers, then the nearest scheduled Session, without duplicating Upcoming", () => {
    const dashboard = createDashboardViewModel({
        schedules: [
            { id: "schedule-a", title: "調整中の卓", owner_id: "user-a", status: "collecting" },
            { id: "schedule-b", title: "次の卓", owner_id: "user-a", status: "confirmed" },
            { id: "schedule-c", title: "記録の卓", owner_id: "user-a", status: "archived" }
        ],
        participants: [
            { id: "participant-a", schedule_id: "schedule-a", user_id: "user-a", sort_order: 0 },
            { id: "participant-b", schedule_id: "schedule-b", user_id: "user-a", sort_order: 0 },
            { id: "participant-c", schedule_id: "schedule-c", user_id: "user-a", sort_order: 0 }
        ],
        rounds: [{ id: "round-a", schedule_id: "schedule-a", sequence: 2, status: "open" }],
        slots: [{
            id: "slot-a",
            schedule_id: "schedule-a",
            round_id: "round-a",
            status: "active",
            revision: 2,
            sort_order: 0
        }],
        responses: [{
            schedule_id: "schedule-a",
            participant_id: "participant-a",
            slot_id: "slot-a",
            candidate_revision: 1,
            answer: "yes"
        }],
        sessions: [{
            id: "session-next",
            schedule_id: "schedule-b",
            sequence: 1,
            status: "scheduled",
            starts_at: "2030-01-02T11:00:00.000Z",
            ends_at: "2030-01-02T14:00:00.000Z"
        }, {
            id: "session-upcoming",
            schedule_id: "schedule-a",
            sequence: 2,
            status: "scheduled",
            starts_at: "2030-01-05T11:00:00.000Z",
            ends_at: "2030-01-05T14:00:00.000Z"
        }, {
            id: "session-cancelled",
            schedule_id: "schedule-a",
            sequence: 3,
            status: "cancelled",
            starts_at: "2030-01-03T11:00:00.000Z",
            ends_at: "2030-01-03T14:00:00.000Z"
        }, {
            id: "session-recent-old",
            schedule_id: "schedule-c",
            sequence: 1,
            status: "completed",
            starts_at: "2029-12-28T11:00:00.000Z",
            ends_at: "2029-12-28T14:00:00.000Z"
        }, {
            id: "session-recent-new",
            schedule_id: "schedule-c",
            sequence: 2,
            status: "completed",
            starts_at: "2029-12-30T11:00:00.000Z",
            ends_at: "2029-12-30T14:00:00.000Z"
        }]
    }, "user-a", new Date("2030-01-01T00:00:00.000Z"));

    assert.equal(dashboard.actionRequired.length, 1);
    assert.equal(dashboard.actionRequired[0].staleResponseCount, 1);
    assert.equal(dashboard.scheduling[0].responseProgress.pending, 1);
    assert.equal(dashboard.nextSessionEntry.session.id, "session-next");
    assert.deepEqual(dashboard.upcoming.map(entry => entry.session.id), ["session-upcoming"]);
    assert.deepEqual(dashboard.recent.map(entry => entry.session.id), ["session-recent-new", "session-recent-old"]);
});

test("TRPG V8 leaves optional Dashboard sections empty for a new account", () => {
    const dashboard = createDashboardViewModel({}, "user-a", new Date("2030-01-01T00:00:00.000Z"));

    assert.equal(dashboard.nextSession, null);
    assert.deepEqual(dashboard.actionRequired, []);
    assert.deepEqual(dashboard.scheduling, []);
    assert.deepEqual(dashboard.upcoming, []);
    assert.deepEqual(dashboard.recent, []);
});

test("TRPG V8 keeps Home focused on activity and moves navigation to compact tools", async () => {
    const [home, app, css] = await Promise.all([
        read("apps/web/creators/chikage/trpg/index.html"),
        read("apps/web/creators/chikage/trpg/v2/js/app.js"),
        read("apps/web/creators/chikage/trpg/v2/css/trpg-v2-home.css")
    ]);

    assert.match(home, /TRPG DASHBOARD/);
    assert.match(home, /cx-trpg-tool-list/);
    assert.doesNotMatch(home, /PRIMARY ACTIONS/);
    assert.match(app, /function actionRequiredBlock/);
    assert.match(app, /function upcomingBlock/);
    assert.match(app, /function recentBlock/);
    assert.match(css, /v2-dashboard-layout/);
    assert.match(css, /cx-trpg-tool-list/);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
