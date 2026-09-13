import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ultimateCss = readFileSync("apps/web/creators/chikage/css/chikage-ultimate.css", "utf8");
const rulesHtml = readFileSync("apps/web/creators/chikage/trpg/rules/index.html", "utf8");
const schedulerHtml = readFileSync("apps/web/creators/chikage/trpg/scheduler/index.html", "utf8");

test("active Rules and Scheduler pages load the final Chikage presentation layer", () => {
    assert.match(rulesHtml, /chikage-ultimate\.css/);
    assert.match(schedulerHtml, /chikage-ultimate\.css/);
});

test("House Rules search remains readable while typing", () => {
    assert.match(
        ultimateCss,
        /body\.rules-page \.rules-search-input\{[\s\S]*?min-height:50px;[\s\S]*?font-size:1rem;/
    );
    assert.match(
        ultimateCss,
        /@media \(max-width:760px\)\{[\s\S]*?body\.rules-page \.rules-search-input\{[\s\S]*?min-height:52px;[\s\S]*?font-size:16px;/
    );
    assert.match(ultimateCss, /caret-color:var\(--ch-ultimate-accent-bright\);/);
});

test("Scheduler mobile answer controls cannot cover the input rows", () => {
    assert.match(
        ultimateCss,
        /@media \(max-width:760px\)\{[\s\S]*?body\.scheduler-v7-page \.v4-answer-editor\{[\s\S]*?overflow:visible;[\s\S]*?body\.scheduler-v7-page \.v4-answer-controls\{[\s\S]*?position:static !important;[\s\S]*?top:auto !important;/
    );
});

test("Scheduler form fields stay inside the viewport and avoid iOS input zoom", () => {
    assert.match(
        ultimateCss,
        /body\.scheduler-v7-page :where\(\.v2-form,\.v2-form label,\.v2-form input,\.v2-form select,\.v2-form textarea,\.vnext-candidate-paste,\.vnext-candidate-paste textarea\)\{[\s\S]*?min-width:0;[\s\S]*?max-width:100%;/
    );
    assert.match(
        ultimateCss,
        /body\.scheduler-v7-page :where\(\.v2-form input,\.v2-form select,\.v2-form textarea,\.vnext-candidate-paste textarea\)\{[\s\S]*?font-size:16px;[\s\S]*?scroll-margin-top:calc\(var\(--scheduler-v7-header-offset,112px\) \+ 20px\);/
    );
});
