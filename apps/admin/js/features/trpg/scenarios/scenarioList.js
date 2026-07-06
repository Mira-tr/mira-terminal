import {
    getElement
} from "../../../utils.js";

import {
    getScenarios
} from "./scenarioStore.js";

import {
    filterScenarios
} from "./scenarioFilter.js";

import {
    ratingText,
    ratingClass,
    statusText,
    statusClass
} from "./scenarioUtils.js";

let handlers = {};

export function initScenarioList(events){
    handlers = events || {};
}

export function renderScenarioList(){
    const list = getElement("scenarioList");

    const result = filterScenarios(
        getScenarios(),
        {
            keyword: getElement("search").value,
            status: getElement("statusFilter").value,
            system: getElement("systemFilter").value,
            sort: getElement("sort").value
        }
    );

    if(result.length === 0){
        list.replaceChildren(
            createEmptyState()
        );
        return;
    }

    const fragment = document.createDocumentFragment();

    result.forEach(scenario=>{
        fragment.appendChild(
            createScenarioItem(scenario)
        );
    });

    list.replaceChildren(fragment);
}

function createScenarioItem(scenario){
    const item = document.createElement("div");
    item.className = "scenario-item";

    const main = document.createElement("div");
    main.className = "scenario-main";

    main.append(
        createScenarioHead(scenario),
        createScenarioMeta(scenario),
        createScenarioTags(scenario)
    );

    item.append(
        main,
        createButtonArea(scenario)
    );

    return item;
}

function createScenarioHead(scenario){
    const head = document.createElement("div");
    head.className = "scenario-head";

    const title = document.createElement("div");
    title.className = "scenario-title";
    title.textContent = scenario.title || "無題";

    const status = document.createElement("span");
    status.className = `status-badge ${statusClass(scenario.status)}`;
    status.textContent = statusText(scenario.status);

    const rating = document.createElement("span");
    rating.className = `rating-badge ${ratingClass(scenario.rating)}`;
    rating.textContent = ratingText(scenario.rating);

    head.append(title, status, rating);
    return head;
}

function createScenarioMeta(scenario){
    const meta = document.createElement("div");
    meta.className = "scenario-meta";

    [
        scenario.system || "システム不明",
        scenario.playersRaw || "人数不明",
        scenario.timeRaw || "時間不明",
        scenario.loss || "ロスト率不明"
    ].forEach((text, index)=>{
        if(index > 0){
            const slash = document.createElement("span");
            slash.textContent = "/";
            meta.appendChild(slash);
        }

        const span = document.createElement("span");
        span.textContent = text;
        meta.appendChild(span);
    });

    return meta;
}

function createScenarioTags(scenario){
    const tags = document.createElement("div");
    tags.className = "scenario-tags";

    (scenario.tags || [])
    .slice(0, 4)
    .forEach(tag=>{
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = `#${tag}`;
        tags.appendChild(span);
    });

    return tags;
}

function createButtonArea(scenario){
    const buttonArea = document.createElement("div");
    buttonArea.className = "card-buttons";

    const detailBtn = document.createElement("button");
    detailBtn.type = "button";
    detailBtn.className = "button button-secondary";
    detailBtn.textContent = "詳細";

    detailBtn.addEventListener("click", ()=>{
        handlers.onDetail?.(scenario.id);
    });

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "button button-secondary";
    editBtn.textContent = "編集";

    editBtn.addEventListener("click", ()=>{
        handlers.onEdit?.(scenario.id);
    });

    buttonArea.append(detailBtn, editBtn);
    return buttonArea;
}

function createEmptyState(){
    const empty = document.createElement("p");
    empty.className = "scenario-empty";
    empty.textContent = "該当するシナリオがありません";
    return empty;
}