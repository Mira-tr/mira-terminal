import {
    getElement,
    clearElement
} from "./dom.js";

import {
    isFavorite
} from "./favoriteService.js";

let modalElement;
let modalBodyElement;
let modalCloseButton;
let currentScenario = null;
let favoriteIdsGetter = ()=>[];
let toggleFavoriteHandler = null;

export function initScenarioModal(options = {}){
    modalElement = getElement("scenarioModal");
    modalBodyElement = getElement("modalBody");
    modalCloseButton = getElement("modalCloseBtn");

    favoriteIdsGetter = typeof options.getFavoriteIds === "function"
        ? options.getFavoriteIds
        : ()=>[];

    toggleFavoriteHandler = typeof options.onToggleFavorite === "function"
        ? options.onToggleFavorite
        : null;

    modalCloseButton.addEventListener("click", closeScenarioModal);

    modalElement.addEventListener("click", event=>{
        if(event.target.closest("[data-modal-close]")){
            closeScenarioModal();
        }
    });

    document.addEventListener("keydown", event=>{
        if(event.key === "Escape" && !modalElement.hidden){
            closeScenarioModal();
        }
    });
}

export function openScenarioModal(scenario){
    currentScenario = scenario;
    renderScenarioModal();

    modalElement.hidden = false;
    document.body.classList.add("is-modal-open");

    modalCloseButton.focus();
}

export function closeScenarioModal(){
    if(!modalElement){
        return;
    }

    modalElement.hidden = true;
    document.body.classList.remove("is-modal-open");
    currentScenario = null;
    clearElement(modalBodyElement);
}

export function refreshScenarioModal(){
    if(!currentScenario || modalElement.hidden){
        return;
    }

    renderScenarioModal();
}

function renderScenarioModal(){
    clearElement(modalBodyElement);

    if(!currentScenario){
        return;
    }

    modalBodyElement.appendChild(createTitleArea(currentScenario));
    modalBodyElement.appendChild(createMetaGrid(currentScenario));
    modalBodyElement.appendChild(createTagArea(currentScenario));
    modalBodyElement.appendChild(createActionArea(currentScenario));
}

function createTitleArea(scenario){
    const area = document.createElement("div");
    area.className = "modal-title-area";

    const title = document.createElement("h3");
    title.className = "modal-scenario-title";
    title.textContent = scenario.title || "無題";

    const sub = document.createElement("p");
    sub.className = "modal-scenario-sub";
    sub.textContent = [
        scenario.kana,
        scenario.author ? `作者：${scenario.author}` : "作者：不明"
    ]
    .filter(Boolean)
    .join(" / ");

    area.append(title, sub);

    return area;
}

function createMetaGrid(scenario){
    const grid = document.createElement("dl");
    grid.className = "modal-meta-grid";

    addMeta(grid, "システム", scenario.system || "不明");
    addMeta(grid, "人数", scenario.playersRaw || "不明");
    addMeta(grid, "時間", scenario.timeRaw || "不明");
    addMeta(grid, "ロスト率", scenario.loss || "不明");
    addMeta(grid, "年齢区分", ratingText(scenario.rating));

    return grid;
}

function addMeta(parent, label, value){
    const item = document.createElement("div");
    item.className = "modal-meta-item";

    const dt = document.createElement("dt");
    dt.className = "modal-meta-label";
    dt.textContent = label;

    const dd = document.createElement("dd");
    dd.className = "modal-meta-value";
    dd.textContent = value;

    item.append(dt, dd);
    parent.appendChild(item);
}

function createTagArea(scenario){
    const area = document.createElement("div");
    area.className = "modal-tag-area";

    const title = document.createElement("h4");
    title.className = "modal-block-title";
    title.textContent = "タグ";

    const list = document.createElement("div");
    list.className = "modal-tag-list";

    const tags = Array.isArray(scenario.tags)
        ? scenario.tags
        : [];

    if(tags.length === 0){
        list.appendChild(createTag("タグなし"));
    } else {
        tags.forEach(tag=>{
            list.appendChild(createTag(tag));
        });
    }

    area.append(title, list);

    return area;
}

function createTag(text){
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = text;

    return tag;
}

function createActionArea(scenario){
    const area = document.createElement("div");
    area.className = "modal-action-area";

    area.appendChild(createFavoriteButton(scenario));

    if(isSafeHttpUrl(scenario.url)){
        area.appendChild(createScenarioLink(scenario.url));
    } else {
        area.appendChild(createDisabledLink());
    }

    return area;
}

function createFavoriteButton(scenario){
    const favoriteIds = favoriteIdsGetter();
    const active = isFavorite(scenario.id, favoriteIds);

    const button = document.createElement("button");
    button.className = active
        ? "button button-ghost modal-favorite-button is-active"
        : "button button-ghost modal-favorite-button";
    button.type = "button";
    button.setAttribute("aria-pressed", String(active));
    button.textContent = active
        ? "★ お気に入り済み"
        : "☆ お気に入りに追加";

    button.addEventListener("click", ()=>{
        if(typeof toggleFavoriteHandler === "function"){
            toggleFavoriteHandler(scenario.id);
        }
    });

    return button;
}

function createScenarioLink(url){
    const link = document.createElement("a");
    link.className = "modal-primary-link";
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "配布ページを見る";

    return link;
}

function createDisabledLink(){
    const span = document.createElement("span");
    span.className = "modal-primary-link is-disabled";
    span.textContent = "URLなし";

    return span;
}

function ratingText(rating){
    return {
        all: "全年齢",
        r18: "R18",
        r18g: "R18G"
    }[rating] || "全年齢";
}

function isSafeHttpUrl(url){
    try {
        const parsed = new URL(url);

        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
}