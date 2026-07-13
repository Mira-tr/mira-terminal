import test from "node:test";
import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";

import {
    DEFAULT_HOME_SECTIONS,
    HOME_CONFIG_SCHEMA_VERSION,
    HOME_SECTION_LIMIT_MAX,
    getDefaultHomeConfig,
    normalizeHomeConfig
} from "../apps/admin/js/features/home/homeConfig.js";

import {
    validateHomeConfig
} from "../apps/admin/js/features/home/homeValidation.js";

import {
    HOME_CONFIG_KEY
} from "../apps/admin/js/store.js";

import {
    loadHomeConfig,
    resetHomeConfig,
    saveHomeConfig
} from "../apps/admin/js/features/home/homeStore.js";

const EXPECTED_SECTION_IDS = [
    "hero",
    "featured-projects",
    "featured-tools",
    "notes",
    "creators"
];

test("Home Configuration default config is valid and contains schemaVersion", () => {
    const config = getDefaultHomeConfig();

    assert.equal(config.schemaVersion, HOME_CONFIG_SCHEMA_VERSION);
    assert.deepEqual(
        config.sections.map(section => section.id),
        EXPECTED_SECTION_IDS
    );
    assert.equal(new Set(config.sections.map(section => section.id)).size, config.sections.length);
    validateHomeConfig(config);
});

test("Home Configuration normalizes order, enabled, limit, and itemIds", () => {
    const normalized = normalizeHomeConfig({
        sections: [
            {
                id: "featured-tools",
                enabled: "false",
                order: "10",
                limit: 999,
                itemIds: ["tool-1", "tool-1", 2, "", "tool-2"],
                selectionMode: "manual"
            },
            {
                id: "hero",
                enabled: "1",
                order: "bad",
                limit: 0,
                layout: "invalid",
                selectionMode: "latest",
                itemIds: ["hero-copy"]
            }
        ]
    });

    const tools = normalized.sections.find(section => section.id === "featured-tools");
    const hero = normalized.sections.find(section => section.id === "hero");

    assert.deepEqual(normalized.sections.map(section => section.order), [10, 10, 20, 40, 50]);
    assert.equal(tools.enabled, false);
    assert.equal(tools.limit, HOME_SECTION_LIMIT_MAX);
    assert.deepEqual(tools.itemIds, ["tool-1", "tool-2"]);
    assert.equal(hero.enabled, true);
    assert.equal(hero.limit, 1);
    assert.equal(hero.layout, "hero");
    assert.equal(hero.selectionMode, "source-order");
    validateHomeConfig(normalized);
});

test("Home Configuration schemaVersion fallback is explicit", () => {
    const legacy = normalizeHomeConfig({
        sections: [
            {
                id: "notes",
                order: 5
            }
        ]
    });
    const versionOne = normalizeHomeConfig({
        schemaVersion: 1,
        sections: [
            {
                id: "notes",
                order: 5
            }
        ]
    });
    const versionZero = normalizeHomeConfig({
        schemaVersion: 0,
        sections: [
            {
                id: "notes",
                order: 5
            }
        ]
    });
    const futureVersion = normalizeHomeConfig({
        schemaVersion: 2,
        sections: [
            {
                id: "notes",
                order: 5
            }
        ]
    });

    assert.equal(legacy.sections[0].id, "notes");
    assert.equal(versionOne.sections[0].id, "notes");
    assert.deepEqual(versionZero, getDefaultHomeConfig());
    assert.deepEqual(futureVersion, getDefaultHomeConfig());
});

test("Home Configuration keeps duplicate order stable and removes unknown sections", () => {
    const normalized = normalizeHomeConfig({
        schemaVersion: 1,
        sections: [
            {
                id: "creators",
                order: 20
            },
            {
                id: "unknown",
                type: "projects",
                order: 1
            },
            {
                id: "featured-tools",
                order: 20
            }
        ]
    });

    assert.equal(normalized.sections.some(section => section.id === "unknown"), false);
    assert.deepEqual(
        normalized.sections
            .filter(section => section.order === 20)
            .map(section => section.id),
        ["creators", "featured-tools", "featured-projects"]
    );
});

test("Home Configuration validation rejects duplicated ids and invalid types", () => {
    assert.throws(
        () => validateHomeConfig({
            schemaVersion: HOME_CONFIG_SCHEMA_VERSION,
            sections: [
                {
                    ...DEFAULT_HOME_SECTIONS[0]
                },
                {
                    ...DEFAULT_HOME_SECTIONS[0],
                    type: "invalid"
                }
            ]
        }),
        /duplicated|invalid/
    );
});

test("Home Configuration store falls back safely and saves normalized data", () => {
    const storage = createStorage({
        [HOME_CONFIG_KEY]: "{broken-json"
    });
    const originalLocalStorage = globalThis.localStorage;

    globalThis.localStorage = storage;

    try{
        assert.deepEqual(
            loadHomeConfig().sections.map(section => section.id),
            EXPECTED_SECTION_IDS
        );

        const saved = saveHomeConfig({
            schemaVersion: HOME_CONFIG_SCHEMA_VERSION,
            sections: [
                {
                    id: "notes",
                    order: 5,
                    enabled: 0,
                    limit: "2",
                    itemIds: ["note-1", "note-1"]
                }
            ]
        });

        assert.notEqual(saved, false);
        assert.equal(saved.sections[0].id, "notes");
        assert.equal(saved.sections[0].enabled, false);
        assert.equal(saved.sections[0].limit, 2);
        assert.deepEqual(saved.sections[0].itemIds, ["note-1"]);
        assert.deepEqual(
            JSON.parse(storage.getItem(HOME_CONFIG_KEY)).sections[0],
            saved.sections[0]
        );

        assert.deepEqual(
            resetHomeConfig().sections.map(section => section.id),
            EXPECTED_SECTION_IDS
        );
        assert.equal(storage.getItem(HOME_CONFIG_KEY), null);
    }finally{
        globalThis.localStorage = originalLocalStorage;
    }
});

test("Home Configuration does not affect existing localStorage keys", () => {
    const storage = createStorage({
        mira_terminal_games: JSON.stringify({
            games: []
        })
    });
    const originalLocalStorage = globalThis.localStorage;

    globalThis.localStorage = storage;

    try{
        saveHomeConfig(getDefaultHomeConfig());
        assert.equal(storage.getItem("mira_terminal_games"), JSON.stringify({
            games: []
        }));
        assert.notEqual(storage.getItem(HOME_CONFIG_KEY), null);
    }finally{
        globalThis.localStorage = originalLocalStorage;
    }
});

test("Home Configuration core modules do not contain DOM operations", async () => {
    const paths = [
        "apps/admin/js/features/home/homeConfig.js",
        "apps/admin/js/features/home/homeValidation.js",
        "apps/admin/js/features/home/homeStore.js"
    ];

    for(const path of paths){
        const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");

        assert.doesNotMatch(source, /\bdocument\b|\bcreateElement\b|\bquerySelector\b|\binnerHTML\b/, path);
    }
});

function createStorage(values = {}){
    const data = new Map(Object.entries(values));

    return {
        getItem: key => data.get(key) ?? null,
        setItem: (key, value) => data.set(key, String(value)),
        removeItem: key => data.delete(key)
    };
}
