import test from "node:test";
import assert from "node:assert/strict";

import {
    filterScenarios
} from "../apps/web/trpg/js/scenarioFilter.js";

const SCENARIOS = [{
    id: "kana-match",
    title: "慄け！因習村",
    kana: "おののけ！いんしゅうむら",
    author: "ゆめたろう",
    system: "CoC6",
    playersMin: 1,
    playersMax: null,
    timeMin: 2,
    timeMax: 3,
    rating: "all",
    tags: ["初心者向け"]
}, {
    id: "other",
    title: "別の物語",
    kana: "べつのものがたり",
    author: "別作者",
    system: "CoC7",
    playersMin: 4,
    playersMax: 4,
    timeMin: 6,
    timeMax: 7,
    rating: "r18",
    tags: ["秘匿HO"]
}, {
    id: "legacy-r18g",
    title: "旧年齢区分",
    kana: "きゅうねんれいくぶん",
    author: "旧作者",
    system: "CoC6",
    playersMin: 2,
    playersMax: 3,
    timeMin: 3,
    timeMax: 4,
    rating: "R-18G",
    tags: ["グロ注意"]
}];

test("ひらがなと作者名を独立して検索できる", ()=>{
    assert.deepEqual(
        filterScenarios(SCENARIOS, {
            keyword: "おののけ",
            author: "ゆめたろう"
        }).map(scenario=>scenario.id),
        ["kana-match"]
    );
});

test("人数・時間・システム・タグ・R18区分を組み合わせられる", ()=>{
    assert.deepEqual(
        filterScenarios(SCENARIOS, {
            system: "CoC7",
            players: "4",
            time: "6",
            rating: "r18",
            tags: ["秘匿HO"]
        }).map(scenario=>scenario.id),
        ["other"]
    );
});

test("お気に入りのみ表示を適用する", ()=>{
    assert.deepEqual(
        filterScenarios(SCENARIOS, {
            favoriteOnly: true,
            favoriteIds: ["other"]
        }).map(scenario=>scenario.id),
        ["other"]
    );
});

test("全年齢とR18の2択で絞り込み、旧R18GもR18へ含める", ()=>{
    assert.deepEqual(
        filterScenarios(SCENARIOS, {
            rating: "all"
        }).map(scenario=>scenario.id),
        ["kana-match"]
    );

    assert.deepEqual(
        filterScenarios(SCENARIOS, {
            rating: "r18"
        }).map(scenario=>scenario.id),
        ["other", "legacy-r18g"]
    );
});
