import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

test("Scenarios and Rules load the final mobile repair after their v5 styles", async () => {
    const [scenarios, rules] = await Promise.all([
        read("apps/web/creators/chikage/trpg/scenarios/index.html"),
        read("apps/web/creators/chikage/trpg/rules/index.html")
    ]);

    assert.match(scenarios, /scenario-library-v5\.css[\s\S]*mobile-reading-repair\.css/);
    assert.match(rules, /rules-v5\.css[\s\S]*mobile-reading-repair\.css/);
});

test("mobile repair owns viewport width and keeps Scenario compact controls in flow", async () => {
    const css = await read("apps/web/creators/chikage/trpg/css/mobile-reading-repair.css");

    assert.match(css, /body\.trpg-v3\.trpg-library-page[\s\S]*width:\s*100%/);
    assert.match(css, /body\.trpg-library-page \.scenario-list--compact \.rating-badge\s*\{[\s\S]*position:\s*static/);
    assert.match(css, /body\.trpg-library-page \.scenario-list--compact \.scenario-actions\s*\{[\s\S]*position:\s*static/);
    assert.match(css, /body\.trpg-library-page \.library-quick-filters\s*\{[\s\S]*overflow-x:\s*auto/);
});

test("mobile Rules removes the inherited desktop panel and compacts deep-link controls", async () => {
    const css = await read("apps/web/creators/chikage/trpg/css/mobile-reading-repair.css");

    assert.match(css, /body\.trpg-v3\.rules-page \.rules-document\s*\{[\s\S]*border:\s*0 !important/);
    assert.match(css, /body\.trpg-v3\.rules-page \.rules-document\s*\{[\s\S]*background:\s*transparent !important/);
    assert.match(css, /body\.rules-page \.rule-deep-link--button[\s\S]*font:\s*800 \.64rem/);
    assert.match(css, /body\.rules-page \.rules-system-description\s*\{[\s\S]*display:\s*none/);
});
