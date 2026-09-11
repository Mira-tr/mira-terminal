import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

test("Scenario filters stay in document flow and active filters stay compact", async () => {
    const css = await read("apps/web/creators/chikage/trpg/css/scenario-filter-ux.css");

    assert.match(css, /\.library-control-bar\s*\{[\s\S]*position:\s*static\s*!important/);
    assert.match(css, /\.active-filter-label\s*\{[\s\S]*display:\s*none\s*!important/);
    assert.match(css, /\.active-filter-list\s*\{[\s\S]*flex-wrap:\s*nowrap/);
    assert.match(css, /\.active-filter-chip\s*\{[\s\S]*min-height:\s*28px\s*!important/);
});

test("Scenario phone filters use a two by two layout and a restrained bottom sheet", async () => {
    const css = await read("apps/web/creators/chikage/trpg/css/scenario-filter-ux.css");

    assert.match(css, /@media \(max-width: 640px\)[\s\S]*\.library-quick-filters\s*\{[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
    assert.match(css, /\.library-more-filters\[open\] \.library-filter-panel\s*\{[\s\S]*max-height:\s*min\(62dvh, 540px\)\s*!important/);
    assert.match(css, /width:\s*calc\(100vw - 16px\)\s*!important/);
    assert.doesNotMatch(css, /height:\s*86dvh/);
});

test("Scenario advanced filters only open by the user and load more closes them", async () => {
    const clarity = await read("apps/web/creators/chikage/trpg/js/scenarioClarity.js");

    assert.match(clarity, /scenario-filter-ux\.css/);
    assert.match(clarity, /allowUserOpen/);
    assert.match(clarity, /summary\?\.addEventListener\("pointerdown"/);
    assert.match(clarity, /loadMoreButton\?\.addEventListener\("click", \(\)=>closeAdvancedFilters\(\)\)/);
    assert.match(clarity, /if\(allowUserOpen \|\| advanced\.contains\(document\.activeElement\)\)/);
});
