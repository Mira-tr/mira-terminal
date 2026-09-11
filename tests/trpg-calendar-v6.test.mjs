import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../apps/web/creators/chikage/trpg/calendar/", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

test("Calendar v6 is loaded last as the final public presentation layer", async ()=>{
    const html = await read("index.html");

    assert.match(html, /calendar-v5-page calendar-v6-page/);
    assert.match(html, /\.\/css\/calendar-v5\.css[\s\S]*\.\/css\/calendar-v6\.css/);
    assert.match(html, /calendar-v6-intro/);
    assert.match(html, /予定を作る・変更する/);
    assert.match(html, /data-trpg-calendar-app/);
});

test("Calendar v6 keeps desktop month primary without sticky side rails", async ()=>{
    const css = await read("css/calendar-v6.css");

    assert.match(css, /\.calendar-v5-workspace\s*{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1\.55fr\)\s+minmax\(300px,\s*\.62fr\)/);
    assert.match(css, /\.calendar-v5-heading\s*{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/);
    assert.doesNotMatch(css, /position:\s*sticky/);
});

test("Calendar v6 makes phone calendar a compact date picker and reads sessions below", async ()=>{
    const css = await read("css/calendar-v6.css");

    assert.match(css, /@media\s*\(max-width:\s*760px\)/);
    assert.match(css, /\.cx-calendar-day\s*{[\s\S]*min-height:\s*50px/);
    assert.match(css, /\.calendar-v5-day-mark\s*{[\s\S]*width:\s*5px/);
    assert.match(css, /\.calendar-v5-side\s*{[\s\S]*grid-template-columns:\s*1fr/);
    assert.match(css, /\.cx-calendar-heading__copy\s*{[\s\S]*display:\s*none/);
    assert.match(css, /prefers-reduced-motion/);
});

test("Calendar runtime remains read-only and routes edits back to Scheduler", async ()=>{
    const app = await read("js/app.js");

    assert.match(app, /loadTrpgV7Calendar/);
    assert.match(app, /nextSessionFocus\(view\)/);
    assert.match(app, /dayDetail\(selectedSessions\)/);
    assert.match(app, /upcomingList\(view\)/);
    assert.match(app, /\.\.\/scheduler\/\?schedule=/);
    assert.doesNotMatch(app, /\.insert\(|\.update\(|\.delete\(/);
});
