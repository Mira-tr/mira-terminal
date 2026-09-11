import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

import {
    buildChikageWorkspaceSummary,
    formatChikageWorkspaceTimestamp
} from "../apps/admin/js/features/creators/chikageWorkspace.js";

const ROOT = new URL("../", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

test("Chikage Admin is a complete Creator Site console instead of a profile shortcut page", async () => {
    await access(new URL("apps/admin/creators/chikage/index.html", ROOT));
    const html = await read("apps/admin/creators/chikage/index.html");
    const page = await read("apps/admin/js/pages/chikageWorkspacePage.js");

    assert.match(html, /CREATOR SITE \/ CHIKAGE/);
    assert.match(html, /id="chikageSiteForm"/);
    assert.match(html, /class="creator-site-console"/);
    assert.match(html, /class="creator-site-map"/);
    assert.match(page, /hydrateCreatorsFromCms/);
    assert.match(page, /updateCreatorCanonical/);
    assert.match(page, /normalizeCreatorSite/);
    assert.match(page, /collectSite/);
    assert.match(page, /applyCreatorWorld/);
});

test("Chikage Creator Site console owns every public-facing site area", async () => {
    const html = await read("apps/admin/creators/chikage/index.html");
    const sections = [
        "site-identity",
        "site-home",
        "site-profile",
        "site-works",
        "site-trpg",
        "site-contact",
        "site-navigation",
        "site-design",
        "site-publish"
    ];

    sections.forEach(id => assert.match(html, new RegExp(`id="${id}"`), id));
    ["Home", "Profile", "Works", "TRPG", "Contact", "Navigation", "Design / World", "Publish"]
        .forEach(label => assert.match(html, new RegExp(escapeRegExp(label)), label));

    assert.match(html, /作品データを編集/);
    assert.match(html, /シナリオ管理/);
    assert.match(html, /ハウスルール/);
    assert.match(html, /公開リンクを編集/);
});

test("Chikage world is editable and shared by Admin workspace and public snapshot flow", async () => {
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
    assert.match(html, /Public Snapshot/);
});

test("Chikage workspace keeps specialized data managers inside the Creator boundary", async () => {
    const html = await read("apps/admin/creators/chikage/index.html");

    assert.match(html, /href="\.\.\/\.\.\/trpg\/"/);
    assert.match(html, /href="\.\.\/\.\.\/trpg\/rules\/"/);
    assert.match(html, /creatorWorksSection/);
    assert.match(html, /creatorLinksSection/);
});

test("Chikage workspace summarizes publication counts and latest update", () => {
    const summary = buildChikageWorkspaceSummary({
        id: "creator-chikage",
        slug: "chikage",
        displayName: "千景",
        status: "public",
        updatedAt: "2026-09-10T01:00:00.000Z",
        works: [
            { status: "public" },
            { status: "private" }
        ],
        links: [
            { status: "public" }
        ]
    }, [
        { status: "draft", updatedAt: 1789090000000 },
        { status: "public", updatedAt: 1789100000000 }
    ]);

    assert.equal(summary.status, "public");
    assert.deepEqual(summary.works, {
        total: 2,
        public: 1,
        draft: 0,
        private: 1,
        other: 0
    });
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
