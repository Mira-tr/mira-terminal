// =====================
// Storage
// =====================

const STORAGE_KEY = "mira_terminal_scenarios";


let scenarios =
    JSON.parse(
        localStorage.getItem(STORAGE_KEY)
    ) || [];


// =====================
// Elements
// =====================

const list = document.getElementById("scenarioList");

const searchInput = document.getElementById("search");

const sortSelect = document.getElementById("sort");


// =====================
// Init
// =====================

initSelectNumbers();

render();


// =====================
// Select作成
// =====================

function initSelectNumbers(){

    const selects = [
        "playersMin",
        "playersMax"
    ];


    selects.forEach(id=>{

        const el =
            document.getElementById(id);

        el.innerHTML =
            `<option value="">
                不明
            </option>`;


        for(let i=1;i<=10;i++){

            el.innerHTML +=
            `
            <option value="${i}">
                ${i}
            </option>
            `;
        }

    });



    const times = [
        "timeMin",
        "timeMax"
    ];


    times.forEach(id=>{

        const el =
            document.getElementById(id);

        el.innerHTML =
        `
        <option value="">
            不明
        </option>
        `;


        for(let i=1;i<=50;i++){

            el.innerHTML +=
            `
            <option value="${i}">
                ${i}h
            </option>
            `;
        }

    });

}



// =====================
// Save
// =====================

document
.getElementById("saveBtn")
.addEventListener(
"click",
saveScenario
);



function saveScenario(){


    const data = {

        id:
            crypto.randomUUID(),

        title:
            value("title"),

        kana:
            value("kana"),

        author:
            value("author"),

        system:
            value("system"),


        playersRaw:
            value("playersRaw"),

        playersMin:
            value("playersMin"),

        playersMax:
            value("playersMax"),


        timeRaw:
            value("timeRaw"),

        timeMin:
            value("timeMin"),

        timeMax:
            value("timeMax"),


        loss:
            value("loss"),


        tags:
            value("tags")
            .split(",")
            .map(t=>t.trim())
            .filter(Boolean),


        url:
            value("url"),


        status:
            value("status"),


        memo:
            value("memo"),


        createdAt:
            Date.now()

    };


    scenarios.push(data);


    save();


    clearForm();


    render();

    showMessage("保存しました");

}



// =====================
// Save Storage
// =====================

function save(){

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(scenarios)
    );

}



// =====================
// Render
// =====================

function render(){


    updateDashboard();


    let result = [...scenarios];


    const keyword =
        searchInput.value
        .toLowerCase();



    if(keyword){

        result =
        result.filter(s=>

            s.title
            .toLowerCase()
            .includes(keyword)

            ||

            s.author
            .toLowerCase()
            .includes(keyword)

        );

    }



    if(sortSelect.value==="name"){

        result.sort(
            (a,b)=>
            a.kana.localeCompare(b.kana,"ja")
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


        div.className =
        "scenario-item";


        div.innerHTML =
        `
        <div class="scenario-title">
            ${s.title}
        </div>


        <div>
            ${s.system}
            /
            ${s.author}
        </div>


        <div>
            人数：
            ${s.playersRaw || "不明"}
        </div>


        <div>
            時間：
            ${s.timeRaw || "不明"}
        </div>


        <div>
            ロスト：
            ${s.loss}
        </div>


        <div>
        ${
            s.tags
            .map(
                t=>
                `<span class="tag">
                    #${t}
                </span>`
            )
            .join("")
        }
        </div>


        <small>
            状態：
            ${statusText(s.status)}
        </small>


        <br>


        <button onclick="
            removeScenario('${s.id}')
        ">
            削除
        </button>
        `;


        list.appendChild(div);


    });


}



// =====================
// Delete
// =====================


function removeScenario(id){


    if(
        !confirm("削除しますか？")
    ){
        return;
    }


    scenarios =
    scenarios.filter(
        s=>s.id!==id
    );


    save();

    render();

}



// =====================
// Dashboard
// =====================


function updateDashboard(){


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
// Utility
// =====================


function value(id){

    return document
    .getElementById(id)
    .value;

}



function clearForm(){


    document
    .querySelectorAll(
        "input, textarea"
    )
    .forEach(
        e=>e.value=""
    );

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
    document.getElementById(
        "message"
    );


    msg.textContent = text;


    setTimeout(()=>{

        msg.textContent="";

    },1500);

}



// =====================
// Events
// =====================


searchInput
.addEventListener(
"input",
render
);



sortSelect
.addEventListener(
"change",
render
);