import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Scheduler loads the dense answer layer after the existing v4 behavior", async () => {
    const html = await read("apps/web/creators/chikage/trpg/scheduler/index.html");
    const v4Css = html.indexOf("trpg-answer-v4.css");
    const denseCss = html.indexOf("trpg-answer-v5-dense.css");
    const v4Js = html.indexOf("answerExperienceV4.js");
    const denseJs = html.indexOf("answerDensityV5.js");

    assert.ok(v4Css >= 0 && denseCss > v4Css);
    assert.ok(v4Js >= 0 && denseJs > v4Js);
});

test("dense answer enhancement is presentation-only and keeps answer saving untouched", async () => {
    const source = await read("apps/web/creators/chikage/trpg/v2/js/answerDensityV5.js");

    assert.match(source, /scheduler-dense-v5/);
    assert.match(source, /v5-answer-when/);
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
