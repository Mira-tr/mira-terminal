import {
    SCENARIO_DRAFT_STORAGE_KEY,
    durationFieldsFromDraft,
    readScenarioDraftFromHref,
    stripScenarioDraftParams
} from "../../js/scenarioSchedulerBridge.js";

const root = document.querySelector("[data-trpg-v2-app]");
let draft = captureDraft();
let observer = null;
let queued = false;

if(root && draft){
    document.body.classList.add("scheduler-scenario-draft-v5");
    observer = new MutationObserver(queueEnhance);
    observer.observe(root, { childList: true, subtree: true });
    enhance();
}

function captureDraft(){
    const fromUrl = readScenarioDraftFromHref(window.location.href);
    if(fromUrl){
        try{ sessionStorage.setItem(SCENARIO_DRAFT_STORAGE_KEY, JSON.stringify(fromUrl)); }catch{}
        const clean = stripScenarioDraftParams(window.location.href);
        history.replaceState(history.state, "", clean);
        return fromUrl;
    }
    try{
        const stored = JSON.parse(sessionStorage.getItem(SCENARIO_DRAFT_STORAGE_KEY) || "null");
        return normalizeStoredDraft(stored);
    }catch{
        return null;
    }
}

function normalizeStoredDraft(value){
    if(!value || typeof value !== "object") return null;
    const scenarioId = String(value.scenarioId ?? "");
    const title = String(value.title ?? "").trim().slice(0, 120);
    if(!/^[A-Za-z0-9_-]{1,100}$/.test(scenarioId) || !title) return null;
    const minutes = Number(value.durationMinutes);
    return {
        scenarioId,
        title,
        system: String(value.system ?? "").trim().slice(0, 40),
        durationMinutes: Number.isFinite(minutes) && minutes >= 5 && minutes <= 1800 ? minutes : null,
        durationCapped: value.durationCapped === true
    };
}

function queueEnhance(){
    if(queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; enhance(); });
}

function enhance(){
    if(!root || !draft) return;
    const form = root.querySelector(".v2-create-session > .v2-form, .v2-create-session form.v2-form");
    if(!form){
        enhanceSignedOut();
        return;
    }
    if(form.dataset.scenarioDraftApplied === draft.scenarioId) return;

    const title = form.querySelector('[name="title"]');
    if(title) title.value = draft.title;
    const duration = durationFieldsFromDraft(draft);
    if(duration){
        const hours = form.querySelector('[name="totalHours"]');
        const minutes = form.querySelector('[name="totalMinutes"]');
        if(hours) hours.value = String(duration.hours);
        if(minutes) minutes.value = String(duration.minutes);
    }

    form.dataset.scenarioDraftApplied = draft.scenarioId;
    form.addEventListener("submit", clearDraft, { once: true });
    const details = form.closest(".v2-create-session");
    if(details) details.open = true;
    addDraftNotice(form);
    title?.focus({ preventScroll: true });
}

function enhanceSignedOut(){
    const section = Array.from(root.children).find(node => node.querySelector?.(":scope > .v2-row-label")?.textContent?.trim() === "ACCOUNT REQUIRED");
    if(!section || section.querySelector(".v5-scenario-draft-note")) return;
    const note = document.createElement("div");
    note.className = "v5-scenario-draft-note";
    const strong = document.createElement("strong");
    strong.textContent = `「${draft.title}」で卓を作ります`;
    const small = document.createElement("small");
    small.textContent = "Discordログイン後も卓名と想定時間を引き継ぎます。";
    note.append(strong, small);
    section.appendChild(note);
}

function addDraftNotice(form){
    if(form.querySelector(".v5-scenario-draft-note")) return;
    const note = document.createElement("div");
    note.className = "v5-scenario-draft-note";
    const strong = document.createElement("strong");
    strong.textContent = `Scenario Libraryから「${draft.title}」を引き継ぎました`;
    const small = document.createElement("small");
    small.textContent = draft.durationCapped
        ? "30時間を超えるシナリオのため、想定時間は30時間で仮入力しています。必要に応じて調整してください。"
        : draft.system ? `${draft.system} / 卓名と想定時間は編集できます。` : "卓名と想定時間は編集できます。";
    const back = document.createElement("a");
    back.href = scenarioDetailHref(draft.scenarioId);
    back.textContent = "シナリオ詳細へ戻る";
    note.append(strong, small, back);
    form.prepend(note);
}

function scenarioDetailHref(id){
    const base = root.closest(".cx-scheduler-v2-page") ? "../scenarios/" : "./scenarios/";
    const url = new URL(base, window.location.href);
    url.searchParams.set("scenario", id);
    return url.href;
}

function clearDraft(){
    try{ sessionStorage.removeItem(SCENARIO_DRAFT_STORAGE_KEY); }catch{}
    draft = null;
}
