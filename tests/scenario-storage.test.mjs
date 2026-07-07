import test from "node:test";
import assert from "node:assert/strict";

import {
    getStorageLocationLabels,
    getStorageLocationSummary,
    normalizeStorageLocations
} from "../apps/admin/js/features/trpg/scenarios/scenarioStorage.js";

test("保存場所を重複なく正規化する", ()=>{
    assert.deepEqual(
        normalizeStorageLocations([
            "booth",
            "local",
            "booth",
            "unknown",
            ""
        ]),
        ["booth", "local"]
    );
});

test("旧形式のカンマ区切り文字列も読み込む", ()=>{
    assert.deepEqual(
        normalizeStorageLocations("booth, cloud, physical"),
        ["booth", "cloud", "physical"]
    );
});

test("保存場所の表示名と一覧用テキストを返す", ()=>{
    assert.deepEqual(
        getStorageLocationLabels([
            "booth",
            "web",
            "local",
            "cloud",
            "physical",
            "other"
        ]),
        [
            "BOOTH",
            "Webサービス",
            "PC",
            "クラウド",
            "紙・書籍",
            "その他"
        ]
    );

    assert.equal(
        getStorageLocationSummary(["booth", "local"]),
        "BOOTH・PC"
    );
});
