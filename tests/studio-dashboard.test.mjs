import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

test("Studio Dashboard 2.0 exposes a production home instead of only a link list", async () => {
    const html = await read("apps/studio/index.html");

    [
        "id=\"dashboard\"",
        "id=\"today\"",
        "id=\"workspaces\"",
        "id=\"health\"",
        "id=\"activity\"",
        "id=\"studioHeroStats\"",
        "id=\"studioTodayList\"",
        "id=\"studioRecentWork\"",
        "id=\"studioQuickActions\"",
        "id=\"studioWorkspaces\"",
        "id=\"studioHealthList\"",
        "id=\"studioActivityList\"",
        "id=\"studioEditorPanel\"",
        "id=\"studioScenarioEditorRoot\""
    ].forEach(token => assert.match(html, new RegExp(escapeRegExp(token))));

    assert.match(html, /おかえりなさい。/);
    assert.match(html, /今日やること/);
    assert.match(html, /公開準備の状態/);
});

test("Studio Dashboard preserves routes to existing Admin, System, and TRPG screens without Terminal", async () => {
    const app = await read("apps/studio/src/app/studioApp.js");

    [
        "../admin/",
        "../admin/home/",
        "../admin/game/",
        "../admin/tools/",
        "../admin/notes/",
        "../admin/creators/",
        "../admin/trpg/",
        "../admin/trpg/rules/",
        "../admin/system/backup/",
        "../admin/system/import/",
        "../admin/system/export/",
        "../admin/system/publish/",
        "../admin/system/validation/",
        "../admin/system/logs/",
        "../web/"
    ].forEach(path => assert.match(app, new RegExp(escapeRegExp(path)), path));

    assert.doesNotMatch(app, /\.\.\/admin\/terminal\//);
    assert.doesNotMatch(app, /id:\s*"terminal"/);
});

test("Studio Dashboard keeps Beginner and Advanced information separated", async () => {
    const html = await read("apps/studio/index.html");
    const app = await read("apps/studio/src/app/studioApp.js");

    assert.match(html, /かんたん表示/);
    assert.match(html, /data-studio-mode="beginner"/);
    assert.match(html, /data-studio-mode="advanced"/);
    assert.match(html, /id="studioAdvancedDetails"[^>]*hidden/);
    assert.match(html, /Build Manifest \/ 診断 \/ Repository/);
    assert.match(app, /studioMode\s*=\s*"beginner"/);
    assert.match(app, /advanced\.hidden\s*=\s*studioMode !== "advanced"/);
});

test("Studio Dashboard uses human wording for operations and one-next-action states", async () => {
    const app = await read("apps/studio/src/app/studioApp.js");
    const terms = await read("apps/shared/ui/language/ja.js");
    const source = `${app}\n${terms}`;

    [
        "公開サイトを組み立てる",
        "公開用データを作る",
        "作業前に戻せる状態を残します。",
        "下書きや確認待ちがあります。",
        "公開用データの作成記録はまだありません。",
        "公開できるか、公開前確認の画面で確認します。",
        "保存済みです。次は表示を確認し、公開用データを作ります。"
    ].forEach(text => assert.match(source, new RegExp(escapeRegExp(text))));
    assert.doesNotMatch(source, /Public JSON needs confirmation/);
});

test("Studio opens the TRPG scenario editor inside the Studio shell", async () => {
    const app = await read("apps/studio/src/app/studioApp.js");
    const html = await read("apps/studio/index.html");

    assert.match(app, /mountScenarioEditor/);
    assert.match(app, /openScenarioEditor/);
    assert.match(app, /closeWizard\(\);\s*openScenarioEditor\(\);/s);
    assert.doesNotMatch(app, /window\.location\.href\s*=\s*route/);
    assert.match(html, /RELMUA Studio[\s\S]*千景[\s\S]*コレクション[\s\S]*TRPG[\s\S]*シナリオ編集/);
    assert.doesNotMatch(html, /admin-header/);
});

test("Studio Dashboard shows Chikage, Asagiri, and Creator add entry without giving Asagiri TRPG", async () => {
    const app = await read("apps/studio/src/app/studioApp.js");
    const css = await read("apps/studio/src/ui/studio.css");

    assert.match(app, /getCreatorSites/);
    assert.match(app, /creatorSites\.flatMap/);
    assert.match(app, /\$\{site\.title\}のサイト/);
    assert.match(app, /新しい活動者を追加/);
    assert.match(app, /id:\s*"creator"[\s\S]*?enabled:\s*true/);
    assert.match(app, /if\(site\.creatorId === "creator-chikage"\)/);
    assert.doesNotMatch(app, /朝霧のTRPG/);
    assert.match(app, /item\.status !== "active"/);
    assert.match(app, /document\.createElement\("span"\)/);
    assert.match(app, /is-planned/);
    assert.match(css, /\.studio-workspace\.is-current/);
});

test("Studio Dashboard CSS keeps mobile order and focus-visible behavior", async () => {
    const css = await read("apps/studio/src/ui/studio.css");

    assert.match(css, /button:focus-visible/);
    assert.match(css, /a:focus-visible/);
    assert.match(css, /@media \(max-width: 760px\)/);
    assert.match(css, /\.studio-today\s*\{\s*order:\s*1/s);
    assert.match(css, /\.studio-quick\s*\{\s*order:\s*2/s);
    assert.match(css, /\.studio-recent\s*\{\s*order:\s*3/s);
    assert.match(css, /\.studio-activity\s*\{\s*order:\s*4/s);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

function escapeRegExp(value){
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
