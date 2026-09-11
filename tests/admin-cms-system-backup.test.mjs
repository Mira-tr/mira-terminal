import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    createSystemBackup,
    createSystemBackupBestAvailable,
    validateSystemBackup
} from "../apps/admin/js/features/system/backup/systemBackup.js";

const ROOT = new URL("../", import.meta.url);

const CANONICAL_ITEMS = Object.freeze({
    mira_terminal_home_config: JSON.stringify({ schemaVersion: 1, sections: [{ id: "cms-home" }] }),
    mira_terminal_games: JSON.stringify({ games: [{ id: "cms-game" }] }),
    mira_terminal_tools: JSON.stringify({ tools: [{ id: "cms-tool" }] }),
    mira_terminal_notes: JSON.stringify({ notes: [{ id: "cms-note" }] }),
    mira_terminal_creators: JSON.stringify({ primaryCreatorId: "creator-chikage", creators: [{ id: "creator-chikage" }] }),
    mira_terminal_profile: JSON.stringify({ displayName: "千景", links: [] }),
    mira_terminal_scenarios: JSON.stringify([{ id: "cms-scenario" }]),
    mira_terminal_tags: JSON.stringify(["tag"]),
    mira_terminal_authors: JSON.stringify(["author"]),
    mira_terminal_rules: JSON.stringify({ systems: [] })
});

function canonicalCms(){
    return {
        source: "supabase",
        siteSections: []
    };
}

test("System Backup keeps v1/v2 import compatibility and validates canonical v3 payloads", () => {
    const legacy = createSystemBackup(createStorage(), new Date("2026-09-11T00:00:00.000Z"));
    assert.equal(legacy.schemaVersion, 1);
    assert.deepEqual(validateSystemBackup(legacy), []);

    const v2 = {
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
    assert.deepEqual(validateSystemBackup(v2), []);

    const v3 = {
        ...legacy,
        backupVersion: "3.0.0",
        schemaVersion: 3,
        data: {
            ...legacy.data,
            items: { ...legacy.data.items, ...CANONICAL_ITEMS },
            cms: canonicalCms()
        }
    };
    assert.deepEqual(validateSystemBackup(v3), []);

    assert.deepEqual(validateSystemBackup({
        ...v3,
        data: {
            ...v3.data,
            cms: { siteSections: [] }
        }
    }), ["data.cms.source must be supabase for schemaVersion 3."]);

    const incomplete = structuredClone(v3);
    delete incomplete.data.items.mira_terminal_scenarios;
    assert.match(
        validateSystemBackup(incomplete).join("\n"),
        /mira_terminal_scenarios/
    );
});

test("System Backup remains downloadable before Supabase CMS setup", async () => {
    const storage = createStorage({
        mira_terminal_tools: JSON.stringify({ tools: [{ id: "tool-a" }] })
    });

    const fallback = await createSystemBackupBestAvailable(
        storage,
        new Date("2026-09-11T00:00:00.000Z"),
        async () => ({ configured: false, authenticated: false, isAdmin: false }),
        async () => {
            throw new Error("Site Structure must not be requested without CMS access");
        },
        async () => {
            throw new Error("Canonical items must not be requested without CMS access");
        }
    );

    assert.equal(fallback.mode, "local-fallback");
    assert.equal(fallback.payload.schemaVersion, 1);
    assert.match(fallback.warning, /localStorage/);
    assert.match(fallback.warning, /schema v3/);
});

test("System Backup upgrades to canonical v3 and replaces stale local cache with CMS data", async () => {
    const storage = createStorage({
        mira_terminal_games: JSON.stringify({ games: [{ id: "stale-local-game" }] }),
        mira_terminal_scenarios: JSON.stringify([{ id: "stale-local-scenario" }])
    });

    const canonical = await createSystemBackupBestAvailable(
        storage,
        new Date("2026-09-11T00:00:00.000Z"),
        async () => ({ configured: true, authenticated: true, isAdmin: true }),
        async () => [{
            section_key: "home",
            title: "Home",
            slug: "",
            section_type: "home",
            status: "published",
            navigation_label: "Home",
            show_in_navigation: true,
            sort_order: 1,
            content: {}
        }],
        async () => ({ ...CANONICAL_ITEMS })
    );

    assert.equal(canonical.mode, "canonical");
    assert.equal(canonical.payload.schemaVersion, 3);
    assert.equal(canonical.payload.backupVersion, "3.0.0");
    assert.equal(canonical.payload.data.cms.source, "supabase");
    assert.equal(canonical.payload.data.cms.siteSections[0].section_key, "home");
    assert.deepEqual(
        JSON.parse(canonical.payload.data.items.mira_terminal_games),
        { games: [{ id: "cms-game" }] }
    );
    assert.deepEqual(
        JSON.parse(canonical.payload.data.items.mira_terminal_scenarios),
        [{ id: "cms-scenario" }]
    );

    const projectSummary = canonical.payload.data.storageTargets.find(target => target.id === "projects");
    assert.equal(projectSummary.count, 1);
    assert.ok(projectSummary.bytes > 0);
});

test("canonical System Backup reconstructs Admin content from CMS without authority tables", async () => {
    const backup = await read("apps/admin/js/features/system/backup/systemBackup.js");

    assert.match(backup, /loadCanonicalBackupItems/);
    assert.match(backup, /getContentRecord\("home", "config", null\)/);
    assert.match(backup, /getContentRecord\("trpg-scenarios", "collection", ownerRow\.id\)/);
    assert.match(backup, /createCollectionFromCms/);
    assert.match(backup, /schemaVersion:\s*3/);
    assert.match(backup, /source:\s*"supabase"/);
    assert.match(backup, /siteSections:/);
    assert.doesNotMatch(backup, /cms_admin_members|owner_user_id/);
});

test("System Import restores v2 and v3 Site Structure through the canonical rollback path", async () => {
    const importer = await read("apps/admin/js/features/system/import/systemImport.js");
    const state = await read("apps/admin/js/features/system/canonicalAdminState.js");

    assert.match(importer, /previewSystemImportCanonical/);
    assert.match(importer, /createSystemBackupCanonical/);
    assert.match(importer, /payload\.schemaVersion >= 2/);
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
