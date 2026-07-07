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

let allScenarios = [];
let selectedTags = [];

const elements = {};

init();

async function init(){
    bindElements();
    bindEvents();
    initNumberOptions();

    try {
        allScenarios = await fetchPublicScenarios();

        initSystemOptions(allScenarios);
        renderTagFilter(allScenarios);
        render();
    } catch (error) {
        console.error(error);
        renderError("公開データを読み込めませんでした。");
        updateResultCount(0, 0);
    }
}

function bindElements(){
    elements.keywordInput = getElement("keywordInput");
    elements.systemSelect = getElement("systemSelect");
    elements.playersSelect = getElement("playersSelect");
    elements.timeSelect = getElement("timeSelect");
    elements.ratingSelect = getElement("ratingSelect");
    elements.tagFilter = getElement("tagFilter");
    elements.clearTagBtn = getElement("clearTagBtn");
    elements.resetFilterBtn = getElement("resetFilterBtn");
    elements.resultCount = getElement("resultCount");
}

function bindEvents(){
    elements.keywordInput.addEventListener("input", render);
    elements.systemSelect.addEventListener("change", render);
    elements.playersSelect.addEventListener("change", render);
    elements.timeSelect.addEventListener("change", render);
    elements.ratingSelect.addEventListener("change", render);

    elements.clearTagBtn.addEventListener("click", ()=>{
        selectedTags = [];
        renderTagFilter(allScenarios);
        render();
    });

    elements.resetFilterBtn.addEventListener("click", ()=>{
        resetFilters();
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
            tags: selectedTags
        }
    );

    renderScenarioList(filtered);
    updateResultCount(filtered.length, allScenarios.length);
}

function resetFilters(){
    elements.keywordInput.value = "";
    elements.systemSelect.value = "";
    elements.playersSelect.value = "";
    elements.timeSelect.value = "";
    elements.ratingSelect.value = "";

    selectedTags = [];
    renderTagFilter(allScenarios);
}

function updateResultCount(current, total){
    elements.resultCount.textContent = `${current} / ${total}件`;
}

function getUniqueValues(values){
    return [
        ...new Set(
            values
            .map(value=>String(value ?? "").trim())
            .filter(Boolean)
        )
    ].sort((a, b)=>a.localeCompare(b, "ja"));
}

function getElement(id){
    const element = document.getElementById(id);

    if(!element){
        throw new Error(`#${id} が見つかりません`);
    }

    return element;
}