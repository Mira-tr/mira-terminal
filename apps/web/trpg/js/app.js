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

let allScenarios = [];
let selectedTags = [];
let favoriteIds = [];
let visibleCount = PAGE_SIZE;

const elements = {};

init();

async function init(){
    bindElements();
    bindEvents();
    initNumberOptions();

    favoriteIds = getFavorites();

    try {
        allScenarios = await fetchPublicScenarios();

        initSystemOptions(allScenarios);
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
    elements.resetFilterBtn = getElement("resetFilterBtn");
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

    elements.resetFilterBtn.addEventListener("click", ()=>{
        resetFilters();
        render();
    });

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
            onToggleFavorite: handleToggleFavorite
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

function getElement(id){
    const element = document.getElementById(id);

    if(!element){
        throw new Error(`#${id} が見つかりません`);
    }

    return element;
}