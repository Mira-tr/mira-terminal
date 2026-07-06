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

const list = document.getElementById("scenarioList");
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

    let result=[
        ...getScenarios()
    ];

    const keyword =
        searchInput.value.toLowerCase();


    if(keyword){

        result =
        result.filter(s=>

            s.title.toLowerCase().includes(keyword)
            ||
            s.author.toLowerCase().includes(keyword)
        );
    }


    if(statusFilter.value){

        result =
        result.filter(
            s=>s.status===statusFilter.value
        );
    }


    if(systemFilter.value){

        result =
        result.filter(
            s=>s.system===systemFilter.value
        );
    }


    if(sortSelect.value==="name"){

        result.sort(
            (a,b)=>
            (a.kana || a.title)
            .localeCompare(
                b.kana || b.title,
                "ja"
            )
        );
    }


    if(sortSelect.value==="date"){

        result.sort(
            (a,b)=>
            b.createdAt-a.createdAt
        );
    }


    list.innerHTML="";


    result.forEach(s=>{

        const div =
            document.createElement("div");

        div.className="scenario-item";


        div.innerHTML=`

        <div class="scenario-title">
            ${s.title}
        </div>

        <div class="scenario-info">
            ${s.system}
            /
            ${s.playersRaw || "人数不明"}
            /
            ${s.timeRaw || "時間不明"}
        </div>


        <div>
        ${
            (s.tags || [])
            .slice(0,3)
            .map(
                t=>`<span class="tag">#${t}</span>`
            )
            .join("")
        }
        </div>


        <div class="card-buttons">

        <button onclick="showDetail('${s.id}')">
        詳細
        </button>

        <button onclick="editScenario('${s.id}')">
        編集
        </button>

        </div>

        `;


        list.appendChild(div);
    });
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