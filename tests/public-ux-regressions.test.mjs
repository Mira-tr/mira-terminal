import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Works keeps the current destination first in the mobile Creator rail", async () => {
    const css = await read("apps/web/creators/chikage/css/works-v2.css");

    assert.match(css, /@media \(max-width: 900px\)/);
    assert.match(css, /\.chikage-page--works \.creator-local-nav a\[aria-current="page"\][\s\S]*?order:\s*-1/);
});

test("Scenario favorites preserve an already expanded result shelf", async () => {
    const source = await read("apps/web/creators/chikage/trpg/js/scenarioClarity.js");

    assert.match(source, /\.favorite-button, \.modal-favorite-button/);
    assert.match(source, /favoriteRestoreTarget\s*=\s*scenarioList\.querySelectorAll/);
    assert.match(source, /queueMicrotask\(restoreExpandedScenarioCount\)/);
    assert.match(source, /loadMoreButton\.click\(\)/);
});
