import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    addSection,
    deleteSection,
    duplicateSection,
    getSystem,
    moveSection,
    normalizeRules
} from "../apps/admin/js/features/trpg/rules/rulesStore.js";

import {
    createPublicRulesPayload
} from "../apps/admin/js/features/trpg/rules/rulesPublicExport.js";

const ROOT = new URL("../", import.meta.url);

test("House Rules旧データを長文運用向け構造へ正規化する", ()=>{
    const normalized = normalizeRules({
        systems: [
            {
                id: "coc6",
                label: "CoC6版",
                sections: [
                    {
                        id: "intro",
                        body: "本文",
                        status: undefined
                    },
                    {
                        id: "intro",
                        title: "判定",
                        category: "判定",
                        order: 10,
                        status: "private",
                        body: ""
                    }
                ]
            }
        ]
    });

    const [system] = normalized.systems;

    assert.equal(system.title, "CoC6版");
    assert.equal(system.status, "public");
    assert.deepEqual(
        system.sections.map(section=>section.order),
        [1, 2]
    );
    assert.equal(system.sections[0].category, "未分類");
    assert.equal(system.sections[0].status, "public");
    assert.equal(system.sections[1].id, "intro-2");
    assert.equal(system.sections[1].status, "private");
});

test("House Rules Public Exportはpublicだけを含み管理項目を除外する", ()=>{
    const payload = createPublicRulesPayload({
        systems: [
            {
                id: "coc6",
                label: "CoC6版",
                title: "MIRA卓 CoC6版 ハウスルール",
                version: "1.1",
                description: "説明",
                status: "public",
                createdAt: "2026-01-01",
                updatedAt: "2026-01-02",
                sections: [
                    {
                        id: "public-section",
                        order: 2,
                        category: "基本",
                        title: "公開",
                        body: "本文",
                        status: "public",
                        createdAt: "2026-01-01",
                        updatedAt: "2026-01-02"
                    },
                    {
                        id: "draft-section",
                        order: 1,
                        category: "基本",
                        title: "下書き",
                        body: "非公開",
                        status: "draft"
                    }
                ]
            },
            {
                id: "private-system",
                label: "Private",
                status: "private",
                sections: [
                    {
                        id: "hidden",
                        title: "Hidden",
                        body: "Hidden",
                        status: "public"
                    }
                ]
            }
        ]
    });

    assert.equal(payload.exportType, "house-rules");
    assert.equal(payload.systems.length, 1);

    const [system] = payload.systems;

    assert.equal(system.title, "MIRA卓 CoC6版 ハウスルール");
    assert.equal(system.version, "1.1");
    assert.equal("status" in system, false);
    assert.equal("createdAt" in system, false);
    assert.equal("updatedAt" in system, false);
    assert.equal(system.sections.length, 1);
    assert.deepEqual(system.sections[0], {
        id: "public-section",
        order: 2,
        category: "基本",
        title: "公開",
        body: "本文"
    });
    assert.equal("status" in system.sections[0], false);
    assert.equal("createdAt" in system.sections[0], false);
    assert.equal("updatedAt" in system.sections[0], false);
});

test("House Rules Admin section操作は追加・複製・上下移動・削除できる", ()=>{
    const originalStorage = globalThis.localStorage;
    const storage = createMemoryStorage();

    globalThis.localStorage = storage;

    try{
        storage.setItem("mira_terminal_rules", JSON.stringify({
            systems: [
                {
                    id: "coc6",
                    label: "CoC6版",
                    status: "public",
                    sections: [
                        {
                            id: "first",
                            order: 1,
                            category: "基本",
                            title: "First",
                            status: "public",
                            body: "本文"
                        },
                        {
                            id: "second",
                            order: 2,
                            category: "基本",
                            title: "Second",
                            status: "draft",
                            body: "本文"
                        }
                    ]
                }
            ]
        }));

        const addedId = addSection("coc6", {
            title: "Added"
        });
        assert.ok(addedId);
        assert.equal(getSystem("coc6").sections.length, 3);

        const duplicatedId = duplicateSection("coc6", "first");
        assert.ok(duplicatedId);
        assert.equal(getSystem("coc6").sections.length, 4);
        assert.ok(getSystem("coc6").sections.some(section=>section.title === "First コピー"));

        assert.equal(moveSection("coc6", addedId, "up"), true);
        assert.equal(moveSection("coc6", addedId, "down"), true);

        assert.equal(deleteSection("coc6", duplicatedId), true);
        assert.equal(getSystem("coc6").sections.length, 3);
        assert.deepEqual(
            getSystem("coc6").sections.map(section=>section.order),
            [1, 2, 3]
        );
    }finally{
        globalThis.localStorage = originalStorage;
    }
});

test("House Rules Public section summaryは独自マーカー要素で安定表示する", async ()=>{
    const [script, styles] = await Promise.all([
        readFile(new URL("apps/web/trpg/rules/js/rules.js", ROOT), "utf8"),
        readFile(new URL("apps/web/trpg/rules/css/rules.css", ROOT), "utf8")
    ]);

    assert.match(script, /className = "rule-section-marker"/);
    assert.match(script, /aria-hidden/);
    assert.match(script, /summary\.append\(marker, number, title, category\)/);
    assert.match(styles, /\.rule-section-summary::marker/);
    assert.match(styles, /\.rule-section-marker/);
    assert.doesNotMatch(styles, /\.rule-section-summary::before/);
});

test("House Rules Admin section summaryは独自マーカー要素で安定表示する", async ()=>{
    const [script, styles] = await Promise.all([
        readFile(new URL("apps/admin/js/features/trpg/rules/rulesForm.js", ROOT), "utf8"),
        readFile(new URL("apps/admin/css/pages/rules.css", ROOT), "utf8")
    ]);

    assert.match(script, /className = "rule-section-marker"/);
    assert.match(script, /aria-hidden/);
    assert.match(script, /summary\.append\(\s*marker,\s*createSectionSummaryMain\(section\),\s*createStatusBadge\(section\.status\)\s*\)/);
    assert.match(styles, /\.rules-section-summary::marker/);
    assert.match(styles, /\.rule-section-marker/);
    assert.match(styles, /\.rules-section-item\[open\] \.rule-section-marker/);
    assert.doesNotMatch(styles, /\.rules-section-summary::before/);
});

function createMemoryStorage(){
    const values = new Map();

    return {
        getItem(key){
            return values.has(key)
                ? values.get(key)
                : null;
        },
        setItem(key, value){
            values.set(key, String(value));
        },
        removeItem(key){
            values.delete(key);
        },
        clear(){
            values.clear();
        }
    };
}
