import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

test("Admin style loads navigation overrides after the polish layer", async () => {
    const style = await read("apps/admin/css/style.css");
    const imports = [...style.matchAll(/@import\s+"([^"]+)"/g)].map(match => match[1]);
    const polishIndex = imports.indexOf("./components/admin-polish.css");
    const navigationIndex = imports.indexOf("./components/admin-navigation.css");

    assert.ok(polishIndex >= 0);
    assert.ok(navigationIndex > polishIndex);
    assert.equal(imports.at(-1), "./components/admin-navigation.css");
});

test("Admin polish keeps the mobile shell compact and touch friendly", async () => {
    const css = await read("apps/admin/css/components/admin-polish.css");

    assert.match(css, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
    assert.match(css, /\.nav-item[\s\S]*min-height:40px/);
    assert.match(css, /\.button,[\s\S]*min-height:46px/);
    assert.match(css, /body \.system-main > \.panel[\s\S]*margin-bottom:0/);
    assert.match(css, /@media\(max-width:700px\)/);
    assert.match(css, /prefers-reduced-motion:reduce/);
});

test("Admin polish covers the live Database workspace", async () => {
    const css = await read("apps/admin/css/components/admin-polish.css");

    assert.match(css, /body \.database-main/);
    assert.match(css, /body \.database-identity-grid/);
    assert.match(css, /body \.database-migration-actions/);
    assert.match(css, /body \.database-flow/);
});
