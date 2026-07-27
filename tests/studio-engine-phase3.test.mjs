import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    createRelmuaEngine
} from "../apps/studio/src/engine/core/engine.js";

import {
    STUDIO_EVENTS,
    createEventBus
} from "../apps/studio/src/engine/core/eventBus.js";

import {
    createCommand
} from "../apps/studio/src/engine/core/commandManager.js";

import {
    createDefaultStudioPlugins
} from "../apps/studio/src/engine/core/defaultPlugins.js";

import {
    createHistoryEngine
} from "../apps/studio/src/engine/history/index.js";

const ROOT = new URL("../", import.meta.url);

test("Event Bus publishes Studio engine events without direct UI coupling", () => {
    const bus = createEventBus();
    const seen = [];

    bus.subscribe(STUDIO_EVENTS.COMPONENT_UPDATED, event => {
        seen.push(event.payload.blockId);
    });
    bus.publish(STUDIO_EVENTS.COMPONENT_UPDATED, {
        blockId: "hero-1"
    });

    assert.deepEqual(seen, ["hero-1"]);
    assert.equal(bus.history()[0].type, STUDIO_EVENTS.COMPONENT_UPDATED);
});

test("Plugin Manager registers Collection, Theme, and Inspector tab plugins", () => {
    const engine = createRelmuaEngine({
        history: createHistoryEngine({
            storage: createMemoryStorage(),
            key: "phase3-history"
        }),
        plugins: createDefaultStudioPlugins()
    });
    const plugins = engine.pluginManager.listPlugins();

    assert.ok(plugins.some(plugin => plugin.kind === "collection" && plugin.collectionType === "TRPG"));
    assert.ok(plugins.some(plugin => plugin.kind === "collection" && plugin.collectionType === "Game"));
    assert.ok(plugins.some(plugin => plugin.kind === "theme" && plugin.group === "color"));
    assert.ok(plugins.some(plugin => plugin.kind === "inspector-tab" && plugin.tab.id === "accessibility"));
});

test("Command Engine executes, undoes, and redoes commands while recording Studio History", () => {
    const history = createHistoryEngine({
        storage: createMemoryStorage(),
        key: "command-history"
    });
    const engine = createRelmuaEngine({
        history
    });
    let value = "before";
    const command = createCommand({
        id: "component.updated",
        label: "Hero changed",
        execute(){
            value = "after";
        },
        undo(){
            value = "before";
        },
        redo(){
            value = "after";
        }
    });

    engine.commandManager.execute(command);
    assert.equal(value, "after");
    assert.equal(history.list()[0].label, "Hero changed");
    engine.commandManager.undo();
    assert.equal(value, "before");
    engine.commandManager.redo();
    assert.equal(value, "after");
});

test("Phase 3 engine folders expose the required boundaries", async () => {
    const files = [
        "apps/studio/src/engine/core/engine.js",
        "apps/studio/src/engine/core/eventBus.js",
        "apps/studio/src/engine/core/pluginManager.js",
        "apps/studio/src/engine/core/commandManager.js",
        "apps/studio/src/engine/core/registry.js",
        "apps/studio/src/engine/block/index.js",
        "apps/studio/src/engine/theme/index.js",
        "apps/studio/src/engine/history/index.js",
        "apps/studio/src/engine/asset/index.js",
        "apps/studio/src/engine/generator/home.js",
        "apps/studio/src/engine/renderer/index.js",
        "apps/studio/src/engine/validation/index.js"
    ];

    for(const file of files){
        const source = await read(file);
        assert.ok(source.length > 0, file);
    }
});

test("Studio Host uses Event Bus, Plugin, Command, Renderer, and Diagnostics foundations", async () => {
    const mounts = await read("apps/studio/src/app/studioEditorMounts.js");

    [
        "createRelmuaEngine",
        "createDefaultStudioPlugins",
        "createCommand",
        "STUDIO_EVENTS",
        "createDiagnosticsPanel",
        "renderComponentModelPreview"
    ].forEach(token => assert.match(mounts, new RegExp(escapeRegExp(token))));

    assert.doesNotMatch(mounts, /switch\s*\(/);
    assert.doesNotMatch(mounts, /innerHTML/);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

function createMemoryStorage(){
    const data = new Map();

    return {
        getItem(key){
            return data.get(key) || null;
        },
        setItem(key, value){
            data.set(key, value);
        }
    };
}

function escapeRegExp(value){
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
