import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
    candidateFromDisplayedSlot,
    classifyCandidateAgainstBusy,
    parseCalendarBusyIntervals
} from "../apps/web/creators/chikage/trpg/v2/js/calendarBusyModel.js";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const RANGE = {
    rangeStart: Date.parse("2026-09-01T00:00:00+09:00"),
    rangeEnd: Date.parse("2026-10-31T23:59:59+09:00")
};

test("local iCalendar import reduces events to merged busy intervals", () => {
    const ics = [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Private appointment that must not survive parsing",
        "DTSTART;TZID=Asia/Tokyo:20260918T203000",
        "DTEND;TZID=Asia/Tokyo:20260918T220000",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "SUMMARY:Weekly class",
        "DTSTART;TZID=Asia/Tokyo:20260914T090000",
        "DTEND;TZID=Asia/Tokyo:20260914T100000",
        "RRULE:FREQ=WEEKLY;COUNT=3;BYDAY=MO",
        "END:VEVENT",
        "END:VCALENDAR"
    ].join("\r\n");

    const intervals = parseCalendarBusyIntervals(ics, RANGE);
    assert.equal(intervals.length, 4);
    intervals.forEach(interval => {
        assert.deepEqual(Object.keys(interval).sort(), ["end", "start"]);
        assert.equal(typeof interval.start, "number");
        assert.equal(typeof interval.end, "number");
    });
});

test("displayed Scheduler candidates resolve in JST and receive suggestion-only conflict classes", () => {
    const candidate = candidateFromDisplayedSlot({
        month: "SEP",
        day: "18",
        weekday: "FRI",
        timeRange: "20:00 - 24:00"
    }, new Date("2026-09-13T12:00:00+09:00"));

    assert.ok(candidate);
    assert.equal(candidate.dateKey, "2026-09-18");

    const partial = classifyCandidateAgainstBusy([
        {
            start: Date.parse("2026-09-18T20:30:00+09:00"),
            end: Date.parse("2026-09-18T22:00:00+09:00")
        }
    ], candidate);
    assert.equal(partial.state, "partial");
    assert.equal(partial.overlapMinutes, 90);

    const busy = classifyCandidateAgainstBusy([
        { start: candidate.start, end: candidate.end }
    ], candidate);
    assert.equal(busy.state, "busy");

    const free = classifyCandidateAgainstBusy([], candidate);
    assert.equal(free.state, "free");
});

test("calendar UI keeps imported data local and never auto-answers", async () => {
    const source = await read("apps/web/creators/chikage/trpg/v2/js/calendarBusyImportV5.js");
    const shell = await read("apps/web/creators/chikage/trpg/js/shell.js");

    assert.match(source, /accept = "\.ics,text\/calendar"/);
    assert.match(source, /await file\.text\(\)/);
    assert.match(source, /予定名や内容は表示・送信・保存しません/);
    assert.match(source, /最終回答は自分で選んでください/);
    assert.match(source, /classifyCandidateAgainstBusy/);
    assert.doesNotMatch(source, /\.v2-answer[^\n]*\.click\s*\(/);
    assert.doesNotMatch(source, /fetch\s*\(|localStorage|sessionStorage|innerHTML/);
    assert.match(shell, /calendarBusyImportV5\.js/);
    assert.match(shell, /activeKey === "scheduler" \|\| activeKey === "home"/);
});
