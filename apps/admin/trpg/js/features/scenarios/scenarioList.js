import {

    getScenarios

} from "./scenarioStore.js";

import {
    ratingText
} from "./scenarioUtils.js";

import {

    filterScenarios

} from "./scenarioFilter.js";



let handlers = {};


export function initScenarioList(events){

    handlers = events;

}



export function renderScenarioList(){


    const list =
        document.getElementById(
            "scenarioList"
        );


    const searchInput =
        document.getElementById(
            "search"
        );


    const sortSelect =
        document.getElementById(
            "sort"
        );


    const statusFilter =
        document.getElementById(
            "statusFilter"
        );


    const systemFilter =
        document.getElementById(
            "systemFilter"
        );



    const result =
    filterScenarios(

        getScenarios(),

        {

            keyword:
                searchInput.value,


            status:
                statusFilter.value,


            system:
                systemFilter.value,


            sort:
                sortSelect.value

        }

    );


    list.innerHTML="";


    result.forEach(
        scenario=>{

            list.appendChild(
                createScenarioCard(
                    scenario
                )
            );

        }
    );

}




function createScenarioCard(s){
    const div = document.createElement("div");
    div.className = "scenario-item";

    div.innerHTML = `
        <div class="scenario-title">
            ${s.title}
        </div>

        <div class="scenario-info">
            ${s.system}
            /
            ${ratingText(s.rating)}
            /
            ${s.playersRaw || "人数不明"}
            /
            ${s.timeRaw || "時間不明"}
        </div>

        <div>
            ${
                (s.tags || [])
                .slice(0,3)
                .map(tag=>`<span class="tag">#${tag}</span>`)
                .join("")
            }
        </div>
    `;

    const buttonArea = document.createElement("div");
    buttonArea.className = "card-buttons";

    const detailBtn = document.createElement("button");
    detailBtn.type = "button";
    detailBtn.textContent = "詳細";

    detailBtn.addEventListener("click",()=>{
        handlers.onDetail(s.id);
    });

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "編集";

    editBtn.addEventListener("click",()=>{
        handlers.onEdit(s.id);
    });

    buttonArea.append(detailBtn, editBtn);
    div.appendChild(buttonArea);

    return div;
}