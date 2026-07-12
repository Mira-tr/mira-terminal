import test from "node:test";
import assert from "node:assert/strict";

import {
    exportPublicScenarios
} from "../apps/admin/js/features/trpg/scenarios/scenarioPublicExport.js";

test("Public Exportは警告を出しAdmin専用項目を除外する", async ()=>{
    const originalDocument = globalThis.document;
    const originalLocalStorage = globalThis.localStorage;
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;

    let exportedBlob = null;
    let exportedFilename = null;

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
                set download(value){
                    exportedFilename = value;
                },
                click(){},
                remove(){}
            };
        },
        body: {
            appendChild(){}
        }
    };
    globalThis.localStorage = createStorage();

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
                    url: "javascript:alert(1)",
                    rating: "R-18G"
                }),
                createScenario({
                    id: "missing-url",
                    url: "",
                    rating: "unknown"
                }),
                createScenario({
                    id: "private",
                    status: "private",
                    memo: "外部へ出してはいけない"
                })
            ],
            {
                appName: "MIRA Terminal",
                moduleName: "trpg",
                filename: "override-must-not-work.json"
            }
        );

        assert.ok(exportedBlob);
        assert.equal(exportedFilename, "public-scenarios.json");

        const payload = JSON.parse(
            await exportedBlob.text()
        );

        assert.equal(payload.exportVersion, "1.2.0");
        assert.equal(payload.scenarios.length, 2);
        assert.deepEqual(
            payload.scenarios.map(scenario=>scenario.rating),
            ["r18", "all"]
        );
        assert.deepEqual(
            payload.warnings.map(warning=>warning.type),
            ["invalid-url", "missing-url"]
        );

        payload.scenarios.forEach(scenario=>{
            [
                "memo",
                "status",
                "createdAt",
                "updatedAt",
                "storageLocations",
                "storageNote"
            ].forEach(field=>{
                assert.equal(field in scenario, false);
            });
        });
    }finally{
        globalThis.document = originalDocument;
        globalThis.localStorage = originalLocalStorage;
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
        storageLocations: ["booth", "local"],
        storageNote: "TRPG/CoC6/テストシナリオ",
        createdAt: 1,
        updatedAt: 2,
        ...overrides
    };
}

function createStorage(){
    return {
        getItem(key){
            if(key !== "mira_terminal_creators"){
                return null;
            }

            return JSON.stringify({
                primaryCreatorId: "creator-chikage",
                creators: [
                    {
                        id: "creator-chikage",
                        slug: "chikage",
                        displayName: "千景",
                        status: "public",
                        order: 1
                    }
                ]
            });
        },
        setItem(){}
    };
}
