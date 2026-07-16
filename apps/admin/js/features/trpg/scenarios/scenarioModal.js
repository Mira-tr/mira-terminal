import {
    isSafeHttpUrl
} from "../../../utils.js";

import {
    showToast
} from "../../common/toastService.js";

import {
    deleteScenario,
    getScenarios
} from "./scenarioStore.js";

import {
    getStorageLocationSummary
} from "./scenarioStorage.js";

import {
    ratingText
} from "./scenarioUtils.js";

let focusBeforeOpen = null;

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

    modal.addEventListener("keydown", event => {
        if(event.key === "Escape"){
            event.preventDefault();
            closeModal(modal);
            return;
        }

        if(event.key === "Tab"){
            trapModalFocus(event, modal);
        }
    });

    return {
        open: id=>{
            focusBeforeOpen = document.activeElement;
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
    closeButtonFor(modal)?.focus();
}

function createDetailContent(scenario, modal, onChange){
    const container = document.createElement("div");
    container.className = "scenario-detail";
    const storageSummary = getStorageLocationSummary(
        scenario.storageLocations
    );

    const title = document.createElement("h2");
    title.textContent = scenario.title || "無題";

    container.append(
        title,
        createInfoRow("作者", scenario.author || "未入力"),
        createInfoRow("システム", scenario.system || "未入力"),
        createInfoRow("人数", scenario.playersRaw || "未入力"),
        createInfoRow("時間", scenario.timeRaw || "未入力"),
        createInfoRow("ロスト傾向", scenario.loss || "未入力"),
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
    const row = document.createElement("div");
    row.className = "scenario-detail-row";

    const labelElement = document.createElement("span");
    labelElement.className = "scenario-detail-label";
    labelElement.textContent = label;

    const valueElement = document.createElement("span");
    valueElement.className = "scenario-detail-value";
    valueElement.textContent = value;

    row.append(labelElement, valueElement);
    return row;
}

function createTagArea(tags = []){
    const area = document.createElement("div");
    area.className = "scenario-detail-tags";

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
    p.className = "scenario-detail-memo";
    p.textContent = memo || "メモはありません。";
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
    button.className = "button danger";
    button.textContent = "削除";

    button.addEventListener("click", ()=>{
        const confirmed = window.confirm("このシナリオを削除します。削除前にBackupがあることを確認してください。");

        if(!confirmed){
            return;
        }

        deleteScenario(id);
        showToast("削除しました", "success");
        closeModal(modal);

        if(onChange){
            onChange();
        }
    });

    return button;
}

function closeModal(modal){
    modal.classList.add("hidden");

    if(focusBeforeOpen && typeof focusBeforeOpen.focus === "function"){
        focusBeforeOpen.focus();
    }
}

function closeButtonFor(modal){
    return modal.querySelector("#closeModal");
}

function trapModalFocus(event, modal){
    const focusable = [
        ...modal.querySelectorAll(
            'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
    ];

    if(focusable.length === 0){
        return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if(event.shiftKey && document.activeElement === first){
        event.preventDefault();
        last.focus();
    }else if(!event.shiftKey && document.activeElement === last){
        event.preventDefault();
        first.focus();
    }
}
