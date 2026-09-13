import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

test("Admin publish API releases queued requests that were never claimed", async () => {
    const source = await read("supabase/functions/admin-publish/index.ts");

    assert.match(source, /STALE_QUEUED_MINUTES\s*=\s*30/);
    assert.match(source, /await failStaleQueuedRequests\(supabase\)/);
    assert.match(source, /\.eq\("status",\s*"queued"\)/);
    assert.match(source, /\.lt\("requested_at",\s*staleBefore\)/);
    assert.match(source, /status:\s*"failed"/);
    assert.match(source, /Publication worker did not claim this request before timeout/);
});
