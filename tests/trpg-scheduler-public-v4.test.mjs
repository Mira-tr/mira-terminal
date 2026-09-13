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

test("Scheduler Public v4 opens the response table first and keeps answer editing explicit", async () => {
    const [source, app] = await Promise.all([
        read("apps/web/creators/chikage/trpg/v2/js/answerExperienceV4.js"),
        read("apps/web/creators/chikage/trpg/v2/js/app.js")
    ]);

    assert.match(app, /voteMode: false/);
    assert.doesNotMatch(source, /autoOpenedRoutes|button\.click\(\)/);
    assert.match(source, /button\?\.textContent\?\.includes\("投票する"\)[\s\S]*?button\.textContent = "回答を編集"/);
    assert.match(source, /button\?\.textContent\?\.includes\("投票を終える"\)[\s\S]*?button\.textContent = "回答表を見る"/);
});

test("Scheduler keeps the response table as the entry state after switching sessions", async () => {
    const [app, actions] = await Promise.all([
        read("apps/web/creators/chikage/trpg/v2/js/app.js"),
        read("apps/web/creators/chikage/trpg/v2/js/runtime/sessionActions.js")
    ]);

    assert.match(actions, /appState\.voteMode = options\.answerMode === true/);
    assert.match(app, /async function renderJoin\(shareId\)\{\s*appState\.voteMode = false/);
    assert.match(app, /appState\.activeGuest = null;\s*appState\.voteMode = false;/);
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

test("Scheduler Public v4 stacks the answer toolbar on phones so copy and the action cannot collide", async () => {
    const css = await read("apps/web/creators/chikage/trpg/v2/css/trpg-answer-v4.css");

    assert.match(css, /\.v2-schedule-toolbar\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
    assert.match(css, /\.v2-schedule-toolbar>div small\{display:block;max-width:34ch/);
    assert.match(css, /\.v2-schedule-toolbar>\.v2-command\{width:100%/);
});

test("Scheduler and TRPG Overview use Public v4 as the sole answer enhancer", async () => {
    const scheduler = await read("apps/web/creators/chikage/trpg/scheduler/index.html");
    const overview = await read("apps/web/creators/chikage/trpg/index.html");

    for(const html of [scheduler, overview]){
        assert.ok(html.indexOf("trpg-answer-v4.css") > html.indexOf("trpg-vnext-answer.css"));
        assert.ok(html.indexOf("answerExperienceV4.js") >= 0);
        assert.doesNotMatch(html, /src="[^"]*\/answerExperience\.js"/);
    }
    assert.match(scheduler, /1タップで ○△×/);
    assert.match(scheduler, /自動保存されます/);
});
