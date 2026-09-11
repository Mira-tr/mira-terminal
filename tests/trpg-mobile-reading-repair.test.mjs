import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

test("Scenarios use their canonical v7 flow while Rules keep the shared mobile repair", async () => {
    const [scenarios, rules] = await Promise.all([
        read("apps/web/creators/chikage/trpg/scenarios/index.html"),
        read("apps/web/creators/chikage/trpg/rules/index.html")
    ]);

    assert.match(scenarios, /scenario-library-v6\.css[\s\S]*scenario-library-v7\.css/);
    assert.doesNotMatch(scenarios, /mobile-reading-repair\.css/);
    assert.doesNotMatch(scenarios, /reference-clarity\.css/);
    assert.match(rules, /rules-v5\.css[\s\S]*mobile-reading-repair\.css/);
});

test("Scenario v7 keeps compact result geometry in normal flow at every width", async () => {
    const css = await read("apps/web/creators/chikage/trpg/css/scenario-library-v7.css");

    assert.match(css, /\.scenario-list--compact \.scenario-item\s*\{[\s\S]*grid-template-areas:[\s\S]*"header header"[\s\S]*"meta actions"/);
    assert.match(css, /\.scenario-list--compact \.scenario-card-header\s*\{[\s\S]*grid-template-areas:\s*"title favorite"/);
    assert.match(css, /\.scenario-list--compact \.scenario-meta[\s\S]*position:\s*static !important/);
    assert.match(css, /\.scenario-list--compact \.scenario-actions[\s\S]*position:\s*static !important/);
    assert.match(css, /@media \(max-width: 760px\)[\s\S]*"header"[\s\S]*"meta"[\s\S]*"actions"/);
});

test("mobile Rules removes the inherited desktop panel and compacts deep-link controls", async () => {
    const css = await read("apps/web/creators/chikage/trpg/css/mobile-reading-repair.css");

    assert.match(css, /body\.trpg-v3\.rules-page \.rules-document\s*\{[\s\S]*border:\s*0 !important/);
    assert.match(css, /body\.trpg-v3\.rules-page \.rules-document\s*\{[\s\S]*background:\s*transparent !important/);
    assert.match(css, /body\.rules-page \.rule-deep-link--button[\s\S]*font:\s*800 \.64rem/);
    assert.match(css, /body\.rules-page \.rules-system-description\s*\{[\s\S]*display:\s*none/);
});
