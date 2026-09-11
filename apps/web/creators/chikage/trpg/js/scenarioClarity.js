const advanced = document.querySelector("#advancedFilters");
const closeButton = document.querySelector("#filterSheetCloseBtn");
const doneButton = document.querySelector("#filterSheetDoneBtn");

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

advanced?.addEventListener("toggle", ()=>setSheetState(advanced.open));
closeButton?.addEventListener("click", ()=>setSheetState(false));
doneButton?.addEventListener("click", ()=>{
    if(!advanced){
        return;
    }

    advanced.open = false;
    setSheetState(false);
    advanced.querySelector("summary")?.focus();
});

window.matchMedia("(max-width: 640px)").addEventListener?.("change", ()=>{
    setSheetState(Boolean(advanced?.open));
});
