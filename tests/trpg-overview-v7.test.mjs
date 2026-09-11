import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

test("TRPG Overview v7 is the final Play Room command layer", async ()=>{
    const html = await read("apps/web/creators/chikage/trpg/index.html");

    assert.match(html, /<body[^>]*trpg-overview-v7/);
    assert.match(html, /遊ぶ前も、[\s\S]*遊んでいる最中も。/);
    assert.match(html, /class="trpg-overview-map"/);
    assert.match(html, /class="trpg-overview-live"/);
    assert.match(html, /class="trpg-overview-route-grid"/);

    const finishCss = html.indexOf("../css/chikage-public-finish.css");
    const overviewCss = html.indexOf("./css/trpg-overview-v7.css");
    assert.ok(finishCss >= 0 && overviewCss > finishCss, "Overview v7 CSS must load after the shared public finish layer");
});

test("TRPG Overview v7 keeps one route per finished public tool", async ()=>{
    const html = await read("apps/web/creators/chikage/trpg/index.html");

    assert.match(html, /href="\.\/scheduler\/"/);
    assert.match(html, /href="\.\/calendar\/"/);
    assert.match(html, /href="\.\/scenarios\/"/);
    assert.match(html, /href="\.\/picker\/"/);
    assert.match(html, /href="\.\/rules\/"/);
    assert.match(html, /日程を決めたい。/);
    assert.match(html, /確定した予定を見たい。/);
    assert.match(html, /遊ぶ一本を探したい。/);
    assert.match(html, /候補を3件まで絞りたい。/);
    assert.match(html, /卓中にルールを確認したい。/);

    assert.doesNotMatch(html, /trpg-home-index/);
    assert.doesNotMatch(html, /trpg-home-tools/);
    assert.doesNotMatch(html, /trpg-home-manage/);
});

test("TRPG Overview v7 preserves the existing live session runtime mount", async ()=>{
    const html = await read("apps/web/creators/chikage/trpg/index.html");

    assert.match(html, /id="trpgV2SessionsApp"[^>]*data-trpg-v2-app/);
    assert.match(html, /<script type="module" src="\.\/v2\/js\/app\.js"><\/script>/);
    assert.match(html, /Discord Login \/ Supabase Session/);
    assert.doesNotMatch(html, /data-(?:memo|status|created-at|updated-at)=/);
});

test("TRPG Overview v7 has a deliberate desktop and phone hierarchy", async ()=>{
    const css = await read("apps/web/creators/chikage/trpg/css/trpg-overview-v7.css");

    assert.match(css, /\.trpg-overview-hero\s*{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1\.45fr\)/);
    assert.match(css, /\.trpg-overview-live__frame\s*{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*240px/);
    assert.match(css, /\.trpg-overview-route-grid\s*{[\s\S]*grid-template-columns:\s*repeat\(12/);
    assert.match(css, /@media\s*\(max-width:\s*640px\)/);
    assert.match(css, /\.trpg-overview-route-grid\s*{[\s\S]*grid-template-columns:\s*1fr/);
    assert.match(css, /prefers-reduced-motion/);
    assert.match(css, /:focus-visible/);
});
