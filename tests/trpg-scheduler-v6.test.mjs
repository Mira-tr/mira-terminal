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
    assert.match(html, /\.\/css\/scheduler-v6\.css\?v=20260913-detail-final/);
    assert.match(html, /日程を、決める。/);
    assert.match(html, /class="scheduler-v6-flow"/);
    assert.match(html, />作る<\/strong>/);
    assert.match(html, />招待<\/strong>/);
    assert.match(html, />回答<\/strong>/);
    assert.match(html, />確定<\/strong>/);
    assert.match(html, /id="trpgV2SessionsApp"[^>]*data-trpg-v2-app/);
    assert.match(html, /\.\.\/v2\/js\/app\.js\?v=20260913-overnight-auto/);
});

test("Scheduler time editors derive overnight ranges from the entered clock order", async ()=>{
    const [app, css] = await Promise.all([
        read("apps/web/creators/chikage/trpg/v2/js/app.js"),
        read("apps/web/creators/chikage/trpg/v2/css/trpg-v2-home.css")
    ]);

    assert.doesNotMatch(app, /v2-next-day-toggle/);
    assert.match(app, /終了が開始より前なら、翌日として扱います/);
    assert.match(app, /終了が開始より前なら、翌日として自動設定します/);
    assert.match(css, /\.v2-time-range__hint/);
    assert.doesNotMatch(css, /v2-next-day-toggle/);
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
    assert.match(css, /scheduler-v6-page:has\(\.v2-detail-title\) \.scheduler-v6-intro/);
    assert.match(css, /@media\s*\(max-width:\s*760px\)/);
    assert.match(css, /font-size:\s*16px/);
    assert.match(css, /\.v2-dashboard-action__status\s*{[\s\S]*grid-column:\s*1 \/ -1/);
    assert.match(css, /prefers-reduced-motion/);
});

test("Scheduler v6 puts the active answer workflow before secondary detail", async ()=>{
    const app = await read("apps/web/creators/chikage/trpg/v2/js/app.js");
    const detailBlocks = app.slice(app.indexOf("function renderDetail()"), app.indexOf("function accountBar()"));

    assert.ok(detailBlocks.indexOf("scheduleBlock(detail)") < detailBlocks.indexOf("preparationBlock(detail)"));
    assert.ok(detailBlocks.indexOf("preparationBlock(detail)") < detailBlocks.indexOf("overviewBlock(detail)"));
    assert.match(app, /function revealDetail\(\)[\s\S]*scrollIntoView/);
    const scheduleBlock = app.slice(app.indexOf("function scheduleBlock(detail)"), app.indexOf("function recommendationBlock(detail)"));
    assert.ok(scheduleBlock.indexOf("v2-schedule-toolbar") < scheduleBlock.indexOf("recommendationBlock(detail)"));
    assert.match(await read("apps/web/creators/chikage/trpg/scheduler/css/scheduler-v6.css"), /v2-round-next:has\(\.v2-empty-state\)/);
});

test("Scheduler v6 remains a presentation-only layer over the V2 scheduling runtime", async ()=>{
    const [html, css] = await Promise.all([
        read("apps/web/creators/chikage/trpg/scheduler/index.html"),
        read("apps/web/creators/chikage/trpg/scheduler/css/scheduler-v6.css")
    ]);

    assert.doesNotMatch(html, /<script[^>]+src="\.\/js\/app\.js"/);
    assert.doesNotMatch(html, /data-(?:memo|status|created-at|updated-at)=/);
    assert.doesNotMatch(css, /\b(?:createdAt|updatedAt)\b/);
    assert.match(html, /長くかかる場合は、この場所に再試行ボタンが表示されます。/);
    assert.match(html, /\.\.\/v2\/js\/app\.js\?v=20260913-overnight-auto/);
});

test("Scheduler refreshes are shared across auth events and the initial bootstrap", async ()=>{
    const app = await read("apps/web/creators/chikage/trpg/v2/js/app.js");

    assert.match(app, /let refreshPromise = null/);
    assert.match(app, /function requestRefresh\(\)/);
    assert.match(app, /if\(refreshPromise\)\{/);
    assert.match(app, /appState\.repository\.onAuthStateChange\(async user => \{[\s\S]*?await requestRefresh\(\);/);
    assert.doesNotMatch(app, /onAuthStateChange\(async user => \{[\s\S]*?await refresh\(\);/);
});

test("Scheduler makes the signed-in work area the first view", async ()=>{
    const [app, css] = await Promise.all([
        read("apps/web/creators/chikage/trpg/v2/js/app.js"),
        read("apps/web/creators/chikage/trpg/scheduler/css/scheduler-v6.css")
    ]);

    assert.match(app, /document\.body\.classList\.toggle\("is-signed-in", Boolean\(appState\.user\)\)/);
    assert.match(css, /body\.scheduler-v6-page\.is-signed-in \.scheduler-v6-intro\s*\{[\s\S]*display:\s*none/);
});
