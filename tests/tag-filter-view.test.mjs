import test from "node:test";
import assert from "node:assert/strict";

import {
    createTagFilterModel,
    normalizeTagSearch,
    VISIBLE_TAG_LIMIT
} from "../apps/web/trpg/js/tagFilterView.js";

test("タグが少ない場合は展開ボタンを表示しない", ()=>{
    const tags = createTags(8);
    const model = createTagFilterModel(tags);

    assert.equal(VISIBLE_TAG_LIMIT, 16);
    assert.equal(model.showToggle, false);
    assert.deepEqual(model.visibleTags, tags);
});

test("タグが多い場合は上位16件に制限し、展開時は全件を表示する", ()=>{
    const tags = createTags(24);
    const collapsed = createTagFilterModel(tags);
    const expanded = createTagFilterModel(tags, {
        expanded: true
    });

    assert.equal(collapsed.showToggle, true);
    assert.deepEqual(
        collapsed.visibleTags,
        tags.slice(0, VISIBLE_TAG_LIMIT)
    );
    assert.equal(expanded.visibleTags.length, tags.length);
    assert.equal(expanded.expanded, true);
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
