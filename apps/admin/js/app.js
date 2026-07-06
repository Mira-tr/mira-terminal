import {
    TAG_KEY,
    load
} from "./store.js";

import {
    getElement,
    createOption
} from "./utils.js";

import {
    initTags,
    addMasterTag,
    getMasterTags,
    setMasterTags
} from "./features/trpg/tags.js";

import {
    exportData,
    importData
} from "./features/common/backup.js";

import {
    getAuthors,
    saveAuthor,
    setAuthors,
    initAuthorSuggest
} from "./features/trpg/authors.js";

import {
    getScenarios,
    setScenarios
} from "./features/trpg/scenarios/scenarioStore.js";

import {
    saveScenario,
    saveAndCopyScenario,
    editScenario
} from "./features/trpg/scenarios/scenarioForm.js";

import {
    initScenarioModal
} from "./features/trpg/scenarios/scenarioModal.js";

import {
    initScenarioList,
    renderScenarioList
} from "./features/trpg/scenarios/scenarioList.js";

import {
    updateDashboard
} from "./features/common/dashboard.js";

const APP_NAME = "MIRA Terminal";
const MODULE_NAME = "trpg";
const SCHEMA_VERSION = 1;

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
    "継続探索者限定"
];

// =====================
// Elements
// =====================

const searchInput = getElement("search");
const sortSelect = getElement("sort");
const statusFilter = getElement("statusFilter");
const systemFilter = getElement("systemFilter");

// =====================
// Init
// =====================

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

const modal = initScenarioModal(render);

initScenarioList({
    onDetail: modal.open,
    onEdit: editScenario
});

bindEvents();

render();

// =====================
// Events
// =====================

function bindEvents(){
    getElement("saveBtn")
    .addEventListener("click", ()=>{
        saveScenario({
            onSaved: render,
            saveAuthor
        });
    });

    getElement("copyBtn")
    .addEventListener("click", ()=>{
        saveAndCopyScenario({
            onSaved: render,
            saveAuthor
        });
    });

    getElement("addTagBtn")
    .addEventListener("click", addMasterTag);

    searchInput.addEventListener("input", render);
    sortSelect.addEventListener("change", render);
    statusFilter.addEventListener("change", render);
    systemFilter.addEventListener("change", render);

    getElement("exportBtn")
    .addEventListener("click", ()=>{
        exportData(
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
                setScenarios(backup.scenarios);

                setMasterTags(backup.tags, {
                    resetSelected: true
                });

                setAuthors(backup.authors);

                render();
            },
            {
                expectedModule: MODULE_NAME,
                maxSchemaVersion: SCHEMA_VERSION,
                currentCounts: getCurrentCounts()
            }
        );
    });
}

// =====================
// Render
// =====================

function render(){
    updateDashboard(
        getScenarios()
    );

    renderScenarioList();
}

// =====================
// Backup
// =====================

function createBackupFilename(){
    return `mira-terminal-${MODULE_NAME}-backup-${createDateStamp()}.json`;
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

// =====================
// Form
// =====================

function initSelectNumbers(){
    initNumberSelect(
        "playersMin",
        1,
        10,
        "不明",
        value=>String(value)
    );

    initNumberSelect(
        "playersMax",
        1,
        10,
        "不明",
        value=>String(value)
    );

    initNumberSelect(
        "timeMin",
        1,
        30,
        "不明",
        value=>`${value}h`
    );

    initNumberSelect(
        "timeMax",
        1,
        80,
        "不明",
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

    for(let i = min; i <= max; i++){
        fragment.appendChild(
            createOption(
                i,
                labelFactory(i)
            )
        );
    }

    select.replaceChildren(fragment);
}