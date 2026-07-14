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

import {
    createTagFilterModel,
    DESKTOP_VISIBLE_TAG_LIMIT,
    MOBILE_VISIBLE_TAG_LIMIT
} from "./tagFilterView.js";

const MOBILE_TAG_LIMIT_QUERY = "(max-width: 640px)";

let allScenarios = [];
let selectedTags = [];
let favoriteIds = [];
let visibleCount = PAGE_SIZE;
let shareStatusTimer = null;
let tagFilterExpanded = false;

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
    elements.authorInput = getElement("authorInput");
    elements.systemSelect = getElement("systemSelect");
    elements.playersSelect = getElement("playersSelect");
    elements.timeSelect = getElement("timeSelect");
    elements.ratingSelect = getElement("ratingSelect");
    elements.sortSelect = getElement("sortSelect");
    elements.favoriteOnlyInput = getElement("favoriteOnlyInput");
    elements.tagSearchInput = getElement("tagSearchInput");
    elements.selectedTagFilter = getElement("selectedTagFilter");
    elements.tagFilter = getElement("tagFilter");
    elements.tagFilterStatus = getElement("tagFilterStatus");
    elements.toggleTagListBtn = getElement("toggleTagListBtn");
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

    elements.authorInput.addEventListener("input", ()=>{
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

    elements.tagSearchInput.addEventListener("input", ()=>{
        renderTagFilter(allScenarios);
    });

    elements.toggleTagListBtn.addEventListener("click", ()=>{
        tagFilterExpanded = !tagFilterExpanded;
        renderTagFilter(allScenarios);
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

    bindResponsiveTagLimit();
}

function bindResponsiveTagLimit(){
    if(!window.matchMedia){
        return;
    }

    const mediaQuery = window.matchMedia(MOBILE_TAG_LIMIT_QUERY);

    const handleChange = ()=>{
        renderTagFilter(allScenarios);
    };

    if(mediaQuery.addEventListener){
        mediaQuery.addEventListener("change", handleChange);
        return;
    }

    mediaQuery.addListener(handleChange);
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
    const tags = getTagsByUsageCount(scenarios);
    const visibleTagLimit = getVisibleTagLimit();
    const model = createTagFilterModel(tags, {
        selectedTags,
        searchQuery: elements.tagSearchInput.value,
        expanded: tagFilterExpanded,
        limit: visibleTagLimit
    });

    renderSelectedTags(model.selectedTags);
    elements.tagFilter.replaceChildren();
    elements.tagFilter.classList.toggle(
        "is-scrollable",
        model.expanded || model.isSearchActive
    );

    if(tags.length === 0){
        elements.tagFilter.appendChild(
            createTagFilterMessage("タグなし")
        );
        updateTagFilterControls(model);
        return;
    }

    if(model.visibleTags.length === 0){
        const message = model.isSearchActive
            ? "一致するタグがありません"
            : "選択中のタグだけを表示しています";
        elements.tagFilter.appendChild(
            createTagFilterMessage(message)
        );
        updateTagFilterControls(model);
        return;
    }

    const fragment = document.createDocumentFragment();

    model.visibleTags.forEach(tag=>{
        fragment.appendChild(createTagFilterButton(tag, false));
    });

    elements.tagFilter.replaceChildren(fragment);
    updateTagFilterControls(model);
}

function renderSelectedTags(tags){
    if(tags.length === 0){
        elements.selectedTagFilter.replaceChildren();
        elements.selectedTagFilter.hidden = true;
        return;
    }

    const label = document.createElement("span");
    label.className = "selected-tag-filter-label";
    label.textContent = "選択中";

    const list = document.createElement("div");
    list.className = "selected-tag-filter-list";
    list.replaceChildren(
        ...tags.map(tag=>createTagFilterButton(tag, true))
    );

    elements.selectedTagFilter.replaceChildren(label, list);
    elements.selectedTagFilter.hidden = false;
}

function createTagFilterButton(tag, selected){
    const button = document.createElement("button");
    button.className = selected
        ? "tag-button is-active"
        : "tag-button";
    button.type = "button";
    button.dataset.tag = tag;
    button.textContent = selected
        ? `${tag} ×`
        : tag;
    button.setAttribute("aria-pressed", String(selected));
    button.setAttribute(
        "aria-label",
        selected ? `${tag}を解除` : `${tag}で絞り込む`
    );

    button.addEventListener("click", ()=>{
        toggleTag(tag);
    });

    return button;
}

function createTagFilterMessage(text){
    const message = document.createElement("p");
    message.className = "tag-filter-empty";
    message.textContent = text;
    return message;
}

function updateTagFilterControls(model){
    elements.toggleTagListBtn.hidden = !model.showToggle;
    elements.toggleTagListBtn.textContent = model.expanded
        ? "タグを折りたたむ"
        : "すべてのタグを表示";
    elements.toggleTagListBtn.setAttribute(
        "aria-expanded",
        String(model.expanded)
    );

    if(model.isSearchActive){
        elements.tagFilterStatus.textContent = `${model.matchingTagCount}件のタグが一致`;
        return;
    }

    elements.tagFilterStatus.textContent = model.showToggle && !model.expanded
        ? `上位${model.limit}件を表示`
        : `${model.totalTagCount}件のタグ`;
}

function getVisibleTagLimit(){
    return window.matchMedia?.(MOBILE_TAG_LIMIT_QUERY).matches
        ? MOBILE_VISIBLE_TAG_LIMIT
        : DESKTOP_VISIBLE_TAG_LIMIT;
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
            author: elements.authorInput.value,
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
            favoriteOnly: elements.favoriteOnlyInput.checked,
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
        case "author":
            elements.authorInput.value = "";
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

        (tagButton || elements.tagSearchInput).focus();
        return;
    }

    const controls = {
        keyword: elements.keywordInput,
        author: elements.authorInput,
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
        author: elements.authorInput.value,
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
        author: filterState.author,
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
    elements.authorInput.value = state.author;
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
    elements.authorInput.value = "";
    elements.systemSelect.value = "";
    elements.playersSelect.value = "";
    elements.timeSelect.value = "";
    elements.ratingSelect.value = "";
    elements.sortSelect.value = "recommended";
    elements.favoriteOnlyInput.checked = false;
    elements.tagSearchInput.value = "";

    selectedTags = [];
    tagFilterExpanded = false;
    resetVisibleCount();
    renderTagFilter(allScenarios);
}

function resetVisibleCount(){
    visibleCount = PAGE_SIZE;
}

function updateResultCount(visible, filtered, total){
    elements.resultCount.textContent = `${filtered}件中 ${visible}件を表示`;

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
