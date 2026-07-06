import {

    getScenarios,
    deleteScenario

} from "./scenarioStore.js";



export function initScenarioModal(onChange){


    const modal =
        document.getElementById("modal");


    const modalBody =
        document.getElementById("modalBody");


    document
    .getElementById("closeModal")
    .addEventListener(
        "click",
        ()=>{

            modal.classList.add(
                "hidden"
            );

        }
    );



    window.showDetail =
        id=>{

            showDetail(
                id,
                modal,
                modalBody,
                onChange
            );

        };

}



function showDetail(
    id,
    modal,
    modalBody,
    onChange
){


    const s =
        getScenarios()
        .find(
            x=>x.id===id
        );


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
            (s.tags || [])
            .map(
                tag=>
                `<span class="tag">
                    #${tag}
                </span>`
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


    <button id="deleteScenarioBtn">
        削除
    </button>

    `;


    document
    .getElementById(
        "deleteScenarioBtn"
    )
    .addEventListener(
        "click",
        ()=>{


            if(
                confirm(
                    "削除しますか？"
                )
            ){

                deleteScenario(
                    id
                );


                modal.classList.add(
                    "hidden"
                );


                onChange();

            }

        }
    );


    modal.classList.remove(
        "hidden"
    );

}