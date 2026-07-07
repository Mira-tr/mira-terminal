import test from "node:test";
import assert from "node:assert/strict";

import {
    getDevelopmentStatusLabel
} from "../apps/web/game/js/game.js";

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
