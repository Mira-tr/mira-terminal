import test from "node:test";
import assert from "node:assert/strict";

import {
    exportPublicScenarios
} from "../apps/admin/js/features/trpg/scenarios/scenarioPublicExport.js";

test("Public Exportは警告を出しAdmin専用項目を除外する", async ()=>{
    const originalDocument = globalThis.document;
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;

    let exportedBlob = null;

    const messageElement = {
        textContent: ""
    };

    globalThis.document = {
        getElementById(id){
            return id === "message"
                ? messageElement
                : null;
        },
        createElement(){
            return {
                href: "",
                download: "",
                click(){},
                remove(){}
            };
        },
        body: {
            appendChild(){}
        }
    };

    URL.createObjectURL = blob=>{
        exportedBlob = blob;
        return "blob:test";
    };

    URL.revokeObjectURL = ()=>{};

    try{
        exportPublicScenarios(
            [
                createScenario({
                    id: "invalid-url",
                    url: "javascript:alert(1)"
                }),
                createScenario({
                    id: "missing-url",
                    url: ""
                }),
                createScenario({
                    id: "private",
                    status: "private",
                    memo: "外部へ出してはいけない"
                })
            ],
            {
                appName: "MIRA Terminal",
                moduleName: "trpg"
            }
        );

        assert.ok(exportedBlob);

        const payload = JSON.parse(
            await exportedBlob.text()
        );

        assert.equal(payload.exportVersion, "1.2.0");
        assert.equal(payload.scenarios.length, 2);
        assert.deepEqual(
            payload.warnings.map(warning=>warning.type),
            ["invalid-url", "missing-url"]
        );

        payload.scenarios.forEach(scenario=>{
            [
                "memo",
                "status",
                "createdAt",
                "updatedAt"
            ].forEach(field=>{
                assert.equal(field in scenario, false);
            });
        });
    }finally{
        globalThis.document = originalDocument;
        URL.createObjectURL = originalCreateObjectUrl;
        URL.revokeObjectURL = originalRevokeObjectUrl;
    }
});

function createScenario(overrides = {}){
    return {
        id: "scenario",
        title: "テストシナリオ",
        kana: "てすとしなりお",
        author: "作者",
        system: "CoC6",
        playersRaw: "4人",
        playersMin: 4,
        playersMax: 4,
        timeRaw: "4時間",
        timeMin: 4,
        timeMax: 4,
        loss: "中",
        rating: "all",
        scenarioType: "クローズド",
        series: "",
        summary: "短い概要",
        notes: "",
        tags: ["推理重視"],
        url: "https://example.com/scenario",
        status: "public",
        memo: "管理用メモ",
        createdAt: 1,
        updatedAt: 2,
        ...overrides
    };
}
