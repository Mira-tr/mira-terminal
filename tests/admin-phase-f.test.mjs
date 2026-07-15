import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    getLastPublicExport,
    getPublicExportHistory,
    recordPublicExport
} from "../apps/admin/js/features/common/operationMeta.js";

import {
    loadAdminTodaySummary
} from "../apps/admin/js/features/common/adminTodaySummary.js";

const ROOT = new URL("../", import.meta.url);
const ADMIN_PAGES = [
    ["apps/admin/index.html", "./js/adminShell.js"],
    ["apps/admin/terminal/index.html", "../js/adminShell.js"],
    ["apps/admin/game/index.html", "../js/adminShell.js"],
    ["apps/admin/tools/index.html", "../js/adminShell.js"],
    ["apps/admin/notes/index.html", "../js/adminShell.js"],
    ["apps/admin/creators/index.html", "../js/adminShell.js"],
    ["apps/admin/profile/index.html", "../js/adminShell.js"],
    ["apps/admin/home/index.html", "../js/adminShell.js"],
    ["apps/admin/trpg/index.html", "../js/adminShell.js"],
    ["apps/admin/trpg/rules/index.html", "../../js/adminShell.js"]
];

test("Phase F applies the persistent Admin theme shell to every Admin page", async () => {
    for(const [path, script] of ADMIN_PAGES){
        assert.match(await read(path), new RegExp(`src=["']${escapeRegExp(script)}["']`), path);
    }

    const shell = await read("apps/admin/js/adminShell.js");
    const variables = await read("apps/admin/css/base/variables.css");
    assert.match(shell, /mira-terminal-admin-theme/);
    assert.match(shell, /localStorage\.setItem/);
    assert.match(variables, /:root\[data-theme="dark"\]/);
});

test("Phase F separates publish, backup, import, and reset operations", async () => {
    const shell = await read("apps/admin/js/adminShell.js");
    assert.match(shell, /operation-zone--publish/);
    assert.match(shell, /operation-zone--danger/);
    assert.match(shell, /Backup Import replaces current local data/);
    assert.match(shell, /Public Export creates JSON for the public site/);
});

test("Phase F replaces visible Creator ID entry with Creator pickers", async () => {
    const tools = await read("apps/admin/tools/index.html");
    const notes = await read("apps/admin/notes/index.html");
    const game = await read("apps/admin/game/index.html");
    assert.match(tools, /<select id="toolMaintainerCreatorIds" multiple/);
    assert.match(notes, /<select id="noteAuthorCreatorId"/);
    assert.match(game, /id="gameTeamEditor"/);
    assert.doesNotMatch(`${tools}\n${notes}\n${game}`, /placeholder="creator-chikage"|Creator IDs|Author Creator ID/);
});

test("Phase F Dashboard reports daily work and operation history", async () => {
    const html = await read("apps/admin/index.html");
    const summary = await read("apps/admin/js/features/common/adminTodaySummary.js");
    assert.match(html, /今日の制作状況/);
    assert.match(html, /dashboardTodayList/);
    assert.match(html, /dashboardRecentList/);
    assert.match(summary, /Last Public Export/);
    assert.match(summary, /Last Backup/);
});

test("Phase F Scenario modal supports Escape, focus trapping, and focus restoration", async () => {
    const modal = await read("apps/admin/js/features/trpg/scenarios/scenarioModal.js");
    assert.match(modal, /event\.key === "Escape"/);
    assert.match(modal, /trapModalFocus/);
    assert.match(modal, /focusBeforeOpen\.focus\(\)/);
});

test("Phase F records successful Public Export history per module", () => {
    const storage = createStorage();
    recordPublicExport("tools", storage, new Date("2026-07-15T01:00:00.000Z"));
    recordPublicExport("notes", storage, new Date("2026-07-15T02:00:00.000Z"));
    assert.deepEqual(getPublicExportHistory(storage), {
        tools: "2026-07-15T01:00:00.000Z",
        notes: "2026-07-15T02:00:00.000Z"
    });
    assert.deepEqual(getLastPublicExport(storage), ["notes", "2026-07-15T02:00:00.000Z"]);
});

test("Phase F daily summary derives public and draft counts from storage", () => {
    const storage = createStorage({
        mira_terminal_tools: JSON.stringify({ tools: [
            { name: "Public Tool", status: "public", updatedAt: "2026-07-15T02:00:00.000Z" },
            { name: "Draft Tool", status: "draft", updatedAt: "2026-07-15T03:00:00.000Z" }
        ] }),
        mira_terminal_notes: JSON.stringify({ notes: [
            { title: "Public Note", status: "public", updatedAt: "2026-07-15T01:00:00.000Z" }
        ] })
    });
    const summary = loadAdminTodaySummary(storage);
    assert.equal(summary.metrics.find(metric => metric.label === "Public").value, 2);
    assert.equal(summary.metrics.find(metric => metric.label === "Draft / Ready").value, 1);
    assert.equal(summary.recent[0].title, "Draft Tool");
    assert.equal(summary.storageAvailable, true);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

function escapeRegExp(value){
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createStorage(initial = {}){
    const values = new Map(Object.entries(initial));
    return {
        getItem(key){ return values.has(key) ? values.get(key) : null; },
        setItem(key, value){ values.set(key, String(value)); },
        removeItem(key){ values.delete(key); }
    };
}
