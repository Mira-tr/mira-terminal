import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

test("System home presents the safe daily flow in operational order", async () => {
    const html = await read("apps/admin/system/index.html");

    const database = html.indexOf('href="./database/"');
    const backup = html.indexOf('href="./backup/"');
    const validation = html.indexOf('href="./validation/"');
    const publish = html.indexOf('href="./publish/"');

    assert.ok(database >= 0);
    assert.ok(backup > database);
    assert.ok(validation > backup);
    assert.ok(publish > validation);
    assert.match(html, /1 → 4 の順/);
    assert.match(html, /公開まで、上から順に。/);
});

test("System home keeps recovery and public tools reachable without mixing them into the daily flow", async () => {
    const html = await read("apps/admin/system/index.html");

    [
        "./export/",
        "./settings/",
        "./import/",
        "./logs/",
        "./guide/"
    ].forEach(path => assert.match(html, new RegExp(path.replace(/[./]/g, "\\$&"))));

    assert.match(html, /公開データ/);
    assert.match(html, /復旧・履歴/);
    assert.doesNotMatch(html, /class="modules-grid"/);
    assert.doesNotMatch(html, /class="module-card"/);
});

test("System home styling stays compact and mobile-first", async () => {
    const css = await read("apps/admin/css/pages/system/index.css");

    assert.match(css, /\.system-home-flow\s*\{/);
    assert.match(css, /\.system-home-step\s*\{/);
    assert.match(css, /\.system-home-groups\s*\{/);
    assert.match(css, /@media \(max-width: 760px\)/);
    assert.match(css, /@media \(max-width: 430px\)/);
    assert.match(css, /prefers-reduced-motion/);
    assert.match(css, /var\(--color-panel\)/);
});
