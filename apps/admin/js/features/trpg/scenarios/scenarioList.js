import {
    getElement
} from "../../../utils.js";

import {
    getMasterTags
} from "../tags.js";

import {
    getScenarios
} from "./scenarioStore.js";

import {
    filterScenarios
} from "./scenarioFilter.js";

import {
    getPublicIssues,
    getPublicWarnings,
    ratingClass,
    ratingText,
    statusClass,
    statusText
} from "./scenarioUtils.js";

import {
    getStorageLocationSummary
} from "./scenarioStorage.js";

let handlers = {};
let selectedFilterTags = [];
let activeScenarioId = "";
let isInitialized = false;

export function initScenarioList(events){
    handlers = events || {};

    if(isInitialized){
        return;
    }

    isInitialized = true;
    bindTagFilterEvents();

    window.addEventListener("mira:tags-changed", ()=>{
        syncSelectedFilterTags();
        renderScenarioList();
    });
}

export function renderScenarioList(){
    const list = getElement("scenarioList");
    const allScenarios = getScenarios();

    syncSelectedFilterTags();
    renderScenarioTagFilter();

    const result = filterScenarios(
        allScenarios,
        {
            keyword: getElement("search").value,
            status: getElement("statusFilter").value,
            system: getElement("systemFilter").value,
            tags: selectedFilterTags,
            publicWarningOnly: getElement("publicWarningOnly").checked,
            sort: getElement("sort").value
        }
    );

    const fragment = document.createDocumentFragment();
    fragment.appendChild(
        createListSummary(
            result.length,
            allScenarios.length,
            getActiveFilterCount(),
            getListStats(allScenarios)
        )
    );

    if(result.length === 0){
        fragment.appendChild(createEmptyState());
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

export function setActiveScenarioListItem(id){
    activeScenarioId = String(id || "");
}

function bindTagFilterEvents(){
    const clearButton = document.getElementById("clearScenarioTagFilter");

    if(!clearButton){
        return;
    }

    clearButton.addEventListener("click", ()=>{
        selectedFilterTags = [];
        renderScenarioList();
    });
}

function renderScenarioTagFilter(){
    const area = getElement("scenarioTagFilter");
    const masterTags = getMasterTags();
    const fragment = document.createDocumentFragment();

    if(masterTags.length === 0){
        const empty = document.createElement("p");
        empty.className = "tag-filter-empty";
        empty.textContent = "タグ候補はまだありません";
        area.replaceChildren(empty);
        updateClearTagFilterButton();
        return;
    }

    masterTags.forEach(tag=>{
        fragment.appendChild(
            createTagFilterButton(tag)
        );
    });

    area.replaceChildren(fragment);
    updateClearTagFilterButton();
}

function createTagFilterButton(tag){
    const button = document.createElement("button");
    button.type = "button";
    button.className = selectedFilterTags.includes(tag)
        ? "tag-filter-button is-active"
        : "tag-filter-button";

    button.textContent = `#${tag}`;
    button.setAttribute("aria-pressed", String(selectedFilterTags.includes(tag)));

    button.addEventListener("click", ()=>{
        toggleFilterTag(tag);
    });

    return button;
}

function toggleFilterTag(tag){
    selectedFilterTags = selectedFilterTags.includes(tag)
        ? selectedFilterTags.filter(item=>item !== tag)
        : [...selectedFilterTags, tag];

    renderScenarioList();
}

function syncSelectedFilterTags(){
    const masterTags = getMasterTags();

    selectedFilterTags = selectedFilterTags.filter(
        tag=>masterTags.includes(tag)
    );
}

function updateClearTagFilterButton(){
    const clearButton = document.getElementById("clearScenarioTagFilter");

    if(!clearButton){
        return;
    }

    clearButton.disabled = selectedFilterTags.length === 0;
}

function createListSummary(displayCount, totalCount, activeFilterCount, stats){
    const summary = document.createElement("div");
    summary.className = "scenario-list-summary";

    const count = document.createElement("span");
    count.className = "scenario-list-count";
    count.textContent = `${displayCount}件表示 / 全${totalCount}件`;

    const hint = document.createElement("span");
    hint.className = "scenario-list-hint";
    hint.textContent = activeFilterCount > 0
        ? `条件${activeFilterCount}件で絞り込み中`
        : "公開前に確認が必要な項目は警告として表示されます。";

    const statsList = document.createElement("span");
    statsList.className = "scenario-list-stats";
    statsList.append(
        createSummaryFilterButton(`公開${stats.publicCount}`, "public"),
        createSummaryFilterButton(`要確認${stats.warningCount}`, "warning"),
        createSummaryFilterButton(`下書き${stats.draftCount}`, "draft")
    );

    summary.append(count, hint, statsList);

    if(activeFilterCount > 0){
        const clearButton = document.createElement("button");
        clearButton.type = "button";
        clearButton.className = "scenario-list-clear";
        clearButton.textContent = "条件を解除";
        clearButton.addEventListener("click", clearScenarioListFilters);
        summary.appendChild(clearButton);
    }

    return summary;
}

function createSummaryFilterButton(text, filter){
    const button = document.createElement("button");
    button.type = "button";
    button.className = "scenario-summary-filter";
    button.textContent = text;
    button.addEventListener("click", ()=>{
        applySummaryFilter(filter);
    });

    return button;
}

function applySummaryFilter(filter){
    if(filter === "public"){
        getElement("statusFilter").value = "public";
        getElement("publicWarningOnly").checked = false;
    }

    if(filter === "warning"){
        getElement("statusFilter").value = "public";
        getElement("publicWarningOnly").checked = true;
    }

    if(filter === "draft"){
        getElement("statusFilter").value = "draft";
        getElement("publicWarningOnly").checked = false;
    }

    renderScenarioList();
}

function getListStats(scenarios){
    return scenarios.reduce((stats, scenario)=>{
        if(scenario.status === "public"){
            stats.publicCount += 1;
            stats.warningCount += getPublicIssues(scenario).length;
        }

        if(scenario.status === "draft" || scenario.status === "ready"){
            stats.draftCount += 1;
        }

        return stats;
    }, {
        publicCount: 0,
        warningCount: 0,
        draftCount: 0
    });
}

function getActiveFilterCount(){
    return [
        getElement("search").value.trim(),
        getElement("statusFilter").value,
        getElement("systemFilter").value,
        getElement("publicWarningOnly").checked ? "public-warning" : "",
        ...selectedFilterTags
    ].filter(Boolean).length;
}

function clearScenarioListFilters(){
    getElement("search").value = "";
    getElement("statusFilter").value = "";
    getElement("systemFilter").value = "";
    getElement("publicWarningOnly").checked = false;
    selectedFilterTags = [];
    renderScenarioList();
}

function createScenarioItem(scenario){
    const item = document.createElement("div");
    item.className = "scenario-item";

    if(getPublicWarnings(scenario).length > 0){
        item.classList.add("has-public-warning");
    }

    if(activeScenarioId && scenario.id === activeScenarioId){
        item.classList.add("is-editing");
    }

    const main = document.createElement("div");
    main.className = "scenario-main";
    main.tabIndex = 0;
    main.role = "button";
    main.setAttribute("aria-label", `${scenario.title || "無題"}を編集`);

    main.append(
        createScenarioHead(scenario),
        createScenarioMeta(scenario),
        createScenarioSubMeta(scenario),
        createScenarioPublicState(scenario),
        createScenarioStorage(scenario),
        createMissingInfo(scenario),
        createPublicWarningInfo(scenario),
        createScenarioTags(scenario)
    );
    main.addEventListener("click", ()=>{
        handlers.onEdit?.(scenario.id);
    });
    main.addEventListener("keydown", event=>{
        if(event.key !== "Enter" && event.key !== " "){
            return;
        }

        event.preventDefault();
        handlers.onEdit?.(scenario.id);
    });

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
    const publicWarnings = getPublicWarnings(scenario);

    if(missingFields.length > 0){
        const warning = document.createElement("span");
        warning.className = "scenario-warning-badge";
        warning.textContent = `未入力 ${missingFields.length}`;
        head.appendChild(warning);
    }

    if(publicWarnings.length > 0){
        const publicWarning = document.createElement("button");
        publicWarning.type = "button";
        publicWarning.className = "scenario-public-warning-badge";
        publicWarning.textContent = `公開確認 ${publicWarnings.length}`;
        publicWarning.addEventListener("click", event=>{
            event.stopPropagation();
            handlers.onFixPublicIssues?.(scenario.id);
        });
        head.appendChild(publicWarning);
    }

    return head;
}

function createScenarioMeta(scenario){
    const meta = document.createElement("div");
    meta.className = "scenario-meta";

    [
        scenario.system || "システム未設定",
        scenario.playersRaw || "人数未設定",
        scenario.timeRaw || "時間未設定",
        scenario.loss || "ロスト可能性未設定"
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
    author.textContent = `作者: ${scenario.author || "未入力"}`;

    const updatedAt = document.createElement("span");
    updatedAt.textContent = `更新: ${formatDate(scenario.updatedAt || scenario.createdAt)}`;

    meta.append(author, updatedAt);
    return meta;
}

function createScenarioPublicState(scenario){
    const state = document.createElement("div");
    const issues = getPublicIssues(scenario);

    state.className = "scenario-public-state";

    if(scenario.status !== "public"){
        state.dataset.state = "hidden";
        state.textContent = "Publicにはまだ出ません";
        return state;
    }

    if(issues.length > 0){
        state.dataset.state = "warn";
        state.textContent = "Publicに出ます。先に確認すると安全です。";
        return state;
    }

    state.dataset.state = "ready";
    state.textContent = "Publicに出ます";
    return state;
}

function createScenarioStorage(scenario){
    const storage = document.createElement("div");
    storage.className = "scenario-storage";

    const summary = getStorageLocationSummary(
        scenario.storageLocations
    );

    if(!summary){
        storage.hidden = true;
        return storage;
    }

    storage.textContent = `保存: ${summary}`;
    return storage;
}

function createMissingInfo(scenario){
    const missingFields = getMissingFields(scenario);
    const info = document.createElement("div");
    info.className = "scenario-missing";

    if(missingFields.length === 0){
        info.hidden = true;
        return info;
    }

    info.textContent = `未入力: ${missingFields.join(" / ")}`;
    return info;
}

function createPublicWarningInfo(scenario){
    const warnings = getPublicWarnings(scenario);
    const info = document.createElement("div");
    info.className = "scenario-public-warning";

    if(warnings.length === 0){
        info.hidden = true;
        return info;
    }

    info.textContent = `公開前確認: ${warnings.join(" / ")}`;
    return info;
}

function createScenarioTags(scenario){
    const tags = document.createElement("div");
    tags.className = "scenario-tags";

    const visibleTags = (scenario.tags || []).slice(0, 4);

    visibleTags.forEach(tag=>{
        const span = document.createElement("span");
        span.className = selectedFilterTags.includes(tag)
            ? "tag tag-hit"
            : "tag";
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

    buttonArea.appendChild(createStatusChanger(scenario));

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

    const duplicateBtn = document.createElement("button");
    duplicateBtn.type = "button";
    duplicateBtn.className = "button button-secondary";
    duplicateBtn.textContent = "複製";
    duplicateBtn.addEventListener("click", ()=>{
        handlers.onDuplicate?.(scenario.id);
    });

    buttonArea.append(detailBtn, editBtn, duplicateBtn);
    return buttonArea;
}

function createStatusChanger(scenario){
    const wrapper = document.createElement("label");
    wrapper.className = "scenario-status-change";

    const labelText = document.createElement("span");
    labelText.textContent = "状態";

    const select = document.createElement("select");
    select.setAttribute("aria-label", `${scenario.title || "無題"}の状態`);
    [
        ["draft", "未整理"],
        ["ready", "整理済み"],
        ["public", "公開"],
        ["private", "非公開"]
    ].forEach(([value, label])=>{
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
    });
    select.value = scenario.status || "draft";
    select.addEventListener("change", ()=>{
        handlers.onStatusChange?.(scenario.id, select.value);
    });

    wrapper.append(labelText, select);
    return wrapper;
}

function createEmptyState(){
    const empty = document.createElement("p");
    empty.className = "scenario-empty";
    empty.textContent = "該当するシナリオはありません。検索条件、フィルター、タグ絞り込みを確認してください。";
    return empty;
}

function getMissingFields(scenario){
    const missing = [];

    if(!scenario.title){
        missing.push("シナリオ名");
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
