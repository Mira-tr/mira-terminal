import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    getAdminContextNavigation,
    getAdminRoute,
    getRouteHref
} from "../apps/admin/js/features/navigation/adminRouteRegistry.js";

import {
    loadAdminQuickActions
} from "../apps/admin/js/features/common/adminDashboard.js";

const ROOT = new URL("../", import.meta.url);

test("Admin keeps Chikage one tap away from every workspace context", () => {
    for(const section of ["admin-home", "admin-relmua", "admin-creators", "admin-system"]){
        const routes = getAdminContextNavigation(section);
        assert.equal(routes[0].id, "creator-chikage", section);
        assert.equal(routes[0].label, "千景", section);
    }

    assert.equal(
        getRouteHref(getAdminRoute("chikage")),
        "./creators/chikage/"
    );
    assert.equal(
        getRouteHref(getAdminRoute("chikageEditor")),
        "./creators/?creator=creator-chikage#formTitle"
    );
});

test("Creator context exposes Chikage, TRPG and house rules directly", () => {
    assert.deepEqual(
        getAdminContextNavigation("admin-creators").map(route => route.id),
        ["creator-chikage", "creator-chikage-trpg", "creator-chikage-rules", "admin-creators"]
    );
});

test("System context exposes frequent operations without returning to System landing", () => {
    const ids = getAdminContextNavigation("admin-system").map(route => route.id);
    for(const id of ["creator-chikage", "system-database", "system-backup", "system-import", "system-publish", "system-validation"]){
        assert.ok(ids.includes(id), id);
    }
});

test("Dashboard prioritizes Chikage before system utilities", () => {
    const actions = loadAdminQuickActions();
    assert.equal(actions[0].id, "open-chikage");
    assert.equal(actions[0].tone, "primary");
    assert.equal(actions[1].id, "add-trpg");
    assert.equal(actions[2].id, "open-database");
});

test("Admin shell renders contextual navigation and recognizes the Chikage workspace", async () => {
    const shell = await read("apps/admin/js/adminShell.js");
    assert.match(shell, /createContextNavigation/);
    assert.match(shell, /getAdminContextNavigation/);
    assert.match(shell, /admin-context-row/);
    assert.match(shell, /creators\/chikage\//);
    assert.match(shell, /creator-chikage/);
    assert.match(shell, /admin-relmua/);
    assert.match(shell, /system-database/);
});

test("Navigation CSS is loaded last and remains horizontally usable on phones", async () => {
    const style = await read("apps/admin/css/style.css");
    const navigation = await read("apps/admin/css/components/admin-navigation.css");

    assert.match(style, /admin-polish\.css[\s\S]*admin-navigation\.css/);
    assert.match(navigation, /\.admin-context-nav/);
    assert.match(navigation, /overflow-x:auto/);
    assert.match(navigation, /\.admin-context-nav \.admin-context-link:first-child/);
    assert.match(navigation, /@media\(max-width:700px\)/);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
