import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

test("Studio v4 exposes the product workspaces with beginner wording", async () => {
    const html = await read("apps/studio/index.html");

    [
        "🏠 ダッシュボード",
        "📁 コンテンツ",
        "🎨 デザイン",
        "🖥 プレビュー",
        "🚀 公開",
        "⚙ 設定",
        "id=\"dashboard\"",
        "id=\"content\"",
        "id=\"design\"",
        "id=\"preview\"",
        "id=\"publish\"",
        "id=\"settings\"",
        "ブランドを組み立てる制作ソフト"
    ].forEach(token => assert.match(html, new RegExp(escapeRegExp(token))));

    assert.doesNotMatch(html, />[^<]*(Terminal|Production OS|Workspace|Plugin|Generator|Manifest|Registry|Event Bus|Component Model|Renderer|Command)[^<]*</);
    assert.doesNotMatch(html, /id="workspaces"|id="health"|id="activity"|id="copyMap"/);
});

test("Studio v4 dashboard shows next action, recent work, and recommendations", async () => {
    const html = await read("apps/studio/index.html");
    const app = await read("apps/studio/src/app/studioV4App.js");
    const source = `${html}\n${app}`;

    [
        "今日やること",
        "次に触る場所がすぐ分かる",
        "最近の作業",
        "おすすめ",
        "Homeを編集する",
        "新しい作品を作る",
        "公開サイトを見る",
        "data-studio-open-editor=\"home\"",
        "renderDashboard",
        "createNextCard",
        "createSmallAction"
    ].forEach(token => assert.match(source, new RegExp(escapeRegExp(token))));
});

test("Studio v4 content and collections use one flow while TRPG remains mounted in Studio", async () => {
    const html = await read("apps/studio/index.html");
    const app = await read("apps/studio/src/app/studioV4App.js");
    const source = `${html}\n${app}`;

    [
        "Home",
        "Projects",
        "Tools",
        "Notes",
        "Creators",
        "Collections",
        "TRPG",
        "Game",
        "Gallery",
        "Music",
        "Video",
        "Custom",
        "openScenarioEditor",
        "mountScenarioEditor",
        "id=\"studioEditorPanel\"",
        "id=\"studioScenarioEditorRoot\""
    ].forEach(token => assert.match(source, new RegExp(escapeRegExp(token))));

    assert.doesNotMatch(html, /admin-header/);
});

test("Studio v4 Design, Publish, and Settings stay beginner-facing", async () => {
    const html = await read("apps/studio/index.html");
    const app = await read("apps/studio/src/app/studioV4App.js");
    const source = `${html}\n${app}`;

    [
        "テーマを選んでから",
        "色",
        "フォント",
        "角丸",
        "影",
        "余白",
        "公開前チェック",
        "公開用データを作ります",
        "公開用データを作る",
        "バックアップ",
        "データ管理",
        "Studio設定",
        "追加できる機能",
        "シンプル",
        "和モダン",
        "ダーク",
        "ポップ"
    ].forEach(token => assert.match(source, new RegExp(escapeRegExp(token))));
});

test("Studio v4 links each content area to the existing Admin editor pages", async () => {
    const html = await read("apps/studio/index.html");
    const app = await read("apps/studio/src/app/studioV4App.js");
    const source = `${html}\n${app}`;

    [
        "ADMIN_EDITOR_ROUTES",
        "../admin/home/",
        "../admin/game/",
        "../admin/tools/",
        "../admin/notes/",
        "../admin/creators/",
        "../admin/profile/",
        "../admin/trpg/?source=studio&collection=trpg&owner=chikage&mode=beginner#scenarioFormTitle",
        "../admin/trpg/rules/",
        "../admin/system/publish/",
        "openAdminEditor",
        "adminで編集",
        "adminで追加"
    ].forEach(token => assert.match(source, new RegExp(escapeRegExp(token))));

    assert.doesNotMatch(source, /\.\.\/admin\/terminal\//);
});

test("Studio v4 keeps the dense Admin workspace baseline", async () => {
    const css = await read("apps/studio/src/ui/studioV4.css");
    const html = await read("apps/studio/index.html");

    [
        ".studio-v4-header",
        "border-bottom",
        "grid-template-columns: minmax(0, 1fr) minmax(360px, .44fr)",
        "grid-template-columns: minmax(280px, .55fr) minmax(360px, .75fr) minmax(420px, .9fr)",
        ".studio-v4-preview-column",
        "max-height: calc(100vh - 28px)",
        "border-radius: 8px"
    ].forEach(token => assert.match(css, new RegExp(escapeRegExp(token))));

    assert.match(html, /<header class="studio-v4-header"/);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

function escapeRegExp(value){
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
