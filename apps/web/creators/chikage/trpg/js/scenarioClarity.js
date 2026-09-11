const advanced = document.querySelector("#advancedFilters");
const closeButton = document.querySelector("#filterSheetCloseBtn");
const doneButton = document.querySelector("#filterSheetDoneBtn");
const loadMoreButton = document.querySelector("#loadMoreBtn");
const summary = advanced?.querySelector("summary");

let allowUserOpen = false;

ensureCompactFilterStyles();

function ensureCompactFilterStyles(){
    if(document.querySelector('link[data-scenario-filter-ux="compact"]')){
        return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL("../css/scenario-filter-ux.css", import.meta.url).href;
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

window.matchMedia("(max-width: 640px)").addEventListener?.("change", ()=>{
    setSheetState(Boolean(advanced?.open));
});
