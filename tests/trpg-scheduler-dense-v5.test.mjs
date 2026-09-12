import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Scheduler and TRPG overview load one answer observer plus the dense presentation", async () => {
    const scheduler = await read("apps/web/creators/chikage/trpg/scheduler/index.html");
    const overview = await read("apps/web/creators/chikage/trpg/index.html");

    for(const html of [scheduler, overview]){
        const candidateCss = html.indexOf("trpg-vnext-candidate-input.css");
        const v4Css = html.indexOf("trpg-answer-v4.css");
        const denseCss = html.indexOf("trpg-answer-v5-dense.css");
        const v4Js = html.indexOf("answerExperienceV4.js");
        const denseJs = html.indexOf("answerDensityV5.js");

        assert.ok(candidateCss >= 0);
        assert.ok(v4Css >= 0 && denseCss > v4Css);
        assert.ok(v4Js >= 0 && denseJs > v4Js);
        assert.equal((html.match(/answerExperienceV4\.js/g) ?? []).length, 1);
        assert.doesNotMatch(html, /src="[^"]*\/answerExperience\.js"/);
    }
});

test("dense answer enhancement is presentation-only and keeps answer saving untouched", async () => {
    const source = await read("apps/web/creators/chikage/trpg/v2/js/answerDensityV5.js");

    assert.match(source, /scheduler-dense-v5/);
    assert.match(source, /v5-answer-when/);
    assert.match(source, /createElement\("span"\)/);
    assert.match(source, /v5-schedule-summary-head/);
    assert.match(source, /集計/);
    assert.doesNotMatch(source, /innerHTML/);
    assert.doesNotMatch(source, /localStorage|sessionStorage/);
    assert.doesNotMatch(source, /fetch\s*\(/);
    assert.doesNotMatch(source, /relmua:scheduler-answer/);
});

test("phone layout keeps one date per row and a horizontally scrollable participant matrix", async () => {
    const css = await read("apps/web/creators/chikage/trpg/v2/css/trpg-answer-v5-dense.css");

    assert.match(css, /grid-template-columns:minmax\(96px,1fr\) 138px/);
    assert.match(css, /repeat\(var\(--participant-count,1\),60px\)/);
    assert.match(css, /overflow-x:auto!important/);
    assert.match(css, /position:sticky!important;left:0!important/);
    assert.match(css, /\.v2-schedule-table__desktop-cells\{display:contents!important\}/);
    assert.match(css, /\.v2-schedule-table__summary\{position:sticky/);
});

test("browse matrix rows stay static because participant answers are already visible", async () => {
    const app = await read("apps/web/creators/chikage/trpg/v2/js/app.js");
    const css = await read("apps/web/creators/chikage/trpg/v2/css/trpg-answer-v5-dense.css");
    const start = app.indexOf("function compactScheduleRow");
    const end = app.indexOf("function voteEditor", start);
    const row = app.slice(start, end);

    assert.match(row, /el\("div", \{ className: "v2-schedule-table__row" \}/);
    assert.match(row, /v2-schedule-table__row-content/);
    assert.doesNotMatch(row, /el\("details"/);
    assert.doesNotMatch(row, /slotAggregate\(detail, slot\)/);
    assert.match(css, /\.v2-schedule-table__row>\.v2-schedule-table__row-content\{min-height:42px!important/);
});
