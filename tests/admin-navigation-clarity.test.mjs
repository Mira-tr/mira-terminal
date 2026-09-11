import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    getAdminContextNavigation,
    getAdminPrimaryNavigation,
    getAdminWorkspaceRoutes,
    getAdminRoute,
    getRouteHref
} from "../apps/admin/js/features/navigation/adminRouteRegistry.js";

import {
    loadAdminQuickActions
} from "../apps/admin/js/features/common/adminDashboard.js";

const ROOT = new URL("../", import.meta.url);

test("Admin global navigation contains only the four root workspaces", () => {
    assert.deepEqual(
        getAdminPrimaryNavigation().map(route => route.id),
        ["admin-home", "admin-relmua", "admin-creators", "admin-system"]
    );
    assert.deepEqual(getAdminContextNavigation(), []);
});

test("Creator-specific routes live inside Creators instead of unrelated contexts", () => {
    const workspaces = getAdminWorkspaceRoutes();

    assert.deepEqual(
        workspaces.creators.map(route => route.id),
        ["admin-creators", "creator-chikage", "creator-chikage-trpg", "creator-chikage-rules"]
    );
    assert.equal(workspaces.relmua.some(route => route.id.startsWith("creator-")), false);
    assert.equal(workspaces.system.some(route => route.id.startsWith("creator-")), false);
    assert.equal(getRouteHref(getAdminRoute("chikage")), "./creators/chikage/");
});

test("Dashboard quick actions stop bypassing Creator workspace boundaries", () => {
    const actions = loadAdminQuickActions();

    assert.deepEqual(
        actions.map(action => action.id),
        ["open-relmua", "open-creators", "open-system"]
    );
    assert.equal(actions.some(action => /chikage|trpg/i.test(action.id)), false);
    assert.equal(actions[0].tone, "primary");
});

test("Admin shell renders only root navigation and uses a fixed dark color scheme", async () => {
    const shell = await read("apps/admin/js/adminShell.js");

    assert.match(shell, /createPrimaryNavigation/);
    assert.match(shell, /getAdminPrimaryNavigation/);
    assert.match(shell, /Admin root navigation/);
    assert.match(shell, /colorScheme\s*=\s*"dark"/);
    assert.doesNotMatch(shell, /createContextNavigation|getAdminContextNavigation|themeToggle|localStorage.*theme/i);
});

test("Navigation becomes a dedicated four-tab bottom bar on phones", async () => {
    const style = await read("apps/admin/css/style.css");
    const navigation = await read("apps/admin/css/components/admin-navigation.css");

    assert.match(style, /admin-polish\.css[\s\S]*admin-navigation\.css/);
    assert.match(navigation, /\.admin-theme-toggle[\s\S]*display:none !important/);
    assert.match(navigation, /grid-template-columns:repeat\(4,auto\)/);
    assert.match(navigation, /@media\(max-width:700px\)/);
    assert.match(navigation, /position:fixed/);
    assert.match(navigation, /bottom:0/);
    assert.match(navigation, /grid-template-columns:repeat\(4,1fr\)/);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
