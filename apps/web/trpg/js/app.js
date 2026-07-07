import {
    PAGE_SIZE
} from "./config.js";

import {
    fetchPublicScenarios
} from "./scenarioApi.js";

import {
    filterScenarios
} from "./scenarioFilter.js";

import {
    renderError,
    renderScenarioList
} from "./scenarioList.js";

import {
    getTagsByUsageCount,
    getUniqueSystems
} from "./tagService.js";

import {
    sortScenarios
} from "./scenarioSort.js";

import {
    getFavorites,
    toggleFavorite
} from "./favoriteService.js";

import {
    initScenarioModal,
    openScenarioModal,
    refreshScenarioModal
} from "./scenarioModal.js";

import {
    renderActiveFilters
} from "./activeFilterView.js";

import {
    createFilterUrl,
    hasShareableFilterState,
    readFilterStateFromSearch
} from "./filterUrlState.js";

import {
    getElement
} from "./dom.js";

let allScenarios = [];
let selectedTags = [];
let favoriteIds = [];
let visibleCount = PAGE_SIZE;
let shareStatusTimer = null;

const elements = {};

init();

async function init(){
    bindElements();
    bindEvents();
    initNumberOptions();
    initScenarioModal({
        getFavoriteIds: ()=>favoriteIds,
        onToggleFavorite: handleToggleFavorite
    });

    favoriteIds = getFavorites();

    try {
        allScenarios = await fetchPublicScenarios();

        initSystemOptions(allScenarios);
        applyFilterStateFromUrl();
        renderTagFilter(allScenarios);
        render();
    } catch (error) {
        console.error(error);
        renderError("公開データを読み込めませんでした。");
        updateResultCount(0, 0, 0);
        updateLoadMoreButton(0, 0);
    }
}

function bindElements(){
    elements.keywordInput = getElement("keywordInput");
    elements.systemSelect = getElement("systemSelect");
    elements.playersSelect = getElement("playersSelect");
    elements.timeSelect = getElement("timeSelect");
    elements.ratingSelect = getElement("ratingSelect");
    elements.sortSelect = getElement("sortSelect");
    elements.favoriteOnlyInput = getElement("favoriteOnlyInput");
    elements.tagFilter = getElement("tagFilter");
    elements.clearTagBtn = getElement("clearTagBtn");
    elements.shareFilterBtn = getElement("shareFilterBtn");
    elements.shareFilterStatus = getElement("shareFilterStatus");
    elements.resetFilterBtn = getElement("resetFilterBtn");
    elements.activeFilters = getElement("activeFilters");
    elements.resultCount = getElement("resultCount");
    elements.loadMoreBtn = getElement("loadMoreBtn");
}

function bindEvents(){
    elements.keywordInput.addEventListener("input", ()=>{
        resetVisibleCount();
        render();
    });

    elements.systemSelect.addEventListener("change", ()=>{
        resetVisibleCount();
        render();
    });

    elements.playersSelect.addEventListener("change", ()=>{
        resetVisibleCount();
        render();
    });

    elements.timeSelect.addEventListener("change", ()=>{
        resetVisibleCount();
        render();
    });

    elements.ratingSelect.addEventListener("change", ()=>{
        resetVisibleCount();
        render();
    });

    elements.sortSelect.addEventListener("change", ()=>{
        resetVisibleCount();
        render();
    });

    elements.favoriteOnlyInput.addEventListener("change", ()=>{
        resetVisibleCount();
        render();
    });

    elements.clearTagBtn.addEventListener("click", ()=>{
        selectedTags = [];
        resetVisibleCount();
        renderTagFilter(allScenarios);
        render();
    });

    elements.resetFilterBtn.addEventListener("click", handleResetFilters);
    elements.shareFilterBtn.addEventListener("click", handleShareFilters);

    elements.loadMoreBtn.addEventListener("click", ()=>{
        visibleCount += PAGE_SIZE;
        render();
    });
}

function initNumberOptions(){
    appendNumberOptions(elements.playersSelect, 1, 10, "PL");
    appendNumberOptions(elements.timeSelect, 1, 30, "時間");
}

function appendNumberOptions(select, min, max, suffix){
    for(let i = min; i <= max; i++){
        const option = document.createElement("option");
        option.value = String(i);
        option.textContent = `${i}${suffix}`;
        select.appendChild(option);
    }
}

function initSystemOptions(scenarios){
    const systems = getUniqueSystems(scenarios);

    systems.forEach(system=>{
        const option = document.createElement("option");
        option.value = system;
        option.textContent = system;
        elements.systemSelect.appendChild(option);
    });
}

function renderTagFilter(scenarios){
    elements.tagFilter.textContent = "";

    const tags = getTagsByUsageCount(scenarios);

    if(tags.length === 0){
        const empty = document.createElement("span");
        empty.className = "tag";
        empty.textContent = "タグなし";
        elements.tagFilter.appendChild(empty);
        return;
    }

    const fragment = document.createDocumentFragment();

    tags.forEach(tag=>{
        const button = document.createElement("button");
        button.className = selectedTags.includes(tag)
            ? "tag-button is-active"
            : "tag-button";
        button.type = "button";
        button.dataset.tag = tag;
        button.textContent = tag;

        button.addEventListener("click", ()=>{
            toggleTag(tag);
        });

        fragment.appendChild(button);
    });

    elements.tagFilter.appendChild(fragment);
}

function toggleTag(tag){
    selectedTags = selectedTags.includes(tag)
        ? selectedTags.filter(selectedTag=>selectedTag !== tag)
        : [...selectedTags, tag];

    resetVisibleCount();
    renderTagFilter(allScenarios);
    render();
}

function render(){
    const currentFilterState = getCurrentFilterState();
    const activeFilterCount = renderActiveFilters(
        elements.activeFilters,
        currentFilterState,
        removeActiveFilter
    );
    const hasActiveFilters = activeFilterCount > 0;
    const urlFilterState = toUrlFilterState(currentFilterState);

    elements.resetFilterBtn.disabled = !hasActiveFilters;
    elements.clearTagBtn.disabled = selectedTags.length === 0;
    elements.shareFilterBtn.disabled = !hasShareableFilterState(urlFilterState);

    syncFilterUrl(urlFilterState);

    const filtered = filterScenarios(
        allScenarios,
        {
            keyword: elements.keywordInput.value,
            system: elements.systemSelect.value,
            players: elements.playersSelect.value,
            time: elements.timeSelect.value,
            rating: elements.ratingSelect.value,
            tags: selectedTags,
            favoriteOnly: elements.favoriteOnlyInput.checked,
            favoriteIds
        }
    );

    const sorted = sortScenarios(
        filtered,
        elements.sortSelect.value
    );

    const visibleScenarios = sorted.slice(
        0,
        visibleCount
    );

    renderScenarioList(
        visibleScenarios,
        {
            favoriteIds,
            onToggleFavorite: handleToggleFavorite,
            onOpenDetail: handleOpenDetail,
            hasActiveFilters,
            onResetFilters: handleResetFilters
        }
    );

    updateResultCount(
        visibleScenarios.length,
        sorted.length,
        allScenarios.length
    );

    updateLoadMoreButton(
        visibleScenarios.length,
        sorted.length
    );
}

function handleToggleFavorite(scenarioId){
    favoriteIds = toggleFavorite(scenarioId);

    resetVisibleCount();
    render();
    refreshScenarioModal();
}

function handleOpenDetail(scenarioId){
    const scenario = allScenarios.find(item=>String(item.id) === String(scenarioId));

    if(!scenario){
        return;
    }

    openScenarioModal(scenario);
}

function handleResetFilters(){
    resetFilters();
    render();
    elements.keywordInput.focus();
}

async function handleShareFilters(){
    try{
        if(!navigator.clipboard?.writeText){
            throw new Error("Clipboard API is unavailable");
        }

        await navigator.clipboard.writeText(window.location.href);
        showShareFilterStatus("条件URLをコピーしました");
    }catch(error){
        console.error(error);
        showShareFilterStatus(
            "コピーできませんでした。アドレスバーからコピーしてください"
        );
    }
}

function removeActiveFilter(item){
    switch(item.type){
        case "keyword":
            elements.keywordInput.value = "";
            break;
        case "system":
            elements.systemSelect.value = "";
            break;
        case "players":
            elements.playersSelect.value = "";
            break;
        case "time":
            elements.timeSelect.value = "";
            break;
        case "rating":
            elements.ratingSelect.value = "";
            break;
        case "favoriteOnly":
            elements.favoriteOnlyInput.checked = false;
            break;
        case "tag":
            selectedTags = selectedTags.filter(tag=>tag !== item.value);
            renderTagFilter(allScenarios);
            break;
        case "sort":
            elements.sortSelect.value = "recommended";
            break;
        default:
            return;
    }

    resetVisibleCount();
    render();
    focusFilterControl(item);
}

function focusFilterControl(item){
    if(item.type === "tag"){
        const tagButton = [
            ...elements.tagFilter.querySelectorAll(".tag-button")
        ]
        .find(button=>button.dataset.tag === item.value);

        tagButton?.focus();
        return;
    }

    const controls = {
        keyword: elements.keywordInput,
        system: elements.systemSelect,
        players: elements.playersSelect,
        time: elements.timeSelect,
        rating: elements.ratingSelect,
        favoriteOnly: elements.favoriteOnlyInput,
        sort: elements.sortSelect
    };

    controls[item.type]?.focus();
}

function getCurrentFilterState(){
    return {
        keyword: elements.keywordInput.value,
        system: getSelectState(elements.systemSelect),
        players: getSelectState(elements.playersSelect),
        time: getSelectState(elements.timeSelect),
        rating: getSelectState(elements.ratingSelect),
        favoriteOnly: elements.favoriteOnlyInput.checked,
        tags: selectedTags,
        sort: getSelectState(elements.sortSelect)
    };
}

function toUrlFilterState(filterState){
    return {
        keyword: filterState.keyword,
        system: filterState.system.value,
        players: filterState.players.value,
        time: filterState.time.value,
        rating: filterState.rating.value,
        tags: filterState.tags,
        sort: filterState.sort.value
    };
}

function applyFilterStateFromUrl(){
    const state = readFilterStateFromSearch(
        window.location.search,
        {
            systems: getUniqueSystems(allScenarios),
            tags: getTagsByUsageCount(allScenarios)
        }
    );

    elements.keywordInput.value = state.keyword;
    elements.systemSelect.value = state.system;
    elements.playersSelect.value = state.players;
    elements.timeSelect.value = state.time;
    elements.ratingSelect.value = state.rating;
    elements.sortSelect.value = state.sort;
    selectedTags = state.tags;
}

function syncFilterUrl(filterState){
    const nextUrl = createFilterUrl(
        window.location.href,
        filterState
    );

    if(nextUrl === window.location.href){
        return;
    }

    window.history.replaceState(
        window.history.state,
        "",
        nextUrl
    );

    clearShareFilterStatus();
}

function showShareFilterStatus(message){
    clearShareFilterStatus();
    elements.shareFilterStatus.textContent = message;

    shareStatusTimer = window.setTimeout(()=>{
        elements.shareFilterStatus.textContent = "";
        shareStatusTimer = null;
    }, 3000);
}

function clearShareFilterStatus(){
    if(shareStatusTimer){
        window.clearTimeout(shareStatusTimer);
        shareStatusTimer = null;
    }

    elements.shareFilterStatus.textContent = "";
}

function getSelectState(select){
    const selectedOption = select.options[select.selectedIndex];

    return {
        value: select.value,
        label: selectedOption?.textContent || select.value
    };
}

function resetFilters(){
    elements.keywordInput.value = "";
    elements.systemSelect.value = "";
    elements.playersSelect.value = "";
    elements.timeSelect.value = "";
    elements.ratingSelect.value = "";
    elements.sortSelect.value = "recommended";
    elements.favoriteOnlyInput.checked = false;

    selectedTags = [];
    resetVisibleCount();
    renderTagFilter(allScenarios);
}

function resetVisibleCount(){
    visibleCount = PAGE_SIZE;
}

function updateResultCount(visible, filtered, total){
    elements.resultCount.textContent = `${visible} / ${filtered}件表示`;

    if(filtered !== total){
        elements.resultCount.textContent += `（全${total}件）`;
    }
}

function updateLoadMoreButton(visible, filtered){
    const hasMore = visible < filtered;

    elements.loadMoreBtn.hidden = !hasMore;
    elements.loadMoreBtn.textContent = hasMore
        ? `もっと見る（残り${filtered - visible}件）`
        : "もっと見る";
}
