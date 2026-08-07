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
    getSelectedTags,
    initTags,
    setSelectedTags,
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
    clearForm,
    duplicateScenario,
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
    getSelectedStorageLocations,
    initScenarioStorage,
    setSelectedStorageLocations
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
const STORAGE_LOCATION_OPTIONS_ID = "storageLocationOptions";
const collectionContext = createCollectionContext();
const scenarioEditorController = createDefaultScenarioEditorController(collectionContext);

const DEFAULT_TAGS = [
    "秘匿HO",
    "RP重視",
    "推理要素",
    "戦闘あり",
    "現代日本",
    "クローズド",
    "シティ",
    "高ロスト",
    "初心者向け",
    "新規継続不可",
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
    STORAGE_LOCATION_OPTIONS_ID
);

const modal = initScenarioModal(render);

initScenarioList({
    onDetail: modal.open,
    onEdit: id=>{
        editScenario(id);
        hideScenarioNextActions();
        updateScenarioLivePreview();
        updateScenarioQuickFillButtons();
        updateScenarioQuickTagButtons();
        updateScenarioQuickStorageButtons();
    },
    onDuplicate: id=>{
        if(duplicateScenario(id)){
            hideScenarioNextActions();
            syncScenarioEditorState();
            focusScenarioEditor();
        }
    }
});

bindEvents();
initScenarioJumpActions();
initScenarioUrlAssist();
render();
updateScenarioLivePreview();
updateScenarioQuickFillButtons();
updateScenarioQuickTagButtons();
updateScenarioQuickStorageButtons();

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
        const restored = saveAndCopyScenario({
            onSaved: handleScenarioSaved,
            saveAuthor,
            controller: scenarioEditorController
        });

        if(restored){
            syncScenarioEditorState();
            focusScenarioEditor();
        }
    });

    getElement("addTagBtn")
    .addEventListener("click", addMasterTag);

    searchInput.addEventListener("input", render);
    sortSelect.addEventListener("change", render);
    statusFilter.addEventListener("change", render);
    systemFilter.addEventListener("change", render);
    publicWarningOnly.addEventListener("change", render);
    scenarioEditorView.form.addEventListener("input", ()=>{
        updateScenarioLivePreview();
        updateScenarioQuickFillButtons();
        applyScenarioUrlAssist();
    });
    scenarioEditorView.form.addEventListener("change", ()=>{
        updateScenarioLivePreview();
        updateScenarioQuickFillButtons();
        updateScenarioQuickStorageButtons();
        applyScenarioUrlAssist();
    });
    window.addEventListener("mira:tags-changed", ()=>{
        updateScenarioLivePreview();
        updateScenarioQuickTagButtons();
    });

    document.querySelectorAll("[data-scenario-focus]").forEach(button=>{
        button.addEventListener("click", ()=>{
            focusScenarioField(button.dataset.scenarioFocus);
        });
    });

    document.addEventListener("click", handleScenarioResetClick);

    document.querySelectorAll("[data-scenario-quick-fill]").forEach(button=>{
        button.addEventListener("click", ()=>{
            applyScenarioQuickFill(
                button.dataset.scenarioQuickFill,
                button.dataset.value
            );
        });
    });

    document.querySelectorAll("[data-scenario-quick-tag]").forEach(button=>{
        button.addEventListener("click", ()=>{
            toggleScenarioQuickTag(button.dataset.scenarioQuickTag);
        });
    });

    document.querySelectorAll("[data-scenario-quick-storage]").forEach(button=>{
        button.addEventListener("click", ()=>{
            toggleScenarioQuickStorage(button.dataset.scenarioQuickStorage);
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

    const showWarningsButton = document.getElementById("scenarioShowPublicWarningsBtn");

    if(showWarningsButton){
        showWarningsButton.addEventListener("click", showPublicWarningScenarios);
    }
}

function initScenarioJumpActions(){
    if(window.location.hash){
        requestAnimationFrame(handleInitialHash);
    }
}

function handleScenarioResetClick(event){
    const target = event.target instanceof Element
        ? event.target
        : null;

    if(!target?.closest("#newScenarioBtn, #continueScenarioBtn")){
        return;
    }

    event.preventDefault();
    startFreshScenario();
}

function startFreshScenario(){
    clearForm();
    hideScenarioNextActions();
    updateScenarioLivePreview();
    updateScenarioQuickFillButtons();
    updateScenarioQuickTagButtons();
    updateScenarioQuickStorageButtons();
    focusScenarioEditor();
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
    syncScenarioEditorState();
}

function syncScenarioEditorState(){
    updateScenarioLivePreview();
    updateScenarioQuickFillButtons();
    updateScenarioQuickTagButtons();
    updateScenarioQuickStorageButtons();
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
            ? "URL・タグ・短い紹介の確認済みです。"
            : `${readiness.warningCount}件の確認があります。一覧の「公開前確認」で絞り込めます。`
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
    const warningsButton = document.getElementById("scenarioShowPublicWarningsBtn");
    [
        exportButton,
        nextExportButton
    ].forEach(button=>{
        if(button){
            button.dataset.state = readiness.state;
            button.title = readiness.message;
        }
    });

    if(warningsButton){
        warningsButton.disabled = readiness.warningCount === 0;
        warningsButton.textContent = readiness.warningCount === 0
            ? "要確認はありません"
            : "要確認だけ見る";
    }
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

function showPublicWarningScenarios(){
    statusFilter.value = "public";
    publicWarningOnly.checked = true;
    render();
    document.getElementById("scenarioListTitle")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
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

function initScenarioUrlAssist(){
    const urlField = document.getElementById("url");
    const field = urlField?.closest(".form-field");

    if(!urlField || !field || document.getElementById("scenarioUrlAssist")){
        return;
    }

    const assist = document.createElement("p");
    assist.id = "scenarioUrlAssist";
    assist.className = "scenario-url-assist";
    assist.setAttribute("aria-live", "polite");
    assist.textContent = "URLを入れると、保存場所の候補を自動で手伝います。";
    field.appendChild(assist);
}

function updateScenarioUrlAssist(){
    const assist = document.getElementById("scenarioUrlAssist");

    if(!assist){
        return;
    }

    const suggestion = getScenarioUrlSuggestion(getElement("url").value);

    assist.dataset.state = suggestion ? "ready" : "empty";
    assist.textContent = suggestion
        ? `${suggestion.label}っぽいURLです。保存場所に反映できます。`
        : "URLを入れると、保存場所の候補を自動で手伝います。";
}

function applyScenarioUrlAssist(){
    const suggestion = getScenarioUrlSuggestion(getElement("url").value);

    updateScenarioUrlAssist();

    if(!suggestion){
        return;
    }

    const selectedLocations = getSelectedStorageLocations(STORAGE_LOCATION_OPTIONS_ID);

    if(selectedLocations.includes(suggestion.storage)){
        return;
    }

    setSelectedStorageLocations(
        STORAGE_LOCATION_OPTIONS_ID,
        [...selectedLocations, suggestion.storage]
    );
    updateScenarioQuickStorageButtons();
}

function getScenarioUrlSuggestion(url){
    const normalizedUrl = String(url || "").trim();

    if(!normalizedUrl){
        return null;
    }

    try{
        const host = new URL(normalizedUrl).hostname.toLowerCase();

        if(host.includes("booth.pm")){
            return {
                label: "BOOTH",
                storage: "booth"
            };
        }

        if(host.includes("talto.cc") ||
            host.includes("pixiv.net") ||
            host.includes("note.com")){
            return {
                label: "Webサービス",
                storage: "web"
            };
        }
    }catch(error){
        return null;
    }

    return {
        label: "Webページ",
        storage: "web"
    };
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
        mark: missingTitle ? "!" : "OK",
        title: "シナリオ名",
        message: missingTitle
            ? "タイトルを入れると保存できます。"
            : "タイトルが入っています。",
        focusId: "title"
    });

    setPreflightItem("scenarioCheckRule", {
        ok: !firstRuleError,
        info: false,
        mark: firstRuleError ? "!" : "OK",
        title: "入力形式",
        message: firstRuleError
            ? firstRuleError.fix || firstRuleError.title
            : "URL、人数、時間の形式は大丈夫です。",
        focusId: getFieldIdForValidation(firstRuleError)
    });

    setPreflightItem("scenarioCheckPublic", {
        ok: !isPublic || publicIssues.length === 0,
        info: !isPublic,
        mark: !isPublic ? "i" : firstPublicIssue ? "!" : "OK",
        title: "公開準備",
        message: !isPublic
            ? "公開にする時だけ、URL・タグ・短い紹介を確認します。"
            : firstPublicIssue?.message || "公開用の準備ができています。",
        focusId: getFieldIdForPublicIssue(firstPublicIssue)
    });

    setPreflightItem("scenarioCheckSave", {
        ok: validation.ok,
        info: false,
        mark: validation.ok ? "OK" : "!",
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

function applyScenarioQuickFill(fieldId, nextValue){
    const field = document.getElementById(fieldId);

    if(!field){
        return;
    }

    field.value = nextValue || "";
    field.dispatchEvent(new Event("input", {
        bubbles: true
    }));
    field.dispatchEvent(new Event("change", {
        bubbles: true
    }));
    field.focus({
        preventScroll: true
    });
}

function updateScenarioQuickFillButtons(){
    document.querySelectorAll("[data-scenario-quick-fill]").forEach(button=>{
        const field = document.getElementById(button.dataset.scenarioQuickFill);
        const active = Boolean(field) && field.value === button.dataset.value;

        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
    });
}

function toggleScenarioQuickTag(tag){
    const cleanTag = String(tag || "").trim();

    if(!cleanTag){
        return;
    }

    if(!getMasterTags().includes(cleanTag)){
        setMasterTags([
            ...getMasterTags(),
            cleanTag
        ]);
    }

    const selectedTags = getSelectedTags();
    setSelectedTags(
        selectedTags.includes(cleanTag)
            ? selectedTags.filter(item=>item !== cleanTag)
            : [...selectedTags, cleanTag]
    );
}

function updateScenarioQuickTagButtons(){
    const selectedTags = getSelectedTags();

    document.querySelectorAll("[data-scenario-quick-tag]").forEach(button=>{
        const active = selectedTags.includes(button.dataset.scenarioQuickTag);
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
    });
}

function toggleScenarioQuickStorage(location){
    const cleanLocation = String(location || "").trim();

    if(!cleanLocation){
        return;
    }

    const selectedLocations = getSelectedStorageLocations(STORAGE_LOCATION_OPTIONS_ID);
    setSelectedStorageLocations(
        STORAGE_LOCATION_OPTIONS_ID,
        selectedLocations.includes(cleanLocation)
            ? selectedLocations.filter(item=>item !== cleanLocation)
            : [...selectedLocations, cleanLocation]
    );
    updateScenarioLivePreview();
    updateScenarioQuickStorageButtons();
}

function updateScenarioQuickStorageButtons(){
    const selectedLocations = getSelectedStorageLocations(STORAGE_LOCATION_OPTIONS_ID);

    document.querySelectorAll("[data-scenario-quick-storage]").forEach(button=>{
        const active = selectedLocations.includes(button.dataset.scenarioQuickStorage);
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
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
