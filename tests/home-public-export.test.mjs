import test from "node:test";
import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";

import {
    HOME_CONFIG_KEY
} from "../apps/admin/js/store.js";

import {
    getDefaultHomeConfig
} from "../apps/admin/js/features/home/homeConfig.js";

import {
    createPublicHomePayload,
    getHomePublicExportContract,
    validatePublicHomePayload
} from "../apps/admin/js/features/home/homePublicExport.js";

const ROOT = new URL("../", import.meta.url);

test("Home Public Export creates public-home structure only", () => {
    const payload = createPublicHomePayload(getDefaultHomeConfig());

    assert.equal(payload.schemaVersion, 1);
    assert.equal(payload.exportType, "public-home");
    assert.equal(payload.module, "home");
    assert.ok(Array.isArray(payload.sections));
    assert.equal(payload.sections.length, 5);
    assert.deepEqual(Object.keys(payload).sort(), [
        "exportType",
        "module",
        "schemaVersion",
        "sections"
    ]);

    payload.sections.forEach(section => {
        assert.equal("status" in section, false);
        assert.equal("createdAt" in section, false);
        assert.equal("updatedAt" in section, false);
        assert.equal("memo" in section, false);
    });

    validatePublicHomePayload(payload);
});

test("Home Public Export omits Hero-only irrelevant fields", () => {
    const payload = createPublicHomePayload(getDefaultHomeConfig());
    const hero = payload.sections.find(section => section.type === "hero");

    assert.ok(hero);
    assert.equal("selectionMode" in hero, false);
    assert.equal("limit" in hero, false);
    assert.equal("itemIds" in hero, false);
});

test("Home Public Export keeps content sections as ID references", () => {
    const payload = createPublicHomePayload({
        schemaVersion: 1,
        sections: [
            {
                id: "featured-projects",
                type: "projects",
                enabled: true,
                order: 5,
                title: "Featured",
                description: "Only IDs are exported.",
                layout: "cards",
                selectionMode: "manual",
                limit: 2,
                itemIds: ["project-a", "project-a", "project-b"]
            }
        ]
    });
    const projects = payload.sections.find(section => section.id === "featured-projects");

    assert.deepEqual(projects.itemIds, ["project-a", "project-b"]);
    assert.equal("title" in projects, true);
    assert.equal("Project title" in projects, false);
    assert.equal("displayName" in projects, false);
    validatePublicHomePayload(payload);
});

test("Home Public Export validation rejects invalid public payloads", () => {
    const payload = createPublicHomePayload(getDefaultHomeConfig());

    assert.throws(
        () => validatePublicHomePayload({
            ...payload,
            exportType: "backup-home"
        }),
        /exportType/
    );

    assert.throws(
        () => validatePublicHomePayload({
            ...payload,
            sections: [
                payload.sections[0],
                {
                    ...payload.sections[0]
                }
            ]
        }),
        /duplicated/
    );

    assert.throws(
        () => validatePublicHomePayload({
            ...payload,
            sections: [
                {
                    ...payload.sections[0],
                    itemIds: []
                }
            ]
        }),
        /not allowed for Hero/
    );

    assert.throws(
        () => validatePublicHomePayload({
            ...payload,
            localStorageKey: "mira_terminal_home_config"
        }),
        /Admin-only/
    );

    assert.throws(
        () => validatePublicHomePayload({
            ...payload,
            sections: [
                {
                    ...payload.sections[1],
                    status: "public"
                }
            ]
        }),
        /Admin-only/
    );
});

test("Home Public Export reads saved Store config when no config is passed", () => {
    const originalLocalStorage = globalThis.localStorage;
    const storage = createStorage({
        [HOME_CONFIG_KEY]: JSON.stringify({
            schemaVersion: 1,
            sections: [
                {
                    id: "featured-tools",
                    type: "tools",
                    enabled: true,
                    order: 7,
                    title: "Saved Tools",
                    description: "",
                    layout: "list",
                    selectionMode: "manual",
                    limit: 2,
                    itemIds: ["json-viewer"]
                }
            ]
        })
    });

    globalThis.localStorage = storage;

    try{
        const payload = createPublicHomePayload();
        const tools = payload.sections.find(section => section.id === "featured-tools");

        assert.equal(tools.title, "Saved Tools");
        assert.equal(tools.order, 7);
        assert.deepEqual(tools.itemIds, ["json-viewer"]);
    }finally{
        globalThis.localStorage = originalLocalStorage;
    }
});

test("Home Public Export contract keeps fixed filename and destination", () => {
    assert.deepEqual(getHomePublicExportContract(), {
        filename: "public-home.json",
        destination: "apps/web/data/public-home.json",
        exportType: "public-home",
        module: "home"
    });
});

test("Initial public-home.json matches Public Export validation", async () => {
    const payload = JSON.parse(await read("apps/web/data/public-home.json"));

    assert.deepEqual(payload, createPublicHomePayload(getDefaultHomeConfig()));
    validatePublicHomePayload(payload);
});

test("Public data update docs include Home Export operation", async () => {
    const docs = await read("docs/public-data-update.md");

    assert.match(docs, /Home Public Export/);
    assert.match(docs, /Save Home Configuration/);
    assert.match(docs, /public-home\.json/);
    assert.match(docs, /node scripts\/build-public\.mjs/);
});

test("Public Home is not wired to public-home.json yet", async () => {
    const home = await read("apps/web/index.html");

    assert.doesNotMatch(home, /public-home\.json|homePublic|Home Configuration/);
});

function createStorage(values = {}){
    const data = new Map(Object.entries(values));

    return {
        getItem: key => data.get(key) ?? null,
        setItem: (key, value) => data.set(key, String(value)),
        removeItem: key => data.delete(key)
    };
}

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
