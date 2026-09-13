import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, ROOT), "utf8");

const BRAND_PAGES = [
    "apps/web/index.html",
    "apps/web/projects/index.html",
    "apps/web/tools/index.html",
    "apps/web/notes/index.html",
    "apps/web/creators/index.html",
    "apps/web/about/index.html",
    "apps/web/contact/index.html"
];

const TRPG_PAGES = [
    "apps/web/creators/chikage/trpg/index.html",
    "apps/web/creators/chikage/trpg/scheduler/index.html",
    "apps/web/creators/chikage/trpg/calendar/index.html",
    "apps/web/creators/chikage/trpg/scenarios/index.html",
    "apps/web/creators/chikage/trpg/picker/index.html",
    "apps/web/creators/chikage/trpg/rules/index.html"
];

test("RELMUA brand pages share the Public v4 finish layer", async () => {
    const indexCss = await read("apps/web/css/brand/index.css");
    const finishCss = await read("apps/web/css/brand/finish-v4.css");

    assert.match(indexCss, /@import "\.\/finish-v4\.css"/);
    assert.match(finishCss, /--brand-v4-touch:44px/);
    assert.match(finishCss, /scroll-snap-type:x proximity/);
    assert.match(finishCss, /:focus-visible/);
    assert.match(finishCss, /env\(safe-area-inset-bottom\)/);
    assert.match(finishCss, /padding-inline:3px/);
    assert.match(finishCss, /mask-image:none/);

    for(const page of BRAND_PAGES){
        const html = await read(page);
        assert.match(html, /css\/brand\/index\.css/, `${page} must use the shared Brand stylesheet entrypoint`);
    }
});

test("Brand reading and footer links keep mobile-sized hit areas", async () => {
    const notesCss = await read("apps/web/notes/css/notes.css");
    const footerCss = await read("apps/web/css/brand/footer.css");

    assert.match(notesCss, /\.note-body-detail summary[\s\S]*min-width:\s*72px/);
    assert.match(notesCss, /\.note-body-detail summary[\s\S]*min-height:\s*42px/);
    assert.match(footerCss, /\.brand-footer__next[\s\S]*min-height:\s*44px/);
    assert.match(footerCss, /\.brand-footer__nav a[\s\S]*min-height:\s*44px/);
});

test("TRPG Public pages share one finish layer and one navigation order", async () => {
    const entryCss = await read("apps/web/creators/chikage/trpg/css/style.css");
    const finishCss = await read("apps/web/creators/chikage/trpg/css/trpg-public-v4.css");

    assert.match(entryCss, /@import "\.\/trpg-public-v4\.css"/);
    assert.match(finishCss, /--trpg4-touch:44px/);
    assert.match(finishCss, /Scheduler and Scenario Library are the two working surfaces/);
    assert.match(finishCss, /scroll-snap-type:x proximity/);
    assert.match(finishCss, /prefers-reduced-motion:reduce/);

    for(const page of TRPG_PAGES){
        const html = await read(page);
        assert.match(html, /trpg\/css\/style\.css|\.\.\/css\/style\.css|href="\.\/css\/style\.css"/, `${page} must use the shared TRPG stylesheet entrypoint`);
        const overview = html.indexOf(">概要<");
        const scheduler = html.indexOf(">日程調整<");
        const calendar = html.indexOf(">予定<");
        const scenarios = html.indexOf(">シナリオ<");
        const rules = html.indexOf(">ルール<");
        assert.ok(overview >= 0 && scheduler > overview && calendar > scheduler && scenarios > calendar && rules > scenarios, `${page} must keep 概要 / 日程調整 / 予定 / シナリオ / ルール order`);
    }
});

test("Chikage public hierarchy keeps RELMUA outside the Creator and TRPG local navigation", async () => {
    const home = await read("apps/web/creators/chikage/index.html");
    const trpg = await read("apps/web/creators/chikage/trpg/index.html");

    assert.match(home, /千景 <small>House<\/small>/);
    assert.match(home, /href="\.\/trpg\/">TRPG/);
    assert.match(home, /href="\.\.\/\.\.\/">RELMUA/);
    assert.match(trpg, /PLAY ROOM \/ TRPG/);
    assert.match(trpg, /href="\.\.\/">Home/);
    assert.match(trpg, /class="ch-house-shell__relmua"/);
});
