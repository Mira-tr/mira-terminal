import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

test("Admin style loads public-aligned overrides after legacy polish and navigation layers", async () => {
    const style = await read("apps/admin/css/style.css");
    const imports = [...style.matchAll(/@import\s+"([^"]+)"/g)].map(match => match[1]);
    const polishIndex = imports.indexOf("./components/admin-polish.css");
    const navigationIndex = imports.indexOf("./components/admin-navigation.css");
    const publicAlignedIndex = imports.indexOf("./components/public-aligned.css");

    assert.ok(polishIndex >= 0);
    assert.ok(navigationIndex > polishIndex);
    assert.ok(publicAlignedIndex > navigationIndex);
    assert.equal(imports.at(-1), "./components/public-aligned.css");
});

test("Admin public-aligned layer keeps mobile navigation compact and touch friendly", async () => {
    const css = await read("apps/admin/css/components/public-aligned.css");

    assert.match(css, /\.header-nav \.nav-item[\s\S]*min-height:40px/);
    assert.match(css, /\.button,[\s\S]*min-height:44px/);
    assert.match(css, /@media\(max-width:700px\)/);
    assert.match(css, /overflow-x:auto/);
    assert.match(css, /prefers-reduced-motion:reduce/);
});

test("Admin public-aligned layer covers the live Database workspace", async () => {
    const css = await read("apps/admin/css/components/public-aligned.css");

    assert.match(css, /\.database-card/);
    assert.match(css, /\.database-identity-grid/);
    assert.match(css, /\.database-flow/);
});
