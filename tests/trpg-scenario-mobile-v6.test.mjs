import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

test("Scenario Library v6 loads after legacy presentation layers", async () => {
    const page = await read("apps/web/creators/chikage/trpg/scenarios/index.html");

    assert.match(page, /reference-clarity\.css[\s\S]*scenario-library-v6\.css/);
    assert.match(page, />タグを解除</);
});

test("Scenario list keeps rating in metadata and limits browse-card tag noise", async () => {
    const list = await read("apps/web/creators/chikage/trpg/js/scenarioList.js");

    assert.match(list, /const VISIBLE_TAG_LIMIT = 3;/);
    assert.match(list, /meta\.append\([\s\S]*createRatingBadge\(scenario\.rating\)[\s\S]*createDataBlock\("システム"/);
    assert.doesNotMatch(list, /createTitleBlock\(scenario\),\s*createRatingBadge/);
    assert.match(list, /scenario-data--\$\{kind\}/);
    assert.match(list, /scenario-meta-rating/);
});

test("Scenario Library v6 makes phone list scanning the default visual hierarchy", async () => {
    const css = await read("apps/web/creators/chikage/trpg/css/scenario-library-v6.css");

    assert.match(css, /\.library-control-bar\s*\{[\s\S]*position:\s*static !important/);
    assert.match(css, /\.active-filter-label\s*\{[\s\S]*display:\s*none !important/);
    assert.match(css, /@media \(max-width: 640px\)[\s\S]*\.library-quick-filters\s*\{[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
    assert.match(css, /\.library-more-filters\[open\] \.library-filter-panel\s*\{[\s\S]*max-height:\s*min\(54dvh, 480px\) !important/);
    assert.match(css, /\.scenario-list--compact \.scenario-card-header\s*\{[\s\S]*grid-template-areas:\s*"title favorite"/);
    assert.match(css, /\.scenario-list--compact \.scenario-summary,[\s\S]*\.scenario-list--compact \.tag-list\s*\{[\s\S]*display:\s*none !important/);
    assert.match(css, /\.scenario-list--compact \.scenario-data--type\s*\{[\s\S]*display:\s*none !important/);
    assert.match(css, /\.scenario-list--card \.scenario-summary\s*\{[\s\S]*-webkit-line-clamp:\s*4/);
    assert.match(css, /\.scenario-meta > \.scenario-meta-rating\s*\{[\s\S]*position:\s*static !important/);
});
