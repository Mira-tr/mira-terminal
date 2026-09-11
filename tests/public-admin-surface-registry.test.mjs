import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    PUBLIC_ADMIN_SURFACES,
    getPublicAdminSurfaces,
    resolveSurfaceUrls
} from "../apps/admin/js/features/site/publicAdminRegistry.js";

const ROOT = new URL("../", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

test("RELMUA brand surfaces and Creator surfaces remain separate", () => {
    const brand = getPublicAdminSurfaces("brand", "relmua");
    const chikage = getPublicAdminSurfaces("creator", "creator-chikage");

    assert.ok(brand.length >= 7);
    assert.ok(chikage.length >= 5);
    assert.ok(brand.every(surface => surface.scope === "brand" && surface.ownerId === "relmua"));
    assert.ok(chikage.every(surface => surface.scope === "creator" && surface.ownerId === "creator-chikage"));
    assert.ok(chikage.every(surface => surface.publicPath.startsWith("creators/chikage/")));
    assert.equal(PUBLIC_ADMIN_SURFACES.some(surface => surface.scope === "brand" && surface.ownerId === "creator-chikage"), false);
});

test("surface registry resolves matching Public and Admin destinations", () => {
    const home = PUBLIC_ADMIN_SURFACES.find(surface => surface.id === "relmua-home");
    const chikage = PUBLIC_ADMIN_SURFACES.find(surface => surface.id === "creator-chikage-profile");

    assert.deepEqual(resolveSurfaceUrls(home, new URL("https://example.test/apps/admin/")), {
        adminHref: "https://example.test/apps/admin/home/",
        publicHref: "https://example.test/apps/web/"
    });
    assert.deepEqual(resolveSurfaceUrls(chikage, new URL("https://example.test/apps/admin/")), {
        adminHref: "https://example.test/apps/admin/creators/chikage/#site-profile",
        publicHref: "https://example.test/apps/web/creators/chikage/profile/"
    });
});

test("brand editor explains that Chikage is a Creator instead of the RELMUA brand", async () => {
    const html = await read("apps/admin/brand/index.html");
    const page = await read("apps/admin/js/pages/brandPage.js");
    const routes = await read("apps/admin/js/features/navigation/adminRouteRegistry.js");

    assert.match(html, /RELMUAとCreatorは別の編集領域です/);
    assert.match(html, /千景はRELMUAに参加するCreatorの1人/);
    assert.match(html, /id="publicAdminBridge"/);
    assert.match(page, /getPublicAdminSurfaces\("brand", "relmua"\)/);
    assert.match(routes, /createRoute\("admin-creators", "活動者"/);
});

test("Chikage Admin workspace owns a scoped Chikage visual world", async () => {
    const workspace = await read("apps/admin/creators/chikage/index.html");
    const css = await read("apps/admin/css/pages/public-admin-bridge.css");
    const style = await read("apps/admin/css/style.css");

    assert.match(workspace, /class="creator-admin creator-admin--chikage"/);
    assert.match(css, /\.creator-admin--chikage\{/);
    assert.match(css, /--color-bg:var\(--creator-world-canvas\)/);
    assert.match(css, /--color-accent:color-mix\(in srgb,var\(--creator-world-accent\)/);
    assert.ok(style.trim().endsWith('@import "./pages/public-admin-bridge.css";'));
});

test("all main Chikage public surfaces consume the Creator site snapshot runtime", async () => {
    const pages = [
        "apps/web/creators/chikage/index.html",
        "apps/web/creators/chikage/works/index.html",
        "apps/web/creators/chikage/profile/index.html",
        "apps/web/creators/chikage/contact/index.html",
        "apps/web/creators/chikage/trpg/index.html"
    ];

    for(const path of pages){
        const html = await read(path);
        assert.match(html, /data-creator-slug="chikage"/, path);
        assert.match(html, /creatorSiteRuntime\.js/, path);
    }

    const home = await read(pages[0]);
    assert.match(home, /id="creatorHomeLead"/);
    assert.doesNotMatch(home, /id="creatorBio"/);
});

test("Creator site runtime applies editable theme, navigation and page copy safely", async () => {
    const runtime = await read("apps/web/creators/js/creatorSiteRuntime.js");

    assert.match(runtime, /applyWorld\(creator\.site\.theme/);
    assert.match(runtime, /applyNavigation\(creator\.site\.navigation/);
    assert.match(runtime, /--ch-house-bg/);
    assert.match(runtime, /--ch-house-purple/);
    assert.match(runtime, /\.trpg-overview-hero \.trpg-v3-kicker/);
    assert.match(runtime, /\.trpg-overview-hero__lead/);
    assert.doesNotMatch(runtime, /innerHTML/);
});
