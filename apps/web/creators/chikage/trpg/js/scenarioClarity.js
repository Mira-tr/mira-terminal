const advanced = document.querySelector("#advancedFilters");
const closeButton = document.querySelector("#filterSheetCloseBtn");
const doneButton = document.querySelector("#filterSheetDoneBtn");
const loadMoreButton = document.querySelector("#loadMoreBtn");
const scenarioList = document.querySelector("#scenarioList");
const summary = advanced?.querySelector("summary");

let allowUserOpen = false;
let favoriteRestoreTarget = 0;

ensureCompactFilterStyles();

function ensureCompactFilterStyles(){
    if(document.querySelector('link[data-scenario-filter-ux="compact"]')){
        return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL("../css/scenario-filter-ux.css?v=20260913-flow-finish", import.meta.url).href;
    link.dataset.scenarioFilterUx = "compact";
    document.head.appendChild(link);
}

function setSheetState(open){
    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    document.body.classList.toggle("is-filter-sheet-open", open && isMobile);

    if(open){
        const panel = advanced?.querySelector(".library-filter-panel");
        if(panel){
            panel.scrollTop = 0;
        }
    }
}

function closeAdvancedFilters({ focusSummary = false } = {}){
    if(!advanced){
        return;
    }

    advanced.open = false;
    setSheetState(false);

    if(focusSummary){
        summary?.focus();
    }
}

function markUserToggle(event){
    if(event.type === "keydown" && event.key !== "Enter" && event.key !== " "){
        return;
    }
    allowUserOpen = true;
}

summary?.addEventListener("pointerdown", markUserToggle, true);
summary?.addEventListener("keydown", markUserToggle, true);

advanced?.addEventListener("toggle", ()=>{
    if(!advanced.open){
        allowUserOpen = false;
        setSheetState(false);
        return;
    }

    if(allowUserOpen || advanced.contains(document.activeElement)){
        allowUserOpen = false;
        setSheetState(true);
        return;
    }

    closeAdvancedFilters();
});

closeButton?.addEventListener("click", ()=>closeAdvancedFilters({ focusSummary: true }));
doneButton?.addEventListener("click", ()=>closeAdvancedFilters({ focusSummary: true }));

/*
 * app.js re-renders the list when "もっと見る" is pressed. Older behavior also
 * reopened advanced filters whenever an advanced condition was active. A list
 * pagination action must never change the filter panel state.
 */
loadMoreButton?.addEventListener("click", ()=>closeAdvancedFilters());

/*
 * Favorite toggles also re-render the result list. The core app currently
 * returns visibleCount to the first page during that render, which makes an
 * already-expanded shelf snap shut. Remember the number of visible cards just
 * before the favorite action and restore only that pagination depth afterward.
 * This applies to favorites toggled from both the shelf and the detail modal.
 */
document.addEventListener("click", event=>{
    const target = event.target instanceof Element
        ? event.target.closest(".favorite-button, .modal-favorite-button")
        : null;

    if(!target || !scenarioList){
        return;
    }

    favoriteRestoreTarget = scenarioList.querySelectorAll(":scope > .scenario-item").length;
    queueMicrotask(restoreExpandedScenarioCount);
}, true);

function restoreExpandedScenarioCount(){
    if(!scenarioList || !loadMoreButton || favoriteRestoreTarget <= 0){
        favoriteRestoreTarget = 0;
        return;
    }

    let safety = 0;
    while(
        scenarioList.querySelectorAll(":scope > .scenario-item").length < favoriteRestoreTarget
        && !loadMoreButton.hidden
        && safety < 20
    ){
        loadMoreButton.click();
        safety += 1;
    }

    favoriteRestoreTarget = 0;
}

window.matchMedia("(max-width: 640px)").addEventListener?.("change", ()=>{
    setSheetState(Boolean(advanced?.open));
});
