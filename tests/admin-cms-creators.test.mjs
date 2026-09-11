import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    createCollectionFromCms
} from "../apps/admin/js/features/creators/creatorCmsStore.js";

const ROOT = new URL("../", import.meta.url);

function creatorRow(overrides = {}){
    return {
        id: "11111111-1111-4111-8111-111111111111",
        legacy_id: "creator-chikage",
        slug: "chikage",
        display_name: "千景",
        name_en: "Chikage",
        bio: "bio",
        activities: ["Game", "TRPG"],
        status: "public",
        is_primary: true,
        sort_order: 1,
        profile: {
            adminSchemaVersion: 1,
            works: [{ id: "work-a", title: "A", status: "public", order: 1 }],
            links: [{ id: "link-a", label: "A", url: "https://example.com", status: "public", order: 1 }]
        },
        created_at: "2026-09-01T00:00:00.000Z",
        updated_at: "2026-09-11T00:00:00.000Z",
        ...overrides
    };
}

test("Creator CMS keeps legacy IDs while DB UUID remains internal", () => {
    const collection = createCollectionFromCms([creatorRow()]);

    assert.equal(collection.primaryCreatorId, "creator-chikage");
    assert.equal(collection.creators[0].id, "creator-chikage");
    assert.equal(collection.creators[0].slug, "chikage");
    assert.deepEqual(collection.creators[0].activities, ["Game", "TRPG"]);
    assert.equal(collection.creators[0].works[0].id, "work-a");
    assert.equal(collection.creators[0].links[0].url, "https://example.com");
    assert.equal("owner_user_id" in collection.creators[0], false);
});

test("archived Creator rows never return to the compatibility cache", () => {
    const collection = createCollectionFromCms([
        creatorRow(),
        creatorRow({
            id: "22222222-2222-4222-8222-222222222222",
            legacy_id: "old-creator",
            slug: "old",
            display_name: "Old",
            status: "archived",
            is_primary: false,
            sort_order: 2
        })
    ]);

    assert.deepEqual(collection.creators.map(creator => creator.id), ["creator-chikage"]);
});

test("Creator bridge migration preserves old IDs and uses archive instead of destructive deletion", async () => {
    const bridge = await read("supabase/migrations/20260911161500_cms_creator_legacy_bridge.sql");
    const compat = await read("supabase/migrations/20260911162000_cms_creator_legacy_id_compat.sql");
    const cmsStore = await read("apps/admin/js/features/creators/creatorCmsStore.js");
    const repository = await read("apps/admin/js/features/cms/cmsRepository.js");

    assert.match(bridge, /add column if not exists legacy_id text/i);
    assert.match(bridge, /add column if not exists profile jsonb/i);
    assert.match(bridge, /'archived'/);
    assert.match(compat, /legacy_id ~ '\^\[a-z0-9-\]\+\$'/);
    assert.match(cmsStore, /archiveCreatorByLegacyId/);
    assert.match(cmsStore, /legacy_id:\s*creator\.id/);
    assert.match(cmsStore, /adminSchemaVersion:\s*CREATOR_CMS_SCHEMA_VERSION/);
    assert.match(cmsStore, /resolveCmsWriteTarget/);
    assert.match(repository, /upsertCreatorByLegacyId/);
    assert.match(repository, /archiveCreatorByLegacyId/);
    assert.doesNotMatch(cmsStore, /\.delete\s*\(/);
});

test("Creator Admin form hydrates and mutates through canonical CMS operations", async () => {
    const form = await read("apps/admin/js/features/creators/creatorForm.js");
    const page = await read("apps/admin/js/pages/creatorsPage.js");
    const backup = await read("apps/admin/js/features/creators/creatorBackup.js");

    assert.match(form, /hydrateCreatorsFromCms/);
    assert.match(form, /addCreatorCanonical/);
    assert.match(form, /updateCreatorCanonical/);
    assert.match(form, /setPrimaryCreatorCanonical/);
    assert.match(form, /deleteCreatorCanonical/);
    assert.match(form, /DB上ではArchiveとして保持/);
    assert.match(page, /await form\.ready/);
    assert.match(backup, /await saveCreatorsCanonical\(normalized\)/);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
