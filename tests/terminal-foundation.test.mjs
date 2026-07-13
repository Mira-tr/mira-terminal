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
    getModules
} from "../apps/admin/js/features/modules/moduleRegistry.js";

import {
    getWorkspaces
} from "../apps/admin/js/features/workspaces/workspaceRegistry.js";

import {
    renderTerminalShell
} from "../apps/admin/js/features/terminal/terminalShell.js";

const ROOT = new URL("../", import.meta.url);

test("Terminal FoundationはWorkspaceとModuleの不変条件を満たす", async () => {
    const workspaces = getWorkspaces();
    const modules = getModules();
    const creatorIds = await readPublicCreatorIds();
    const trpg = modules.find(module => module.id === "module-trpg");
    const requiredWorkspaceIds = [
        "workspace-brand",
        "workspace-creator-chikage",
        "workspace-module-trpg",
        "workspace-publish-center"
    ];

    requiredWorkspaceIds.forEach(id => {
    assert.ok(workspaces.some(workspace => workspace.id === id), id);
    });
    assertUnique(workspaces.map(workspace => workspace.id), "Workspace ID");
    assertUnique(modules.map(module => module.id), "Module ID");
    assert.equal(trpg.ownerCreatorId, "creator-chikage");
    assert.ok(creatorIds.has(trpg.ownerCreatorId));
    assert.equal(workspaces.find(workspace => workspace.id === "workspace-module-trpg").status, "active");
    assert.equal(workspaces.find(workspace => workspace.id === "workspace-brand").status, "active");
    assert.equal(workspaces.find(workspace => workspace.id === "workspace-creator-chikage").ownerCreatorId, "creator-chikage");
    assert.notEqual(workspaces.find(workspace => workspace.id === "workspace-creator-chikage").ownerCreatorId, "workspace-creator-chikage");
    assert.equal(trpg.adminPath, "../trpg/");
    assert.equal(trpg.publicPath, "/trpg/");
    assert.ok(trpg.features.length >= 2);
    assertUnique(trpg.features.map(feature => feature.id), "Feature ID");
    trpg.features.forEach(feature => {
        assert.equal(typeof feature.title, "string");
        assert.ok(feature.title);
        assert.equal(feature.status, "active");
        assert.match(feature.adminPath, /^\.\.\//);
        assert.match(feature.publicPath, /^\//);
    });
});

test("Brand Workspaceは既存Adminに接続できる項目だけをactiveにする", async () => {
    const sections = getBrandSections();
    const active = sections.filter(section => section.status === "active");
    const planned = sections.filter(section => section.status === "planned");
    const requiredIds = [
        "brand-home",
        "brand-projects",
        "brand-tools",
        "brand-notes",
        "brand-creators",
        "brand-about",
        "brand-contact",
        "brand-navigation",
        "brand-news",
        "brand-roadmap"
    ];

    requiredIds.forEach(id => {
        assert.ok(sections.some(section => section.id === id), id);
    });
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
    assert.ok(planned.some(section => section.id === "brand-navigation"));
    assert.ok(planned.some(section => section.id === "brand-news"));
    assert.ok(planned.some(section => section.id === "brand-roadmap"));

    for(const section of active){
        assert.match(section.adminPath, /^\.\.\//);
        await access(new URL(
            section.adminPath,
            new URL("apps/admin/terminal/index.html", ROOT)
        ));
    }

    planned.forEach(section => {
        assert.equal(section.adminPath, "");
    });
});

test("Terminal Pageは既存Adminへの入口でPublicやStorage処理を持たない", async () => {
    await access(new URL("apps/admin/terminal/index.html", ROOT));

    const adminHub = await read("apps/admin/index.html");
    const terminalHtml = await read("apps/admin/terminal/index.html");
    const terminalPage = await read("apps/admin/js/pages/terminalPage.js");
    const terminalShell = await read("apps/admin/js/features/terminal/terminalShell.js");

    assert.match(adminHub, /href="\.\/terminal\/"/);
    assert.match(terminalHtml, /id="terminalBreadcrumb"/);
    assert.match(terminalHtml, /id="workspaceOverviewList"/);
    assert.match(terminalHtml, /id="workspaceDetailList"/);
    assert.match(terminalHtml, /id="moduleWorkspaceList"/);
    assert.match(terminalHtml, /terminalPage\.js/);
    assert.doesNotMatch(terminalHtml, /千景|creator-chikage|TRPG|Scenario Library|House Rules|Projects|Tools|Notes|Creators|Roadmap/);
    assert.match(terminalPage, /renderTerminalShell/);
    assert.match(terminalShell, /getWorkspaces/);
    assert.match(terminalShell, /getModules/);
    assert.match(terminalShell, /createWorkspaceGroup/);
    assert.match(terminalShell, /createBrandWorkspaceContent/);
    assert.match(terminalShell, /createBrandSectionCard/);
    assert.match(terminalShell, /createCreatorWorkspaceContent/);
    assert.match(terminalShell, /createFeatureList/);
    assert.doesNotMatch(terminalShell, /localStorage|getItem|setItem|exportPublic|Backup|Import/);
    assert.doesNotMatch(terminalShell, /Owner Creator ID/);
    assert.match(terminalShell, /Owner ID/);
});

test("Terminal Shellはplanned WorkspaceとBrand項目を操作可能リンクとして描画しない", () => {
    const originalDocument = globalThis.document;
    const document = createFakeDocument();
    const containers = {
        breadcrumbContainer: document.createElement("div"),
        workspaceOverviewContainer: document.createElement("div"),
        workspaceDetailContainer: document.createElement("div"),
        moduleContainer: document.createElement("div"),
        statusElement: document.createElement("p")
    };

    globalThis.document = document;

    try{
        renderTerminalShell(containers);
        const plannedSections = findElements(
            containers.workspaceOverviewContainer,
            element => element.className === "terminal-workspace-node" &&
                allText(element).includes("Planned")
        );

        assert.ok(plannedSections.length > 0);
        plannedSections.forEach(section => {
            assert.equal(findElements(section, element => element.tagName === "a").length, 0);
            assert.ok(findElements(section, element => element.attributes["aria-disabled"] === "true").length > 0);
        });

        const plannedBrandSections = findElements(
            containers.workspaceDetailContainer,
            element => element.className === "terminal-brand-section" &&
                allText(element).includes("Planned")
        );

        assert.ok(plannedBrandSections.length > 0);
        plannedBrandSections.forEach(section => {
            assert.equal(findElements(section, element => element.tagName === "a").length, 0);
            assert.ok(findElements(section, element => element.attributes["aria-disabled"] === "true").length > 0);
        });
    }finally{
        globalThis.document = originalDocument;
    }
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
