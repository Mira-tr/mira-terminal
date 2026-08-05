import {
    TAG_KEY,
    load
} from "./store.js";

import {
    createOption,
    getElement
} from "./utils.js";

import {
    addMasterTag,
    getMasterTags,
    initTags,
    setMasterTags
} from "./features/trpg/tags.js";

import {
    exportData,
    importData
} from "./features/common/backup.js";

import {
    getAuthors,
    initAuthorSuggest,
    saveAuthor,
    setAuthors
} from "./features/trpg/authors.js";

import {
    getScenarios,
    setScenarios
} from "./features/trpg/scenarios/scenarioStore.js";

import {
    editScenario,
    saveAndCopyScenario,
    saveScenario
} from "./features/trpg/scenarios/scenarioForm.js";

import {
    initScenarioModal
} from "./features/trpg/scenarios/scenarioModal.js";

import {
    initScenarioList,
    renderScenarioList
} from "./features/trpg/scenarios/scenarioList.js";

import {
    createCollectionContext
} from "./features/collections/collectionContext.js";

import {
    createDefaultScenarioEditorController
} from "./features/trpg/scenarios/scenarioDraftAdapter.js";

import {
    collectScenarioEditorData,
    mountScenarioEditorView
} from "./features/trpg/scenarios/scenarioEditorView.js";

import {
    getPublicIssues,
    ratingText,
    statusText
} from "./features/trpg/scenarios/scenarioUtils.js";

import {
    initScenarioStorage
} from "./features/trpg/scenarios/scenarioStorage.js";

import {
    updateDashboard
} from "./features/common/dashboard.js";

import {
    initToastService,
    runToastOperation
} from "./features/common/toastService.js";

import {
    APP_NAME
} from "./appIdentity.js";

const MODULE_NAME = "trpg";
const SCHEMA_VERSION = 1;
const PUBLIC_EXPORT_FILENAME = "public-scenarios.json";
const collectionContext = createCollectionContext();
const scenarioEditorController = createDefaultScenarioEditorController(collectionContext);

const DEFAULT_TAGS = [
    "秘匿HO",
    "RP重視",
    "推理重視",
    "戦闘あり",
    "現代日本",
    "クローズド",
    "シティ",
    "高ロスト",
    "初心者向け",
    "新規継続不問",
    "新規探索者限定",
    "継続探索者限定",
    "グロ注意",
    "暴力描写",
    "欠損",
    "倫理観",
    "性的描写",
    "人を選ぶ"
];

const scenarioEditorView = mountScenarioEditorView({
    rootElement: document.getElementById("scenarioEditorMount"),
    surface: "browser-admin",
    mode: collectionContext.mode || "standard"
});

const searchInput = getElement("search");
const sortSelect = getElement("sort");
const statusFilter = getElement("statusFilter");
const systemFilter = getElement("systemFilter");
const publicWarningOnly = getElement("publicWarningOnly");

initToastService();
initSelectNumbers();
initTags(
    load(
        TAG_KEY,
        DEFAULT_TAGS
    )
);
initAuthorSuggest(
    "author",
    "authorSuggest"
);
initScenarioStorage(
    "storageLocationOptions"
);

const modal = initScenarioModal(render);

initScenarioList({
    onDetail: modal.open,
    onEdit: id=>{
        editScenario(id);
        hideScenarioNextActions();
        updateScenarioLivePreview();
    }
});

bindEvents();
initScenarioJumpActions();
render();
updateScenarioLivePreview();

function bindEvents(){
    getElement("saveBtn")
    .addEventListener("click", ()=>{
        saveScenario({
            onSaved: handleScenarioSaved,
            saveAuthor,
            controller: scenarioEditorController
        });
    });

    getElement("copyBtn")
    .addEventListener("click", ()=>{
        saveAndCopyScenario({
            onSaved: handleScenarioSaved,
            saveAuthor,
            controller: scenarioEditorController
        });
    });

    getElement("addTagBtn")
    .addEventListener("click", addMasterTag);

    searchInput.addEventListener("input", render);
    sortSelect.addEventListener("change", render);
    statusFilter.addEventListener("change", render);
    systemFilter.addEventListener("change", render);
    publicWarningOnly.addEventListener("change", render);
    scenarioEditorView.form.addEventListener("input", updateScenarioLivePreview);
    scenarioEditorView.form.addEventListener("change", updateScenarioLivePreview);
    window.addEventListener("mira:tags-changed", updateScenarioLivePreview);

    document.querySelectorAll("[data-scenario-focus]").forEach(button=>{
        button.addEventListener("click", ()=>{
            focusScenarioField(button.dataset.scenarioFocus);
        });
    });

    getElement("exportBtn")
    .addEventListener("click", ()=>{
        runToastOperation(
            () => exportData(
                {
                    scenarios: getScenarios(),
                    tags: getMasterTags(),
                    authors: getAuthors()
                },
                {
                    appName: APP_NAME,
                    moduleName: MODULE_NAME,
                    schemaVersion: SCHEMA_VERSION,
                    filename: createBackupFilename()
                }
            ),
            { errorMessage: "Backupの出力に失敗しました" }
        );
    });

    getElement("importBtn")
    .addEventListener("click", ()=>{
        getElement("importFile").click();
    });

    getElement("importFile")
    .addEventListener("change", event=>{
        importData(
            event,
            backup=>{
                const scenariosSaved = setScenarios(backup.scenarios);

                const tagsSaved = setMasterTags(backup.tags, {
                    resetSelected: true
                });

                const authorsSaved = setAuthors(backup.authors);

                render();
                return scenariosSaved && tagsSaved && authorsSaved;
            },
            {
                expectedModule: MODULE_NAME,
                maxSchemaVersion: SCHEMA_VERSION,
                currentCounts: getCurrentCounts()
            }
        );
    });

    getElement("publicExportBtn")
    .addEventListener("click", runScenarioPublicExport);

    const nextExportButton = document.getElementById("scenarioNextExportBtn");

    if(nextExportButton){
        nextExportButton.addEventListener("click", runScenarioPublicExport);
    }
}

function initScenarioJumpActions(){
    const newButton = document.getElementById("newScenarioBtn");
    const continueButton = document.getElementById("continueScenarioBtn");

    if(newButton){
        newButton.addEventListener("click", ()=>{
            clearForm();
            hideScenarioNextActions();
            updateScenarioLivePreview();
            focusScenarioEditor();
        });
    }

    if(continueButton){
        continueButton.addEventListener("click", ()=>{
            clearForm();
            hideScenarioNextActions();
            updateScenarioLivePreview();
            focusScenarioEditor();
        });
    }

    if(window.location.hash){
        requestAnimationFrame(handleInitialHash);
    }
}

function handleInitialHash(){
    if(window.location.hash === "#newScenario" ||
        window.location.hash === "#scenarioFormTitle"){
        focusScenarioEditor();
    }
}

function focusScenarioEditor(){
    document.getElementById("scenarioFormTitle")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    getElement("title").focus({
        preventScroll: true
    });
}

function render(){
    updateDashboard(
        getScenarios()
    );

    renderScenarioList();
    updatePublishReadiness(
        getScenarios()
    );
}

function handleScenarioSaved(result){
    render();
    showScenarioNextActions(result?.draft);
    updateScenarioLivePreview();
}

function runScenarioPublicExport(){
    const result = runToastOperation(
        () => scenarioEditorController.exportPublicData({
            appName: APP_NAME,
            moduleName: MODULE_NAME,
            schemaVersion: SCHEMA_VERSION,
            filename: PUBLIC_EXPORT_FILENAME
        }),
        { errorMessage: "公開用データの作成に失敗しました" }
    );

    updatePublishReadiness(
        getScenarios()
    );

    return result;
}

function updatePublishReadiness(scenarios = []){
    const readiness = getPublishReadiness(scenarios);
    const panel = document.getElementById("scenarioPublishReadiness");

    if(panel){
        panel.dataset.state = readiness.state;
    }

    setLivePreviewText("scenarioPublishCount", String(readiness.publicCount));
    setLivePreviewText("scenarioPublishWarningCount", String(readiness.warningCount));
    setLivePreviewText("scenarioPublishDraftCount", String(readiness.draftCount));
    setLivePreviewText("scenarioPublishMessage", readiness.message);

    setPublishChecklistItem(
        "scenarioPublishChecklistPublic",
        readiness.publicCount > 0 ? "ok" : "warn",
        readiness.publicCount > 0
            ? `${readiness.publicCount}件を公開用データに含めます。`
            : "公開状態のシナリオがまだありません。"
    );
    setPublishChecklistItem(
        "scenarioPublishChecklistWarnings",
        readiness.warningCount === 0 ? "ok" : "warn",
        readiness.warningCount === 0
            ? "URL・タグ・短い紹介は確認済みです。"
            : `${readiness.warningCount}件の確認があります。一覧の「公開前に確認が必要なもの」で絞り込めます。`
    );
    setPublishChecklistItem(
        "scenarioPublishChecklistDestination",
        "ok",
        `${PUBLIC_EXPORT_FILENAME}として作成します。`
    );
    setPublishChecklistItem(
        "scenarioPublishChecklistCompatibility",
        "ok",
        "既存のPublic URL、検索、お気に入り、Export互換は変更しません。"
    );

    const exportButton = document.getElementById("publicExportBtn");
    const nextExportButton = document.getElementById("scenarioNextExportBtn");
    [
        exportButton,
        nextExportButton
    ].forEach(button=>{
        if(button){
            button.dataset.state = readiness.state;
            button.title = readiness.message;
        }
    });
}

function getPublishReadiness(scenarios = []){
    const publicScenarios = scenarios.filter(scenario=>scenario.status === "public");
    const warningCount = publicScenarios
    .flatMap(scenario=>getPublicIssues(scenario))
    .length;
    const draftCount = scenarios.filter(
        scenario=>scenario.status === "draft" || scenario.status === "ready"
    ).length;

    if(publicScenarios.length === 0){
        return {
            state: "empty",
            publicCount: 0,
            warningCount,
            draftCount,
            message: "公開状態のシナリオを1件以上作ると、公開用データを作れます。"
        };
    }

    if(warningCount > 0){
        return {
            state: "warn",
            publicCount: publicScenarios.length,
            warningCount,
            draftCount,
            message: "公開用データは作れますが、先に確認した方が安全です。"
        };
    }

    return {
        state: "ready",
        publicCount: publicScenarios.length,
        warningCount,
        draftCount,
        message: "公開用データを作れる状態です。"
    };
}

function setPublishChecklistItem(id, state, text){
    const item = document.getElementById(id);

    if(!item){
        return;
    }

    item.dataset.state = state;
    item.textContent = text;
}

function updateScenarioLivePreview(){
    const previewRoot = document.getElementById("scenarioLivePreview");

    if(!previewRoot){
        return;
    }

    const draft = collectScenarioEditorData({
        ownerCreatorId: collectionContext.ownerCreatorId
    });
    const validation = scenarioEditorController.validateDraft(draft);
    const publicIssues = getPublicIssues(draft);

    setLivePreviewText("scenarioLivePreviewName", draft.title || "タイトル未入力");
    setLivePreviewText(
        "scenarioLivePreviewSummary",
        draft.summary || "短い紹介を入れると、一覧で見つけやすくなります。"
    );
    setLivePreviewText("scenarioLivePreviewPlayers", draft.playersRaw || formatPlayerRange(draft));
    setLivePreviewText("scenarioLivePreviewTime", draft.timeRaw || formatTimeRange(draft));
    setLivePreviewText(
        "scenarioLivePreviewStatus",
        `${statusText(draft.status)} / ${ratingText(draft.rating)}`
    );
    setLivePreviewText(
        "scenarioLivePreviewCheck",
        validation.ok
            ? "保存できます。必要ならこのまま公開用データへ進めます。"
            : validation.errors?.[0]?.message || "入力内容を確認してください。"
    );

    previewRoot.classList.toggle("is-ready", validation.ok);
    updateScenarioPreflight(draft, validation, publicIssues);
}

function updateScenarioPreflight(draft, validation, publicIssues){
    const missingTitle = !String(draft.title || "").trim();
    const firstRuleError = validation.errors
    ?.find(error => error.code !== "missing-title" && error.code !== "invalid-creator");
    const firstPublicIssue = publicIssues[0];
    const isPublic = draft.status === "public";

    clearScenarioAttention();

    setPreflightItem("scenarioCheckTitle", {
        ok: !missingTitle,
        info: false,
        mark: missingTitle ? "!" : "✓",
        title: "シナリオ名",
        message: missingTitle
            ? "タイトルを入れると保存できます。"
            : "タイトルが入っています。",
        focusId: "title"
    });

    setPreflightItem("scenarioCheckRule", {
        ok: !firstRuleError,
        info: false,
        mark: firstRuleError ? "!" : "✓",
        title: "入力形式",
        message: firstRuleError
            ? firstRuleError.fix || firstRuleError.title
            : "URL、人数、時間の形は大丈夫です。",
        focusId: getFieldIdForValidation(firstRuleError)
    });

    setPreflightItem("scenarioCheckPublic", {
        ok: !isPublic || publicIssues.length === 0,
        info: !isPublic,
        mark: !isPublic ? "i" : firstPublicIssue ? "!" : "✓",
        title: "公開準備",
        message: !isPublic
            ? "公開にする時だけ、URL・タグ・短い紹介を確認します。"
            : firstPublicIssue?.message || "公開用の準備ができています。",
        focusId: getFieldIdForPublicIssue(firstPublicIssue)
    });

    setPreflightItem("scenarioCheckSave", {
        ok: validation.ok,
        info: false,
        mark: validation.ok ? "✓" : "!",
        title: "保存",
        message: validation.ok
            ? "このまま保存できます。"
            : validation.errors?.[0]?.fix || "入力内容を確認してください。",
        focusId: validation.ok ? "saveBtn" : getFieldIdForValidation(validation.errors?.[0])
    });

    markScenarioField("title", missingTitle);
    markScenarioField(getFieldIdForValidation(firstRuleError), Boolean(firstRuleError));
    markScenarioField(
        getFieldIdForPublicIssue(firstPublicIssue),
        isPublic && Boolean(firstPublicIssue)
    );
}

function setPreflightItem(id, {
    ok,
    info,
    mark,
    title,
    message,
    focusId
}){
    const item = document.getElementById(id);

    if(!item){
        return;
    }

    const markElement = item.querySelector(".scenario-preflight-mark");
    const titleElement = item.querySelector("strong");
    const messageElement = item.querySelector("small");

    if(markElement){
        markElement.textContent = mark;
    }

    if(titleElement){
        titleElement.textContent = title;
    }

    if(messageElement){
        messageElement.textContent = message;
    }

    item.dataset.state = info ? "info" : ok ? "ok" : "warn";
    item.dataset.scenarioFocus = focusId || "";
}

function getFieldIdForValidation(error){
    return {
        "missing-title": "title",
        "invalid-url": "url",
        "invalid-player-range": "playersMin",
        "invalid-time-range": "timeMin",
        "summary-too-long": "summary",
        "notes-too-long": "notes",
        "storageNote-too-long": "storageNote"
    }[error?.code] || "title";
}

function getFieldIdForPublicIssue(issue){
    return {
        "missing-url": "url",
        "invalid-url": "url",
        "missing-tags": "newTagInput",
        "missing-summary": "summary"
    }[issue?.type] || "summary";
}

function markScenarioField(id, active){
    const element = document.getElementById(id);
    const wrapper = element?.closest(".form-field, .tag-editor");

    if(wrapper){
        wrapper.classList.toggle("needs-attention", active);
    }
}

function clearScenarioAttention(){
    [
        "title",
        "url",
        "playersMin",
        "timeMin",
        "summary",
        "notes",
        "storageNote",
        "newTagInput"
    ].forEach(id=>markScenarioField(id, false));
}

function focusScenarioField(id){
    const element = document.getElementById(id);

    if(!element){
        return;
    }

    if(element.closest(".scenario-editor-details:not([open])")){
        element.closest(".scenario-editor-details").open = true;
    }

    element.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
    element.focus({
        preventScroll: true
    });
}

function setLivePreviewText(id, text){
    const element = document.getElementById(id);

    if(element){
        element.textContent = text || "未入力";
    }
}

function formatPlayerRange(draft){
    if(draft.playersMin && draft.playersMax){
        return `${draft.playersMin}から${draft.playersMax}人`;
    }

    if(draft.playersMin){
        return `${draft.playersMin}人から`;
    }

    if(draft.playersMax){
        return `${draft.playersMax}人まで`;
    }

    return "未入力";
}

function formatTimeRange(draft){
    if(draft.timeMin && draft.timeMax){
        return `${draft.timeMin}から${draft.timeMax}時間`;
    }

    if(draft.timeMin){
        return `${draft.timeMin}時間から`;
    }

    if(draft.timeMax){
        return `${draft.timeMax}時間まで`;
    }

    return "未入力";
}

function showScenarioNextActions(draft){
    const panel = document.getElementById("scenarioNextActions");

    if(!panel){
        return;
    }

    const title = document.getElementById("scenarioNextTitle");
    const description = document.getElementById("scenarioNextDescription");
    const exportButton = document.getElementById("scenarioNextExportBtn");
    const publicIssues = getPublicIssues(draft || {});

    if(title){
        title.textContent = draft?.title
            ? `「${draft.title}」を保存しました`
            : "保存しました";
    }

    if(description){
        description.textContent = draft?.status === "public" && publicIssues.length === 0
            ? "公開用データ作成まで進めます。必要なら続けて追加もできます。"
            : "続けて追加するか、公開前チェックで足りない項目を確認できます。";
    }

    if(exportButton){
        exportButton.dataset.state = draft?.status === "public" && publicIssues.length === 0
            ? "ready"
            : "warn";
        exportButton.title = draft?.status === "public" && publicIssues.length === 0
            ? "公開用データを作れます。"
            : "公開前チェックを確認してから作成してください。";
    }

    panel.hidden = false;
}

function hideScenarioNextActions(){
    const panel = document.getElementById("scenarioNextActions");

    if(panel){
        panel.hidden = true;
    }
}

function createBackupFilename(){
    return `relmua-terminal-${MODULE_NAME}-backup-${createDateStamp()}.json`;
}

function createDateStamp(){
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}${month}${day}`;
}

function getCurrentCounts(){
    return {
        scenarios: getScenarios().length,
        tags: getMasterTags().length,
        authors: getAuthors().length
    };
}

function initSelectNumbers(){
    initNumberSelect(
        "playersMin",
        1,
        10,
        "未設定",
        value=>String(value)
    );

    initNumberSelect(
        "playersMax",
        1,
        10,
        "未設定",
        value=>String(value)
    );

    initNumberSelect(
        "timeMin",
        1,
        30,
        "未設定",
        value=>`${value}h`
    );

    initNumberSelect(
        "timeMax",
        1,
        80,
        "未設定",
        value=>`${value}h`
    );
}

function initNumberSelect(id, min, max, emptyLabel, labelFactory){
    const select = getElement(id);
    const fragment = document.createDocumentFragment();

    fragment.appendChild(
        createOption(
            "",
            emptyLabel
        )
    );

    for(let value = min; value <= max; value += 1){
        fragment.appendChild(
            createOption(
                value,
                labelFactory(value)
            )
        );
    }

    select.replaceChildren(fragment);
}
