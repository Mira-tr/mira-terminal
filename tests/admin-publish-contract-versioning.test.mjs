import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { getPublicExportTargets } from "../apps/admin/js/features/system/systemInventory.js";
import { computePublicSnapshotFingerprint } from "../apps/admin/js/features/system/publish/publicSnapshotPackage.js";

const ROOT_URL = new URL("../", import.meta.url);
const ROOT = fileURLToPath(ROOT_URL);
const GENERATED_AT = "2026-09-13T13:30:00.000Z";

function dynamicTargets(){
    return getPublicExportTargets().filter(target => target.filename !== "static-html");
}

function packageFor(schemaVersion, targets){
    return {
        schemaVersion,
        module: "public-snapshot-package",
        generatedAt: GENERATED_AT,
        files: targets.map(target => ({
            targetId: target.id,
            filename: target.filename,
            destination: target.destination,
            payload: {}
        }))
    };
}

test("publication contract bumps to v2 while preserving queued v1 snapshots", async () => {
    const browser = await read("apps/admin/js/features/system/publish/publicSnapshotPackage.js");
    const edge = await read("supabase/functions/_shared/publicationContract.ts");
    const cli = await read("scripts/apply-public-package.mjs");

    assert.match(browser, /PACKAGE_SCHEMA_VERSION\s*=\s*2/);
    assert.match(edge, /PUBLICATION_PACKAGE_SCHEMA_VERSION\s*=\s*2/);
    assert.match(edge, /LEGACY_PUBLICATION_TARGETS_V1/);
    assert.match(edge, /computeLegacyPublicSnapshotFingerprint/);
    assert.match(browser, /\.sort\(compareTargetIds\)/);
    assert.match(edge, /\.sort\(ignoreVolatileMetadata \? compareTargetIds : compareTargetIdsLegacy\)/);
    assert.match(edge, /schemaVersion:\s*pack\.schemaVersion/);
    assert.match(cli, /LEGACY_ALLOWED_TARGETS_V1/);
    assert.match(cli, /CURRENT_PACKAGE_SCHEMA_VERSION\s*=\s*2/);
    assert.match(cli, /--validate-only/);
});

test("publication fingerprint ignores volatile export timestamps but detects content changes", async () => {
    const targets = dynamicTargets();
    const first = packageFor(2, targets);
    first.files[0].payload = { exportedAt: "2026-09-13T00:00:00.000Z", title: "RELMUA" };
    const timestampOnly = structuredClone(first);
    timestampOnly.files[0].payload.exportedAt = "2026-09-14T00:00:00.000Z";
    const changed = structuredClone(timestampOnly);
    changed.files[0].payload.title = "RELMUA Next";

    assert.equal(
        await computePublicSnapshotFingerprint(first),
        await computePublicSnapshotFingerprint(timestampOnly)
    );
    assert.notEqual(
        await computePublicSnapshotFingerprint(first),
        await computePublicSnapshotFingerprint(changed)
    );
});

test("CLI accepts the old eight-target v1 package but requires nine targets for v2", async () => {
    const current = dynamicTargets();
    assert.equal(current.length, 9);
    const legacy = current.filter(target => target.id !== "brand-site");
    assert.equal(legacy.length, 8);

    const temp = await mkdtemp(join(tmpdir(), "relmua-publish-contract-"));
    try{
        const legacyPath = join(temp, "legacy-v1.json");
        await writeFile(legacyPath, JSON.stringify(packageFor(1, legacy)), "utf8");
        const legacyResult = spawnSync(
            process.execPath,
            ["scripts/apply-public-package.mjs", legacyPath, "--validate-only"],
            { cwd: ROOT, encoding: "utf8" }
        );
        assert.equal(legacyResult.status, 0, legacyResult.stderr || legacyResult.stdout);
        assert.match(legacyResult.stdout, /schema v1 validated/);

        const invalidV2Path = join(temp, "invalid-v2.json");
        await writeFile(invalidV2Path, JSON.stringify(packageFor(2, legacy)), "utf8");
        const invalidV2Result = spawnSync(
            process.execPath,
            ["scripts/apply-public-package.mjs", invalidV2Path, "--validate-only"],
            { cwd: ROOT, encoding: "utf8" }
        );
        assert.notEqual(invalidV2Result.status, 0);
        assert.match(invalidV2Result.stderr, /must contain 9 files/);
    }finally{
        await rm(temp, { recursive: true, force: true });
    }
});

test("publication worker stages every current Public export target", async () => {
    const workflow = await read(".github/workflows/publish-cms-queue.yml");
    for(const target of dynamicTargets()){
        assert.match(
            workflow,
            new RegExp(escapeRegExp(target.destination)),
            `worker must stage ${target.destination}`
        );
    }
});

async function read(path){
    return readFile(new URL(path, ROOT_URL), "utf8");
}

function escapeRegExp(value){
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
