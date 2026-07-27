import test from "node:test";
import assert from "node:assert/strict";
import {
    access,
    readFile
} from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

test("Studio v4 is the active product entry and keeps the legacy app available", async () => {
    const html = await read("apps/studio/index.html");
    const legacyApp = await read("apps/studio/src/app/studioApp.js");

    assert.match(html, /studioV4App\.js/);
    assert.match(html, /studioV4\.css/);
    assert.match(html, /ブランドを組み立てる制作ソフト/);
    assert.match(html, /id="studioEditorPanel"/);
    assert.match(html, /id="studioScenarioEditorRoot"/);
    assert.match(legacyApp, /mountScenarioEditor/);
    assert.doesNotMatch(html, /Terminal|Production OS|Plugin|Generator|Manifest|Registry|Event Bus|Component Model|Command/);
});

test("Studio v4 product app provides Builder, assets, common preview, publish generation, and TRPG mount", async () => {
    const app = await read("apps/studio/src/app/studioV4App.js");
    const html = await read("apps/studio/index.html");
    const source = `${html}\n${app}`;

    [
        "BLOCK_LIBRARY_TYPES",
        "openHomeEditor",
        "openScenarioEditor",
        "mountScenarioEditor",
        "renderComponentModelPreview",
        "generateHomeArtifacts",
        "validateGeneratedHomeArtifacts",
        "createAssetRecord",
        "createUrlAssetRecord",
        "studio-v4-workbench",
        "displayMode",
        "Button",
        "Link",
        "Text",
        "Hidden",
        "dragstart",
        "drop",
        "FileReader",
        "公開用データを作る",
        "TRPGシナリオを追加する"
    ].forEach(token => assert.match(source, new RegExp(escapeRegExp(token))));

    assert.doesNotMatch(app, /innerHTML/);
    [
        "ADMIN_EDITOR_ROUTES",
        "../admin/home/",
        "../admin/game/",
        "../admin/tools/",
        "../admin/notes/",
        "../admin/creators/",
        "../admin/trpg/?source=studio&collection=trpg&owner=chikage&mode=beginner#scenarioFormTitle"
    ].forEach(token => assert.match(source, new RegExp(escapeRegExp(token))));

    assert.doesNotMatch(source, /\.\.\/admin\/terminal\//);
});

test("Studio v4 Admin editor routes resolve to existing editor pages", async () => {
    const routes = [
        "../admin/home/",
        "../admin/game/",
        "../admin/tools/",
        "../admin/notes/",
        "../admin/creators/",
        "../admin/profile/",
        "../admin/trpg/?source=studio&collection=trpg&owner=chikage&mode=beginner#scenarioFormTitle",
        "../admin/trpg/rules/",
        "../admin/system/publish/",
        "../admin/system/backup/"
    ];

    for(const route of routes){
        const target = new URL(route, new URL("apps/studio/index.html", ROOT));
        const fileTarget = target.pathname.endsWith("/")
            ? new URL("index.html", target)
            : target;
        await access(fileTarget);
    }
});

test("Studio v4 CSS supports dense Builder and real asset preview surfaces", async () => {
    const css = await read("apps/studio/src/ui/studioV4.css");
    const baseCss = await read("apps/studio/src/ui/studio.css");

    [
        ".studio-v4-workbench",
        "grid-template-columns: minmax(280px, .55fr) minmax(360px, .75fr) minmax(420px, .9fr)",
        ".studio-v4-block-library",
        ".studio-v4-tree-item",
        ".studio-v4-inspector-panel",
        ".studio-v4-assets-panel",
        ".studio-v4-preview-column",
        "position: sticky",
        ".studio-preview-asset img",
        ".studio-preview-bgm audio",
        "radial-gradient(circle at 16% 0%",
        "box-shadow: var(--studio-shadow-panel)"
    ].forEach(token => assert.match(css, new RegExp(escapeRegExp(token))));

    [
        "--studio-bg: #eef1eb",
        "--studio-panel: #ffffff",
        "--studio-card: #fbfcf8",
        "--studio-accent: #234f45",
        "--studio-shadow-panel"
    ].forEach(token => assert.match(baseCss, new RegExp(escapeRegExp(token))));
});

test("Shared component renderer renders actual image and audio assets when Studio provides src", async () => {
    const renderer = await read("apps/web/js/componentRenderer.js");

    [
        "documentRef.createElement(\"img\")",
        "media.src = asset.src",
        "documentRef.createElement(\"audio\")",
        "audio.controls = true",
        "clampAudioVolume"
    ].forEach(token => assert.match(renderer, new RegExp(escapeRegExp(token))));
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

function escapeRegExp(value){
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
