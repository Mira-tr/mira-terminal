import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    PUBLIC_SNAPSHOT_EXPORT_TYPE,
    PUBLIC_SNAPSHOT_SCHEMA_VERSION,
    PUBLIC_SNAPSHOT_TARGETS,
    assertPublicPayloadSafe,
    validatePublicSnapshotPackage
} from "../apps/admin/js/features/system/export/publicSnapshotContract.js";

const ROOT = new URL("../", import.meta.url);

function createValidPackage(){
    return {
        exportType: PUBLIC_SNAPSHOT_EXPORT_TYPE,
        schemaVersion: PUBLIC_SNAPSHOT_SCHEMA_VERSION,
        source: "supabase-canonical",
        generatedAt: "2026-09-11T00:00:00.000Z",
        files: PUBLIC_SNAPSHOT_TARGETS.map(target => ({
            ...target,
            payload: { id: target.id, publicValue: true }
        }))
    };
}

test("Public Snapshot contract allows exactly the eight static Public JSON targets", () => {
    assert.equal(PUBLIC_SNAPSHOT_TARGETS.length, 8);
    PUBLIC_SNAPSHOT_TARGETS.forEach(target => {
        assert.match(target.destination, /^apps\/web\//);
        assert.doesNotMatch(target.destination, /apps\/admin|backup/i);
    });
    assert.equal(validatePublicSnapshotPackage(createValidPackage()), true);
});

test("Public Snapshot contract rejects missing, redirected, and admin-only data", () => {
    const missing = createValidPackage();
    missing.files.pop();
    assert.throws(() => validatePublicSnapshotPackage(missing), /不足/);

    const redirected = createValidPackage();
    redirected.files[0] = {
        ...redirected.files[0],
        destination: "apps/admin/leak.json"
    };
    assert.throws(() => validatePublicSnapshotPackage(redirected), /公開先/);

    assert.throws(
        () => assertPublicPayloadSafe({ memo: "private" }, "test"),
        /管理画面専用/
    );
});

test("System Export presents the canonical snapshot flow in plain language", async () => {
    const html = await read("apps/admin/system/export/index.html");
    const page = await read("apps/admin/js/pages/systemExportPage.js");
    assert.match(html, /公開サイト用のデータをまとめて作成/);
    assert.match(html, /id="systemExportSnapshot"/);
    assert.match(html, /Supabaseに保存されている最新の編集内容/);
    assert.match(page, /exportPublicSnapshotPackageCanonical/);
});

test("Snapshot apply command validates the package before writing only to apps/web", async () => {
    const source = await read("scripts/apply-public-snapshot.mjs");
    assert.match(source, /validatePublicSnapshotPackage\(snapshot\)/);
    assert.match(source, /resolve\(PROJECT_ROOT, "apps", "web"\)/);
    assert.match(source, /公開サイト外への書き込みを拒否/);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
