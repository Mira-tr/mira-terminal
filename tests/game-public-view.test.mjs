import test from "node:test";
import assert from "node:assert/strict";

import {
    getDevelopmentStatusLabel,
    normalizeGameUrl
} from "../apps/web/projects/js/projects.js";

test("Gameの開発状態をPublic表示用ラベルへ変換する", ()=>{
    assert.equal(getDevelopmentStatusLabel("planning"), "制作構想中");
    assert.equal(getDevelopmentStatusLabel("development"), "制作中");
    assert.equal(getDevelopmentStatusLabel("released"), "公開中");
    assert.equal(getDevelopmentStatusLabel("archived"), "アーカイブ");
});

test("未定義の開発状態には安全な代替表示を返す", ()=>{
    assert.equal(getDevelopmentStatusLabel("unknown"), "ステータス未設定");
    assert.equal(getDevelopmentStatusLabel(""), "ステータス未設定");
});

test("GameのPublicリンクは有効なhttp/https URLだけを許可する", ()=>{
    assert.equal(
        normalizeGameUrl("https://example.com/game"),
        "https://example.com/game"
    );
    assert.equal(normalizeGameUrl("javascript:alert(1)"), "");
    assert.equal(normalizeGameUrl("https://"), "");
    assert.equal(normalizeGameUrl("https://exa mple.com"), "");
});
