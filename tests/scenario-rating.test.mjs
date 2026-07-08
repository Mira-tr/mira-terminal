import test from "node:test";
import assert from "node:assert/strict";

import {
    normalizeScenarioRating
} from "../apps/admin/js/features/trpg/scenarios/scenarioRating.js";

import {
    normalizeRating,
    normalizeRatingFilter,
    ratingText
} from "../apps/web/trpg/js/scenarioRating.js";

const LEGACY_R18_VALUES = [
    "r18",
    "R18G",
    "R-18G",
    "r18g",
    "hard",
    "adult",
    "mature",
    "18禁",
    "R18相当"
];

test("Admin保存用ratingをall / r18へ正規化する", ()=>{
    LEGACY_R18_VALUES.forEach(value=>{
        assert.equal(normalizeScenarioRating(value), "r18", value);
    });

    ["", null, undefined, "unknown", "all", "全年齢"].forEach(value=>{
        assert.equal(normalizeScenarioRating(value), "all", String(value));
    });
});

test("Publicデータの旧ratingを互換変換する", ()=>{
    LEGACY_R18_VALUES.forEach(value=>{
        assert.equal(normalizeRating(value), "r18", value);
        assert.equal(ratingText(value), "R18", value);
    });

    assert.equal(normalizeRating("unknown"), "all");
    assert.equal(ratingText("unknown"), "全年齢");
});

test("検索条件は旧R18値を統合し、不正値を無視する", ()=>{
    assert.equal(normalizeRatingFilter("r18g"), "r18");
    assert.equal(normalizeRatingFilter("all"), "all");
    assert.equal(normalizeRatingFilter(""), "");
    assert.equal(normalizeRatingFilter("unknown"), "");
});
