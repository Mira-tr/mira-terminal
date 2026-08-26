import test from "node:test";
import assert from "node:assert/strict";

import {
    applyComposerBulk,
    addComposerWindow,
    buildCandidateBatch,
    combineDurationMinutes,
    createCandidateComposer,
    createMonthDays,
    formatCandidateTime,
    formatDurationMinutes,
    resolveDiscordDisplayName,
    toggleComposerDate,
    updateComposerBulk,
    updateComposerSelection,
    updateComposerWindow
} from "../apps/web/creators/chikage/trpg/v2/js/schedulerComposer.js";

test("Discord display names prefer human-readable Discord metadata and never provider IDs", () => {
    assert.equal(resolveDiscordDisplayName({
        global_name: "千景",
        username: "chikage_0001",
        provider_id: "123456789012345678"
    }), "千景");
    assert.equal(resolveDiscordDisplayName({
        full_name: "千景",
        name: "chikage_0001",
        provider_id: "123456789012345678"
    }), "千景");
    assert.equal(resolveDiscordDisplayName({
        provider_id: "123456789012345678",
        sub: "123456789012345678"
    }), "RELMUA User");
});

test("candidate calendar exposes full selectable month rows and toggles dates independently", () => {
    const composer = createCandidateComposer(new Date("2026-11-01T00:00:00+09:00"));
    const days = createMonthDays(composer.month);
    const first = days.find(Boolean);
    const last = [...days].reverse().find(Boolean);
    const selected = toggleComposerDate(composer, "2026-11-03");
    const cleared = toggleComposerDate(selected, "2026-11-03");

    assert.equal(composer.month, "2026-11");
    assert.equal(first.dateKey, "2026-11-01");
    assert.equal(last.dateKey, "2026-11-30");
    assert.equal(days.length % 7, 0);
    assert.deepEqual(Object.keys(selected.selections), ["2026-11-03"]);
    assert.deepEqual(cleared.selections, {});
});

test("bulk time updates can preserve individual overrides", () => {
    let composer = createCandidateComposer(new Date("2026-11-01T00:00:00+09:00"));
    composer = toggleComposerDate(composer, "2026-11-03");
    composer = toggleComposerDate(composer, "2026-11-07");
    composer = updateComposerSelection(composer, "2026-11-07", {
        startTime: "21:00",
        endTime: "01:00",
        endsNextDay: true
    });
    composer = updateComposerBulk(composer, {
        startTime: "19:00",
        endTime: "23:00",
        endsNextDay: false
    });
    composer = applyComposerBulk(composer, "unmodified");

    assert.deepEqual(composer.selections["2026-11-03"], [{
        startTime: "19:00",
        endTime: "23:00",
        endsNextDay: false,
        isOverridden: false
    }]);
    assert.deepEqual(composer.selections["2026-11-07"], [{
        startTime: "21:00",
        endTime: "01:00",
        endsNextDay: true,
        isOverridden: true
    }]);
});

test("candidate batches create independent Japan-time overnight candidates", () => {
    let composer = createCandidateComposer(new Date("2026-11-01T00:00:00+09:00"));
    composer = toggleComposerDate(composer, "2026-11-03");
    composer = toggleComposerDate(composer, "2026-11-07");
    composer = updateComposerSelection(composer, "2026-11-03", {
        startTime: "22:00",
        endTime: "02:00",
        endsNextDay: true
    });
    composer = updateComposerSelection(composer, "2026-11-07", {
        startTime: "20:00",
        endTime: "23:00",
        endsNextDay: false
    });

    const result = buildCandidateBatch(composer, 240);

    assert.equal(result.ok, true);
    assert.equal(result.candidates.length, 2);
    assert.deepEqual(result.candidates[0], {
        startsAt: "2026-11-03T13:00:00.000Z",
        endsAt: "2026-11-03T17:00:00.000Z",
        label: ""
    });
    assert.match(result.warnings[0], /11\/07/);
    assert.equal(formatCandidateTime(composer.selections["2026-11-03"][0]), "22:00 - 翌02:00");
    assert.equal(formatDurationMinutes(270), "4時間30分");
    assert.equal(combineDurationMinutes(4, 30), 270);
    assert.equal(combineDurationMinutes(0, 10), null);
});

test("candidate composer supports multiple independent time windows on one selected date", () => {
    let composer = createCandidateComposer(new Date("2026-11-01T00:00:00+09:00"));
    composer = toggleComposerDate(composer, "2026-11-19");
    composer = addComposerWindow(composer, "2026-11-19");
    composer = updateComposerWindow(composer, "2026-11-19", 0, {
        startTime: "13:00",
        endTime: "18:00",
        endsNextDay: false
    });
    composer = updateComposerWindow(composer, "2026-11-19", 1, {
        startTime: "21:00",
        endTime: "02:00",
        endsNextDay: true
    });

    const result = buildCandidateBatch(composer, 0);

    assert.equal(result.ok, true);
    assert.equal(result.candidates.length, 2);
    assert.match(result.candidates[0].startsAt, /2026-11-19T04:00:00\.000Z/);
    assert.match(result.candidates[1].endsAt, /2026-11-19T17:00:00\.000Z/);
});

test("candidate validation requires an explicit next-day choice and rejects giant ranges", () => {
    let composer = createCandidateComposer(new Date("2026-11-01T00:00:00+09:00"));
    composer = toggleComposerDate(composer, "2026-11-03");
    composer = updateComposerSelection(composer, "2026-11-03", {
        startTime: "22:00",
        endTime: "02:00",
        endsNextDay: false
    });

    const invalid = buildCandidateBatch(composer, 0);

    assert.equal(invalid.ok, false);
    assert.match(invalid.errors[0], /翌日終了/);

    composer = updateComposerSelection(composer, "2026-11-03", {
        startTime: "00:00",
        endTime: "12:00",
        endsNextDay: true
    });

    const tooLong = buildCandidateBatch(composer, 0);

    assert.equal(tooLong.ok, false);
    assert.match(tooLong.errors[0], /30時間以内/);
});
