import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    createCalendarViewModel,
    dateKey,
    formatSessionTime,
    monthRangeIso,
    monthStart,
    shiftMonth
} from "../apps/web/creators/chikage/trpg/calendar/js/calendarViewModel.js";

const ROOT = new URL("../", import.meta.url);

test("TRPG Calendar groups current-month sessions, status history, and the nearest upcoming Session", () => {
    const view = createCalendarViewModel({
        schedules: [
            { id: "schedule-a", title: "四季送り" },
            { id: "schedule-b", title: "贖イ郵便局" }
        ],
        monthSessions: [
            session("session-a", "schedule-a", "scheduled", "2030-08-30", 20 * 60, 25 * 60, 3),
            session("session-b", "schedule-b", "completed", "2030-08-30", 13 * 60, 17 * 60, 2),
            session("session-c", "schedule-a", "cancelled", "2030-08-31", 20 * 60, 24 * 60, 4)
        ],
        upcomingSessions: [
            session("session-a", "schedule-a", "scheduled", "2030-08-30", 20 * 60, 25 * 60, 3),
            session("session-d", "schedule-b", "scheduled", "2030-09-06", 21 * 60, 24 * 60, 4)
        ]
    }, new Date("2030-08-01T03:00:00.000Z"), new Date("2030-08-29T00:00:00.000Z"));

    assert.equal(view.monthLabel, "2030年8月");
    assert.equal(view.sessionsByDate.get("2030-08-30").length, 2);
    assert.equal(view.sessionsByDate.get("2030-08-30")[0].title, "贖イ郵便局");
    assert.equal(view.sessionsByDate.get("2030-08-31")[0].statusLabel, "中止");
    assert.deepEqual(view.upcoming.map(item => item.id), ["session-a", "session-d"]);
    assert.equal(formatSessionTime(view.upcoming[0]), "20:00-翌01:00");
});

test("TRPG Calendar keeps month navigation and Japan month query boundaries stable", () => {
    const august = monthStart(new Date("2030-08-20T15:00:00.000Z"));
    const september = shiftMonth(august, 1);

    assert.equal(dateKey(august), "2030-08-01");
    assert.equal(dateKey(september), "2030-09-01");
    assert.deepEqual(monthRangeIso(august), {
        start: "2030-08-01T00:00:00+09:00",
        end: "2030-09-01T00:00:00+09:00"
    });
});

test("TRPG Calendar provides the formal route, loading/error states, keyboard buttons, and Scheduler deep links", async () => {
    const [html, app, repository] = await Promise.all([
        read("apps/web/creators/chikage/trpg/calendar/index.html"),
        read("apps/web/creators/chikage/trpg/calendar/js/app.js"),
        read("apps/web/creators/chikage/trpg/scheduler/js/supabaseRepository.js")
    ]);

    assert.match(html, /data-trpg-calendar-app/);
    assert.match(html, /href="\.\/" aria-current="page">Calendar/);
    assert.match(app, /renderLoading\(\)/);
    assert.match(app, /renderError\(\)/);
    assert.match(app, /aria-pressed/);
    assert.match(app, /\.\.\/scheduler\/\?schedule=/);
    assert.match(repository, /async loadTrpgV7Calendar/);
    assert.match(repository, /\.gte\("starts_at", monthStart\)/);
    assert.match(repository, /\.limit\(Math\.max\(1, Math\.min\(Number\(upcomingLimit\) \|\| 12, 24\)\)\)/);
});

function session(id, scheduleId, status, localDate, startMinute, endMinute, sequence){
    const startsAt = `${localDate}T${String(Math.floor(startMinute / 60)).padStart(2, "0")}:${String(startMinute % 60).padStart(2, "0")}:00.000Z`;
    return {
        id,
        schedule_id: scheduleId,
        status,
        local_date: localDate,
        start_minute: startMinute,
        end_minute: endMinute,
        starts_at: startsAt,
        ends_at: startsAt,
        sequence
    };
}

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
