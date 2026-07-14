import test from "node:test";
import assert from "node:assert/strict";

import {
    createTagFilterModel,
    DESKTOP_VISIBLE_TAG_LIMIT,
    MOBILE_VISIBLE_TAG_LIMIT,
    normalizeTagSearch,
    VISIBLE_TAG_LIMIT
} from "../apps/web/creators/chikage/trpg/js/tagFilterView.js";

test("タグが少ない場合は展開ボタンを表示しない", ()=>{
    const tags = createTags(8);
    const model = createTagFilterModel(tags);

    assert.equal(DESKTOP_VISIBLE_TAG_LIMIT, 16);
    assert.equal(MOBILE_VISIBLE_TAG_LIMIT, 8);
    assert.equal(VISIBLE_TAG_LIMIT, 16);
    assert.equal(model.showToggle, false);
    assert.deepEqual(model.visibleTags, tags);
});

test("PC幅ではタグが多い場合に上位16件へ制限し、展開時は全件を表示する", ()=>{
    const tags = createTags(24);
    const collapsed = createTagFilterModel(tags, {
        limit: DESKTOP_VISIBLE_TAG_LIMIT
    });
    const expanded = createTagFilterModel(tags, {
        expanded: true,
        limit: DESKTOP_VISIBLE_TAG_LIMIT
    });

    assert.equal(collapsed.showToggle, true);
    assert.deepEqual(
        collapsed.visibleTags,
        tags.slice(0, VISIBLE_TAG_LIMIT)
    );
    assert.equal(expanded.visibleTags.length, tags.length);
    assert.equal(expanded.expanded, true);
});

test("スマホ幅ではタグ初期表示を8件へ制限する", ()=>{
    const tags = createTags(9);
    const collapsed = createTagFilterModel(tags, {
        limit: MOBILE_VISIBLE_TAG_LIMIT
    });
    const expanded = createTagFilterModel(tags, {
        expanded: true,
        limit: MOBILE_VISIBLE_TAG_LIMIT
    });

    assert.equal(collapsed.showToggle, true);
    assert.equal(collapsed.limit, MOBILE_VISIBLE_TAG_LIMIT);
    assert.deepEqual(
        collapsed.visibleTags,
        tags.slice(0, MOBILE_VISIBLE_TAG_LIMIT)
    );
    assert.deepEqual(expanded.visibleTags, tags);
});

test("折りたたみ中でも初期表示外の選択タグを分離して保持する", ()=>{
    const tags = createTags(24);
    const selectedTag = tags[22];
    const model = createTagFilterModel(tags, {
        selectedTags: [selectedTag]
    });

    assert.deepEqual(model.selectedTags, [selectedTag]);
    assert.deepEqual(
        model.visibleTags,
        tags.slice(0, VISIBLE_TAG_LIMIT)
    );
    assert.equal(model.visibleTags.includes(selectedTag), false);
});

test("タグ検索はかな・全半角・大文字小文字を正規化する", ()=>{
    const tags = [
        "ホラー",
        "CoC",
        "ＲＰ重視",
        "現代日本"
    ];

    assert.deepEqual(
        createTagFilterModel(tags, {
            searchQuery: "ほらー"
        }).visibleTags,
        ["ホラー"]
    );
    assert.deepEqual(
        createTagFilterModel(tags, {
            searchQuery: "cOc"
        }).visibleTags,
        ["CoC"]
    );
    assert.deepEqual(
        createTagFilterModel(tags, {
            searchQuery: "rp"
        }).visibleTags,
        ["ＲＰ重視"]
    );
    assert.equal(normalizeTagSearch(" ホ ラ ー "), "ほらー");
});

test("検索中も選択タグを保持し、候補からは重複を除く", ()=>{
    const model = createTagFilterModel(
        ["ホラー", "ホラーコメディ", "推理"],
        {
            selectedTags: ["ホラー"],
            searchQuery: "ホラー"
        }
    );

    assert.deepEqual(model.selectedTags, ["ホラー"]);
    assert.deepEqual(model.visibleTags, ["ホラーコメディ"]);
    assert.equal(model.matchingTagCount, 2);
    assert.equal(model.showToggle, false);
});

function createTags(count){
    return Array.from(
        { length: count },
        (_, index)=>`タグ${String(index + 1).padStart(2, "0")}`
    );
}
