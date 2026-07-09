import test from "node:test";
import assert from "node:assert/strict";

import {
    normalizeRules
} from "../apps/admin/js/features/trpg/rules/rulesStore.js";

import {
    createPublicRulesPayload
} from "../apps/admin/js/features/trpg/rules/rulesPublicExport.js";

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
