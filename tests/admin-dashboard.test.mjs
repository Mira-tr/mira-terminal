import test from "node:test";
import assert from "node:assert/strict";
import {
    access,
    readFile
} from "node:fs/promises";

import {
    loadAdminDashboardCards
} from "../apps/admin/js/features/common/adminDashboard.js";

import {
    ADMIN_PRODUCT_NAME,
    getAdminPrimaryNavigation,
    getAdminRoute,
    getRouteHref
} from "../apps/admin/js/features/navigation/adminRouteRegistry.js";

const ROOT = new URL("../", import.meta.url);

test("Admin route registry is the canonical source for names and destinations", () => {
    assert.equal(ADMIN_PRODUCT_NAME, "RELMUA Admin");
    assert.deepEqual(
        getAdminPrimaryNavigation().map(route => route.label),
        ["Admin Home", "Brand", "Creators", "System", "Desktop機能"]
    );
    assert.equal(getRouteHref(getAdminRoute("brand")), "./brand/");
    assert.equal(getRouteHref(getAdminRoute("brand"), "desktop"), "../admin/brand/");
    assert.equal(getRouteHref(getAdminRoute("system")), "./system/");
    assert.equal(getRouteHref(getAdminRoute("system"), "desktop"), "../admin/system/");
});

test("Admin Dashboard exposes canonical Brand, Creators, System, and Desktop entries", () => {
    const cards = loadAdminDashboardCards();

    assert.deepEqual(
        cards.map(card => card.id),
        ["brand", "creators", "system", "desktop"]
    );
    assert.equal(cards.find(card => card.id === "brand").href, "./brand/");
    assert.equal(cards.find(card => card.id === "creators").href, "./creators/");
    assert.equal(cards.find(card => card.id === "system").href, "./system/");
    assert.equal(cards.find(card => card.id === "desktop").href, "../studio/");

    cards.forEach(card => {
        assert.equal(card.error, "", card.id);
        assert.ok(card.primary, card.id);
        assert.ok(Array.isArray(card.stats), card.id);
    });
});

test("Admin Hub removes direct feature and creator-specific navigation", async () => {
    const cards = loadAdminDashboardCards();

    for(const card of cards){
        const target = new URL(card.href, new URL("apps/admin/index.html", ROOT));
        const fileTarget = target.pathname.endsWith("/")
            ? new URL("index.html", target)
            : target;
        await access(fileTarget);
    }

    const html = await read("apps/admin/index.html");
    const nav = html.match(/<nav class="header-nav"[\s\S]*?<\/nav>/)?.[0] || "";
    const page = await read("apps/admin/js/pages/adminDashboardPage.js");
    const css = await read("apps/admin/css/pages/dashboard.css");

    assert.match(html, /href="\.\/brand\/"/);
    assert.match(html, /href="\.\/creators\/"/);
    assert.match(html, /href="\.\/system\/"/);
    assert.match(html, /href="\.\.\/studio\/"/);
    assert.match(html, /id="moduleDashboard"/);
    assert.match(html, /id="lastBackupExportAt"/);
    assert.match(html, /adminDashboardPage\.js/);

    assert.doesNotMatch(nav, /TRPG|House Rules|Profile \/ Links|Home設定|作品|道具|記録/);
    assert.doesNotMatch(html, /TRPG Scenario|House Rules|Profile \/ Links/);
    assert.match(page, /createElement\s*\(/);
    assert.match(page, /textContent\s*=/);
    assert.match(page, /replaceChildren\s*\(/);
    assert.doesNotMatch(page, /innerHTML/);
    assert.match(css, /@media \(max-width: 390px\)/);
    assert.match(css, /repeat\(auto-fit, minmax\(280px, 1fr\)\)/);
});

test("Admin Hub keeps a current-location breadcrumb", async () => {
    const html = await read("apps/admin/index.html");
    const breadcrumb = html.match(/<nav class="admin-breadcrumb"[\s\S]*?<\/nav>/)?.[0] || "";

    assert.match(breadcrumb, /RELMUA Admin/);
    assert.match(breadcrumb, /aria-current="page"/);
});

test("pnpm local store is ignored", async () => {
    const gitignore = await read(".gitignore");

    assert.match(gitignore, /^\.pnpm-store\/$/m);
    await assert.rejects(
        access(new URL(".pnpm-store/", ROOT)),
        error => error?.code === "ENOENT"
    );
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
