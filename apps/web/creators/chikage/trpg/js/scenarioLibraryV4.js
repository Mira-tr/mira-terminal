import { fetchPublicScenarios } from "./scenarioApi.js";
import { closeScenarioModal, openScenarioModal } from "./scenarioModal.js";

const list = document.querySelector("#scenarioList");
const search = document.querySelector("#keywordInput");
const controls = document.querySelector(".library-control-bar");
const modal = document.querySelector("#scenarioModal");
const scenarioPromise = fetchPublicScenarios().catch(() => []);
let scenarios = [];
let modalScenarioId = "";
let enhancementQueued = false;

if(list && search && controls && modal){
    document.body.classList.add("scenario-library-v4");
    controls.classList.add("library-control-bar--v4");

    scenarioPromise.then(items => {
        scenarios = Array.isArray(items) ? items : [];
        enhanceList();
        openScenarioFromUrl();
    });

    const observer = new MutationObserver(queueEnhance);
    observer.observe(list, { childList: true, subtree: true });
    observer.observe(modal, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });

    list.addEventListener("click", handleListClick, true);
    list.addEventListener("keydown", handleListKeydown);
    document.addEventListener("keydown", handleShortcut);
    document.addEventListener("keydown", handleModalEscape, true);
    modal.addEventListener("click", handleModalCloseIntent, true);
    window.addEventListener("popstate", syncModalFromUrl);

    enhanceControls();
    enhanceList();
}

function queueEnhance(){
    if(enhancementQueued) return;
    enhancementQueued = true;
    queueMicrotask(() => {
        enhancementQueued = false;
        enhanceList();
        enhanceModal();
        enhanceControls();
    });
}

function enhanceControls(){
    const summary = document.querySelector("#advancedFilters > summary");
    if(summary && !summary.dataset.v4Label){
        summary.dataset.v4Label = "true";
        const hint = document.createElement("small");
        hint.className = "library-more-filters__hint";
        hint.textContent = "作者・タグ・R18・形式";
        summary.appendChild(hint);
    }

    if(!controls.querySelector(".library-v4-shortcuts")){
        const shortcuts = document.createElement("div");
        shortcuts.className = "library-v4-shortcuts";
        shortcuts.setAttribute("aria-label", "検索ショートカット");
        shortcuts.append(
            createShortcut("2PL", "playersSelect", "2"),
            createShortcut("4PL", "playersSelect", "4"),
            createShortcut("4時間", "timeSelect", "4"),
            createShortcut("8時間", "timeSelect", "8"),
            createShortcut("R18", "ratingSelect", "r18")
        );
        const active = document.querySelector("#activeFilters");
        active?.before(shortcuts);
    }
}

function createShortcut(label, controlId, value){
    const button = document.createElement("button");
    button.type = "button";
    button.className = "library-v4-shortcut";
    button.textContent = label;
    button.addEventListener("click", () => {
        const control = document.getElementById(controlId);
        if(!control) return;
        control.value = control.value === value ? "" : value;
        control.dispatchEvent(new Event("change", { bubbles: true }));
        syncShortcutStates();
    });
    button.dataset.controlId = controlId;
    button.dataset.value = value;
    return button;
}

function syncShortcutStates(){
    controls.querySelectorAll(".library-v4-shortcut").forEach(button => {
        const control = document.getElementById(button.dataset.controlId || "");
        const active = Boolean(control && control.value === button.dataset.value);
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
    });
}

function enhanceList(){
    if(!list) return;
    const cards = Array.from(list.querySelectorAll(".scenario-item"));
    cards.forEach(card => {
        card.classList.add("scenario-item--v4");
        const titleBlock = card.querySelector(".scenario-title-block");
        const title = card.querySelector(".scenario-title")?.textContent?.trim() || "";
        const authorText = card.querySelector(".scenario-author")?.textContent?.trim() || "";
        const author = authorText === "作者不明" ? "" : authorText;
        const matched = findScenario(title, author);
        if(matched) card.dataset.scenarioId = String(matched.id);

        if(titleBlock && !titleBlock.dataset.v4Interactive){
            titleBlock.dataset.v4Interactive = "true";
            titleBlock.tabIndex = 0;
            titleBlock.setAttribute("role", "button");
            titleBlock.setAttribute("aria-label", `${title || "シナリオ"}の詳細を見る`);
        }
    });
    syncShortcutStates();
}

function findScenario(title, author){
    return scenarios.find(item => {
        const sameTitle = String(item?.title || "").trim() === title;
        const itemAuthor = String(item?.author || "").trim();
        return sameTitle && (!author || itemAuthor === author);
    }) || null;
}

function handleListClick(event){
    const target = event.target instanceof Element ? event.target : null;
    if(!target) return;
    const titleBlock = target.closest(".scenario-title-block");
    if(titleBlock && !target.closest("button,a,input,select,textarea")){
        event.preventDefault();
        titleBlock.closest(".scenario-item")?.querySelector(".scenario-detail-button")?.click();
        return;
    }

    const detail = target.closest(".scenario-detail-button");
    if(!detail) return;
    const card = detail.closest(".scenario-item");
    const scenarioId = String(card?.dataset?.scenarioId || "");
    if(scenarioId) setScenarioUrl(scenarioId, true);
}

function handleListKeydown(event){
    if(!(event.target instanceof Element) || !event.target.matches(".scenario-title-block")) return;
    if(event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.target.closest(".scenario-item")?.querySelector(".scenario-detail-button")?.click();
}

function handleShortcut(event){
    if(event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
    const active = document.activeElement;
    if(active && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)) return;
    event.preventDefault();
    search.focus();
    search.select();
}

function handleModalEscape(event){
    if(event.key === "Escape" && !modal.hidden){
        removeScenarioUrl(false);
    }
}

function handleModalCloseIntent(event){
    const target = event.target instanceof Element ? event.target : null;
    if(!target) return;
    if(target.closest("#modalCloseBtn") || target.closest("[data-modal-close]")){
        removeScenarioUrl(false);
    }
}

function enhanceModal(){
    if(modal.hidden) return;
    const actionArea = modal.querySelector(".modal-action-area");
    if(!actionArea || actionArea.querySelector(".library-v4-copy-detail")) return;
    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "button button-ghost library-v4-copy-detail";
    copy.textContent = "詳細URLをコピー";
    copy.addEventListener("click", async () => {
        try{
            await navigator.clipboard.writeText(window.location.href);
            copy.textContent = "コピーしました";
        }catch{
            copy.textContent = "アドレスバーからコピー";
        }
        window.setTimeout(() => { copy.textContent = "詳細URLをコピー"; }, 1800);
    });
    actionArea.appendChild(copy);
}

async function openScenarioFromUrl(){
    const id = readScenarioId();
    if(!id || id === modalScenarioId) return;
    const scenario = scenarios.find(item => String(item?.id || "") === id);
    if(!scenario) return;
    modalScenarioId = id;
    openScenarioModal(scenario);
    enhanceModal();
}

function syncModalFromUrl(){
    const id = readScenarioId();
    if(!id){
        modalScenarioId = "";
        if(!modal.hidden) closeScenarioModal();
        return;
    }
    openScenarioFromUrl();
}

function readScenarioId(){
    const id = new URL(window.location.href).searchParams.get("scenario") || "";
    return /^[A-Za-z0-9_-]{1,100}$/.test(id) ? id : "";
}

function setScenarioUrl(id, push){
    if(!/^[A-Za-z0-9_-]{1,100}$/.test(id)) return;
    const url = new URL(window.location.href);
    url.searchParams.set("scenario", id);
    const method = push ? "pushState" : "replaceState";
    window.history[method](window.history.state, "", url);
    modalScenarioId = id;
}

function removeScenarioUrl(push){
    const url = new URL(window.location.href);
    if(!url.searchParams.has("scenario")) return;
    url.searchParams.delete("scenario");
    const method = push ? "pushState" : "replaceState";
    window.history[method](window.history.state, "", url);
    modalScenarioId = "";
}
