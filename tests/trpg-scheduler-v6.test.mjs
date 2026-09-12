import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

test("Scheduler v6 presents the existing engine as one guided workspace", async ()=>{
    const html = await read("apps/web/creators/chikage/trpg/scheduler/index.html");

    assert.match(html, /<body[^>]*scheduler-v6-page/);
    assert.match(html, /\.\/css\/scheduler-v6\.css/);
    assert.match(html, /卓を、[\s\S]*決め切る。/);
    assert.match(html, /class="scheduler-v6-flow"/);
    assert.match(html, />作る<\/strong>/);
    assert.match(html, />招待<\/strong>/);
    assert.match(html, />回答<\/strong>/);
    assert.match(html, />確定<\/strong>/);
    assert.match(html, /id="trpgV2SessionsApp"[^>]*data-trpg-v2-app/);
    assert.match(html, /\.\.\/v2\/js\/app\.js\?v=20260913-refresh-guard/);
});

test("Scheduler v6 keeps surrounding TRPG routes visible without duplicating the mobile dock", async ()=>{
    const html = await read("apps/web/creators/chikage/trpg/scheduler/index.html");

    assert.match(html, /AROUND THE TABLE/);
    assert.match(html, /href="\.\.\/calendar\/"/);
    assert.match(html, /href="\.\.\/picker\/"/);
    assert.match(html, /href="\.\.\/rules\/"/);
    assert.doesNotMatch(html, /trpg-mobile-dock/);
});

test("Scheduler v6 has dedicated desktop dashboard and mobile operation layouts", async ()=>{
    const css = await read("apps/web/creators/chikage/trpg/scheduler/css/scheduler-v6.css");

    assert.match(css, /\.scheduler-v6-flow\s*{[\s\S]*grid-template-columns:\s*repeat\(4/);
    assert.match(css, /\.v2-dashboard-layout\s*{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1\.3fr\)/);
    assert.match(css, /\.scheduler-v6-app:has\(> \.v2-account-strip\)/);
    assert.match(css, /\.scheduler-v6-app:has\(\.v2-detail-title\)/);
    assert.match(css, /@media\s*\(max-width:\s*760px\)/);
    assert.match(css, /font-size:\s*16px/);
    assert.match(css, /\.v2-dashboard-action__status\s*{[\s\S]*grid-column:\s*1 \/ -1/);
    assert.match(css, /prefers-reduced-motion/);
});

test("Scheduler v6 remains a presentation-only layer over the V2 scheduling runtime", async ()=>{
    const [html, css] = await Promise.all([
        read("apps/web/creators/chikage/trpg/scheduler/index.html"),
        read("apps/web/creators/chikage/trpg/scheduler/css/scheduler-v6.css")
    ]);

    assert.doesNotMatch(html, /<script[^>]+src="\.\/js\/app\.js"/);
    assert.doesNotMatch(html, /data-(?:memo|status|created-at|updated-at)=/);
    assert.doesNotMatch(css, /\b(?:createdAt|updatedAt)\b/);
    assert.match(html, /Discord Login \/ Supabase Session/);
    assert.match(html, /\.\.\/v2\/js\/app\.js\?v=20260913-refresh-guard/);
});

test("Scheduler refreshes are shared across auth events and the initial bootstrap", async ()=>{
    const app = await read("apps/web/creators/chikage/trpg/v2/js/app.js");

    assert.match(app, /let refreshPromise = null/);
    assert.match(app, /function requestRefresh\(\)/);
    assert.match(app, /if\(refreshPromise\)\{/);
    assert.match(app, /appState\.repository\.onAuthStateChange\(async user => \{[\s\S]*?await requestRefresh\(\);/);
    assert.doesNotMatch(app, /onAuthStateChange\(async user => \{[\s\S]*?await refresh\(\);/);
});
