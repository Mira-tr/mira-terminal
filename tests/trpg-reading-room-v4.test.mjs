import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

test("Scenario Library v4 hero does not inherit the legacy shelf artwork", async ()=>{
    const page = await read("apps/web/creators/chikage/trpg/scenarios/index.html");

    assert.match(page, /class="trpg-v3-intro library-hero"/);
    assert.doesNotMatch(page, /class="[^"]*trpg-library-intro[^"]*"/);
    assert.match(page, /scenario-library-v4\.css/);
});

test("House Rules uses a dedicated reading-room presentation layer", async ()=>{
    const [page, styles] = await Promise.all([
        read("apps/web/creators/chikage/trpg/rules/index.html"),
        read("apps/web/creators/chikage/trpg/rules/css/rules-v4.css")
    ]);

    assert.match(page, /class="trpg-v3 rules-page rules-reading-room"/);
    assert.doesNotMatch(page, /class="[^"]*trpg-library-page[^"]*"/);
    assert.match(page, /class="trpg-v3-intro rules-hero"/);
    assert.match(page, /rules-hero__meta/);
    assert.match(page, /rules-v4\.css/);
    assert.match(page, /class="rules-document rules-reading-room__document"/);
    assert.doesNotMatch(page, /class="search-panel rules-document"/);

    assert.match(styles, /\.rules-page \.rules-reference__bar\s*{/);
    assert.match(styles, /position:\s*sticky;/);
    assert.match(styles, /\.rules-page \.rules-system\s*{[\s\S]*grid-template-columns:/);
    assert.match(styles, /\.rules-page \.rules-system-hero\s*{[\s\S]*position:\s*sticky;/);
    assert.match(styles, /@media \(max-width: 820px\)/);
    assert.match(styles, /grid-template-columns:\s*1fr;/);
});
