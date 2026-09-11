import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

test("Scenario Library v7 owns the final result layout after v6", async () => {
    const page = await read("apps/web/creators/chikage/trpg/scenarios/index.html");

    assert.match(page, /scenario-library-v6\.css[\s\S]*scenario-library-v7\.css/);
    assert.doesNotMatch(page, /mobile-reading-repair\.css/);
    assert.doesNotMatch(page, /reference-clarity\.css/);
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

test("Scenario Library v7 keeps phone list scanning in one normal-flow hierarchy", async () => {
    const [v6, v7] = await Promise.all([
        read("apps/web/creators/chikage/trpg/css/scenario-library-v6.css"),
        read("apps/web/creators/chikage/trpg/css/scenario-library-v7.css")
    ]);

    assert.match(v6, /\.library-control-bar\s*\{[\s\S]*position:\s*static !important/);
    assert.match(v6, /\.active-filter-label\s*\{[\s\S]*display:\s*none !important/);
    assert.match(v6, /@media \(max-width: 640px\)[\s\S]*\.library-quick-filters\s*\{[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
    assert.match(v6, /\.library-more-filters\[open\] \.library-filter-panel\s*\{[\s\S]*max-height:\s*min\(54dvh, 480px\) !important/);

    assert.match(v7, /\.scenario-list--compact \.scenario-card-header\s*\{[\s\S]*grid-template-areas:\s*"title favorite"/);
    assert.match(v7, /\.scenario-list--compact \.scenario-summary,[\s\S]*\.scenario-list--compact \.tag-list\s*\{[\s\S]*display:\s*none !important/);
    assert.match(v7, /\.scenario-list--compact \.scenario-data--type\s*\{[\s\S]*display:\s*none !important/);
    assert.match(v7, /\.scenario-list--compact \.scenario-meta[\s\S]*position:\s*static !important/);
    assert.match(v7, /\.scenario-list--compact \.scenario-actions[\s\S]*position:\s*static !important/);
    assert.match(v7, /@media \(max-width: 760px\)[\s\S]*grid-template-areas:[\s\S]*"header"[\s\S]*"meta"[\s\S]*"actions"/);
});
