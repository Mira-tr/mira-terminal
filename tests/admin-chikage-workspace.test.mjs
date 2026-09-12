import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

import {
    buildChikageWorkspaceSummary,
    formatChikageWorkspaceTimestamp
} from "../apps/admin/js/features/creators/chikageWorkspace.js";
import {
    getCreatorFeature,
    getCreatorFeatureGroups,
    getCreatorWorkspace,
    resolveAdminRelativePath,
    resolveCreatorPublicHref
} from "../apps/admin/js/features/creators/creatorFeatureRegistry.js";

const ROOT = new URL("../", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

test("Chikage is one registered Creator Workspace instead of a root Admin product", async () => {
    await access(new URL("apps/admin/creators/chikage/index.html", ROOT));
    const html = await read("apps/admin/creators/chikage/index.html");
    const page = await read("apps/admin/js/pages/chikageWorkspacePage.js");
    const routes = await read("apps/admin/js/features/navigation/adminRouteRegistry.js");

    assert.match(html, /RELMUA \/ CREATORS \/ CHIKAGE/);
    assert.match(html, /id="chikageSiteForm"/);
    assert.match(html, /class="creator-site-console"/);
    assert.match(html, /Creators/);
    assert.doesNotMatch(routes, /chikageTrpg:/);
    assert.doesNotMatch(routes, /chikageRules:/);
    assert.match(routes, /creators: \["creatorDirectory"\]/);
    assert.match(page, /hydrateCreatorsFromCms/);
    assert.match(page, /updateCreatorCanonical/);
    assert.match(page, /normalizeCreatorSite/);
    assert.match(page, /collectSite/);
    assert.match(page, /applyCreatorWorld/);
});

test("Creator feature registry groups Chikage Web, TRPG and management capabilities", () => {
    const workspace = getCreatorWorkspace("creator-chikage");
    assert.equal(workspace.displayName, "千景");
    assert.equal(workspace.theme, "chikage");

    const groups = getCreatorFeatureGroups("creator-chikage");
    assert.deepEqual(groups.map(group => group.id), ["overview", "web", "trpg", "manage"]);
    assert.deepEqual(
        groups.find(group => group.id === "trpg").features.map(feature => feature.id),
        ["trpg-overview", "trpg-scenarios", "trpg-rules", "trpg-scheduler", "trpg-calendar"]
    );
    assert.equal(getCreatorFeature("creator-chikage", "trpg-scenarios").capabilities.editable, true);
    assert.equal(getCreatorFeature("creator-chikage", "trpg-scheduler").capabilities.operational, true);
    assert.equal(
        resolveAdminRelativePath("./trpg/", "https://example.com/project/admin/creators/chikage/"),
        "https://example.com/project/admin/trpg/"
    );
});

test("Creator Public links resolve correctly in source preview and built Pages layouts", () => {
    assert.equal(
        resolveCreatorPublicHref("creator-chikage", "trpg-scheduler", "https://example.com/project/apps/admin/creators/chikage/"),
        "https://example.com/project/apps/web/creators/chikage/trpg/scheduler/"
    );
    assert.equal(
        resolveCreatorPublicHref("creator-chikage", "trpg-scheduler", "https://example.com/project/admin/creators/chikage/"),
        "https://example.com/project/creators/chikage/trpg/scheduler/"
    );
});

test("Chikage workspace owns Web, TRPG, Scheduler, Calendar and Publish navigation", async () => {
    const html = await read("apps/admin/creators/chikage/index.html");
    const sections = ["site-identity","site-home","site-profile","site-works","site-trpg","site-contact","trpg-scheduler","trpg-calendar","site-navigation","site-design","site-integrations","site-publish"];
    sections.forEach(id => assert.match(html, new RegExp(`id="${id}"`), id));
    ["OVERVIEW", "WEB", "TRPG", "MANAGE", "Scenarios", "House Rules", "Scheduler", "Calendar", "Integrations", "Publish"]
        .forEach(label => assert.match(html, new RegExp(escapeRegExp(label)), label));
    assert.match(html, /作品データを編集/);
    assert.match(html, /シナリオ登録・検索・公開状態を編集/);
    assert.match(html, /Supabase上のライブデータ/);
    assert.match(html, /公開リンクを編集/);
});

test("Chikage world is accessible by design and shared by Admin workspace and public snapshot flow", async () => {
    const html = await read("apps/admin/creators/chikage/index.html");
    const page = await read("apps/admin/js/pages/chikageWorkspacePage.js");
    const css = await read("apps/admin/css/pages/chikage-workspace.css");
    for(const field of ["themeCanvas", "themeSurface", "themeAccent", "themeText", "themeMuted"]){
        assert.match(html, new RegExp(`id="${field}"[^>]*type="color"|id="${field}"`), field);
    }
    assert.match(page, /--creator-world-canvas/);
    assert.match(page, /--creator-world-accent/);
    assert.match(css, /\.creator-admin--chikage/);
    assert.match(css, /--creator-world-canvas:#0d0b14/);
    assert.match(css, /--creator-world-accent:#8063ad/);
    assert.match(css, /--creator-world-text:#f4f2f7/);
    assert.match(css, /--creator-world-focus:#cdb3f1/);
    assert.match(css, /outline:3px solid var\(--creator-world-focus\)/);
    assert.match(html, /見やすさを優先/);
});

test("specialized TRPG editors mount the shared Creator Workspace chrome", async () => {
    const shell = await read("apps/admin/js/adminShell.js");
    const chrome = await read("apps/admin/js/features/creators/creatorWorkspaceChrome.js");
    const css = await read("apps/admin/css/pages/chikage-workspace.css");
    assert.match(shell, /"trpg\/".*creator-chikage.*trpg-scenarios/);
    assert.match(shell, /"trpg\/rules\/".*creator-chikage.*trpg-rules/);
    assert.match(shell, /mountCreatorWorkspaceChrome/);
    assert.match(chrome, /getCreatorFeatureGroups/);
    assert.match(chrome, /data-creator-workspace-chrome|creatorWorkspaceChrome/);
    assert.match(chrome, /textContent/);
    assert.doesNotMatch(chrome, /innerHTML/);
    assert.match(css, /\.creator-feature-shell/);
    assert.match(css, /grid-template-columns:210px minmax\(0,1fr\)/);
});

test("Chikage workspace summarizes publication counts and latest update", () => {
    const summary = buildChikageWorkspaceSummary({
        id: "creator-chikage",slug: "chikage",displayName: "千景",status: "public",updatedAt: "2026-09-10T01:00:00.000Z",
        works: [{ status: "public" },{ status: "private" }],links: [{ status: "public" }]
    }, [{ status: "draft", updatedAt: 1789090000000 },{ status: "public", updatedAt: 1789100000000 }]);
    assert.equal(summary.status, "public");
    assert.deepEqual(summary.works, {total: 2,public: 1,draft: 0,private: 1,other: 0});
    assert.equal(summary.links.total, 1);
    assert.equal(summary.links.public, 1);
    assert.equal(summary.scenarios.total, 2);
    assert.equal(summary.scenarios.public, 1);
    assert.equal(summary.scenarios.draft, 1);
    assert.equal(summary.updatedAt, 1789100000000);
    assert.notEqual(formatChikageWorkspaceTimestamp(summary.updatedAt), "更新記録なし");
});

test("Chikage workspace is responsive without flattening its Creator identity", async () => {
    const style = await read("apps/admin/css/style.css");
    const css = await read("apps/admin/css/pages/chikage-workspace.css");
    assert.match(style, /chikage-workspace\.css/);
    assert.match(css, /grid-template-columns:210px minmax\(0,1fr\)/);
    assert.match(css, /@media\(max-width:900px\)/);
    assert.match(css, /@media\(max-width:700px\)/);
    assert.match(css, /@media\(max-width:380px\)/);
    assert.match(css, /creator-save-bar/);
    assert.match(css, /bottom:78px/);
});

function escapeRegExp(value){
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
