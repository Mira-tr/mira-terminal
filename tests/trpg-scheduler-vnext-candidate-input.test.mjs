import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
    MAX_TEXT_CANDIDATES,
    parseCandidateLine,
    parseCandidateText
} from "../apps/web/creators/chikage/trpg/v2/js/candidateTextParser.js";

const FIXED_NOW = new Date("2026-09-11T12:00:00+09:00");
const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Scheduler fast input parses compact overnight candidate notation", () => {
    const parsed = parseCandidateLine("9/18 20-24", FIXED_NOW);

    assert.equal(parsed.ok, true);
    assert.deepEqual(parsed.entry, {
        dateKey: "2026-09-18",
        startTime: "20:00",
        endTime: "00:00",
        endsNextDay: true
    });
});

test("Scheduler fast input accepts explicit next-day and Japanese time notation", () => {
    const parsed = parseCandidateLine("9月20日 21時30分〜翌1時", FIXED_NOW);

    assert.equal(parsed.ok, true);
    assert.equal(parsed.entry.dateKey, "2026-09-20");
    assert.equal(parsed.entry.startTime, "21:30");
    assert.equal(parsed.entry.endTime, "01:00");
    assert.equal(parsed.entry.endsNextDay, true);
});

test("Scheduler fast input rolls an omitted past month/day into next year", () => {
    const parsed = parseCandidateLine("1/5 13-18", FIXED_NOW);

    assert.equal(parsed.ok, true);
    assert.equal(parsed.entry.dateKey, "2027-01-05");
    assert.equal(parsed.entry.endsNextDay, false);
});

test("Scheduler fast input deduplicates identical candidates and reports the skipped line", () => {
    const parsed = parseCandidateText("9/18 20-24\n9/18 20:00〜24:00\n9/19 19-23", { now: FIXED_NOW });

    assert.equal(parsed.ok, true);
    assert.equal(parsed.entries.length, 2);
    assert.equal(parsed.warnings.length, 1);
    assert.match(parsed.warnings[0], /2行目/);
});

test("Scheduler fast input reports line-specific invalid dates without applying a valid result", () => {
    const parsed = parseCandidateText("9/18 20-24\n9/31 20-24", { now: FIXED_NOW });

    assert.equal(parsed.ok, false);
    assert.equal(parsed.entries.length, 1);
    assert.match(parsed.errors.join("\n"), /2行目/);
    assert.match(parsed.errors.join("\n"), /日付/);
});

test("Scheduler fast input enforces the existing 120 candidate batch limit", () => {
    const lines = [];
    const start = new Date("2026-09-12T00:00:00+09:00");

    for(let index = 0; index < MAX_TEXT_CANDIDATES + 1; index += 1){
        const date = new Date(start.getTime() + index * 24 * 60 * 60 * 1000);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        lines.push(`${year}-${month}-${day} 20-24`);
    }

    const parsed = parseCandidateText(lines.join("\n"), { now: FIXED_NOW });

    assert.equal(parsed.ok, false);
    assert.equal(parsed.entries.length, MAX_TEXT_CANDIDATES);
    assert.match(parsed.errors.join("\n"), /120件まで/);
});

test("Scheduler and TRPG Overview both load the candidate input enhancement", async () => {
    const scheduler = await read("apps/web/creators/chikage/trpg/scheduler/index.html");
    const overview = await read("apps/web/creators/chikage/trpg/index.html");

    assert.match(scheduler, /candidateInputExperience\.js/);
    assert.match(overview, /candidateInputExperience\.js/);
});

test("Candidate input enhancement remains presentation-only over the existing composer", async () => {
    const source = await read("apps/web/creators/chikage/trpg/v2/js/candidateInputExperience.js");
    const css = await read("apps/web/creators/chikage/trpg/v2/css/trpg-vnext-candidate-input.css");

    assert.match(source, /入力を候補に反映/);
    assert.match(source, /候補欄へ反映するだけで、まだ保存されません/);
    assert.match(source, /\.v2-calendar__day/);
    assert.match(source, /\.v2-candidate-window/);
    assert.doesNotMatch(source, /innerHTML/);
    assert.doesNotMatch(source, /repository\./);
    assert.doesNotMatch(source, /requestSubmit|\.submit\s*\(/);
    assert.match(css, /@media \(max-width: 640px\)/);
    assert.match(css, /font-size:\s*16px/);
});
