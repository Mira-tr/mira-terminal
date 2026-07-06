// =====================
// State
// =====================

import {
    STORAGE_KEY,
    TAG_KEY,
    AUTHOR_KEY,

    load,
    save

} from "./store.js";

import {

    value,
    setValue,
    showMessage

} from "./utils.js";

import {

    initTags,
    addMasterTag,
    getSelectedTags,
    setSelectedTags

} from "./features/tags.js";

import {

    exportData,
    importData

} from "./features/backup.js";


let scenarios =
    load(
        STORAGE_KEY,
        []
    );

let editingId = null;

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

let authors =
    load(
        AUTHOR_KEY,
        []
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
const authorInput =
    document.getElementById("author");

const authorSuggest =
    document.getElementById("authorSuggest");

const modal =
    document.getElementById("modal");

const modalBody =
    document.getElementById("modalBody");


// =====================
// Init
// =====================

initSelectNumbers();

initTags(
    masterTags
);

render();


// =====================
// Events
// =====================

document
.getElementById("saveBtn")
.addEventListener("click", saveScenario);

document
.getElementById("copyBtn")
.addEventListener("click", saveAndCopyScenario);

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
            scenarios,
            masterTags,
            authors
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

                scenarios =
                    backup.scenarios;


                masterTags =
                    backup.tags;


                authors =
                    backup.authors || [];


                initTags(
                    masterTags
                );


                render();

            }
        );

    }
);

document.getElementById("importFile")
.addEventListener("change", importData);

authorInput.addEventListener(
    "input",
    renderAuthorSuggest
);

statusFilter
.addEventListener("change", render);


systemFilter
.addEventListener("change", render);

document
.getElementById("closeModal")
.addEventListener(
    "click",
    ()=>{
        modal.classList.add("hidden");
    }
);



// =====================
// Scenario CRUD
// =====================

function saveScenario(){

    const data = {
        id: editingId || crypto.randomUUID(),

        title: value("title"),
        kana: value("kana"),
        author: value("author"),
        system: value("system"),

        playersRaw: value("playersRaw"),
        playersMin: value("playersMin"),
        playersMax: value("playersMax"),

        timeRaw: value("timeRaw"),
        timeMin: value("timeMin"),
        timeMax: value("timeMax"),

        loss: value("loss"),

        tags:getSelectedTags(),

        url:value("url"),
        status:value("status"),
        memo:value("memo"),

        createdAt:
            editingId
            ? scenarios.find(s=>s.id===editingId).createdAt
            : Date.now(),

        updatedAt:Date.now()
    };


    if(editingId){

        scenarios =
            scenarios.map(s=>
                s.id===editingId ? data : s
            );

        editingId=null;

        showMessage("更新しました");

    }else{

        scenarios.push(data);

        showMessage("保存しました");
    }

    saveAuthor(data.author);

    saveScenarios();
    clearForm();
    render();
}



function saveAndCopyScenario(){

    const copyData = {
        author:value("author"),
        system:value("system"),

        playersRaw:value("playersRaw"),
        playersMin:value("playersMin"),
        playersMax:value("playersMax"),

        timeRaw:value("timeRaw"),
        timeMin:value("timeMin"),
        timeMax:value("timeMax"),

        loss:value("loss"),

        tags:getSelectedTags(),

        status:value("status")
    };


    saveScenario();


    setValue("author",copyData.author);
    setValue("system",copyData.system);

    setValue("playersRaw",copyData.playersRaw);
    setValue("playersMin",copyData.playersMin);
    setValue("playersMax",copyData.playersMax);

    setValue("timeRaw",copyData.timeRaw);
    setValue("timeMin",copyData.timeMin);
    setValue("timeMax",copyData.timeMax);

    setValue("loss",copyData.loss);

    setSelectedTags(
        copyData.tags
    );

    setValue("status",copyData.status);


    showMessage("保存して複製しました");
}



function editScenario(id){

    const s =
        scenarios.find(x=>x.id===id);

    if(!s)return;


    editingId=id;


    setValue("title",s.title);
    setValue("kana",s.kana);
    setValue("author",s.author);
    setValue("system",s.system);

    setValue("playersRaw",s.playersRaw);
    setValue("playersMin",s.playersMin);
    setValue("playersMax",s.playersMax);

    setValue("timeRaw",s.timeRaw);
    setValue("timeMin",s.timeMin);
    setValue("timeMax",s.timeMax);

    setValue("loss",s.loss);

    setSelectedTags(
        s.tags
    );

    setValue("url",s.url);
    setValue("status",s.status);
    setValue("memo",s.memo);


    window.scrollTo({
        top:0,
        behavior:"smooth"
    });
}



function removeScenario(id){

    if(!confirm("削除しますか？")){
        return;
    }

    scenarios =
        scenarios.filter(s=>s.id!==id);

    saveScenarios();

    render();
}



// =====================
// Render
// =====================

function render(){

    updateDashboard();

    let result=[...scenarios];

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
            s.tags
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



function showDetail(id){

    const s =
        scenarios.find(x=>x.id===id);

    if(!s)return;


    modalBody.innerHTML=`

    <h2>${s.title}</h2>

    <p>
    作者：${s.author}
    </p>

    <p>
    システム：${s.system}
    </p>

    <p>
    人数：${s.playersRaw || "不明"}
    </p>

    <p>
    時間：${s.timeRaw || "不明"}
    </p>

    <p>
    ロスト率：${s.loss}
    </p>

    <div>
    ${
        s.tags
        .map(
            t=>`<span class="tag">#${t}</span>`
        )
        .join("")
    }
    </div>


    <p>
    ${s.memo || ""}
    </p>


    ${
        s.url
        ?
        `
        <a 
            class="scenario-link"
            href="${s.url}"
            target="_blank"
        >
            ページを開く
        </a>
        `
        :
        ""
    }


    <button onclick="
        removeScenario('${s.id}');
        modal.classList.add('hidden');
    ">
        削除
    </button>
    `;


    modal.classList.remove("hidden");
}



// =====================
// Author
// =====================

function saveAuthor(name){

    if(!name)return;


    if(!authors.includes(name)){

        authors.push(name);

        save(
            AUTHOR_KEY,
            authors
        );
    }
}


function renderAuthorSuggest(){

    const word =
        authorInput.value;


    authorSuggest.innerHTML="";


    if(!word)return;


    authors
    .filter(a=>a.includes(word))
    .forEach(author=>{


        const btn =
            document.createElement("button");


        btn.type="button";

        btn.className="author-suggest";


        btn.textContent=author;


        btn.addEventListener(
            "click",
            ()=>{

                authorInput.value=author;

                authorSuggest.innerHTML="";
            }
        );


        authorSuggest.appendChild(btn);
    });
}



// =====================
// Dashboard
// =====================

function updateDashboard(){

    document.getElementById("totalCount")
    .textContent = scenarios.length;

    document.getElementById("draftCount")
    .textContent =
        scenarios.filter(
            s=>s.status==="draft"
        ).length;

    document.getElementById("publicCount")
    .textContent =
        scenarios.filter(
            s=>s.status==="public"
        ).length;
}



// =====================
// Form
// =====================

function clearForm(){
    document
    .querySelectorAll("input, textarea")
    .forEach(e=>e.value="");

    setValue("system","CoC6");
    setValue("loss","不明");
    setValue("status","draft");

    setSelectedTags([]);
}



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



// =====================
// Storage
// =====================

function saveScenarios(){

    save(
        STORAGE_KEY,
        scenarios
    );
}



// =====================
// Utility
// =====================


function statusText(status){

    return {
        draft:"未整理",
        ready:"整理済み",
        public:"公開",
        private:"非公開"
    }[status];
}