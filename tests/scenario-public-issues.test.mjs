import test from "node:test";
import assert from "node:assert/strict";

import {
    getPublicIssues,
    getPublicWarnings
} from "../apps/admin/js/features/trpg/scenarios/scenarioUtils.js";

import {
    isSafeHttpUrl
} from "../apps/web/trpg/js/dom.js";

const VALID_PUBLIC_SCENARIO = {
    status: "public",
    url: "https://example.com/scenario",
    tags: ["推理重視"],
    summary: "短い概要"
};

test("公開品質条件を満たすシナリオには警告がない", ()=>{
    assert.deepEqual(
        getPublicIssues(VALID_PUBLIC_SCENARIO),
        []
    );
});

test("公開シナリオの不足項目を構造化して返す", ()=>{
    const issues = getPublicIssues({
        ...VALID_PUBLIC_SCENARIO,
        url: "",
        tags: [],
        summary: ""
    });

    assert.deepEqual(
        issues.map(issue=>issue.type),
        [
            "missing-url",
            "missing-tags",
            "missing-summary"
        ]
    );

    assert.deepEqual(
        getPublicWarnings({
            ...VALID_PUBLIC_SCENARIO,
            url: "",
            tags: [],
            summary: ""
        }),
        [
            "URLなし",
            "タグなし",
            "概要なし"
        ]
    );
});

test("httpとhttps以外のURLを不正として扱う", ()=>{
    const issues = getPublicIssues({
        ...VALID_PUBLIC_SCENARIO,
        url: "javascript:alert(1)"
    });

    assert.equal(issues.length, 1);
    assert.equal(issues[0].type, "invalid-url");
    assert.equal(issues[0].label, "URL不正");

    assert.equal(isSafeHttpUrl("https://example.com"), true);
    assert.equal(isSafeHttpUrl("http://example.com"), true);
    assert.equal(isSafeHttpUrl("javascript:alert(1)"), false);
    assert.equal(isSafeHttpUrl("/relative/path"), false);
    assert.equal(isSafeHttpUrl(""), false);
});

test("非公開シナリオには公開品質警告を出さない", ()=>{
    assert.deepEqual(
        getPublicIssues({
            status: "draft",
            url: "invalid",
            tags: [],
            summary: ""
        }),
        []
    );
});

