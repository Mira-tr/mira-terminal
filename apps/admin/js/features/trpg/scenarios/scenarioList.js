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
    const allScenarios = getScenarios();

    const result = filterScenarios(
        allScenarios,
        {
            keyword: getElement("search").value,
            status: getElement("statusFilter").value,
            system: getElement("systemFilter").value,
            sort: getElement("sort").value
        }
    );

    const fragment = document.createDocumentFragment();

    fragment.appendChild(
        createListSummary(result.length, allScenarios.length)
    );

    if(result.length === 0){
        fragment.appendChild(
            createEmptyState()
        );

        list.replaceChildren(fragment);
        return;
    }

    result.forEach(scenario=>{
        fragment.appendChild(
            createScenarioItem(scenario)
        );
    });

    list.replaceChildren(fragment);
}

function createListSummary(displayCount, totalCount){
    const summary = document.createElement("div");
    summary.className = "scenario-list-summary";

    const count = document.createElement("span");
    count.className = "scenario-list-count";
    count.textContent = `${displayCount}件表示 / 全${totalCount}件`;

    const hint = document.createElement("span");
    hint.className = "scenario-list-hint";
    hint.textContent = "未入力バッジがある項目は整理対象";

    summary.append(count, hint);
    return summary;
}

function createScenarioItem(scenario){
    const item = document.createElement("div");
    item.className = "scenario-item";

    const main = document.createElement("div");
    main.className = "scenario-main";

    main.append(
        createScenarioHead(scenario),
        createScenarioMeta(scenario),
        createScenarioSubMeta(scenario),
        createMissingInfo(scenario),
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

    const missingFields = getMissingFields(scenario);

    if(missingFields.length > 0){
        const warning = document.createElement("span");
        warning.className = "scenario-warning-badge";
        warning.textContent = `未入力 ${missingFields.length}`;
        head.appendChild(warning);
    }

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
            slash.className = "scenario-meta-separator";
            slash.textContent = "/";
            meta.appendChild(slash);
        }

        const span = document.createElement("span");
        span.textContent = text;
        meta.appendChild(span);
    });

    return meta;
}

function createScenarioSubMeta(scenario){
    const meta = document.createElement("div");
    meta.className = "scenario-sub-meta";

    const author = document.createElement("span");
    author.textContent = `作者：${scenario.author || "未入力"}`;

    const updatedAt = document.createElement("span");
    updatedAt.textContent = `更新：${formatDate(scenario.updatedAt || scenario.createdAt)}`;

    meta.append(author, updatedAt);
    return meta;
}

function createMissingInfo(scenario){
    const missingFields = getMissingFields(scenario);
    const info = document.createElement("div");
    info.className = "scenario-missing";

    if(missingFields.length === 0){
        info.hidden = true;
        return info;
    }

    info.textContent = `未入力：${missingFields.join(" / ")}`;
    return info;
}

function createScenarioTags(scenario){
    const tags = document.createElement("div");
    tags.className = "scenario-tags";

    const visibleTags = (scenario.tags || []).slice(0, 4);

    visibleTags.forEach(tag=>{
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = `#${tag}`;
        tags.appendChild(span);
    });

    const hiddenTagCount = (scenario.tags || []).length - visibleTags.length;

    if(hiddenTagCount > 0){
        const more = document.createElement("span");
        more.className = "tag tag-muted";
        more.textContent = `+${hiddenTagCount}`;
        tags.appendChild(more);
    }

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
    empty.textContent = "該当するシナリオがありません。検索条件かフィルターを確認してください。";
    return empty;
}

function getMissingFields(scenario){
    const missing = [];

    if(!scenario.title){
        missing.push("タイトル");
    }

    if(!scenario.author){
        missing.push("作者");
    }

    if(!scenario.playersRaw){
        missing.push("人数");
    }

    if(!scenario.timeRaw){
        missing.push("時間");
    }

    if(scenario.status === "public" && !scenario.url){
        missing.push("URL");
    }

    return missing;
}

function formatDate(value){
    const timestamp = Number(value);

    if(!Number.isFinite(timestamp)){
        return "日付不明";
    }

    const date = new Date(timestamp);

    if(Number.isNaN(date.getTime())){
        return "日付不明";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}/${month}/${day}`;
}