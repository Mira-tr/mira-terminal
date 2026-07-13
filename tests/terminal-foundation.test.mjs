import test from "node:test";
import assert from "node:assert/strict";
import {
    access,
    readFile
} from "node:fs/promises";

import {
    getBrandSections
} from "../apps/admin/js/features/brand/brandSectionRegistry.js";

import {
    getCreatorSites
} from "../apps/admin/js/features/creators/creatorSiteRegistry.js";

import {
    getModules
} from "../apps/admin/js/features/modules/moduleRegistry.js";

import {
    getWorkspaces
} from "../apps/admin/js/features/workspaces/workspaceRegistry.js";

import {
    renderTerminalShell
} from "../apps/admin/js/features/terminal/terminalShell.js";

const ROOT = new URL("../", import.meta.url);

test("Terminal registries keep internal module data but expose creator sites", async () => {
    const workspaces = getWorkspaces();
    const modules = getModules();
    const creatorSites = getCreatorSites();
    const creatorIds = await readPublicCreatorIds();
    const trpg = modules.find(module => module.id === "module-trpg");

    [
        "workspace-brand",
        "workspace-creator-chikage",
        "workspace-module-trpg",
        "workspace-publish-center"
    ].forEach(id => {
        assert.ok(workspaces.some(workspace => workspace.id === id), id);
    });
    assertUnique(workspaces.map(workspace => workspace.id), "Workspace ID");
    assertUnique(modules.map(module => module.id), "Module ID");
    assertUnique(creatorSites.map(site => site.creatorId), "Creator Site ID");
    assert.equal(trpg.ownerCreatorId, "creator-chikage");
    assert.ok(creatorIds.has(trpg.ownerCreatorId));
    assert.equal(workspaces.find(workspace => workspace.id === "workspace-module-trpg").status, "active");
    assert.equal(workspaces.find(workspace => workspace.id === "workspace-creator-chikage").ownerCreatorId, "creator-chikage");
    assert.equal(creatorSites[0].creatorId, "creator-chikage");
    assert.deepEqual(
        creatorSites[0].sections.map(section => section.title),
        ["Home", "プロフィール", "Works", "連絡"]
    );
    assert.equal(trpg.adminPath, "../trpg/");
    assert.equal(trpg.publicPath, "/trpg/");
    assert.ok(trpg.features.length >= 2);
    assertUnique(trpg.features.map(feature => feature.id), "Feature ID");
});

test("Brand Workspace does not include creator-specific feature links", async () => {
    const sections = getBrandSections();
    const active = sections.filter(section => section.status === "active");

    assertUnique(sections.map(section => section.id), "Brand section ID");
    assert.deepEqual(
        active.map(section => section.id),
        [
            "brand-home",
            "brand-projects",
            "brand-tools",
            "brand-notes",
            "brand-creators"
        ]
    );
    assert.equal(sections.some(section => /trpg|rules|profile/i.test(section.id)), false);

    for(const section of active){
        assert.match(section.adminPath, /^\.\.\//);
        await access(new URL(
            section.adminPath,
            new URL("apps/admin/terminal/index.html", ROOT)
        ));
    }
});

test("Terminal Page is creator navigation and keeps static HTML free of registry labels", async () => {
    await access(new URL("apps/admin/terminal/index.html", ROOT));

    const adminHub = await read("apps/admin/index.html");
    const terminalHtml = await read("apps/admin/terminal/index.html");
    const terminalPage = await read("apps/admin/js/pages/terminalPage.js");
    const terminalShell = await read("apps/admin/js/features/terminal/terminalShell.js");

    assert.match(adminHub, /href="\.\/terminal\/"/);
    assert.match(terminalHtml, /id="terminalBreadcrumb"/);
    assert.match(terminalHtml, /id="workspaceOverviewList"/);
    assert.match(terminalHtml, /id="workspaceDetailList"/);
    assert.doesNotMatch(terminalHtml, /moduleWorkspaceList|Module Workspace/);
    assert.match(terminalHtml, /terminalPage\.js/);
    assert.doesNotMatch(terminalHtml, /千景|creator-chikage|TRPG|シナリオ|ハウスルール|作品|道具|記録|ロードマップ/);
    assert.match(terminalPage, /renderTerminalShell/);
    assert.doesNotMatch(terminalPage, /moduleWorkspaceList/);
    assert.match(terminalShell, /getWorkspaces/);
    assert.match(terminalShell, /getModules/);
    assert.match(terminalShell, /getCreatorSites/);
    assert.doesNotMatch(terminalShell, /Owner Creator ID|Owner ID/);
    assert.doesNotMatch(terminalShell, /localStorage|getItem|setItem|exportPublic|Backup|Import/);
});

test("Terminal Shell renders 千景 site with TRPG features and no owner id text", () => {
    const originalDocument = globalThis.document;
    const document = createFakeDocument();
    const containers = {
        breadcrumbContainer: document.createElement("div"),
        workspaceOverviewContainer: document.createElement("div"),
        workspaceDetailContainer: document.createElement("div"),
        statusElement: document.createElement("p")
    };

    globalThis.document = document;

    try{
        renderTerminalShell(containers);
        const detailText = allText(containers.workspaceDetailContainer);
        const overviewText = allText(containers.workspaceOverviewContainer);

        assert.match(overviewText, /Brand/);
        assert.match(overviewText, /活動者/);
        assert.match(detailText, /千景/);
        assert.match(detailText, /Home/);
        assert.match(detailText, /プロフィール/);
        assert.match(detailText, /Works/);
        assert.match(detailText, /連絡/);
        assert.match(detailText, /TRPG/);
        assert.match(detailText, /シナリオ/);
        assert.match(detailText, /ハウスルール/);
        assert.doesNotMatch(`${overviewText}\n${detailText}`, /Owner ID|creator-chikage|Module Workspace|Module Admin/);

        const links = findElements(
            containers.workspaceDetailContainer,
            element => element.tagName === "a"
        ).map(element => element.href);

        assert.ok(links.includes("../trpg/"));
        assert.ok(links.includes("../trpg/rules/"));
    }finally{
        globalThis.document = originalDocument;
    }
});

test("Terminal Shell keeps planned creator site sections disabled", () => {
    const originalDocument = globalThis.document;
    const document = createFakeDocument();
    const containers = {
        breadcrumbContainer: document.createElement("div"),
        workspaceOverviewContainer: document.createElement("div"),
        workspaceDetailContainer: document.createElement("div"),
        statusElement: document.createElement("p")
    };

    globalThis.document = document;

    try{
        renderTerminalShell(containers);
        const plannedSections = findElements(
            containers.workspaceDetailContainer,
            element => element.className === "terminal-brand-section" &&
                allText(element).includes("計画中")
        );

        assert.ok(plannedSections.length > 0);
        plannedSections.forEach(section => {
            assert.equal(findElements(section, element => element.tagName === "a").length, 0);
            assert.ok(findElements(section, element => element.attributes["aria-disabled"] === "true").length > 0);
        });
    }finally{
        globalThis.document = originalDocument;
    }
});

test("TRPG Scenario form hides owner input but preserves internal creator owner", async () => {
    const html = await read("apps/admin/trpg/index.html");
    const form = await read("apps/admin/js/features/trpg/scenarios/scenarioForm.js");

    assert.doesNotMatch(html, /ownerCreatorId|Owner Creator ID/);
    assert.match(form, /DEFAULT_PRIMARY_CREATOR_ID/);
    assert.match(form, /existing\?\.ownerCreatorId\s*\|\|\s*DEFAULT_PRIMARY_CREATOR_ID/);
    assert.doesNotMatch(form, /value\("ownerCreatorId"\)/);
});

test("Creator Site Registry does not duplicate TRPG feature URLs", async () => {
    const registry = await read("apps/admin/js/features/creators/creatorSiteRegistry.js");

    assert.doesNotMatch(registry, /シナリオ|ハウスルール|\/trpg\/|module-trpg/);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

async function readPublicCreatorIds(){
    const payload = JSON.parse(await read("apps/web/data/public-creators.json"));
    return new Set(payload.creators.map(creator => creator.id));
}

function assertUnique(values, label){
    assert.equal(new Set(values).size, values.length, `${label} must be unique`);
}

function createFakeDocument(){
    return {
        createElement(tagName){
            return new FakeElement(tagName);
        }
    };
}

class FakeElement {
    constructor(tagName){
        this.tagName = tagName;
        this.children = [];
        this.attributes = {};
        this.className = "";
        this.id = "";
        this.href = "";
        this.textContent = "";
    }

    append(...children){
        children.forEach(child => this.appendChild(child));
    }

    appendChild(child){
        this.children.push(child);
        return child;
    }

    replaceChildren(...children){
        this.children = [];
        this.append(...children);
    }

    setAttribute(name, value){
        this.attributes[name] = String(value);
    }
}

function findElements(root, predicate){
    const found = [];
    const visit = element => {
        if(predicate(element)){
            found.push(element);
        }

        element.children.forEach(visit);
    };

    visit(root);
    return found;
}

function allText(element){
    return [
        element.textContent,
        ...element.children.map(allText)
    ].join(" ");
}
