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
    assert.match(view, /createEditorStep/);
    assert.match(view, /createEditorDetails/);
    assert.match(view, /1画面で追加/);
    assert.match(view, /細かい設定/);
    assert.match(view, /scenario-publish-grid/);
    assert.match(mount, /mountScenarioEditorView/);
    assert.match(app, /mountScenarioEditorView/);
    assert.match(adminHtml, /id="scenarioEditorMount"/);
    assert.doesNotMatch(adminHtml, /<form id="scenarioForm"/);
    assert.doesNotMatch(mount, /createTextField|createInput|createTextarea|createSelect/);
});

test("Scenario Editor Mount exposes the shared Studio mount contract", async () => {
    const source = await read("apps/admin/js/features/trpg/scenarios/scenarioEditorMount.js");

    assert.match(source, /export function mountScenarioEditor/);
    assert.match(source, /rootElement/);
    assert.match(source, /context = \{\}/);
    assert.match(source, /controller = createDefaultScenarioEditorController\(context\)/);
    assert.match(source, /mode = DEFAULT_MODE/);
    assert.match(source, /onStateChange = \(\) => \{\}/);
    assert.match(source, /onNavigate = \(\) => \{\}/);
    assert.match(source, /unmount\(\)/);
});

test("Scenario Editor Mount saves, previews, exports, and reports shell state through controller", async () => {
    const source = await read("apps/admin/js/features/trpg/scenarios/scenarioEditorMount.js");

    assert.match(source, /controller\.saveDraft/);
    assert.match(source, /controller\.previewDraft/);
    assert.match(source, /controller\.exportPublicData/);
    assert.match(source, /onStateChange\(\{/);
    assert.match(source, /source: "scenario-editor"/);
    assert.match(source, /type: "preview"/);
    assert.doesNotMatch(source, /window\.location\.href/);
});

test("Browser Admin and Studio both depend on ScenarioEditorController contract", async () => {
    const app = await read("apps/admin/js/app.js");
    const form = await read("apps/admin/js/features/trpg/scenarios/scenarioForm.js");
    const tags = await read("apps/admin/js/features/trpg/tags.js");
    const studio = await read("apps/studio/src/app/studioApp.js");

    assert.match(app, /createDefaultScenarioEditorController/);
    assert.match(app, /initScenarioJumpActions/);
    assert.match(app, /focusScenarioEditor/);
    assert.match(app, /showScenarioNextActions/);
    assert.match(app, /hideScenarioNextActions/);
    assert.match(app, /runScenarioPublicExport/);
    assert.match(app, /updatePublishReadiness/);
    assert.match(app, /getPublishReadiness/);
    assert.match(app, /updateScenarioLivePreview/);
    assert.match(app, /collectScenarioEditorData/);
    assert.match(app, /scenarioEditorController\.validateDraft/);
    assert.match(app, /updateScenarioPreflight/);
    assert.match(app, /getPublicIssues/);
    assert.match(app, /focusScenarioField/);
    assert.match(app, /window\.addEventListener\("mira:tags-changed", updateScenarioLivePreview\)/);
    assert.match(tags, /emitTagsChanged\(\)/);
    assert.match(form, /controller\.saveDraft/);
    assert.match(studio, /mountScenarioEditor/);
    assert.match(studio, /createCollectionEditorRoute/);
});

test("TRPG Admin gives beginners clear add, search, and export entry points", async () => {
    const html = await read("apps/admin/trpg/index.html");
    const css = await read("apps/admin/css/pages/trpg.css");

    assert.match(html, /id="newScenario"/);
    assert.match(html, /id="newScenarioBtn"/);
    assert.match(html, /id="scenarioPreflight"/);
    assert.match(html, /id="scenarioCheckTitle"/);
    assert.match(html, /data-scenario-focus="title"/);
    assert.match(html, /id="scenarioLivePreview"/);
    assert.match(html, /id="scenarioLivePreviewName"/);
    assert.match(html, /id="scenarioLivePreviewCheck"/);
    assert.match(html, /id="scenarioNextActions"/);
    assert.match(html, /id="continueScenarioBtn"/);
    assert.match(html, /id="scenarioNextExportBtn"/);
    assert.match(html, /id="scenarioPublishReadiness"/);
    assert.match(html, /id="scenarioPublishCount"/);
    assert.match(html, /id="scenarioPublishWarningCount"/);
    assert.match(html, /href="#scenarioListTitle"/);
    assert.match(html, /id="publicExportTitle"/);
    assert.match(css, /\.scenario-start-panel/);
    assert.match(css, /\.scenario-start-actions/);
    assert.match(css, /\.scenario-editor-step/);
    assert.match(css, /\.scenario-editor-details/);
    assert.match(css, /\.scenario-publish-grid/);
    assert.match(css, /\.scenario-preflight/);
    assert.match(css, /\.scenario-preflight-item\[data-state="warn"\]/);
    assert.match(css, /\.needs-attention/);
    assert.match(css, /\.scenario-live-preview/);
    assert.match(css, /\.scenario-live-preview-meta/);
    assert.match(css, /\.scenario-next-actions/);
    assert.match(css, /\.scenario-publish-readiness/);
    assert.match(css, /\.scenario-publish-metrics/);
    assert.match(css, /\.scenario-publish-checklist/);
    assert.match(css, /\.scenario-editor-form \.button-area\{/);
    assert.match(css, /position:sticky/);
    assert.match(css, /min-height:82px/);
});

test("User-facing Studio and TRPG editor files stay valid UTF-8 Japanese", async () => {
    const files = [
        "apps/admin/js/app.js",
        "apps/admin/js/features/collections/collectionRegistry.js",
        "apps/admin/js/features/trpg/scenarios/scenarioEditorView.js",
        "apps/admin/js/features/trpg/scenarios/scenarioEditorMount.js",
        "apps/admin/js/features/trpg/scenarios/scenarioForm.js",
        "apps/admin/js/features/trpg/scenarios/scenarioList.js",
        "apps/admin/js/features/trpg/scenarios/scenarioModal.js",
        "apps/admin/js/features/trpg/scenarios/scenarioStorage.js",
        "apps/admin/js/features/trpg/scenarios/scenarioUtils.js",
        "apps/admin/js/features/trpg/tags.js",
        "apps/admin/trpg/index.html",
        "apps/shared/ui/language/ja.js"
    ];

    for(const file of files){
        const source = await read(file);
        assert.doesNotMatch(source, MOJIBAKE_PATTERN, `${file} has mojibake-like text`);
    }
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
