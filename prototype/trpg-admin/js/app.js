// =====================
// State
// =====================

const STORAGE_KEY = "mira_terminal_scenarios";
const TAG_KEY = "mira_terminal_tags";
const AUTHOR_KEY = "mira_terminal_authors";

let scenarios =
    JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

let editingId = null;

let masterTags =
    JSON.parse(localStorage.getItem(TAG_KEY)) ||
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
    ];

let selectedTags = [];
let authors =
    JSON.parse(localStorage.getItem(AUTHOR_KEY)) || [];


// =====================
// Elements
// =====================

const list = document.getElementById("scenarioList");
const searchInput = document.getElementById("search");
const sortSelect = document.getElementById("sort");
const authorInput =
    document.getElementById("author");

const authorSuggest =
    document.getElementById("authorSuggest");


// =====================
// Init
// =====================

initSelectNumbers();
renderTagButtons();
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

document.getElementById("exportBtn")
.addEventListener("click", exportData);

document.getElementById("importBtn")
.addEventListener("click", ()=>{
    document.getElementById("importFile").click();
});

document.getElementById("importFile")
.addEventListener("change", importData);

authorInput.addEventListener(
    "input",
    renderAuthorSuggest
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

        tags:[...selectedTags],

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

        tags:[...selectedTags],

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

    selectedTags=[...copyData.tags];

    syncTagsInput();
    renderTagButtons();

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

    selectedTags=[...s.tags];

    syncTagsInput();
    renderTagButtons();

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

        <div>
            ${s.system} / ${s.author}
        </div>

        <div>
            人数：${s.playersRaw || "不明"}
        </div>

        <div>
            時間：${s.timeRaw || "不明"}
        </div>

        <div>
            ロスト：${s.loss}
        </div>

        <div>
            ${
                s.tags.map(t=>
                    `<span class="tag">#${t}</span>`
                ).join("")
            }
        </div>

        <small>
            状態：${statusText(s.status)}
        </small>

        <br>

        <button onclick="editScenario('${s.id}')">
            編集
        </button>

        <button onclick="removeScenario('${s.id}')">
            削除
        </button>
        `;


        list.appendChild(div);
    });
}



// =====================
// Tags
// =====================

function renderTagButtons(){

    const area =
        document.getElementById("tagButtons");

    area.innerHTML="";


    masterTags.forEach(tag=>{

        const wrapper =
            document.createElement("div");

        wrapper.className="tag-wrapper";


        const btn =
            document.createElement("button");

        btn.type="button";
        btn.textContent="#"+tag;

        btn.className =
            selectedTags.includes(tag)
            ? "tag-button active"
            : "tag-button";


        btn.addEventListener("click",()=>{

            if(selectedTags.includes(tag)){

                selectedTags =
                    selectedTags.filter(t=>t!==tag);

            }else{

                selectedTags.push(tag);
            }

            syncTagsInput();
            renderTagButtons();
        });



        const del =
            document.createElement("button");

        del.type="button";
        del.textContent="×";
        del.className="tag-delete";


        del.addEventListener("click",()=>{

            deleteTag(tag);

        });


        wrapper.appendChild(btn);
        wrapper.appendChild(del);

        area.appendChild(wrapper);
    });
}



function addMasterTag(){

    const input =
        document.getElementById("newTagInput");

    const tag =
        input.value.trim();


    if(!tag)return;


    if(!masterTags.includes(tag)){

        masterTags.push(tag);

        localStorage.setItem(
            TAG_KEY,
            JSON.stringify(masterTags)
        );
    }


    if(!selectedTags.includes(tag)){
        selectedTags.push(tag);
    }

    input.value="";


    syncTagsInput();

    renderTagButtons();
}



function syncTagsInput(){

    document
    .getElementById("tags")
    .value =
    selectedTags.join(",");
}



function deleteTag(tag){

    if(!confirm(`#${tag} を削除しますか？`)){
        return;
    }


    masterTags =
        masterTags.filter(
            t=>t!==tag
        );


    selectedTags =
        selectedTags.filter(
            t=>t!==tag
        );


    localStorage.setItem(
        TAG_KEY,
        JSON.stringify(masterTags)
    );


    syncTagsInput();

    renderTagButtons();
}



// =====================
// Author
// =====================

function saveAuthor(name){

    if(!name)return;


    if(!authors.includes(name)){

        authors.push(name);

        localStorage.setItem(
            AUTHOR_KEY,
            JSON.stringify(authors)
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

    selectedTags=[];
    syncTagsInput();
    renderTagButtons();
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
// Backup
// =====================

function exportData(){
    const backup = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        scenarios: scenarios,
        tags: masterTags
    };

    const blob = new Blob(
        [JSON.stringify(backup,null,2)],
        {type:"application/json"}
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "mira-terminal-backup.json";
    a.click();

    URL.revokeObjectURL(url);

    showMessage("データを出力しました");
}

function importData(event){
    const file = event.target.files[0];
    if(!file)return;

    const reader = new FileReader();

    reader.onload = e=>{
        try{
            const backup = JSON.parse(e.target.result);

            if(!backup.scenarios || !backup.tags){
                alert("バックアップ形式が違います");
                return;
            }

            if(!confirm("現在のデータを上書きしますか？")){
                return;
            }

            scenarios = backup.scenarios;
            masterTags = backup.tags;
            selectedTags = [];

            saveScenarios();
            localStorage.setItem(TAG_KEY, JSON.stringify(masterTags));

            syncTagsInput();
            renderTagButtons();
            render();

            showMessage("データを読み込みました");
        }catch(error){
            alert("読み込みに失敗しました");
        }
    };

    reader.readAsText(file);
    event.target.value = "";
}



// =====================
// Storage
// =====================

function saveScenarios(){

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(scenarios)
    );
}



// =====================
// Utility
// =====================

function value(id){
    return document.getElementById(id).value;
}


function setValue(id,val){
    document.getElementById(id).value=val || "";
}


function statusText(status){

    return {
        draft:"未整理",
        ready:"整理済み",
        public:"公開",
        private:"非公開"
    }[status];
}


function showMessage(text){

    const msg =
        document.getElementById("message");

    msg.textContent=text;

    setTimeout(()=>{
        msg.textContent="";
    },1500);
}