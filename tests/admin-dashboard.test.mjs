import test from "node:test";
import assert from "node:assert/strict";
import {
    access,
    readFile
} from "node:fs/promises";

import {
    loadAdminDashboardCards
} from "../apps/admin/js/features/common/adminDashboard.js";

const ROOT = new URL("../", import.meta.url);

test("Admin Dashboard exposes direct Admin editor entries", () => {
    const cards = loadAdminDashboardCards();

    assert.deepEqual(
        cards.map(card => card.id),
        ["home", "projects", "tools", "notes", "creators", "trpg", "system"]
    );
    assert.equal(cards.find(card => card.id === "home").href, "./home/");
    assert.equal(cards.find(card => card.id === "projects").href, "./game/");
    assert.equal(cards.find(card => card.id === "tools").href, "./tools/");
    assert.equal(cards.find(card => card.id === "notes").href, "./notes/");
    assert.equal(cards.find(card => card.id === "creators").href, "./creators/");
    assert.equal(cards.find(card => card.id === "trpg").href, "./trpg/");
    assert.equal(cards.find(card => card.id === "system").href, "./system/publish/");

    cards.forEach(card => {
        assert.equal(card.error, "", card.id);
        assert.ok(card.primary, card.id);
        assert.ok(Array.isArray(card.stats), card.id);
    });
});

test("Admin Hub uses Admin screens as the primary navigation", async () => {
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

    assert.match(html, /href="\.\/home\/"/);
    assert.match(html, /href="\.\/game\/"/);
    assert.match(html, /href="\.\/tools\/"/);
    assert.match(html, /href="\.\/notes\/"/);
    assert.match(html, /href="\.\/creators\/"/);
    assert.match(html, /href="\.\/trpg\/"/);
    assert.match(html, /href="\.\/system\/publish\/"/);
    assert.match(html, /id="dashboardQuickActions"/);
    assert.match(html, /すぐ始める/);
    assert.match(html, /id="moduleDashboard"/);
    assert.match(html, /id="lastBackupExportAt"/);
    assert.match(html, /adminDashboardPage\.js/);

    assert.doesNotMatch(nav, /Studio/);
    assert.doesNotMatch(html, /href="\.\.\/studio\//);
    assert.match(page, /createElement\s*\(/);
    assert.match(page, /textContent\s*=/);
    assert.match(page, /replaceChildren\s*\(/);
    assert.match(page, /loadAdminQuickActions/);
    assert.match(page, /dashboard-quick-action/);
    assert.doesNotMatch(page, /innerHTML/);
    assert.match(css, /@media \(max-width: 390px\)/);
    assert.match(css, /repeat\(auto-fit, minmax\(280px, 1fr\)\)/);
    assert.match(css, /\.dashboard-quick-grid/);
    assert.match(css, /\.dashboard-quick-action/);
});

test("Admin Hub keeps a current-location breadcrumb", async () => {
    const html = await read("apps/admin/index.html");
    const breadcrumb = html.match(/<nav class="admin-breadcrumb"[\s\S]*?<\/nav>/)?.[0] || "";

    assert.match(breadcrumb, /RELMUA Admin/);
    assert.match(breadcrumb, /aria-current="page"/);
});

test("Admin shell does not inject Studio flow actions", async () => {
    const shell = await read("apps/admin/js/adminShell.js");
    const css = await read("apps/admin/css/components/admin-shell.css");

    assert.doesNotMatch(shell, /createStudioFlowBar/);
    assert.doesNotMatch(shell, /normalizeStudioLinks/);
    assert.doesNotMatch(shell, /Studioへ戻る/);
    assert.doesNotMatch(shell, /コンテンツへ戻る/);
    assert.doesNotMatch(shell, /studio\/#content|studio\/#publish/);
    assert.doesNotMatch(css, /\.admin-studio-flow/);
    assert.doesNotMatch(css, /\.admin-studio-flow-actions/);
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
