import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    createSystemBackup,
    validateSystemBackup
} from "../apps/admin/js/features/system/backup/systemBackup.js";

const ROOT = new URL("../", import.meta.url);

test("System Backup keeps v1 import compatibility and validates canonical v2 payloads", () => {
    const legacy = createSystemBackup(createStorage(), new Date("2026-09-11T00:00:00.000Z"));
    assert.equal(legacy.schemaVersion, 1);
    assert.deepEqual(validateSystemBackup(legacy), []);

    const canonical = {
        ...legacy,
        backupVersion: "2.0.0",
        schemaVersion: 2,
        data: {
            ...legacy.data,
            cms: {
                siteSections: []
            }
        }
    };
    assert.deepEqual(validateSystemBackup(canonical), []);

    assert.deepEqual(validateSystemBackup({
        ...canonical,
        data: {
            ...canonical.data,
            cms: {}
        }
    }), ["data.cms.siteSections must be an array."]);
});

test("canonical System Backup includes Site Structure without authority tables", async () => {
    const backup = await read("apps/admin/js/features/system/backup/systemBackup.js");

    assert.match(backup, /createSystemBackupCanonical/);
    assert.match(backup, /listSiteSections/);
    assert.match(backup, /schemaVersion:\s*2/);
    assert.match(backup, /siteSections:/);
    assert.doesNotMatch(backup, /cms_admin_members|owner_user_id/);
});

test("System Import restores canonical content and Site Structure with rollback support", async () => {
    const importer = await read("apps/admin/js/features/system/import/systemImport.js");
    const state = await read("apps/admin/js/features/system/canonicalAdminState.js");

    assert.match(importer, /previewSystemImportCanonical/);
    assert.match(importer, /createSystemBackupCanonical/);
    assert.match(importer, /payload\.data\.cms/);
    assert.match(state, /upsertSiteSectionByKey/);
    assert.match(state, /replaceSiteSections/);
    assert.match(state, /status:\s*"archived"/);
    assert.match(state, /rollbackCanonicalState/);
});

test("System UI uses complete canonical backup and preview paths", async () => {
    const page = await read("apps/admin/js/pages/systemPage.js");

    assert.match(page, /await exportSystemBackupCanonical\(\)/);
    assert.match(page, /await previewSystemImportCanonical\(read\.payload\)/);
    assert.match(page, /button\.disabled = true/);
    assert.match(page, /previewButton\.disabled = true/);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

function createStorage(initial = {}){
    const values = new Map(Object.entries(initial));
    return {
        getItem(key){ return values.has(key) ? values.get(key) : null; },
        setItem(key, value){ values.set(key, String(value)); },
        removeItem(key){ values.delete(key); }
    };
}
