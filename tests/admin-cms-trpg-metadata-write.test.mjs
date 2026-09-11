import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

test("new and edited scenario authors are included in the same CMS snapshot write", async () => {
    const source = await read("apps/admin/js/features/trpg/scenarios/scenarioCmsStore.js");

    assert.match(source, /metadata\s*=\s*\{\}/);
    assert.match(source, /authors:\s*\[data\.author\]/);
    assert.match(source, /\.\.\.localMetadata\.authors/);
    assert.match(source, /await setScenariosCanonical\([\s\S]*?authors:\s*\[data\.author\]/);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
