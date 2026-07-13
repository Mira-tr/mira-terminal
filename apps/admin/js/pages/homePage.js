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
    getElement("homePublicExportBtn").addEventListener("click", handlePublicExport);
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
    showPublicExportMessage(
        "Unsaved changes. Save Home Configuration before Public Export.",
        "warning"
    );
}

function handleSave(){
    try{
        const draft = collectHomeForm(getElement("homeSectionForm"));

        validateHomeConfig(draft);

        const saved = saveHomeConfig(draft);

        if(saved === false){
            showValidation("Failed to save Home Configuration.");
            showToast("Failed to save Home Configuration.", "error");
            return;
        }

        state.savedConfig = saved;
        renderEditor(saved, {
            dirty: false,
            message: "Saved"
        });
        showPublicExportMessage("");
        showToast("Home Configuration saved.", "success");
    }catch(error){
        showValidation(error.message || "Please check Home Configuration.");
        showToast("Please check Home Configuration.", "warning");
    }
}

function handleReset(){
    if(!confirm("Reset Home Configuration to default?")){
        return;
    }

    const reset = resetHomeConfig();

    state.savedConfig = getDefaultHomeConfig();
    renderEditor(reset, {
        dirty: false,
        message: "Default state"
    });
    showPublicExportMessage("Default state. Save is not required before Public Export.", "info");
    showToast("Home Configuration reset to default.", "success");
}

function handlePublicExport(){
    if(state.dirty){
        showPublicExportMessage(
            "Unsaved changes. Save Home Configuration before Public Export.",
            "warning"
        );
        showToast("Save Home Configuration before Public Export.", "warning");
        return;
    }

    try{
        const payload = exportPublicHome();
        const contract = getHomePublicExportContract();

        showPublicExportMessage(
            `Exported ${contract.filename} for ${contract.destination}. Sections: ${payload.sections.length}`,
            "success"
        );
    }catch(error){
        showPublicExportMessage(
            error.message || "Public Export failed.",
            "error"
        );
        showToast("Public Export failed.", "error");
    }
}

function updatePageState(message){
    const status = getElement("homeConfigState");

    status.textContent = message || (
        state.dirty
            ? "Unsaved"
            : "Saved"
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
