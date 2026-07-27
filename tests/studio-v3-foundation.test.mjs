import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

test("Studio exposes the Phase 4 product workspaces", async () => {
    const html = await read("apps/studio/index.html");
    const app = await read("apps/studio/src/app/studioApp.js");
    const foundation = await read("apps/studio/src/app/studioV3Foundation.js");

    [
        "id=\"dashboard\"",
        "id=\"content\"",
        "id=\"design\"",
        "id=\"preview\"",
        "id=\"publish\"",
        "id=\"settings\"",
        "id=\"studioContentWorkspace\"",
        "id=\"studioDesignWorkspace\""
    ].forEach(token => assert.match(html, new RegExp(escapeRegExp(token))));

    [
        "Home",
        "Projects",
        "TRPG",
        "Tools",
        "Notes",
        "Creators",
        "Collections"
    ].forEach(token => assert.match(foundation, new RegExp(escapeRegExp(token))));

    assert.match(app, /renderStudioV3Foundation/);
    assert.doesNotMatch(foundation, /\.\.\/admin\//);
});

test("Studio v3 has Editor Host mounts without duplicating Admin HTML", async () => {
    const app = await read("apps/studio/src/app/studioApp.js");
    const mounts = await read("apps/studio/src/app/studioEditorMounts.js");

    [
        "mountScenarioEditor",
        "mountHomeEditor",
        "mountProjectEditor",
        "mountNoteEditor",
        "mountToolEditor",
        "mountCreatorEditor"
    ].forEach(token => assert.match(`${app}\n${mounts}`, new RegExp(token)));

    assert.match(app, /openEditorHost/);
    assert.match(app, /mountedStudioEditor/);
    assert.match(mounts, /createVisualEditorMount/);
    assert.match(mounts, /createVisualTree/);
    assert.match(mounts, /createVisualPreview/);
    assert.match(mounts, /createVisualInspector/);
    assert.match(mounts, /renderEnginePreview/);
    assert.match(mounts, /createBindingPanel/);
    assert.match(mounts, /createAssetManagerPanel/);
    assert.match(mounts, /createHistoryPanel/);
    assert.doesNotMatch(mounts, /innerHTML/);
});

test("Studio v3 models Button, Link, Text, Hidden, and design components as GUI contracts", async () => {
    const mounts = await read("apps/studio/src/app/studioEditorMounts.js");
    const registry = await read("apps/studio/src/engine/componentRegistry.js");
    const theme = await read("apps/studio/src/engine/themeEngine.js");

    [
        "COMPONENT_DISPLAY_MODES",
        "Button",
        "Link",
        "Text",
        "Hidden",
        "Header",
        "Footer",
        "Card",
        "Gallery",
        "Divider",
        "Markdown",
        "Quote",
        "Timeline",
        "Accordion",
        "Video",
        "Map"
    ].forEach(token => assert.match(`${mounts}\n${registry}`, new RegExp(escapeRegExp(token))));

    [
        "THEME_GROUPS",
        "Color",
        "Typography",
        "Primary",
        "Secondary",
        "Radius",
        "Shadow",
        "Motion",
        "Spacing"
    ].forEach(token => assert.match(theme, new RegExp(escapeRegExp(token))));
});

test("Studio v3 CSS supports the Tree Preview Inspector layout", async () => {
    const css = await read("apps/studio/src/ui/studio.css");

    [
        ".studio-visual-editor",
        ".studio-visual-tree",
        ".studio-visual-preview",
        ".studio-visual-inspector",
        ".studio-preview-surface",
        ".studio-preview-button",
        ".studio-preview-link-token",
        ".studio-preview-text-token",
        ".studio-inspector-tabs",
        ".studio-asset-manager",
        ".studio-history-panel",
        ".studio-diagnostics-panel",
        ".studio-preview-size-controls"
    ].forEach(token => assert.match(css, new RegExp(escapeRegExp(token))));
});

test("Studio v3 uses registry, block, asset, theme, and history engines", async () => {
    const mounts = await read("apps/studio/src/app/studioEditorMounts.js");

    [
        "../engine/block/index.js",
        "../engine/componentRegistry.js",
        "../engine/asset/index.js",
        "../engine/history/index.js",
        "../engine/theme/index.js",
        "../engine/core/engine.js",
        "../engine/core/eventBus.js",
        "../engine/core/commandManager.js",
        "Page -> Block -> Component -> Property",
        "PREVIEW_SIZES",
        "createDiagnosticsPanel"
    ].forEach(token => assert.match(mounts, new RegExp(escapeRegExp(token))));

    assert.doesNotMatch(mounts, /switch\s*\(/);
});

test("Studio Phase 5 Visual Builder exposes creator-focused builder tools", async () => {
    const mounts = await read("apps/studio/src/app/studioEditorMounts.js");
    const registry = await read("apps/studio/src/engine/componentRegistry.js");
    const css = await read("apps/studio/src/ui/studio.css");

    [
        "BLOCK_LIBRARY_TYPES",
        "createNavigationEditorPanel",
        "createFooterEditorPanel",
        "createThemePresetPanel",
        "createPublishChecklistPanel",
        "createPageSettingsPanel",
        "createCreatorGuidePanel",
        "createBeginnerGuidePanel",
        "createQuickAddPanel",
        "createInspectorQuickPanel",
        "createHeroComposer",
        "createAssetRecord",
        "createUrlAssetRecord",
        "既存Homeを読み込む",
        "BGMを使う",
        "URLを追加",
        "Heroを編集",
        "画像を入れる",
        "BGMを設定",
        "Heroを作る",
        "はじめてなら、この順番でOK",
        "タイトルを書く",
        "見え方を見る",
        "追加する",
        "置きたいものを押すだけ",
        "loadExistingHome",
        "focusEditorField",
        "updateBeginnerProgress",
        "data-studio-field-id",
        "Hero画像やBGMをここへドラッグ",
        "背景と余白を調整",
        "選んだ場所へ設定",
        "素材",
        "公開前チェック",
        "シンプル",
        "和モダン",
        "ダーク",
        "ポップ"
    ].forEach(token => assert.match(mounts, new RegExp(escapeRegExp(token))));

    [
        "hero",
        "card-grid",
        "gallery",
        "image",
        "audio",
        "button",
        "quote",
        "divider",
        "timeline",
        "markdown",
        "video",
        "map",
        "accordion"
    ].forEach(token => assert.match(mounts, new RegExp(escapeRegExp(token))));

    assert.match(registry, /LINK_TARGET_TYPES/);
    assert.match(registry, /createField\("title", "タイトル"/);
    assert.match(registry, /createField\("displayMode", "表示形式"/);
    assert.match(registry, /createField\("imageAssetId", "画像"/);
    assert.match(registry, /createField\("audioAssetId", "音声"/);
    assert.match(mounts, /DISPLAY_MODE_LABELS/);
    assert.match(css, /\.studio-block-library/);
    assert.match(css, /\.studio-beginner-guide/);
    assert.match(css, /\.studio-beginner-step/);
    assert.match(css, /\.studio-quick-add-panel/);
    assert.match(css, /\.studio-quick-add-list/);
    assert.match(css, /\.studio-navigation-editor/);
    assert.match(css, /\.studio-footer-editor/);
    assert.match(css, /\.studio-theme-preset-panel/);
    assert.match(css, /\.studio-creator-guide/);
    assert.match(css, /\.studio-inspector-quick/);
    assert.match(css, /\.studio-hero-composer/);
    assert.match(css, /\.studio-hero-composer-drop/);
    assert.match(css, /\.studio-page-settings/);
    assert.match(css, /\.studio-preview-bgm/);
    assert.match(css, /position:\s*sticky/);
    assert.doesNotMatch(mounts, /switch\s*\(/);
});

test("Studio Phase 6 models assets, links, BGM, and existing Home import without direct JSON editing", async () => {
    const mounts = await read("apps/studio/src/app/studioEditorMounts.js");
    const assets = await read("apps/studio/src/engine/assetManager.js");
    const blocks = await read("apps/studio/src/engine/blockEngine.js");
    const generator = await read("apps/studio/src/engine/homeGenerator.js");
    const renderer = await read("apps/web/js/componentRenderer.js");

    [
        "\"image\"",
        "\"audio\"",
        "\"video\"",
        "\"svg\"",
        "\"pdf\"",
        "\"url\"",
        "createAssetRecord",
        "createUrlAssetRecord"
    ].forEach(token => assert.match(assets, new RegExp(escapeRegExp(token))));

    [
        "settings",
        "bgm",
        "publicHomeConfigToPageModel",
        "../web/data/public-home.json",
        "getAssetTargetField"
    ].forEach(token => assert.match(`${blocks}\n${mounts}`, new RegExp(escapeRegExp(token))));

    assert.match(generator, /applyEditableSection/);
    assert.match(renderer, /createBgmControl/);
    assert.match(renderer, /createAssetPreview/);
    assert.match(renderer, /is-selected/);
    assert.match(mounts, /selectedBlockId/);
    assert.match(mounts, /toHomePreviewSectionId/);
    assert.doesNotMatch(mounts, /localStorage\.setItem\([^)]*public-home/s);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

function escapeRegExp(value){
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
