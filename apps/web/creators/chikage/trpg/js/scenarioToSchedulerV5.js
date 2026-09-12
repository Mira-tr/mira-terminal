import { fetchPublicScenarios } from "./scenarioApi.js";
import { buildScenarioSchedulerHref } from "./scenarioSchedulerBridge.js";

const modal = document.querySelector("#scenarioModal");
let scenarios = [];
let queued = false;

if(modal){
    fetchPublicScenarios().then(items => {
        scenarios = Array.isArray(items) ? items : [];
        enhance();
    }).catch(() => {});
    new MutationObserver(queueEnhance).observe(modal, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
    window.addEventListener("popstate", enhance);
    enhance();
}

function queueEnhance(){
    if(queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; enhance(); });
}

function enhance(){
    if(!modal || modal.hidden) return;
    const actionArea = modal.querySelector(".modal-action-area");
    if(!actionArea || actionArea.querySelector(".library-v5-create-session")) return;
    const id = readScenarioId();
    const scenario = scenarios.find(item => String(item?.id ?? "") === id);
    if(!scenario) return;
    const href = buildScenarioSchedulerHref(scenario, window.location.href);
    if(!href) return;

    const link = document.createElement("a");
    link.className = "modal-primary-link library-v5-create-session";
    link.href = href;
    link.textContent = "このシナリオで卓を作る";
    link.setAttribute("aria-label", `${scenario.title || "このシナリオ"}でSchedulerの卓を作る`);
    actionArea.prepend(link);
}

function readScenarioId(){
    const id = new URL(window.location.href).searchParams.get("scenario") || "";
    return /^[A-Za-z0-9_-]{1,100}$/.test(id) ? id : "";
}
