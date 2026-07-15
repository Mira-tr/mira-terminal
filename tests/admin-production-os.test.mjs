import test from "node:test";
import assert from "node:assert/strict";
import {
    access,
    readFile
} from "node:fs/promises";

import {
    ACTIVITY_LOG_KEY
} from "../apps/admin/js/store.js";

import {
    clearActivityLog,
    getActivityLog,
    recordActivity
} from "../apps/admin/js/features/system/activityLog.js";

import {
    createSystemBackup,
    validateSystemBackup
} from "../apps/admin/js/features/system/backup/systemBackup.js";

import {
    applySystemImport,
    previewSystemImport
} from "../apps/admin/js/features/system/import/systemImport.js";

import {
    runSystemValidation
} from "../apps/admin/js/features/system/validation/validationCenter.js";

import {
    validateBuildManifest
} from "../apps/admin/js/features/system/build/buildManifest.js";

const ROOT = new URL("../", import.meta.url);

test("v0.6 System Workspace exposes real screens instead of guide-only links", async () => {
    const pages = [
        "backup",
        "import",
        "export",
        "settings",
        "publish",
        "logs",
        "validation",
        "guide"
    ];

    for(const page of pages){
        const path = `apps/admin/system/${page}/index.html`;
        await access(new URL(path, ROOT));
        const html = await read(path);
        assert.match(html, /data-system-page=/, path);
        assert.match(html, /adminShell\.js/, path);
        assert.match(html, /systemPage\.js/, path);
        assert.doesNotMatch(html, /aria-pressed|tabindex="-1"|role="tab"/, path);
    }
});

test("v0.6 System registry points every active System item to a System screen", async () => {
    const registry = await read("apps/admin/js/features/system/systemSectionRegistry.js");
    [
        "../system/backup/",
        "../system/import/",
        "../system/export/",
        "../system/settings/",
        "../system/publish/",
        "../system/logs/",
        "../system/validation/",
        "../system/guide/"
    ].forEach(path => assert.match(registry, new RegExp(escapeRegExp(path))));
    assert.doesNotMatch(registry, /status:\s*"planned"/);
});

test("v0.6 Activity Log records, normalizes, exports, and clears local actions", () => {
    const storage = createStorage();
    const entry = recordActivity({
        action: "backup",
        workspace: "system",
        module: "backup",
        summary: "Backup created.",
        result: "success"
    }, storage);

    assert.equal(entry.actor, "local-admin");
    assert.equal(getActivityLog(storage).length, 1);
    assert.equal(JSON.parse(storage.getItem(ACTIVITY_LOG_KEY)).entries[0].action, "backup");
    clearActivityLog(storage);
    assert.equal(getActivityLog(storage).length, 0);
});

test("v0.6 System Backup and Import require preview before overwrite", () => {
    const storage = createStorage({
        mira_terminal_tools: JSON.stringify({ tools: [{ id: "tool-a" }] })
    });
    const backup = createSystemBackup(storage, new Date("2026-07-15T00:00:00.000Z"));
    assert.deepEqual(validateSystemBackup(backup), []);

    const preview = previewSystemImport(backup, storage);
    assert.equal(preview.ok, true);
    assert.ok(preview.rollback);
    assert.ok(preview.changes.some(change => change.key === "mira_terminal_tools"));

    storage.setItem("mira_terminal_tools", JSON.stringify({ tools: [] }));
    const applied = applySystemImport(backup, storage);
    assert.equal(applied.applied, true);
    assert.equal(JSON.parse(storage.getItem("mira_terminal_tools")).tools.length, 1);
});

test("v0.6 System Import blocks schemaVersion and module mismatches", () => {
    const valid = createSystemBackup(createStorage());
    assert.deepEqual(validateSystemBackup({
        ...valid,
        schemaVersion: 2
    }), ["schemaVersion must be 1."]);
    assert.deepEqual(validateSystemBackup({
        ...valid,
        module: "tools"
    }), ["module must be system."]);
    assert.equal(previewSystemImport({
        ...valid,
        module: "tools"
    }, createStorage()).ok, false);
});

test("v0.6 System Import UI exposes rollback, cancel, and confirm dialog controls", async () => {
    const html = await read("apps/admin/system/import/index.html");
    const page = await read("apps/admin/js/pages/systemPage.js");
    assert.match(html, /systemImportRollbackDownload/);
    assert.match(html, /systemImportCancel/);
    assert.match(html, /<dialog id="systemImportDialog"/);
    assert.match(page, /trapDialogFocus/);
    assert.match(page, /Escape/);
    assert.match(page, /returnTarget\?\.focus/);
});

test("v0.6 Validation Center has a dedicated System screen and activity record", async () => {
    const html = await read("apps/admin/system/validation/index.html");
    const page = await read("apps/admin/js/pages/systemPage.js");
    assert.match(html, /data-system-page="validation"/);
    assert.match(html, /systemValidationIssues/);
    assert.match(page, /function initValidationPage/);
    assert.match(page, /action: "validation"/);
});

test("v0.6 Validation Center catches duplicate IDs, invalid owners, and broken local JSON through contracts", () => {
    const storage = createStorage({
        mira_terminal_tools: "{broken"
    });
    const result = runSystemValidation(storage);
    assert.equal(result.status, "critical");
    assert.ok(result.issues.some(issue => issue.title === "Broken local data"));
});

test("v0.6 Build Manifest contract blocks Admin inclusion and wrong production origin", () => {
    const issues = validateBuildManifest({
        buildVersion: 1,
        status: "success",
        adminIncluded: true,
        cname: "example.com",
        canonicalOrigin: "https://example.com"
    });
    assert.ok(issues.some(issue => issue.title === "Admin files are included in dist"));
    assert.ok(issues.some(issue => issue.title === "CNAME is not relmua.com"));
    assert.ok(issues.some(issue => issue.title === "Canonical origin is not relmua.com"));

    assert.deepEqual(validateBuildManifest({
        buildVersion: 1,
        status: "success",
        adminIncluded: false,
        cname: "relmua.com",
        canonicalOrigin: "https://relmua.com"
    }), []);
});

test("v0.6 Publish Preflight reads the root dist build manifest from System pages", async () => {
    const source = await read("apps/admin/js/features/system/publish/publishPreflight.js");
    assert.ok(source.includes('manifestPath = "../../../../dist/build-manifest.json"'));
});

test("v0.6 Public build blocks broken Public JSON before release", async () => {
    const source = await read("scripts/build-public.mjs");
    assert.match(source, /Broken Public JSON/);
    assert.match(source, /JSON\.parse\(await readFile\(path, "utf8"\)\)/);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

function escapeRegExp(value){
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createStorage(initial = {}){
    const values = new Map(Object.entries(initial));
    return {
        getItem(key){ return values.has(key) ? values.get(key) : null; },
        setItem(key, value){ values.set(key, String(value)); },
        removeItem(key){ values.delete(key); }
    };
}
