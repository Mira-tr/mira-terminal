import test from "node:test";
import assert from "node:assert/strict";

import {
    createActiveFilterItems
} from "../apps/web/creators/chikage/trpg/js/activeFilterView.js";

test("適用中の検索条件をv5の表示順どおりに組み立てる", ()=>{
    const items = createActiveFilterItems({
        keyword: "  深海  ",
        author: "作者",
        system: {
            value: "CoC6",
            label: "CoC6"
        },
        players: {
            value: "4",
            label: "4PL"
        },
        time: {
            value: "5",
            label: "5時間"
        },
        scenarioType: {
            value: "秘匿4PL",
            label: "秘匿4PL"
        },
        series: {
            value: "夜シリーズ",
            label: "夜シリーズ"
        },
        loss: {
            value: "高",
            label: "高"
        },
        rating: {
            value: "r18",
            label: "R18"
        },
        favoriteOnly: true,
        tags: ["推理重視", "秘匿HO"],
        sort: {
            value: "title",
            label: "名前順"
        }
    });

    assert.deepEqual(
        items.map(item=>item.label),
        [
            "検索: 深海",
            "作者: 作者",
            "System: CoC6",
            "人数: 4PL",
            "時間: 5時間",
            "形式: 秘匿4PL",
            "シリーズ: 夜シリーズ",
            "ロスト: 高",
            "年齢区分: R18",
            "お気に入り",
            "#推理重視",
            "#秘匿HO",
            "並び順: 名前順"
        ]
    );
});

test("未指定条件とデフォルトの並び順は表示しない", ()=>{
    assert.deepEqual(
        createActiveFilterItems({
            keyword: "",
            system: {
                value: "",
                label: "すべて"
            },
            tags: [],
            favoriteOnly: false,
            sort: {
                value: "recommended",
                label: "おすすめ優先"
            }
        }),
        []
    );
});
