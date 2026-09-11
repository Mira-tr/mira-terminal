import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

import {
    buildChikageWorkspaceSummary,
    createChikageWorkspaceDestinations,
    formatChikageWorkspaceTimestamp
} from "../apps/admin/js/features/creators/chikageWorkspace.js";

const ROOT = new URL("../", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

test("Chikage has a dedicated Admin workspace entry", async () => {
    await access(new URL("apps/admin/creators/chikage/index.html", ROOT));
    const html = await read("apps/admin/creators/chikage/index.html");
    const page = await read("apps/admin/js/pages/chikageWorkspacePage.js");

    assert.match(html, /千景 Workspace/);
    assert.match(html, /id="chikageWorkspaceMetrics"/);
    assert.match(html, /id="chikageWorkspaceDestinations"/);
    assert.match(html, /id="chikagePublicationSummary"/);
    assert.match(html, /活動者情報を編集/);
    assert.match(html, /公開サイトを見る/);
    assert.match(page, /hydrateCreatorsFromCms/);
    assert.match(page, /hydrateScenariosFromCms/);
    assert.match(page, /createElement\s*\(/);
    assert.match(page, /replaceChildren\s*\(/);
    assert.doesNotMatch(page, /innerHTML/);
});

test("Chikage workspace keeps profile, works, contact, TRPG and rules one tap away", () => {
    const destinations = createChikageWorkspaceDestinations();
    assert.deepEqual(
        destinations.map(item => item.id),
        ["profile", "works", "contact", "trpg", "rules"]
    );
    assert.equal(destinations[0].href, "../?creator=creator-chikage#formTitle");
    assert.equal(destinations[1].href, "../?creator=creator-chikage#creatorWorksSection");
    assert.equal(destinations[2].href, "../?creator=creator-chikage#creatorLinksSection");
    assert.equal(destinations[3].href, "../../trpg/");
    assert.equal(destinations[4].href, "../../trpg/rules/");
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

test("Chikage workspace CSS is responsive and uses canonical Admin tokens", async () => {
    const style = await read("apps/admin/css/style.css");
    const css = await read("apps/admin/css/pages/chikage-workspace.css");

    assert.match(style, /chikage-workspace\.css/);
    assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
    assert.match(css, /@media\(max-width:760px\)/);
    assert.match(css, /@media\(max-width:430px\)/);
    assert.match(css, /var\(--color-panel\)/);
    assert.doesNotMatch(css, /var\(--(?:panel-bg|text-primary|text-secondary|text-muted|surface-subtle|border-color|border-strong)\)/);
});
