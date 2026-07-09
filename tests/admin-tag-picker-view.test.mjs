import test from "node:test";
import assert from "node:assert/strict";

import {
    ADMIN_TAG_CANDIDATE_LIMIT,
    createAdminTagPickerModel,
    normalizeTagSearch
} from "../apps/admin/js/features/trpg/tagPickerView.js";

test("Adminタグ候補は初期表示を12件に制限する", ()=>{
    const tags = createTags(18);
    const model = createAdminTagPickerModel(tags);

    assert.equal(ADMIN_TAG_CANDIDATE_LIMIT, 12);
    assert.equal(model.showToggle, true);
    assert.equal(model.limit, ADMIN_TAG_CANDIDATE_LIMIT);
    assert.deepEqual(
        model.visibleCandidateTags,
        tags.slice(0, ADMIN_TAG_CANDIDATE_LIMIT)
    );
});

test("Adminタグ候補は展開時に全候補を表示する", ()=>{
    const tags = createTags(18);
    const model = createAdminTagPickerModel(tags, {
        expanded: true
    });

    assert.equal(model.expanded, true);
    assert.deepEqual(model.visibleCandidateTags, tags);
});

test("Adminタグ候補は選択済みタグを候補から除外して選択済みに保持する", ()=>{
    const tags = createTags(18);
    const model = createAdminTagPickerModel(tags, {
        selectedTags: [tags[15]]
    });

    assert.deepEqual(model.selectedTags, [tags[15]]);
    assert.equal(model.visibleCandidateTags.includes(tags[15]), false);
});

test("Adminタグ候補検索はかな・全半角・大文字小文字を正規化する", ()=>{
    const tags = [
        "ホラー",
        "CoC",
        "ＲＰ重視",
        "現代日本"
    ];

    assert.deepEqual(
        createAdminTagPickerModel(tags, {
            searchQuery: "ほらー"
        }).visibleCandidateTags,
        ["ホラー"]
    );
    assert.deepEqual(
        createAdminTagPickerModel(tags, {
            searchQuery: "cOc"
        }).visibleCandidateTags,
        ["CoC"]
    );
    assert.deepEqual(
        createAdminTagPickerModel(tags, {
            searchQuery: "rp"
        }).visibleCandidateTags,
        ["ＲＰ重視"]
    );
    assert.equal(normalizeTagSearch(" ホ ラー "), "ほらー");
});

function createTags(count){
    return Array.from(
        { length: count },
        (_, index)=>`タグ${String(index + 1).padStart(2, "0")}`
    );
}
