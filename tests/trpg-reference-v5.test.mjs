import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { filterScenarios } from "../apps/web/creators/chikage/trpg/js/scenarioFilter.js";
import { normalizeRules } from "../apps/web/creators/chikage/trpg/rules/js/rules.js";

const ROOT = new URL("../", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

test("Scenario Library v5はbrowse-first構造と拡張facetを持つ", async ()=>{
    const [page, styles, app] = await Promise.all([
        read("apps/web/creators/chikage/trpg/scenarios/index.html"),
        read("apps/web/creators/chikage/trpg/css/scenario-library-v5.css"),
        read("apps/web/creators/chikage/trpg/js/app.js")
    ]);

    assert.match(page, /scenario-library-v5\.css/);
    assert.doesNotMatch(page, /scenario-library-v4\.css/);
    assert.match(page, /遊びたい一本を探す。/);
    assert.match(page, /id="scenarioTypeSelect"/);
    assert.match(page, /id="seriesSelect"/);
    assert.match(page, /id="lossSelect"/);
    assert.match(page, /id="filterSheetCloseBtn"/);
    assert.match(styles, /\.library-control-bar/);
    assert.match(styles, /\.library-more-filters\[open\] \.library-filter-panel/);
    assert.match(app, /getUniqueValues\(allScenarios, "scenarioType"\)/);
    assert.match(app, /scenarioType: elements\.scenarioTypeSelect\.value/);
});

test("Scenario Library v5は概要・形式・シリーズ・ロストを検索/絞り込みできる", ()=>{
    const scenarios = [
        {
            id: "a",
            title: "夜の駅",
            author: "A",
            system: "CoC6",
            scenarioType: "秘匿4PL",
            series: "夜シリーズ",
            loss: "高",
            summary: "刑事たちが失踪事件を追う",
            notes: "重い描写あり",
            tags: ["現代日本"]
        },
        {
            id: "b",
            title: "朝の海",
            author: "B",
            system: "CoC6",
            scenarioType: "2PL",
            series: "海シリーズ",
            loss: "低",
            summary: "旅をする",
            tags: ["旅行"]
        }
    ];

    assert.deepEqual(
        filterScenarios(scenarios, { keyword: "刑事" }).map(item=>item.id),
        ["a"]
    );
    assert.deepEqual(
        filterScenarios(scenarios, {
            scenarioType: "秘匿4PL",
            series: "夜シリーズ",
            loss: "高"
        }).map(item=>item.id),
        ["a"]
    );
});

test("House Rules v5は複数systemを正規化しUIで切り替えられる", async ()=>{
    const normalized = normalizeRules({
        systems: [
            { id: "coc6", label: "CoC6", sections: [{ id: "a", title: "A", body: "本文" }] },
            { id: "emoklore", label: "エモクロア", sections: [{ id: "b", title: "B", body: "本文" }] }
        ]
    });

    assert.deepEqual(normalized.map(system=>system.id), ["coc6", "emoklore"]);

    const [page, styles, script, links] = await Promise.all([
        read("apps/web/creators/chikage/trpg/rules/index.html"),
        read("apps/web/creators/chikage/trpg/rules/css/rules-v5.css"),
        read("apps/web/creators/chikage/trpg/rules/js/rules.js"),
        read("apps/web/creators/chikage/trpg/rules/js/rules-links.js")
    ]);

    assert.match(page, /rules-v5\.css/);
    assert.doesNotMatch(page, /rules-v4\.css/);
    assert.match(page, /ルールデータベース/);
    assert.match(styles, /\.rules-system-list/);
    assert.match(styles, /\.rules-v5-shell\.is-quick/);
    assert.match(script, /systems\.forEach\(system=>/);
    assert.match(script, /id = "rulesSystemSelect"/);
    assert.match(script, /searchScope = button\.dataset\.scope === "all"/);
    assert.match(script, /url\.searchParams\.set\("system", selectedSystemId\)/);
    assert.match(links, /url\.searchParams\.set\("system", systemId\)/);
});
