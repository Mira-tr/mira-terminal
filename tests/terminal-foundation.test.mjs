import test from "node:test";
import assert from "node:assert/strict";
import {
    access,
    readFile
} from "node:fs/promises";

import {
    getModules
} from "../apps/admin/js/features/modules/moduleRegistry.js";

import {
    getWorkspaces
} from "../apps/admin/js/features/workspaces/workspaceRegistry.js";

const ROOT = new URL("../", import.meta.url);

test("Terminal FoundationはWorkspaceとTRPG ModuleをRegistryで定義する", () => {
    const workspaces = getWorkspaces();
    const modules = getModules();
    const trpg = modules.find(module => module.id === "module-trpg");

    assert.deepEqual(
        workspaces.map(workspace => workspace.id),
        [
            "workspace-brand",
            "workspace-creator-chikage",
            "workspace-module-trpg",
            "workspace-publish-center"
        ]
    );
    assert.equal(workspaces.find(workspace => workspace.id === "workspace-module-trpg").status, "active");
    assert.equal(workspaces.find(workspace => workspace.id === "workspace-brand").status, "planned");
    assert.equal(trpg.ownerCreatorId, "creator-chikage");
    assert.equal(trpg.adminPath, "../trpg/");
    assert.equal(trpg.publicPath, "/trpg/");
    assert.deepEqual(
        trpg.features.map(feature => [feature.title, feature.adminPath, feature.publicPath]),
        [
            ["Scenario Library", "../trpg/", "/trpg/"],
            ["House Rules", "../trpg/rules/", "/trpg/rules/"]
        ]
    );
});

test("Terminal Pageは既存Adminへの入口でPublicやStorage処理を持たない", async () => {
    await access(new URL("apps/admin/terminal/index.html", ROOT));

    const adminHub = await read("apps/admin/index.html");
    const terminalHtml = await read("apps/admin/terminal/index.html");
    const terminalPage = await read("apps/admin/js/pages/terminalPage.js");
    const terminalShell = await read("apps/admin/js/features/terminal/terminalShell.js");

    assert.match(adminHub, /href="\.\/terminal\/"/);
    assert.match(terminalHtml, /id="workspaceRegistryList"/);
    assert.match(terminalHtml, /id="moduleRegistryList"/);
    assert.match(terminalHtml, /terminalPage\.js/);
    assert.match(terminalPage, /renderTerminalShell/);
    assert.doesNotMatch(terminalShell, /localStorage|getItem|setItem|exportPublic|Backup|Import/);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
