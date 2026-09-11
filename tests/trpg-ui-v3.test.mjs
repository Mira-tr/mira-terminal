import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);
const pages = [
    "apps/web/creators/chikage/trpg/index.html",
    "apps/web/creators/chikage/trpg/scheduler/index.html",
    "apps/web/creators/chikage/trpg/calendar/index.html",
    "apps/web/creators/chikage/trpg/scenarios/index.html",
    "apps/web/creators/chikage/trpg/picker/index.html",
    "apps/web/creators/chikage/trpg/rules/index.html"
];

test("TRPG UI v3 gives every current tool one shared Chikage house shell without a duplicate mobile dock", async () => {
    for(const path of pages){
        const html = await read(path);
        assert.match(html, /class="[^"]*trpg-v3/);
        assert.match(html, /trpg-ui-v3\.css/);
        assert.match(html, /chikage-ui-refresh\.css/);
        assert.equal((html.match(/<header class="trpg-shell-header">/g) || []).length, 1, `${path}: one shared header`);
        assert.equal((html.match(/class="ch-house-shell"/g) || []).length, 1, `${path}: one house shell`);
        assert.equal((html.match(/<nav class="trpg-mobile-dock"/g) || []).length, 0, `${path}: no duplicate mobile dock`);
        assert.doesNotMatch(html, /creator-site\.css|chikage-experience\.css|href="\.\.\/chikage\.css"|cx-bottom-nav/);
        assert.match(html, />Overview<\/a>/);
        assert.match(html, />Calendar<\/a>/);
        assert.match(html, />Scenarios<\/a>/);
        assert.match(html, />Rules<\/a>/);
        assert.match(html, /Scenario Picker/);
    }
});

test("TRPG UI v3 preserves every functional mount and runtime entry", async () => {
    const [home, scheduler, calendar, library, picker, rules] = await Promise.all(pages.map(read));

    assert.match(home, /id="trpgV2SessionsApp"[\s\S]*data-trpg-v2-app/);
    assert.match(home, /\.\/v2\/js\/app\.js/);
    assert.match(scheduler, /id="trpgV2SessionsApp"[\s\S]*data-trpg-v2-app/);
    assert.match(scheduler, /\.\.\/v2\/js\/app\.js/);
    assert.match(calendar, /data-trpg-calendar-app/);
    assert.match(calendar, /\.\/js\/app\.js/);
    assert.match(library, /id="keywordInput"/);
    assert.match(library, /id="advancedFilters"/);
    assert.match(library, /id="scenarioList"/);
    assert.match(library, /id="scenarioModal"/);
    assert.match(library, /\.\.\/js\/app\.js/);
    assert.match(picker, /id="pickerForm"/);
    assert.match(picker, /id="pickerResults"/);
    assert.match(picker, /\.\/js\/pickerPage\.js/);
    assert.match(rules, /id="rulesApp"/);
    assert.match(rules, /\.\/js\/rules\.js/);
});

test("TRPG UI v3 matches Chikage palette and keeps mobile typography compact but readable", async () => {
    const css = await read("apps/web/creators/chikage/trpg/css/trpg-ui-v3.css");

    assert.match(css, /--trpg3-bg:\s*#090b11/);
    assert.match(css, /--trpg3-violet:\s*#9b8cff/);
    assert.match(css, /--trpg3-silver:\s*#d9dbea/);
    assert.match(css, /font-size:\s*16px/);
    assert.match(css, /@media \(max-width: 760px\)/);
    assert.match(css, /\.trpg-v3-intro h1\s*{[\s\S]*font-size:\s*clamp\(2rem, 10vw, 2\.55rem\)/);
    assert.match(css, /\.cx-calendar-day\.has-session::after/);
    assert.match(css, /\.cx-calendar-day__event,[\s\S]*\.cx-calendar-day__more\s*{\s*display:\s*none/);
    assert.doesNotMatch(css, /font-size:\s*(?:1[0-9]|[2-9][0-9])rem/);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
