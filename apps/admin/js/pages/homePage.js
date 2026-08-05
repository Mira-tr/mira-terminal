import {
    renderHomeForm,
    collectHomeForm,
    updateHomeFormControlState
} from "../features/home/homeForm.js";

import {
    getDefaultHomeConfig,
    loadHomeConfig,
    resetHomeConfig,
    saveHomeConfig
} from "../features/home/homeStore.js";

import {
    validateHomeConfig
} from "../features/home/homeValidation.js";

import {
    exportPublicHome,
    getHomePublicExportContract
} from "../features/home/homePublicExport.js";

import {
    initToastService,
    showToast
} from "../features/common/toastService.js";

const state = {
    savedConfig: null,
    dirty: false,
    itemOptionsByType: {}
};

const HOME_ITEM_OPTION_URLS = Object.freeze({
    trpg: "../../web/data/creators/chikage/trpg/public-scenarios.json"
});

initToastService();
initHomePage();

async function initHomePage(){
    state.savedConfig = loadHomeConfig();
    renderEditor(state.savedConfig, {
        dirty: false,
        message: ""
    });

    getElement("saveHomeConfigBtn").addEventListener("click", handleSave);
    getElement("resetHomeConfigBtn").addEventListener("click", handleReset);
    getElement("homePublicExportBtn").addEventListener("click", handlePublicExport);

    state.itemOptionsByType = await loadHomeItemOptions();
    if(!state.dirty){
        renderEditor(state.savedConfig, {
            dirty: false,
            message: "保存済み"
        });
    }
}

function renderEditor(config, options = {}){
    renderHomeForm(getElement("homeSectionForm"), config, {
        onChange: handleFormChange,
        itemOptionsByType: state.itemOptionsByType
    });

    state.dirty = Boolean(options.dirty);
    showValidation(options.validationMessage || "");
    updatePageState(options.message || "");
}

async function loadHomeItemOptions(){
    const entries = await Promise.all(
        Object.entries(HOME_ITEM_OPTION_URLS).map(async ([type, url]) => [
            type,
            await loadHomeItemOptionList(type, url)
        ])
    );

    return Object.fromEntries(entries);
}

async function loadHomeItemOptionList(type, url){
    try{
        const response = await fetch(url, {
            cache: "no-store"
        });

        if(!response.ok){
            return [];
        }

        const payload = await response.json();
        return normalizeHomeItemOptions(type, payload);
    }catch(error){
        console.warn("[home] Failed to load item options.", error);
        return [];
    }
}

function normalizeHomeItemOptions(type, payload){
    if(type === "trpg" && Array.isArray(payload?.scenarios)){
        return payload.scenarios.map(scenario => ({
            id: text(scenario.id, 120),
            title: text(scenario.title, 80) || "無題のシナリオ",
            meta: [
                text(scenario.system, 40),
                scenario.rating === "r18" ? "R18" : "全年齢"
            ].filter(Boolean).join(" / ")
        }));
    }

    return [];
}

function text(value, maxLength){
    return String(value ?? "").trim().slice(0, maxLength);
}

function handleFormChange(){
    state.dirty = true;
    updateHomeFormControlState(getElement("homeSectionForm"));
    updatePageState("");
    showPublicExportMessage(
        "未保存の変更があります。公開用データを作る前に保存してください。",
        "warning"
    );
}

function handleSave(){
    try{
        const draft = collectHomeForm(getElement("homeSectionForm"));

        validateHomeConfig(draft);

        const saved = saveHomeConfig(draft);

        if(saved === false){
            showValidation("保存できませんでした。");
            showToast("保存できませんでした。", "error");
            return;
        }

        state.savedConfig = saved;
        renderEditor(saved, {
            dirty: false,
            message: "保存済み"
        });
        showPublicExportMessage("");
        showToast("Homeを保存しました。", "success");
    }catch(error){
        showValidation(error.message || "Home設定を確認してください。");
        showToast("Home設定を確認してください。", "warning");
    }
}

function handleReset(){
    if(!confirm("Home設定を初期状態に戻しますか？")){
        return;
    }

    const reset = resetHomeConfig();

    state.savedConfig = getDefaultHomeConfig();
    renderEditor(reset, {
        dirty: false,
        message: "初期状態"
    });
    showPublicExportMessage("初期状態に戻しました。このまま公開用データを作れます。", "info");
    showToast("Home設定を初期状態に戻しました。", "success");
}

function handlePublicExport(){
    if(state.dirty){
        showPublicExportMessage(
            "未保存の変更があります。公開用データを作る前に保存してください。",
            "warning"
        );
        showToast("先にHomeを保存してください。", "warning");
        return;
    }

    try{
        const payload = exportPublicHome();
        const contract = getHomePublicExportContract();

        showPublicExportMessage(
            `${contract.filename} を作りました。配置先: ${contract.destination} / エリア数: ${payload.sections.length}`,
            "success"
        );
    }catch(error){
        showPublicExportMessage(
            error.message || "公開用データを作れませんでした。",
            "error"
        );
        showToast("公開用データを作れませんでした。", "error");
    }
}

function updatePageState(message){
    const status = getElement("homeConfigState");

    status.textContent = message || (
        state.dirty
            ? "未保存"
            : "保存済み"
    );
}

function showValidation(message){
    const target = getElement("homeValidationMessage");

    target.textContent = message;
}

function showPublicExportMessage(message, type = ""){
    const target = getElement("homePublicExportMessage");

    target.textContent = message;
    target.dataset.messageType = type;
}

function getElement(id){
    const element = document.getElementById(id);

    if(!element){
        throw new Error(`Missing element: ${id}`);
    }

    return element;
}
