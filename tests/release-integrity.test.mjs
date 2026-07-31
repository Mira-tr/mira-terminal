import test from "node:test";
import assert from "node:assert/strict";

import {
    readFile
} from "node:fs/promises";

import {
    APP_NAME,
    PRODUCT_VERSION,
    isSupportedAppName
} from "../apps/admin/js/appIdentity.js";

import {
    getProfileCompatibilityIssues
} from "../scripts/public-readiness-rules.mjs";

const ROOT = new URL("../", import.meta.url);

test("v1.0 identity is canonical while legacy Backup names remain readable", async () => {
    const packageData = JSON.parse(await read("package.json"));

    assert.equal(APP_NAME, "RELMUA Terminal");
    assert.equal(PRODUCT_VERSION, "1.0.0");
    assert.equal(packageData.version, PRODUCT_VERSION);
    assert.equal(isSupportedAppName(APP_NAME), true);
    assert.equal(isSupportedAppName("MIRA Terminal"), true);
    assert.equal(isSupportedAppName("Other Terminal"), false);
});

test("module Backup validators use the shared legacy app-name compatibility rule", async () => {
    const paths = [
        "apps/admin/js/features/creators/creatorBackup.js",
        "apps/admin/js/features/game/gameBackup.js",
        "apps/admin/js/features/notes/noteBackup.js",
        "apps/admin/js/features/profile/profileBackup.js",
        "apps/admin/js/features/tools/toolBackup.js",
        "apps/admin/js/features/trpg/rules/rulesBackup.js"
    ];

    for(const path of paths){
        const source = await read(path);
        assert.match(source, /isSupportedAppName\(data\.app\)/, path);
    }
});

test("Public JSON uses the canonical application name", async () => {
    const paths = [
        "apps/web/data/public-creators.json",
        "apps/web/data/public-profile.json",
        "apps/web/game/data/public-games.json",
        "apps/web/tools/data/public-tools.json",
        "apps/web/notes/data/public-notes.json",
        "apps/web/data/creators/chikage/trpg/public-scenarios.json",
        "apps/web/data/creators/chikage/trpg/house-rules.json"
    ];

    for(const path of paths){
        const payload = JSON.parse(await read(path));
        assert.equal(payload.app, APP_NAME, path);
    }
});

test("legacy Public Profile cannot drift from the Primary Creator", async () => {
    const creators = JSON.parse(
        await read("apps/web/data/public-creators.json")
    );
    const profile = JSON.parse(
        await read("apps/web/data/public-profile.json")
    );

    assert.deepEqual(getProfileCompatibilityIssues(creators, profile), []);

    assert.deepEqual(
        getProfileCompatibilityIssues(creators, {
            ...profile,
            profile: {
                ...profile.profile,
                displayName: "stale"
            }
        }),
        ["public-profile.json displayName is stale"]
    );
});

test("empty and preparation-only public areas are not indexed or promoted", async () => {
    const sitemap = await read("apps/web/sitemap.xml");
    const tools = await read("apps/web/tools/index.html");
    const asagiriPages = await Promise.all([
        "apps/web/creators/asagiri/index.html",
        "apps/web/creators/asagiri/profile/index.html",
        "apps/web/creators/asagiri/works/index.html",
        "apps/web/creators/asagiri/contact/index.html"
    ].map(read));

    assert.match(tools, /<meta name="robots" content="noindex,follow">/);
    asagiriPages.forEach(page => {
        assert.match(page, /<meta name="robots" content="noindex,follow">/);
    });
    assert.doesNotMatch(sitemap, /\/tools\/|\/creators\/asagiri\//);
});

test("Home promotes current public value instead of an internal migration note", async () => {
    const home = await read("apps/web/index.html");
    const notes = JSON.parse(
        await read("apps/web/notes/data/public-notes.json")
    ).notes;
    const firstNote = [...notes].sort((a, b) => a.order - b.order)[0];

    assert.match(home, /シナリオ候補メーカー/);
    assert.match(home, /公開書架から今夜の候補を3件/);
    assert.doesNotMatch(home, /\d+件の書架から今夜の候補/);
    assert.match(home, /href="\.\/creators\/chikage\/trpg\/picker\/"/);
    assert.doesNotMatch(
        home.match(/<section class="home-recent-updates"[\s\S]*?<\/section>/)?.[0] ?? "",
        /v0\.4への移行メモ/
    );
    assert.equal(firstNote.title, "TRPGシナリオ管理で重視していること");
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
