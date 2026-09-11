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
    assert.deepEqual(
        getAdminPrimaryNavigation().map(route => route.label),
        ["ホーム", "サイト編集", "千景", "サイト運用"]
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

test("Admin shell renders only root navigation with beginner-friendly copy and a light public-aligned scheme", async () => {
    const shell = await read("apps/admin/js/adminShell.js");

    assert.match(shell, /createPrimaryNavigation/);
    assert.match(shell, /getAdminPrimaryNavigation/);
    assert.match(shell, /RELMUA編集メニュー/);
    assert.match(shell, /colorScheme\s*=\s*"light"/);
    assert.match(shell, /公開用データ/);
    assert.doesNotMatch(shell, /createContextNavigation|getAdminContextNavigation|themeToggle|localStorage.*theme/i);
});

test("Admin styling loads the public-aligned layer last and keeps navigation at the top on phones", async () => {
    const style = await read("apps/admin/css/style.css");
    const aligned = await read("apps/admin/css/components/public-aligned.css");

    assert.match(style, /admin-navigation\.css[\s\S]*public-aligned\.css/);
    assert.match(aligned, /web\/css\/brand\/tokens\.css/);
    assert.match(aligned, /color-scheme:light/);
    assert.match(aligned, /@media\(max-width:700px\)/);
    assert.match(aligned, /\.header-nav\{[\s\S]*position:static/);
    assert.doesNotMatch(aligned, /\.header-nav\{[^}]*bottom:\s*0/);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
