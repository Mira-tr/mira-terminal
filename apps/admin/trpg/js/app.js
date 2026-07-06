// =====================
// State
// =====================

import {
    TAG_KEY,
    load
} from "./store.js";

import {
    initTags,
    addMasterTag
} from "./features/tags.js";

import {
    exportData,
    importData
} from "./features/backup.js";

import {
    getAuthors,
    saveAuthor,
    setAuthors,
    initAuthorSuggest
} from "./features/authors.js";

import {
    getScenarios,
    setScenarios
} from "./features/scenarios/scenarioStore.js";

import {
    saveScenario,
    saveAndCopyScenario,
    editScenario
} from "./features/scenarios/scenarioForm.js";

import {

    initScenarioModal

} from "./features/scenarios/scenarioModal.js";

import {

    renderScenarioList

} from "./features/scenarios/scenarioList.js";


let masterTags =
    load(
        TAG_KEY,
        [
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
        ]
    );


// =====================
// Elements
// =====================

const searchInput = document.getElementById("search");
const sortSelect = document.getElementById("sort");
const statusFilter =
    document.getElementById("statusFilter");

const systemFilter =
    document.getElementById("systemFilter");



// =====================
// Init
// =====================

initSelectNumbers();

initTags(
    masterTags
);

initAuthorSuggest(
    "author",
    "authorSuggest"
);

initScenarioModal(
    render
);

render();


// =====================
// Events
// =====================

document
.getElementById("saveBtn")
.addEventListener("click", ()=>{
    saveScenario({
        onSaved: render,
        saveAuthor
    });
});

document
.getElementById("copyBtn")
.addEventListener("click", ()=>{
    saveAndCopyScenario({
        onSaved: render,
        saveAuthor
    });
});

document
.getElementById("addTagBtn")
.addEventListener("click", addMasterTag);

searchInput.addEventListener("input", render);

sortSelect.addEventListener("change", render);

document
.getElementById("exportBtn")
.addEventListener(
    "click",
    ()=>{

        exportData(
            getScenarios(),
            masterTags,
            getAuthors()
        );

    }
);

document
.getElementById("importFile")
.addEventListener(
    "change",
    e=>{

        importData(
            e,
            backup=>{

                setScenarios(
                    backup.scenarios
                );


                masterTags =
                    backup.tags;


                setAuthors(
                    backup.authors
                );


                initTags(
                    masterTags
                );


                render();

            }
        );

    }
);

document
.getElementById("importBtn")
.addEventListener(
    "click",
    ()=>{
        document
        .getElementById("importFile")
        .click();
    }
);

statusFilter
.addEventListener("change", render);


systemFilter
.addEventListener("change", render);



// =====================
// Render
// =====================

function render(){

    updateDashboard();

    renderScenarioList();

}



// =====================
// Dashboard
// =====================

function updateDashboard(){

    const scenarios =
        getScenarios();

    document
    .getElementById("totalCount")
    .textContent =
        scenarios.length;


    document
    .getElementById("draftCount")
    .textContent =
        scenarios
        .filter(
            s=>s.status==="draft"
        )
        .length;


    document
    .getElementById("publicCount")
    .textContent =
        scenarios
        .filter(
            s=>s.status==="public"
        )
        .length;
}



// =====================
// Form
// =====================


function initSelectNumbers(){

    ["playersMin","playersMax"]
    .forEach(id=>{

        const el=document.getElementById(id);

        el.innerHTML="<option value=''>不明</option>";

        for(let i=1;i<=10;i++){
            el.innerHTML+=`<option>${i}</option>`;
        }
    });


    ["timeMin","timeMax"]
    .forEach(id=>{

        const el=document.getElementById(id);

        el.innerHTML="<option value=''>不明</option>";

        for(let i=1;i<=50;i++){
            el.innerHTML+=`<option value="${i}">${i}h</option>`;
        }
    });
}


window.editScenario =
    editScenario;