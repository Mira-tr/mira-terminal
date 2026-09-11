import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../apps/web/creators/chikage/trpg/calendar/", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

test("Calendar v5 presents confirmed sessions as a read-only room", async ()=>{
    const html = await read("index.html");

    assert.match(html, /calendar-v5-page/);
    assert.match(html, /決まった卓を、[\s\S]*見る。/);
    assert.match(html, /予定を作る・変更する/);
    assert.match(html, /data-trpg-calendar-app/);
    assert.match(html, /href="\.\.\/scheduler\/"/);
    assert.match(html, /\.\/css\/calendar-v5\.css/);
});

test("Calendar v5 runtime prioritizes next session month selected day and upcoming list", async ()=>{
    const app = await read("js/app.js");

    assert.match(app, /nextSessionFocus\(view\)/);
    assert.match(app, /calendarControls\(view\)/);
    assert.match(app, /monthCalendar\(view\)/);
    assert.match(app, /dayDetail\(selectedSessions\)/);
    assert.match(app, /upcomingList\(view\)/);
    assert.match(app, /calendar-v5-day-mark/);
    assert.match(app, /\.\.\/scheduler\/\?schedule=/);
    assert.doesNotMatch(app, /\.insert\(|\.update\(|\.delete\(/);
});

test("Calendar v5 keeps mobile cells compact and moves event detail below the month", async ()=>{
    const css = await read("css/calendar-v5.css");

    assert.match(css, /\.calendar-v5-workspace\s*{[\s\S]*grid-template-columns:/);
    assert.match(css, /\.calendar-v5-side\s*{/);
    assert.match(css, /@media\s*\(max-width:\s*760px\)/);
    assert.match(css, /\.cx-calendar-day__event,[\s\S]*\.cx-calendar-day__more\s*{[\s\S]*display:\s*none;/);
    assert.match(css, /\.calendar-v5-day-mark\s*{[\s\S]*border-radius:\s*50%/);
    assert.match(css, /prefers-reduced-motion/);
});
