import {
    isSafeHttpUrl
} from "../../../utils.js";

import {
    getScenarios,
    deleteScenario
} from "./scenarioStore.js";

import {
    ratingText
} from "./scenarioUtils.js";

import {
    getStorageLocationSummary
} from "./scenarioStorage.js";

import {
    showToast
} from "../../common/toastService.js";

export function initScenarioModal(onChange){
    const modal = document.getElementById("modal");
    const modalBody = document.getElementById("modalBody");
    const closeButton = document.getElementById("closeModal");

    closeButton.addEventListener("click", ()=>{
        closeModal(modal);
    });

    modal.addEventListener("click", event=>{
        if(event.target === modal){
            closeModal(modal);
        }
    });

    return {
        open: id=>{
            showDetail(
                id,
                modal,
                modalBody,
                onChange
            );
        }
    };
}

function showDetail(id, modal, modalBody, onChange){
    const scenario = getScenarios()
    .find(item=>item.id === id);

    if(!scenario){
        return;
    }

    modalBody.replaceChildren(
        createDetailContent(
            scenario,
            modal,
            onChange
        )
    );

    modal.classList.remove("hidden");
}

function createDetailContent(scenario, modal, onChange){
    const container = document.createElement("div");
    const storageSummary = getStorageLocationSummary(
        scenario.storageLocations
    );

    const title = document.createElement("h2");
    title.textContent = scenario.title || "無題";

    container.append(
        title,
        createInfoRow("作者", scenario.author || "不明"),
        createInfoRow("システム", scenario.system || "不明"),
        createInfoRow("人数", scenario.playersRaw || "不明"),
        createInfoRow("時間", scenario.timeRaw || "不明"),
        createInfoRow("ロスト率", scenario.loss || "不明"),
        createInfoRow("対象", ratingText(scenario.rating)),
        createInfoRow("保存場所", storageSummary || "未設定")
    );

    if(scenario.storageNote){
        container.appendChild(
            createInfoRow("保存メモ", scenario.storageNote)
        );
    }

    container.append(
        createTagArea(scenario.tags),
        createMemo(scenario.memo)
    );

    const link = createScenarioLink(scenario.url);

    if(link){
        container.appendChild(link);
    }

    container.appendChild(
        createDeleteButton(
            scenario.id,
            modal,
            onChange
        )
    );

    return container;
}

function createInfoRow(label, value){
    const p = document.createElement("p");
    p.textContent = `${label}：${value}`;
    return p;
}

function createTagArea(tags = []){
    const area = document.createElement("div");

    tags.forEach(tag=>{
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = `#${tag}`;
        area.appendChild(span);
    });

    return area;
}

function createMemo(memo){
    const p = document.createElement("p");
    p.textContent = memo || "";
    return p;
}

function createScenarioLink(url){
    if(!isSafeHttpUrl(url)){
        return null;
    }

    const link = document.createElement("a");
    link.className = "scenario-link";
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "ページを開く";

    return link;
}

function createDeleteButton(id, modal, onChange){
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button button-danger";
    button.textContent = "削除";

    button.addEventListener("click", ()=>{
        if(!confirm("削除しますか？")){
            return;
        }

        if(!deleteScenario(id)){
            showToast("削除に失敗しました", "error");
            return;
        }

        closeModal(modal);
        showToast("削除しました", "success");

        if(onChange){
            onChange();
        }
    });

    return button;
}

function closeModal(modal){
    modal.classList.add("hidden");
}
