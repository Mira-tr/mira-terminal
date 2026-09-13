import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);
const MOJIBAKE_PATTERN = /繧|縺|譛|菫|邱|髢|隧|遘|莠|谺|鬮|蝨|蜈|譁|豢|邂|讀|陦|繝|荳|撫|�/;

test("Scenario Editor View is the single form UI source", async () => {
    const view = await read("apps/admin/js/features/trpg/scenarios/scenarioEditorView.js");
    const mount = await read("apps/admin/js/features/trpg/scenarios/scenarioEditorMount.js");
    const app = await read("apps/admin/js/app.js");
    const adminHtml = await read("apps/admin/trpg/index.html");

    assert.match(view, /export function mountScenarioEditorView/);
    assert.match(view, /id: "title"/);
    assert.match(view, /id: "kana"/);
    assert.match(view, /id: "storageNote"/);
    assert.match(view, /id: "memo"/);
    assert.match(view, /保存して続けて追加/);
    assert.match(view, /公開用タグ/);
    assert.match(view, /保存場所/);
    assert.match(mount, /mountScenarioEditorView/);
    assert.match(app, /mountScenarioEditorView/);
    assert.match(adminHtml, /id="scenarioEditorMount"/);
    assert.doesNotMatch(adminHtml, /<form id="scenarioForm"/);
});

test("Scenario Editor Mount exposes the shared Admin editor contract", async () => {
    const source = await read("apps/admin/js/features/trpg/scenarios/scenarioEditorMount.js");

    assert.match(source, /export function mountScenarioEditor/);
    assert.match(source, /rootElement/);
    assert.match(source, /controller = createDefaultScenarioEditorController\(context\)/);
    assert.match(source, /onStateChange = \(\) => \{\}/);
    assert.match(source, /onNavigate = \(\) => \{\}/);
    assert.match(source, /unmount\(\)/);
});

test("Scenario Editor Mount saves previews and exports through its controller", async () => {
    const source = await read("apps/admin/js/features/trpg/scenarios/scenarioEditorMount.js");

    assert.match(source, /controller\.saveDraft/);
    assert.match(source, /controller\.previewDraft/);
    assert.match(source, /controller\.exportPublicData/);
    assert.match(source, /source: "scenario-editor"/);
    assert.doesNotMatch(source, /window\.location\.href/);
});

test("Browser Admin owns the ScenarioEditorController contract", async () => {
    const app = await read("apps/admin/js/app.js");
    const form = await read("apps/admin/js/features/trpg/scenarios/scenarioForm.js");
    const list = await read("apps/admin/js/features/trpg/scenarios/scenarioList.js");
    const tags = await read("apps/admin/js/features/trpg/tags.js");

    assert.match(app, /createDefaultScenarioEditorController/);
    assert.match(app, /focusScenarioEditor/);
    assert.match(app, /duplicateScenario/);
    assert.match(app, /runScenarioPublicExport/);
    assert.match(app, /scenarioEditorController\.validateDraft/);
    assert.match(app, /saveCurrentScenario/);
    assert.match(form, /controller\.saveDraft/);
    assert.match(form, /export function duplicateScenario/);
    assert.match(list, /onDuplicate/);
    assert.match(list, /onStatusChange/);
    assert.match(tags, /emitTagsChanged\(\)/);
});

test("TRPG Admin keeps the current Scenario management entry points", async () => {
    const html = await read("apps/admin/trpg/index.html");
    const css = await read("apps/admin/css/pages/trpg.css");
    const guide = await read("docs/admin/trpg-scenario-guide.md");

    assert.match(html, /id="newScenario"/);
    assert.match(html, /id="scenarioEditorMount"/);
    assert.match(html, /id="scenarioPreflight"/);
    assert.match(html, /id="scenarioLivePreview"/);
    assert.match(html, /id="scenarioPublishReadiness"/);
    assert.match(css, /\.scenario-editor-step/);
    assert.match(css, /\.scenario-publish-grid/);
    assert.match(css, /\.scenario-live-preview/);
    assert.match(guide, /TRPGシナリオ管理ガイド/);
    assert.match(guide, /JSONや内部ファイルを直接触る必要はありません/);
});

test("User-facing Admin TRPG editor files stay valid UTF-8 Japanese", async () => {
    const files = [
        "apps/admin/js/app.js",
        "apps/admin/js/features/trpg/scenarios/scenarioEditorView.js",
        "apps/admin/js/features/trpg/scenarios/scenarioEditorMount.js",
        "apps/admin/js/features/trpg/scenarios/scenarioForm.js",
        "apps/admin/js/features/trpg/scenarios/scenarioList.js",
        "apps/admin/js/features/trpg/tags.js",
        "apps/admin/trpg/index.html"
    ];

    for(const file of files){
        assert.doesNotMatch(await read(file), MOJIBAKE_PATTERN, `${file} has mojibake-like text`);
    }
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
