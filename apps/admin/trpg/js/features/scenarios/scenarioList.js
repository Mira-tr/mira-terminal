import {

    getScenarios

} from "./scenarioStore.js";



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



    let result=[
        ...getScenarios()
    ];



    const keyword =
        searchInput
        .value
        .toLowerCase();



    if(keyword){

        result =
            result.filter(
                s=>

                s.title
                .toLowerCase()
                .includes(keyword)

                ||

                s.author
                .toLowerCase()
                .includes(keyword)
            );

    }



    if(statusFilter.value){

        result =
            result.filter(
                s=>
                s.status===statusFilter.value
            );

    }



    if(systemFilter.value){

        result =
            result.filter(
                s=>
                s.system===systemFilter.value
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


    const div =
        document.createElement(
            "div"
        );


    div.className =
        "scenario-item";



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
                tag=>

                `<span class="tag">
                    #${tag}
                </span>`
            )

            .join("")
        }

        </div>


        <div class="card-buttons">


            <button onclick="
                showDetail('${s.id}')
            ">
                詳細
            </button>


            <button onclick="
                editScenario('${s.id}')
            ">
                編集
            </button>


        </div>

    `;


    return div;

}