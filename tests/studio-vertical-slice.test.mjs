import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    createCollectionContext,
    normalizeMode
} from "../apps/admin/js/features/collections/collectionContext.js";

import {
    createCollectionEditorRoute,
    getActiveCollectionTypes,
    getAvailableCollectionOwners,
    getCollectionStorageMapping
} from "../apps/admin/js/features/collections/collectionRegistry.js";

import {
    getScenarios,
    setScenarios
} from "../apps/admin/js/features/trpg/scenarios/scenarioStore.js";

import {
    createDefaultScenarioEditorController,
    saveDraft,
    validateDraft
} from "../apps/admin/js/features/trpg/scenarios/scenarioDraftAdapter.js";

import {
    createBrowserLocalStorageRepository
} from "../apps/admin/js/features/trpg/scenarios/browserLocalStorageRepository.js";

import {
    createScenarioExportAdapter
} from "../apps/admin/js/features/trpg/scenarios/scenarioExportAdapter.js";

import {
    createScenarioPreviewAdapter
} from "../apps/admin/js/features/trpg/scenarios/scenarioPreviewAdapter.js";

const ROOT = new URL("../", import.meta.url);

test("Studio add wizard exposes only Collection as an enabled first slice action", async () => {
    const html = await read("apps/studio/index.html");
    const app = await read("apps/studio/src/app/studioApp.js");

    assert.match(html, /id="openAddWizard"/);
    assert.match(html, /id="addWizard"/);
    assert.match(html, /aria-labelledby="addWizardTitle"/);
    assert.match(html, /id="wizardError"[^>]*aria-live="polite"/);
    assert.match(app, /id:\s*"collection"[\s\S]*?enabled:\s*true/);
    assert.match(app, /id:\s*"project"[\s\S]*?enabled:\s*false/);
    assert.match(app, /is-static/);
});

test("Studio vertical slice has Light and Dark readable action tokens", async () => {
    const css = await read("apps/studio/src/ui/studio.css");

    assert.match(css, /--studio-accent-ink:\s*#ffffff/);
    assert.match(css, /prefers-color-scheme:\s*dark/);
    assert.match(css, /--studio-accent:\s*#8fc8b7/);
    assert.match(css, /--studio-accent-ink:\s*#0f1714/);
    assert.match(css, /button:focus-visible/);
    assert.match(css, /\.studio-button-primary/);
});

test("TRPG collection owners are resolved from registry and do not include Asagiri", () => {
    const types = getActiveCollectionTypes();
    const owners = getAvailableCollectionOwners("trpg");

    assert.deepEqual(types.map(type => type.id), ["trpg"]);
    assert.deepEqual(owners.map(owner => owner.displayName), ["千景"]);
    assert.equal(owners.some(owner => owner.id === "creator-asagiri"), false);
});

test("CollectionContext keeps Studio mode and owner separate from UI strings", () => {
    const context = createCollectionContext(new URLSearchParams(
        "source=studio&collection=trpg&owner=chikage&mode=beginner"
    ));

    assert.equal(context.source, "studio");
    assert.equal(context.collectionTypeId, "trpg");
    assert.equal(context.ownerCreatorId, "creator-chikage");
    assert.equal(context.ownerDisplayName, "千景");
    assert.equal(context.mode, "beginner");
    assert.equal(context.isStudio, true);
    assert.equal(context.isBeginner, true);
    assert.equal(normalizeMode("unknown"), "standard");
});

test("Studio editor route hides internal IDs and keeps existing Browser Admin route available", () => {
    const route = createCollectionEditorRoute({
        collectionTypeId: "trpg",
        ownerCreatorId: "creator-chikage",
        context: "studio"
    });

    assert.match(route, /^\.\.\/admin\/trpg\//);
    assert.match(route, /collection=trpg/);
    assert.match(route, /owner=chikage/);
    assert.match(route, /mode=beginner/);
    assert.doesNotMatch(route, /creator-chikage/);
});

test("TRPG smart storage mapping uses the new creator data authority only", () => {
    const mapping = getCollectionStorageMapping("trpg", "creator-chikage");
    const asagiriMapping = getCollectionStorageMapping("trpg", "creator-asagiri");

    assert.ok(mapping);
    assert.equal(mapping.ownerCreatorId, "creator-chikage");
    assert.equal(mapping.publicPath, "/creators/chikage/trpg/");
    assert.equal(mapping.publicScenariosJson, "apps/web/data/creators/chikage/trpg/public-scenarios.json");
    assert.equal(mapping.houseRulesJson, "apps/web/data/creators/chikage/trpg/house-rules.json");
    assert.deepEqual(mapping.localStorageKeys, [
        "mira_terminal_scenarios",
        "mira_terminal_tags",
        "mira_terminal_authors"
    ]);
    assert.equal(mapping.publicScenariosJson.includes("apps/web/trpg/data"), false);
    assert.equal(mapping.houseRulesJson.includes("apps/web/trpg/rules/data"), false);
    assert.equal(asagiriMapping, null);
});

test("TRPG draft adapter validates beginner-facing errors", () => {
    const missingTitle = validateDraft({
        title: "",
        ownerCreatorId: "creator-chikage"
    });
    const invalidCreator = validateDraft({
        title: "Scenario",
        ownerCreatorId: "creator-asagiri"
    });
    const invalidUrl = validateDraft({
        title: "Scenario",
        ownerCreatorId: "creator-chikage",
        url: "javascript:alert(1)"
    });

    assert.equal(missingTitle.ok, false);
    assert.ok(missingTitle.errors.some(error => error.code === "missing-title"));
    assert.equal(invalidCreator.ok, false);
    assert.ok(invalidCreator.errors.some(error => error.code === "invalid-creator"));
    assert.equal(invalidUrl.ok, false);
    assert.ok(invalidUrl.errors.some(error => error.code === "invalid-url"));
});

test("TRPG draft adapter saves through the existing scenario localStorage key", () => {
    const originalStorage = globalThis.localStorage;
    const storage = createStorage();
    globalThis.localStorage = storage;

    try{
        setScenarios([]);

        const result = saveDraft({
            id: "scenario-from-studio",
            title: "Studioから追加したシナリオ",
            ownerCreatorId: "creator-chikage",
            status: "draft"
        }, {
            storage
        });

        assert.equal(result.ok, true);
        assert.equal(result.status.publicSynced, false);
        assert.equal(result.status.previewAvailable, true);
        assert.equal(result.nextAction, "次は表示を確認してください。");
        assert.equal(getScenarios()[0].id, "scenario-from-studio");
        assert.ok(storage.getItem("mira_terminal_scenarios"));
    }finally{
        setScenarios([]);
        globalThis.localStorage = originalStorage;
    }
});

test("ScenarioEditorController saves through repository and returns preview status", () => {
    const originalStorage = globalThis.localStorage;
    const storage = createStorage();
    globalThis.localStorage = storage;

    try{
        setScenarios([]);

        const context = createCollectionContext(new URLSearchParams(
            "source=studio&collection=trpg&owner=chikage&mode=beginner"
        ));
        const controller = createDefaultScenarioEditorController(context);
        const result = controller.saveDraft({
            id: "controller-scenario",
            title: "Controller保存シナリオ",
            ownerCreatorId: "creator-chikage",
            status: "draft"
        }, {
            storage
        });

        assert.equal(result.ok, true);
        assert.equal(result.preview.type, "draft-preview");
        assert.equal(result.preview.previewUrl.includes("previewScenario=controller-scenario"), true);
        assert.equal(controller.context.mode, "beginner");
        assert.equal(getScenarios()[0].id, "controller-scenario");
    }finally{
        setScenarios([]);
        globalThis.localStorage = originalStorage;
    }
});

test("Repository, PreviewAdapter, and ExportAdapter expose replaceable contracts", () => {
    const repository = createBrowserLocalStorageRepository({
        ownerCreatorId: "creator-chikage"
    });
    const previewAdapter = createScenarioPreviewAdapter({
        repository,
        previewPath: "../../web/creators/chikage/trpg/"
    });
    const exportAdapter = createScenarioExportAdapter({
        repository
    });

    assert.equal(repository.kind, "ScenarioDraftRepository");
    assert.equal(typeof repository.listDrafts, "function");
    assert.equal(typeof repository.saveDraft, "function");
    assert.equal(typeof repository.validateDraft, "function");
    assert.equal(previewAdapter.kind, "PreviewAdapter");
    assert.equal(typeof previewAdapter.previewDraft, "function");
    assert.equal(exportAdapter.kind, "ExportAdapter");
    assert.equal(typeof exportAdapter.exportPublicData, "function");
});

test("Existing scenario form delegates save and public export through the shared controller contract", async () => {
    const form = await read("apps/admin/js/features/trpg/scenarios/scenarioForm.js");
    const app = await read("apps/admin/js/app.js");

    assert.match(form, /controller\.saveDraft/);
    assert.match(form, /collectScenarioEditorData/);
    assert.doesNotMatch(form, /addScenario|updateScenario|isSafeHttpUrl/);
    assert.match(app, /createCollectionContext/);
    assert.match(app, /createDefaultScenarioEditorController/);
    assert.match(app, /scenarioEditorController\.exportPublicData/);
});

test("Phase 2 editor contract files do not introduce new Collection types", async () => {
    const registry = await read("apps/admin/js/features/collections/collectionRegistry.js");
    const combined = [
        await read("apps/admin/js/features/trpg/scenarios/scenarioEditorController.js"),
        await read("apps/admin/js/features/trpg/scenarios/scenarioDraftRepository.js"),
        await read("apps/admin/js/features/trpg/scenarios/browserLocalStorageRepository.js"),
        await read("apps/admin/js/features/trpg/scenarios/scenarioPreviewAdapter.js"),
        await read("apps/admin/js/features/trpg/scenarios/scenarioExportAdapter.js")
    ].join("\n");

    assert.deepEqual(getActiveCollectionTypes().map(type => type.id), ["trpg"]);
    assert.doesNotMatch(registry, /game|book|music|tool-collection/i);
    assert.doesNotMatch(combined, /game|book|music|Tool Collection/);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

function createStorage(){
    const data = new Map();

    return {
        getItem(key){
            return data.has(key) ? data.get(key) : null;
        },
        setItem(key, value){
            data.set(key, String(value));
        },
        removeItem(key){
            data.delete(key);
        },
        clear(){
            data.clear();
        }
    };
}
