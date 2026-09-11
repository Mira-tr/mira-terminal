import test from "node:test";
import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";

import {
    createMatchReasons,
    createPickerSearch,
    filterPickerCandidates,
    getScenarioTags,
    normalizePickerCriteria,
    readPickerState,
    selectPickerCandidates
} from "../apps/web/creators/chikage/trpg/picker/js/scenarioPicker.js";

const SCENARIOS = [{
    id: "all-fit",
    title: "全年齢の候補",
    system: "CoC6",
    playersMin: 2,
    playersMax: 4,
    timeMin: 2,
    timeMax: 4,
    rating: "all",
    tags: ["ホラー", "秘匿"]
}, {
    id: "r18-fit",
    title: "R18の候補",
    system: "CoC6",
    playersMin: 2,
    playersMax: 2,
    timeMin: 3,
    timeMax: 4,
    rating: "r18",
    tags: ["ホラー"]
}, {
    id: "unknown-upper",
    title: "上限不明",
    system: "CoC6",
    playersMin: 2,
    playersMax: 2,
    timeMin: 2,
    timeMax: null,
    rating: "all",
    tags: ["探索"]
}, {
    id: "too-long",
    title: "長時間",
    system: "CoC6",
    playersMin: 2,
    playersMax: 4,
    timeMin: 5,
    timeMax: 8,
    rating: "all",
    tags: ["秘匿"]
}, {
    id: "other-system",
    title: "別システム",
    system: "CoC7",
    playersMin: 2,
    playersMax: 2,
    timeMin: 2,
    timeMax: 3,
    rating: "all",
    tags: ["探索"]
}];

test("候補メーカーは人数・時間・システムを厳密に適用する", ()=>{
    assert.deepEqual(
        filterPickerCandidates(SCENARIOS, {
            players: "2",
            hours: "4",
            system: "CoC6"
        }).map(scenario => scenario.id),
        ["all-fit"]
    );
});

test("気分タグは公開タグからだけ受け取り候補を絞る", ()=>{
    assert.deepEqual(getScenarioTags(SCENARIOS), ["ホラー", "探索", "秘匿"]);
    assert.deepEqual(
        filterPickerCandidates(SCENARIOS, {
            players: "2",
            tag: "探索"
        }).map(scenario => scenario.id),
        ["unknown-upper", "other-system"]
    );
    assert.equal(
        normalizePickerCriteria({ tag: "管理専用" }, ["CoC6"], getScenarioTags(SCENARIOS)).tag,
        ""
    );
});

test("時間指定時は上限不明を除外し、R18は明示時だけ含める", ()=>{
    assert.deepEqual(
        filterPickerCandidates(SCENARIOS, {
            players: "2",
            hours: "4",
            includeR18: true
        }).map(scenario => scenario.id),
        ["all-fit", "r18-fit", "other-system"]
    );

    assert.deepEqual(
        filterPickerCandidates(SCENARIOS, {
            players: "2"
        }).map(scenario => scenario.id),
        ["all-fit", "unknown-upper", "too-long", "other-system"]
    );
});

test("同じseedは同じ候補順を再現し、最大3件に制限する", ()=>{
    const source = Array.from({ length: 8 }, (_, index) => ({
        id: `scenario-${index + 1}`,
        system: "CoC6",
        playersMin: 1,
        playersMax: 4,
        timeMin: 1,
        timeMax: 4,
        rating: "all",
        tags: ["探索"]
    }));
    const first = selectPickerCandidates(source, {}, "shared-seed");
    const second = selectPickerCandidates([...source].reverse(), {}, "shared-seed");

    assert.equal(first.length, 3);
    assert.deepEqual(
        first.map(scenario => scenario.id),
        second.map(scenario => scenario.id)
    );
});

test("共有URLは条件・気分タグ・seedを正規化して往復する", ()=>{
    const allowedSystems = ["CoC6", "CoC7"];
    const allowedTags = getScenarioTags(SCENARIOS);
    const search = createPickerSearch({
        players: "2",
        hours: "4",
        system: "CoC6",
        tag: "ホラー",
        includeR18: true,
        seed: "same_result-1"
    }, allowedSystems, allowedTags);

    assert.equal(
        search,
        "?players=2&hours=4&system=CoC6&tag=%E3%83%9B%E3%83%A9%E3%83%BC&r18=include&seed=same_result-1"
    );
    assert.deepEqual(
        readPickerState(search, allowedSystems, allowedTags),
        {
            players: "2",
            hours: "4",
            system: "CoC6",
            tag: "ホラー",
            includeR18: true,
            seed: "same_result-1"
        }
    );
    assert.deepEqual(
        readPickerState(
            "?players=0&hours=99&system=Unknown&tag=Private&r18=no&seed=%3Cscript%3E",
            allowedSystems,
            allowedTags
        ),
        {
            players: "",
            hours: "",
            system: "",
            tag: "",
            includeR18: false,
            seed: "script"
        }
    );
});

test("選定理由は適用した条件と年齢区分だけを返す", ()=>{
    const scenario = SCENARIOS[0];

    assert.deepEqual(
        createMatchReasons(scenario, normalizePickerCriteria({
            players: "2",
            hours: "4",
            system: "CoC6",
            tag: "ホラー"
        }, ["CoC6"], getScenarioTags(SCENARIOS))),
        ["2人で遊べる", "4時間以内の目安", "「ホラー」に一致", "CoC6", "全年齢"]
    );
});

test("実際の公開書架から安全な候補を3件選べる", async ()=>{
    const payload = JSON.parse(
        await readFile(
            new URL(
                "../apps/web/data/creators/chikage/trpg/public-scenarios.json",
                import.meta.url
            ),
            "utf8"
        )
    );
    const criteria = {
        players: "2",
        hours: "4",
        system: "CoC6"
    };
    const selected = selectPickerCandidates(
        payload.scenarios,
        criteria,
        "real-public-data"
    );

    assert.equal(selected.length, 3);
    selected.forEach(scenario => {
        assert.equal(scenario.system, "CoC6");
        assert.equal(scenario.rating, "all");
        assert.ok(scenario.playersMin === null || scenario.playersMin <= 2);
        assert.ok(scenario.playersMax === null || scenario.playersMax >= 2);
        assert.ok(scenario.timeMax !== null && scenario.timeMax <= 4);
    });
});

test("候補メーカーCSSはLightとDarkのテーマ変数でフォームと年齢表示を描く", async ()=>{
    const css = await readFile(
        new URL(
            "../apps/web/creators/chikage/trpg/picker/css/picker.css",
            import.meta.url
        ),
        "utf8"
    );

    assert.match(css, /\.picker-form select\s*{[\s\S]*background:\s*var\(--color-input\);/);
    assert.match(css, /\.picker-checkbox\s*{[\s\S]*background:\s*var\(--color-input\);/);
    assert.match(css, /\.picker-rating\s*{[\s\S]*display:\s*inline-flex;/);
    assert.match(css, /\.picker-rating\s*{[\s\S]*min-height:\s*28px;/);
    assert.match(css, /\.picker-rating\s*{[\s\S]*color:\s*var\(--color-accent\);/);
    assert.match(css, /\.picker-rating\s*{[\s\S]*background:\s*var\(--color-accent-soft\);/);
    assert.match(css, /\.picker-rating\.is-r18\s*{[\s\S]*background:\s*var\(--color-danger-soft\);/);
});
