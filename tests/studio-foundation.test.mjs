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
    getSystemSections
} from "../apps/admin/js/features/system/systemSectionRegistry.js";

import {
    getWorkspaces
} from "../apps/admin/js/features/workspaces/workspaceRegistry.js";

const ROOT = new URL("../", import.meta.url);

test("Studio replaces the old Terminal UI shell while keeping registries available", async () => {
    const workspaces = getWorkspaces();
    const modules = getModules();
    const creatorSites = getCreatorSites();
    const systemSections = getSystemSections();
    const creatorIds = await readPublicCreatorIds();
    const trpg = modules.find(module => module.id === "module-trpg");

    [
        "workspace-brand",
        "workspace-creators",
        "workspace-creator-chikage",
        "workspace-creator-asagiri",
        "workspace-system"
    ].forEach(id => assert.ok(workspaces.some(workspace => workspace.id === id), id));

    assert.equal(workspaces.some(workspace => workspace.id === "workspace-terminal"), false);
    assert.equal(workspaces.some(workspace => workspace.type === "terminal"), false);
    assert.equal(workspaces.some(workspace => workspace.id === "workspace-module-trpg"), false);
    assertUnique(workspaces.map(workspace => workspace.id), "Workspace ID");
    assertUnique(modules.map(module => module.id), "Module ID");
    assertUnique(creatorSites.map(site => site.creatorId), "Creator Site ID");
    assertUnique(systemSections.map(section => section.id), "System section ID");

    assert.equal(trpg.ownerCreatorId, "creator-chikage");
    assert.equal(trpg.nextId, "module-creator-chikage-trpg");
    assert.ok(creatorIds.has(trpg.ownerCreatorId));
    assert.equal(trpg.adminPath, "../trpg/");
    assert.equal(trpg.publicPath, "/creators/chikage/trpg/");
    assert.ok(trpg.features.length >= 2);
    assertUnique(trpg.features.map(feature => feature.id), "Feature ID");

    assert.equal(modules.some(module => module.ownerCreatorId === "creator-asagiri"), false);
});

test("Brand Workspace keeps creator-specific feature links out", async () => {
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
            "brand-creators",
            "brand-about",
            "brand-contact",
            "brand-navigation"
        ]
    );
    assert.equal(sections.some(section => /trpg|rules|profile/i.test(section.id)), false);

    for(const section of active){
        assert.match(section.adminPath, /^\.\.\//);
        await access(new URL(section.adminPath, new URL("apps/admin/studio-placeholder/index.html", ROOT)));
    }
});

test("Studio is the only visible structure entry for Brand, Creators, and System", async () => {
    await access(new URL("apps/studio/index.html", ROOT));
    await assert.rejects(
        access(new URL("apps/admin/terminal/index.html", ROOT)),
        error => error?.code === "ENOENT"
    );

    const adminHub = await read("apps/admin/index.html");
    const studioHtml = await read("apps/studio/index.html");
    const studioApp = await read("apps/studio/src/app/studioApp.js");

    assert.match(adminHub, /href="\.\.\/studio\/"/);
    assert.match(adminHub, /href="\.\.\/studio\/#workspaces"/);
    assert.match(adminHub, /href="\.\.\/studio\/#health"/);
    assert.doesNotMatch(`${adminHub}\n${studioHtml}\n${studioApp}`, /\.\.\/admin\/terminal\/|\.\/terminal\/|terminalPage|terminalShell/);
    assert.match(studioHtml, /id="studioWorkspaces"/);
    assert.match(studioApp, /getCreatorSites/);
    assert.match(studioApp, /getAvailableCollectionOwners/);
    assert.match(studioApp, /千景のTRPGシナリオ/);
    assert.doesNotMatch(studioApp, /朝霧のTRPG/);
});

test("Admin pages expose Studio current-location breadcrumbs", async () => {
    const pages = [
        ["apps/admin/index.html", ["RELMUA Studio"]],
        ["apps/admin/home/index.html", ["RELMUA Studio", "Brand", "Home"]],
        ["apps/admin/creators/index.html", ["RELMUA Studio", "Creators"]],
        ["apps/admin/game/index.html", ["RELMUA Studio", "Brand", "Projects"]],
        ["apps/admin/tools/index.html", ["RELMUA Studio", "Brand", "Tools"]],
        ["apps/admin/notes/index.html", ["RELMUA Studio", "Brand", "Notes"]],
        ["apps/admin/profile/index.html", ["RELMUA Studio", "Creators", "千景", "Profile"]],
        ["apps/admin/trpg/index.html", ["RELMUA Studio", "Creators", "千景", "TRPG", "Scenario Library"]],
        ["apps/admin/trpg/rules/index.html", ["RELMUA Studio", "Creators", "千景", "TRPG", "House Rules"]],
        ["apps/admin/system/backup/index.html", ["RELMUA Studio", "System", "Backup"]],
        ["apps/admin/system/import/index.html", ["RELMUA Studio", "System", "Import"]],
        ["apps/admin/system/export/index.html", ["RELMUA Studio", "System", "Export"]],
        ["apps/admin/system/settings/index.html", ["RELMUA Studio", "System", "Settings"]],
        ["apps/admin/system/publish/index.html", ["RELMUA Studio", "System", "Publish"]],
        ["apps/admin/system/logs/index.html", ["RELMUA Studio", "System", "Activity Log"]],
        ["apps/admin/system/guide/index.html", ["RELMUA Studio", "System", "Operations Guide"]]
    ];

    for(const [page, labels] of pages){
        const html = await read(page);
        const breadcrumb = html.match(/<nav class="admin-breadcrumb"[\s\S]*?<\/nav>/)?.[0] || "";
        for(const label of labels){
            assert.match(breadcrumb, new RegExp(escapeRegExp(label)), `${page}: ${label}`);
        }
        assert.match(breadcrumb, /aria-current="page"/, `${page}: current`);
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

    assert.doesNotMatch(registry, /Scenario Library|House Rules|\/trpg\/|module-trpg/);
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

function escapeRegExp(value){
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
