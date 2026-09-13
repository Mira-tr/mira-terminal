import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

test("Admin publish API preserves queued requests when immediate dispatch is unavailable", async () => {
    const admin = await read("supabase/functions/admin-publish/index.ts");

    assert.match(admin, /GITHUB_WORKFLOW_DISPATCH_TOKEN/);
    assert.match(admin, /cron fallback remains active/);
    assert.match(admin, /status:\s*"deferred"/);
    assert.doesNotMatch(admin, /failStaleQueuedRequests|STALE_QUEUED_MINUTES/);
    assert.doesNotMatch(admin, /Publication worker did not claim this request before timeout/);
});

test("Publication feed requeues stale processing and treats a lost claim race as no work", async () => {
    const feed = await read("supabase/functions/admin-publish-feed/index.ts");

    assert.match(feed, /recoverStaleProcessing/);
    assert.match(feed, /status:\s*"queued"/);
    assert.match(feed, /workflow_run_id:\s*null/);
    assert.match(feed, /reason:\s*"already_claimed"/);
    assert.doesNotMatch(feed, /Publication request was already claimed/);
});
