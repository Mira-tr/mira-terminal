import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    getPublicAdminSurfaceForAdminLocation,
    getPublicAdminSurface
} from "../apps/admin/js/features/site/publicAdminRegistry.js";

import {
    evaluatePublicSurface
} from "../apps/admin/js/features/site/surfaceReadiness.js";

import {
    createDefaultCreatorSite
} from "../apps/admin/js/features/creators/creatorStore.js";

import {
    createPublicCreatorPreview
} from "../apps/admin/js/features/creators/creatorPublicExport.js";

import {
    getPublicExportTargets
} from "../apps/admin/js/features/system/systemInventory.js";

import {
    LAST_PUBLIC_EXPORT_KEY
} from "../apps/admin/js/store.js";

const ROOT = new URL("../", import.meta.url);
const NOW = "2026-09-12T00:00:00.000Z";

test("Public surface registry resolves brand pages and Chikage section hashes", () => {
    const adminRoot = new URL("https://example.test/apps/admin/");

    assert.equal(
        getPublicAdminSurfaceForAdminLocation(adminRoot, {
            pathname: "/apps/admin/home/",
            hash: ""
        })?.id,
        "relmua-home"
    );

    assert.equal(
        getPublicAdminSurfaceForAdminLocation(adminRoot, {
            pathname: "/apps/admin/creators/chikage/",
            hash: "#site-profile"
        })?.id,
        "creator-chikage-profile"
    );
});

test("Chikage page readiness blocks non-public Creator and accepts a ready public draft", () => {
    const surface = getPublicAdminSurface("creator-chikage-home");
    const storage = createStorage({
        [LAST_PUBLIC_EXPORT_KEY]: JSON.stringify({ creators: NOW })
    });
    const creator = createCreator("public");

    const ready = evaluatePublicSurface(surface, { storage, creator });
    assert.equal(ready.status, "ready");
    assert.equal(ready.ready, true);

    const blocked = evaluatePublicSurface(surface, {
        storage,
        creator: { ...creator, status: "draft" }
    });
    assert.equal(blocked.status, "blocked");
    assert.ok(blocked.issues.some(issue => issue.title === "Creatorが公開状態ではありません"));
});

test("Creator draft preview uses the same public-safe shape as Public Export", () => {
    const preview = createPublicCreatorPreview({
        ...createCreator("public"),
        memo: "private memo",
        createdAt: NOW,
        updatedAt: NOW
    });

    assert.equal(preview.displayName, "千景");
    assert.equal(preview.site.home.lead, "Preview lead");
    assert.equal("status" in preview, false);
    assert.equal("memo" in preview, false);
    assert.equal("createdAt" in preview, false);
    assert.equal("updatedAt" in preview, false);
});

test("Admin shell mounts one shared Public Editor console", async () => {
    const shell = await read("apps/admin/js/adminShell.js");
    const consoleSource = await read("apps/admin/js/features/site/adminSurfaceConsole.js");

    assert.match(shell, /features\/site\/adminSurfaceConsole\.js/);
    assert.match(shell, /initAdminSurfaceConsole/);
    assert.match(consoleSource, /未保存をプレビュー/);
    assert.match(consoleSource, /system\/publish\//);
    assert.match(consoleSource, /postMessage/);
    assert.doesNotMatch(consoleSource, /innerHTML/);
});

test("Public Creator runtime only accepts same-origin parent preview messages", async () => {
    const runtime = await read("apps/web/creators/js/creatorSiteRuntime.js");

    assert.match(runtime, /event\.source !== window\.parent/);
    assert.match(runtime, /event\.origin !== window\.location\.origin/);
    assert.match(runtime, /relmua-admin-preview/);
    assert.match(runtime, /ADMIN \/ 未保存プレビュー/);
    assert.doesNotMatch(runtime, /innerHTML/);
});

test("Publish screen queues authenticated automatic releases and keeps manual package recovery", async () => {
    const html = await read("apps/admin/system/publish/index.html");
    const page = await read("apps/admin/js/pages/publishFlowPage.js");
    const service = await read("apps/admin/js/features/system/publish/publicationService.js");
    const pack = await read("apps/admin/js/features/system/publish/publicSnapshotPackage.js");
    const apply = await read("scripts/apply-public-package.mjs");

    assert.match(html, /id="systemPublishNow"/);
    assert.match(html, /id="systemPublicationState"/);
    assert.match(html, /id="systemPublicationHistory"/);
    assert.match(html, /id="systemPublishPackage"/);
    assert.match(html, /id="copyApplyPackageCommand"/);
    assert.match(html, /publishFlowPage\.js/);

    assert.match(page, /hydrateCanonicalAdminState/);
    assert.match(page, /requestAutomaticPublish/);
    assert.match(page, /getPublicationHistory/);
    assert.match(page, /requestPublicationRollback/);
    assert.match(page, /computePublicSnapshotFingerprint/);
    assert.match(page, /保存済み・未公開/);
    assert.match(page, /公開中/);
    assert.match(page, /公開済み/);
    assert.match(page, /公開失敗/);
    assert.match(page, /downloadPublicSnapshotPackage/);

    assert.match(service, /FUNCTION_NAME\s*=\s*"admin-publish"/);
    assert.match(service, /client\.functions\.invoke\(FUNCTION_NAME/);
    assert.match(service, /access\?\.isAdmin/);
    assert.doesNotMatch(service, /GITHUB_TOKEN|ghp_|github_pat_/i);

    assert.match(pack, /ADMIN_ONLY_FIELDS/);
    assert.match(pack, /SAFE_EXTERNAL_PROTOCOLS/);
    assert.match(pack, /computePublicSnapshotFingerprint/);
    assert.match(pack, /pack\.files\.length !== dynamicTargets\.length/);
    assert.match(pack, /公開ターゲットが不足しています/);
    assert.match(pack, /recordPublicExport\(file\.targetId/);

    assert.match(apply, /ALLOWED_TARGETS/);
    assert.match(apply, /Public snapshot package must contain/);
    assert.match(apply, /Filename mismatch/);
    assert.match(apply, /Destination mismatch/);
    assert.match(apply, /SAFE_EXTERNAL_PROTOCOLS/);
    assert.match(apply, /scripts\/build-public\.mjs/);
});

test("Automatic publishing keeps browser, Edge Function, CLI and GitHub target contracts aligned", async () => {
    const browser = await read("apps/admin/js/features/system/publish/publicSnapshotPackage.js");
    const edge = await read("supabase/functions/_shared/publicationContract.ts");
    const apply = await read("scripts/apply-public-package.mjs");
    const dynamicTargets = getPublicExportTargets().filter(target => target.filename !== "static-html");

    assert.equal(dynamicTargets.length, 8);
    for(const target of dynamicTargets){
        for(const [label, source] of [["browser", browser], ["edge", edge], ["cli", apply]]){
            assert.match(source, new RegExp(escapeRegExp(target.id)), `${label}: ${target.id}`);
            assert.match(source, new RegExp(escapeRegExp(target.filename)), `${label}: ${target.filename}`);
            assert.match(source, new RegExp(escapeRegExp(target.destination)), `${label}: ${target.destination}`);
        }
    }

    for(const source of [browser, edge, apply]){
        assert.match(source, /memo/);
        assert.match(source, /status/);
        assert.match(source, /createdAt/);
        assert.match(source, /updatedAt/);
        assert.match(source, /http:/);
        assert.match(source, /https:/);
    }
});

test("Publication Edge Functions enforce Discord Admin auth and a narrow GitHub OIDC identity", async () => {
    const config = await read("supabase/config.toml");
    const adminFunction = await read("supabase/functions/admin-publish/index.ts");
    const feedFunction = await read("supabase/functions/admin-publish-feed/index.ts");
    const contract = await read("supabase/functions/_shared/publicationContract.ts");
    const migration = await read("supabase/migrations/20260912070817_cms_publication_queue_v1.sql");
    const hardening = await read("supabase/migrations/20260912074100_cms_publication_queue_acl_hardening.sql");

    assert.match(config, /\[functions\.admin-publish\][\s\S]*verify_jwt\s*=\s*true/);
    assert.match(config, /\[functions\.admin-publish-feed\][\s\S]*verify_jwt\s*=\s*false/);

    assert.match(adminFunction, /supabase\.auth\.getUser\(token\)/);
    assert.match(adminFunction, /cms_admin_members/);
    assert.match(adminFunction, /MAX_SNAPSHOT_BYTES/);
    assert.match(adminFunction, /validatePublicSnapshotPackage/);
    assert.match(adminFunction, /computePublicSnapshotFingerprint/);
    assert.match(adminFunction, /action === "rollback"/);
    assert.doesNotMatch(adminFunction, /GITHUB_TOKEN|ghp_|github_pat_/i);

    assert.match(feedFunction, /https:\/\/token\.actions\.githubusercontent\.com/);
    assert.match(feedFunction, /EXPECTED_AUDIENCE\s*=\s*"relmua-cms-publish"/);
    assert.match(feedFunction, /EXPECTED_REPOSITORY\s*=\s*"Mira-tr\/mira-terminal"/);
    assert.match(feedFunction, /EXPECTED_REPOSITORY_ID\s*=\s*"1291073303"/);
    assert.match(feedFunction, /EXPECTED_REF\s*=\s*"refs\/heads\/main"/);
    assert.match(feedFunction, /publish-cms-queue\.yml@refs\/heads\/main/);
    assert.match(feedFunction, /ALLOWED_EVENTS[\s\S]*schedule[\s\S]*workflow_dispatch/);
    assert.match(feedFunction, /crypto\.subtle\.verify/);
    assert.match(feedFunction, /workflow_run_id/);
    assert.match(feedFunction, /validatePublicSnapshotPackage/);
    assert.match(feedFunction, /computePublicSnapshotFingerprint/);

    assert.match(contract, /PUBLICATION_TARGETS/);
    assert.match(contract, /Public snapshot package must contain/);
    assert.match(contract, /Missing public target/);
    assert.match(contract, /computePublicSnapshotFingerprint/);

    assert.match(migration, /enable row level security/);
    assert.match(migration, /cms_publication_requests/);
    assert.match(hardening, /revoke all on table public\.cms_publication_requests from authenticated/);
    assert.match(hardening, /grant select, insert, update, delete on table public\.cms_publication_requests to service_role/);
    assert.match(hardening, /drop policy if exists cms_publication_requests_select_admin/);
    assert.match(hardening, /drop policy if exists cms_publication_requests_insert_admin/);
});

test("Publication worker is the single Pages deployer for queued snapshots", async () => {
    const queueWorkflow = await read(".github/workflows/publish-cms-queue.yml");
    const pagesWorkflow = await read(".github/workflows/publish-pages.yml");

    assert.match(queueWorkflow, /workflow_dispatch:/);
    assert.match(queueWorkflow, /cron:\s*"\*\/5 \* \* \* \*"/);
    assert.match(queueWorkflow, /id-token:\s*write/);
    assert.match(queueWorkflow, /contents:\s*write/);
    assert.match(queueWorkflow, /OIDC_AUDIENCE:\s*relmua-cms-publish/);
    assert.match(queueWorkflow, /admin-publish-feed/);
    assert.match(queueWorkflow, /node scripts\/apply-public-package\.mjs/);
    assert.match(queueWorkflow, /npm run check/);
    assert.match(queueWorkflow, /npm run build:public/);
    assert.match(queueWorkflow, /\[skip ci\]/);
    assert.match(queueWorkflow, /actions\/deploy-pages@v4/);
    assert.match(queueWorkflow, /action:\s*"complete"/);
    assert.match(queueWorkflow, /group:\s*public-pages-main/);
    assert.match(pagesWorkflow, /group:\s*public-pages-main/);

    assert.doesNotMatch(queueWorkflow, /secrets\.[A-Z0-9_]*GITHUB_TOKEN|ghp_|github_pat_/i);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

function createCreator(status){
    return {
        id: "creator-chikage",
        slug: "chikage",
        displayName: "千景",
        nameEn: "Chikage",
        bio: "Creator bio",
        activities: ["Game", "Web"],
        works: [{ id: "work-a", title: "Work", summary: "Summary", url: "https://example.test/work", status: "public", order: 1 }],
        links: [{ id: "link-a", label: "Site", url: "https://example.test/", status: "public", order: 1 }],
        site: {
            ...createDefaultCreatorSite("chikage", "千景"),
            home: {
                ...createDefaultCreatorSite("chikage", "千景").home,
                lead: "Preview lead"
            }
        },
        status,
        order: 1
    };
}

function createStorage(initial = {}){
    const values = new Map(Object.entries(initial));
    return {
        getItem(key){ return values.has(key) ? values.get(key) : null; },
        setItem(key, value){ values.set(key, String(value)); },
        removeItem(key){ values.delete(key); }
    };
}

function escapeRegExp(value){
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
