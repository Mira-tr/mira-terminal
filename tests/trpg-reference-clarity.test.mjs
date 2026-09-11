import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

test("Scenario Library uses v7 as the sole final result layer and keeps filter controls functional", async () => {
    const [page, v6, v7, clarity] = await Promise.all([
        read("apps/web/creators/chikage/trpg/scenarios/index.html"),
        read("apps/web/creators/chikage/trpg/css/scenario-library-v6.css"),
        read("apps/web/creators/chikage/trpg/css/scenario-library-v7.css"),
        read("apps/web/creators/chikage/trpg/js/scenarioClarity.js")
    ]);

    assert.match(page, /scenario-library-v5\.css[\s\S]*scenario-library-v6\.css[\s\S]*scenario-library-v7\.css/);
    assert.doesNotMatch(page, /mobile-reading-repair\.css/);
    assert.doesNotMatch(page, /reference-clarity\.css/);
    assert.match(page, /id="filterSheetDoneBtn"/);
    assert.match(page, />その他の条件</);
    assert.match(page, />並び替え</);
    assert.match(page, /scenarioClarity\.js/);

    assert.match(v7, /\.library-favorite-toggle input\s*\{[\s\S]*width:\s*1px !important/);
    assert.match(v7, /\.scenario-list--compact \.scenario-actions[\s\S]*position:\s*static !important/);
    assert.match(v7, /\.scenario-list--compact \.favorite-button[\s\S]*position:\s*static !important/);
    assert.match(v6, /@media \(min-width: 641px\)[\s\S]*\.library-more-filters\[open\] \.library-filter-panel[\s\S]*position:\s*absolute/);
    assert.match(v6, /@media \(max-width: 640px\)[\s\S]*\.library-more-filters\[open\] \.library-filter-panel[\s\S]*position:\s*fixed !important/);
    assert.match(clarity, /document\.body\.classList\.toggle\("is-filter-sheet-open"/);
    assert.match(clarity, /doneButton\?\.addEventListener/);
});

test("House Rules removes low-value controls while retaining hash deep-link behavior", async () => {
    const [page, css, clarity, rules] = await Promise.all([
        read("apps/web/creators/chikage/trpg/rules/index.html"),
        read("apps/web/creators/chikage/trpg/css/reference-clarity.css"),
        read("apps/web/creators/chikage/trpg/rules/js/rulesClarity.js"),
        read("apps/web/creators/chikage/trpg/rules/js/rules.js")
    ]);

    assert.match(page, /必要なルールを、すぐ引く。/);
    assert.match(page, /rulesClarity\.js/);
    assert.doesNotMatch(page, /rules-links\.js/);
    assert.doesNotMatch(page, /rules-links\.css/);

    assert.match(clarity, /#rulesQuickModeBtn/);
    assert.match(clarity, /\.remove\(\)/);
    assert.match(clarity, /is-single-system/);
    assert.match(clarity, /section\.open = false/);

    assert.match(css, /\.is-single-system \.rules-system-panel[\s\S]*display:\s*none !important/);
    assert.match(css, /\.is-single-system \.rules-scope[\s\S]*display:\s*none !important/);
    assert.match(css, /\.rule-link-actions\s*\{[\s\S]*display:\s*none !important/);

    assert.match(rules, /function revealHashTarget/);
    assert.match(rules, /window\.addEventListener\("hashchange"/);
});
