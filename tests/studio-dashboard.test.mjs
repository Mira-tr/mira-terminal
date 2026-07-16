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
        "id=\"studioActivityList\""
    ].forEach(token => assert.match(html, new RegExp(escapeRegExp(token))));

    assert.match(html, /おかえりなさい、千景。/);
    assert.match(html, /今日やること/);
    assert.match(html, /公開準備の状態/);
});

test("Studio Dashboard preserves routes to existing Admin, Terminal, System, and TRPG screens", async () => {
    const app = await read("apps/studio/src/app/studioApp.js");

    [
        "../admin/",
        "../admin/terminal/",
        "../admin/terminal/#workspace-brand",
        "../admin/terminal/#workspace-creators",
        "../admin/terminal/#workspace-system",
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
});

test("Studio Dashboard keeps Beginner and Advanced information separated", async () => {
    const html = await read("apps/studio/index.html");
    const app = await read("apps/studio/src/app/studioApp.js");

    assert.match(html, /Beginner Mode/);
    assert.match(html, /data-studio-mode="beginner"/);
    assert.match(html, /data-studio-mode="advanced"/);
    assert.match(html, /id="studioAdvancedDetails"[^>]*hidden/);
    assert.match(html, /Manifest \/ Diagnostics \/ Repository/);
    assert.match(app, /studioMode\s*=\s*"beginner"/);
    assert.match(app, /advanced\.hidden\s*=\s*studioMode !== "advanced"/);
});

test("Studio Dashboard uses human wording for operations and one-next-action states", async () => {
    const app = await read("apps/studio/src/app/studioApp.js");

    [
        "公開サイトを更新",
        "公開用データを作成します",
        "作業前に戻せる状態を残します",
        "下書きまたは確認待ちが残っています",
        "公開用データの作成記録はまだありません",
        "公開できるかはPublish画面のPreflightで確認します",
        "公開用データを作ると、Publicへ反映する準備ができます"
    ].forEach(text => assert.match(app, new RegExp(escapeRegExp(text))));
    assert.doesNotMatch(app, /Public JSON needs confirmation/);
});

test("Studio Dashboard does not mix planned Creator entries into normal workspace actions", async () => {
    const app = await read("apps/studio/src/app/studioApp.js");
    const css = await read("apps/studio/src/ui/studio.css");

    assert.doesNotMatch(app, /workspace-creator-asagiri/);
    assert.doesNotMatch(app, /createWorkspaceItem\("朝霧"/);
    assert.match(app, /\.filter\(item => item\.status !== "planned"\)/);
    assert.match(app, /item\.status !== "active"/);
    assert.match(app, /document\.createElement\("span"\)/);
    assert.match(app, /is-planned/);
    assert.match(app, /current:\s*true/);
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
