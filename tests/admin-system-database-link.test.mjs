import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

test("System workspace exposes the Database screen", async () => {
    const html = await readFile(new URL("apps/admin/system/index.html", ROOT), "utf8");
    const database = await readFile(new URL("apps/admin/system/database/index.html", ROOT), "utf8");
    const registry = await readFile(new URL("apps/admin/js/features/system/systemSectionRegistry.js", ROOT), "utf8");

    assert.match(html, /href="\.\/database\/"/);
    assert.match(html, /<h3>Database<\/h3>/);
    assert.match(database, /<title>RELMUA Admin \| Database<\/title>/);
    assert.match(registry, /id: "system-database"/);
    assert.match(registry, /adminPath: "\.\.\/system\/database\/"/);
});
