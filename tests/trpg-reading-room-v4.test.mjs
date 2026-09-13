import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

test("Scenario Library v5 keeps the library hero independent from legacy shelf artwork", async ()=>{
    const page = await read("apps/web/creators/chikage/trpg/scenarios/index.html");

    assert.match(page, /class="library-hero"/);
    assert.doesNotMatch(page, /class="[^"]*trpg-library-intro[^"]*"/);
    assert.match(page, /scenario-library-v5\.css/);
    assert.doesNotMatch(page, /scenario-library-v4\.css/);
});

test("House Rules v5 uses a dedicated multi-system database presentation layer", async ()=>{
    const [page, styles] = await Promise.all([
        read("apps/web/creators/chikage/trpg/rules/index.html"),
        read("apps/web/creators/chikage/trpg/rules/css/rules-v5.css")
    ]);

    assert.match(page, /class="trpg-v3 rules-page rules-database"/);
    assert.doesNotMatch(page, /class="[^"]*trpg-library-page[^"]*"/);
    assert.match(page, /class="rules-hero"/);
    assert.match(page, /rules-hero__meta/);
    assert.match(page, /rules-v5\.css/);
    assert.doesNotMatch(page, /rules-v4\.css/);
    assert.match(page, /class="rules-document"/);
    assert.doesNotMatch(page, /class="search-panel rules-document"/);

    assert.match(styles, /\.rules-v5-shell\s*{[\s\S]*grid-template-columns:/);
    assert.match(styles, /\.rules-system-panel\s*{[\s\S]*position:\s*sticky;/);
    assert.match(styles, /\.rules-toolbar\s*{[\s\S]*position:\s*static;/);
    assert.match(styles, /@media\(max-width:900px\)/);
    assert.match(styles, /\.rules-v5-shell\{grid-template-columns:1fr;/);
});
