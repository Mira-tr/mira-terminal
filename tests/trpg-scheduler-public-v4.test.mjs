import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, ROOT), "utf8");

test("Scheduler Public v4 queues rapid one-tap answers instead of waiting for each save", async () => {
    const source = await read("apps/web/creators/chikage/trpg/v2/js/answerExperienceV4.js");

    assert.match(source, /pendingAnswers/);
    assert.match(source, /optimisticAnswers/);
    assert.match(source, /queueAnswer\(slotIndex, answer, card\)/);
    assert.match(source, /pumpAnswerQueue/);
    assert.match(source, /stopImmediatePropagation\(\)/);
    assert.match(source, /symbol === "△" \? "maybe"/);
    assert.match(source, /relmua:scheduler-answer/);
    assert.doesNotMatch(source, /innerHTML\s*=/);
});

test("Scheduler Public v4 keeps unanswered navigation and filtering next to progress", async () => {
    const source = await read("apps/web/creators/chikage/trpg/v2/js/answerExperienceV4.js");

    assert.match(source, /次の未回答へ/);
    assert.match(source, /未回答だけ/);
    assert.match(source, /すべて表示/);
    assert.match(source, /focusNextUnanswered/);
    assert.match(source, /あと \$\{remaining\}件/);
    assert.match(source, /自動保存/);
});

test("Scheduler Public v4 makes rapid controls and desktop matrix sticky without forcing sticky on mobile", async () => {
    const css = await read("apps/web/creators/chikage/trpg/v2/css/trpg-answer-v4.css");

    assert.match(css, /\.v4-answer-controls\{position:sticky/);
    assert.match(css, /\.v4-schedule-matrix \.v2-schedule-table__desktop-head\{position:sticky/);
    assert.match(css, /\.v4-schedule-matrix \.v2-schedule-table__date\{position:sticky/);
    assert.match(css, /@media \(max-width:760px\)[\s\S]+\.v4-schedule-matrix \.v2-schedule-table__desktop-head\{position:static/);
    assert.match(css, /touch-action:manipulation/);
});

test("Scheduler and TRPG Overview load Public v4 before the legacy enhancer", async () => {
    const scheduler = await read("apps/web/creators/chikage/trpg/scheduler/index.html");
    const overview = await read("apps/web/creators/chikage/trpg/index.html");

    for(const html of [scheduler, overview]){
        assert.ok(html.indexOf("trpg-answer-v4.css") > html.indexOf("trpg-vnext-answer.css"));
        assert.ok(html.indexOf("answerExperienceV4.js") < html.indexOf("answerExperience.js"));
    }
    assert.match(scheduler, /1タップで ○△×/);
    assert.match(scheduler, /保存操作は要りません/);
});
