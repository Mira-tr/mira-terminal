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
    mountScenarioEditorView
} from "./features/trpg/scenarios/scenarioEditorView.js";

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

mountScenarioEditorView({
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
    onEdit: editScenario
});

bindEvents();
initScenarioJumpActions();
render();

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
    .addEventListener("click", ()=>{
        runToastOperation(
            () => scenarioEditorController.exportPublicData({
                appName: APP_NAME,
                moduleName: MODULE_NAME,
                schemaVersion: SCHEMA_VERSION,
                filename: PUBLIC_EXPORT_FILENAME
            }),
            { errorMessage: "公開用データの作成に失敗しました" }
        );
    });
}

function initScenarioJumpActions(){
    const newButton = document.getElementById("newScenarioBtn");
    const continueButton = document.getElementById("continueScenarioBtn");

    if(newButton){
        newButton.addEventListener("click", ()=>{
            clearForm();
            hideScenarioNextActions();
            focusScenarioEditor();
        });
    }

    if(continueButton){
        continueButton.addEventListener("click", ()=>{
            clearForm();
            hideScenarioNextActions();
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
}

function handleScenarioSaved(result){
    render();
    showScenarioNextActions(result?.draft);
}

function showScenarioNextActions(draft){
    const panel = document.getElementById("scenarioNextActions");

    if(!panel){
        return;
    }

    const title = document.getElementById("scenarioNextTitle");
    const description = document.getElementById("scenarioNextDescription");

    if(title){
        title.textContent = draft?.title
            ? `「${draft.title}」を保存しました`
            : "保存しました";
    }

    if(description){
        description.textContent = "続けて追加するか、一覧で確認するか、公開用データ作成へ進めます。";
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
