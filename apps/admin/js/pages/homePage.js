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
    initToastService,
    showToast
} from "../features/common/toastService.js";

const state = {
    savedConfig: null,
    dirty: false
};

initToastService();
initHomePage();

function initHomePage(){
    state.savedConfig = loadHomeConfig();
    renderEditor(state.savedConfig, {
        dirty: false,
        message: ""
    });

    getElement("saveHomeConfigBtn").addEventListener("click", handleSave);
    getElement("resetHomeConfigBtn").addEventListener("click", handleReset);
}

function renderEditor(config, options = {}){
    renderHomeForm(getElement("homeSectionForm"), config, {
        onChange: handleFormChange
    });

    state.dirty = Boolean(options.dirty);
    showValidation(options.validationMessage || "");
    updatePageState(options.message || "");
}

function handleFormChange(){
    state.dirty = true;
    updateHomeFormControlState(getElement("homeSectionForm"));
    updatePageState("");
}

function handleSave(){
    try{
        const draft = collectHomeForm(getElement("homeSectionForm"));

        validateHomeConfig(draft);

        const saved = saveHomeConfig(draft);

        if(saved === false){
            showValidation("Home Configurationの保存に失敗しました。");
            showToast("Home Configurationの保存に失敗しました。", "error");
            return;
        }

        state.savedConfig = saved;
        renderEditor(saved, {
            dirty: false,
            message: "保存済み"
        });
        showToast("Home Configurationを保存しました。", "success");
    }catch(error){
        showValidation(error.message || "入力内容を確認してください。");
        showToast("入力内容を確認してください。", "warning");
    }
}

function handleReset(){
    if(!confirm("Home Configurationをdefaultへ戻します。よろしいですか？")){
        return;
    }

    const reset = resetHomeConfig();

    state.savedConfig = getDefaultHomeConfig();
    renderEditor(reset, {
        dirty: false,
        message: "デフォルト状態"
    });
    showToast("Home Configurationをdefaultへ戻しました。", "success");
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

function getElement(id){
    const element = document.getElementById(id);

    if(!element){
        throw new Error(`Missing element: ${id}`);
    }

    return element;
}
