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

test("Publish screen exposes one package handoff instead of pretending to push GitHub", async () => {
    const html = await read("apps/admin/system/publish/index.html");
    const page = await read("apps/admin/js/pages/publishFlowPage.js");
    const pack = await read("apps/admin/js/features/system/publish/publicSnapshotPackage.js");
    const apply = await read("scripts/apply-public-package.mjs");

    assert.match(html, /id="systemPublishPackage"/);
    assert.match(html, /id="copyApplyPackageCommand"/);
    assert.match(html, /publishFlowPage\.js/);
    assert.match(html, /ブラウザのAdminはGitHubの認証情報を持たない/);
    assert.match(page, /hydrateCanonicalAdminState/);
    assert.match(page, /downloadPublicSnapshotPackage/);
    assert.match(pack, /ADMIN_ONLY_FIELDS/);
    assert.match(pack, /SAFE_EXTERNAL_PROTOCOLS/);
    assert.match(pack, /recordPublicExport\(file\.targetId/);
    assert.match(apply, /ALLOWED_DESTINATIONS/);
    assert.match(apply, /apps\/web\/data\/public-creators\.json/);
    assert.match(apply, /scripts\/build-public\.mjs/);
    assert.match(apply, /Destination mismatch/);
    assert.match(apply, /SAFE_EXTERNAL_PROTOCOLS/);
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
