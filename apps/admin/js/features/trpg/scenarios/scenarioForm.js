import {
    setValue
} from "../../../utils.js";

import {
    showToast
} from "../../common/toastService.js";

import {
    DEFAULT_PRIMARY_CREATOR_ID
} from "../../creators/creatorStore.js";

import {
    getScenarios
} from "./scenarioStore.js";

import {
    createDefaultScenarioEditorController
} from "./scenarioDraftAdapter.js";

import {
    applyScenarioEditorData,
    collectScenarioCopyData,
    collectScenarioEditorData,
    resetScenarioEditorFields,
    restoreScenarioCopyData
} from "./scenarioEditorView.js";

let editingId = null;
const defaultScenarioController = createDefaultScenarioEditorController();

export function saveScenario({
    onSaved,
    saveAuthor,
    successMessage,
    controller = defaultScenarioController
}){
    const data = buildScenarioData();

    const isEditing = Boolean(editingId);
    const result = controller.saveDraft(data, {
        editingId
    });

    if(!result.ok){
        showScenarioControllerError(result);
        return false;
    }

    if(isEditing){
        editingId = null;
    }

    saveAuthor(data.author);
    clearForm();

    showToast(
        successMessage || (isEditing ? "更新しました" : "保存しました"),
        "success"
    );

    if(onSaved){
        onSaved(result);
    }

    return true;
}

export function saveAndCopyScenario({
    onSaved,
    saveAuthor,
    controller = defaultScenarioController
}){
    const copyData = collectScenarioCopyData();

    const saved = saveScenario({
        onSaved,
        saveAuthor,
        controller,
        successMessage: "保存して複製しました"
    });

    if(!saved){
        return false;
    }

    restoreScenarioCopyData(copyData);
    return true;
}

export function editScenario(id){
    const scenario = getScenarios()
    .find(item=>item.id === id);

    if(!scenario){
        return;
    }

    editingId = id;
    applyScenarioEditorData(scenario);

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

export function clearForm(){
    resetScenarioEditorFields();
}

function buildScenarioData(){
    const existing = editingId
        ? getScenarios().find(scenario=>scenario.id === editingId)
        : null;
    const ownerCreatorId = existing?.ownerCreatorId || DEFAULT_PRIMARY_CREATOR_ID;

    return collectScenarioEditorData({
        editingId,
        existingScenario: existing,
        ownerCreatorId
    });
}

function showScenarioControllerError(result){
    const firstError = result.errors?.[0];
    const message = firstError?.message || "保存に失敗しました";
    const level = firstError?.code === "local-storage-failed"
        ? "error"
        : "warning";

    showToast(`入力内容を確認してください: ${message}`, level);
}
