import test from "node:test";
import assert from "node:assert/strict";

import {
    filterScenarios
} from "../apps/admin/js/features/trpg/scenarios/scenarioFilter.js";

const SCENARIOS = [
    {
        id: "match",
        title: "Alpha Mystery",
        status: "public",
        system: "CoC6",
        url: "invalid",
        tags: ["推理重視"],
        summary: "概要あり"
    },
    {
        id: "clean",
        title: "Alpha Clean",
        status: "public",
        system: "CoC6",
        url: "https://example.com/clean",
        tags: ["推理重視"],
        summary: "概要あり"
    },
    {
        id: "other-system",
        title: "Alpha Other",
        status: "public",
        system: "CoC7",
        url: "",
        tags: ["推理重視"],
        summary: "概要あり"
    },
    {
        id: "draft",
        title: "Alpha Draft",
        status: "draft",
        system: "CoC6",
        url: "",
        tags: ["推理重視"],
        summary: ""
    }
];

test("公開警告フィルターを既存条件とANDで適用する", ()=>{
    const result = filterScenarios(
        SCENARIOS,
        {
            keyword: "alpha",
            system: "CoC6",
            tags: ["推理重視"],
            publicWarningOnly: true
        }
    );

    assert.deepEqual(
        result.map(scenario=>scenario.id),
        ["match"]
    );
});

test("公開警告フィルターOFFでは正常な公開シナリオも残す", ()=>{
    const result = filterScenarios(
        SCENARIOS,
        {
            status: "public",
            system: "CoC6"
        }
    );

    assert.deepEqual(
        result.map(scenario=>scenario.id),
        ["match", "clean"]
    );
});

test("最近編集順はupdatedAtを優先し、未指定時はcreatedAtへ戻す", ()=>{
    const result = filterScenarios(
        [
            {
                id: "old-created-new-updated",
                title: "B",
                createdAt: 100,
                updatedAt: 400
            },
            {
                id: "new-created",
                title: "A",
                createdAt: 300
            },
            {
                id: "middle-updated",
                title: "C",
                createdAt: 200,
                updatedAt: 250
            }
        ],
        {
            sort: "updated"
        }
    );

    assert.deepEqual(
        result.map(scenario=>scenario.id),
        ["old-created-new-updated", "new-created", "middle-updated"]
    );
});
