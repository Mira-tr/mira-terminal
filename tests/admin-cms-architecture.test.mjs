import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    getAllWorkspaces,
    getCreatorWorkspaces,
    getWorkspaceChildren,
    getWorkspaces
} from "../apps/admin/js/features/workspaces/workspaceRegistry.js";

const ROOT = new URL("../", import.meta.url);

test("Admin root hierarchy keeps Chikage below Creators", () => {
    assert.deepEqual(
        getWorkspaces().map(workspace => workspace.id),
        ["workspace-relmua", "workspace-creators", "workspace-system"]
    );

    const creatorWorkspaces = getCreatorWorkspaces();
    assert.equal(creatorWorkspaces.length, 1);
    assert.equal(creatorWorkspaces[0].id, "workspace-creator-chikage");
    assert.equal(creatorWorkspaces[0].parentId, "workspace-creators");
    assert.equal(getWorkspaceChildren("workspace-creators")[0].ownerCreatorId, "creator-chikage");
    assert.equal(getAllWorkspaces().length, 4);
});

test("CMS foundation enables RLS and does not auto-assign a guessed owner", async () => {
    const sql = await read("supabase/migrations/20260911073828_cms_foundation_v1.sql");

    [
        "cms_admin_members",
        "cms_creators",
        "cms_site_sections",
        "cms_content_records",
        "cms_publication_revisions",
        "cms_activity_log"
    ].forEach(table => {
        assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    });

    assert.match(sql, /owner_user_id uuid references auth\.users/);
    assert.match(sql, /'chikage', '千景'/);
    assert.match(sql, /'public', null, true, 1/);
    assert.doesNotMatch(sql, /insert into public\.cms_admin_members\s*\(/i);
});

test("CMS client validates the current user instead of trusting local identity", async () => {
    const source = await read("apps/admin/js/features/cms/cmsClient.js");
    assert.match(source, /auth\.getUser\(\)/);
    assert.match(source, /cms_admin_members/);
    assert.match(source, /owner_user_id/);
    assert.doesNotMatch(source, /service_role|SERVICE_ROLE/);
});

test("Database screen exposes only the current CMS connection and identity controls", async () => {
    const html = await read("apps/admin/system/database/index.html");
    const page = await read("apps/admin/js/pages/databasePage.js");

    assert.match(html, /Supabase CMS/);
    assert.match(html, /databaseLogin/);
    assert.match(html, /databaseIdentityPanel/);
    assert.doesNotMatch(html, /databaseUploadLegacy|databaseRestoreLegacy|Migration Bridge/);
    assert.doesNotMatch(page, /cmsLegacyBridge|exportLegacyStorageToCms|restoreLegacyStorageFromCms/);
});

test("RELMUA structure editor is DB-backed and never hard-deletes sections", async () => {
    const html = await read("apps/admin/brand/structure/index.html");
    const page = await read("apps/admin/js/pages/siteStructurePage.js");

    assert.match(html, /公開する場所を管理する/);
    assert.match(html, /structureAdd/);
    assert.match(html, /structureArchive/);
    assert.match(page, /listSiteSections/);
    assert.match(page, /upsertSiteSection/);
    assert.match(page, /status:\s*"archived"/);
    assert.doesNotMatch(page, /\.delete\s*\(/);
    assert.doesNotMatch(page, /innerHTML/);
});

test("local development server exposes only publishable Supabase configuration", async () => {
    const source = await read("scripts/serve.mjs");
    assert.match(source, /\/config\/supabase-public\.json/);
    assert.match(source, /SUPABASE_PUBLISHABLE_KEY/);
    assert.match(source, /SUPABASE_ANON_KEY/);
    assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("deployed Admin exposes Supabase configuration through a publishable-only Vercel endpoint", async () => {
    const api = await read("api/supabase-public.js");
    const client = await read("apps/admin/js/features/cms/cmsClient.js");

    assert.match(api, /SUPABASE_URL/);
    assert.match(api, /SUPABASE_PUBLISHABLE_KEY/);
    assert.match(api, /SUPABASE_ANON_KEY/);
    assert.doesNotMatch(api, /SUPABASE_SERVICE_ROLE_KEY|service_role/);
    assert.match(api, /Cache-Control/);
    assert.match(client, /\/api\/supabase-public/);
    assert.match(client, /\/config\/supabase-public\.json/);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
