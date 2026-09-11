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

    if(isPromiseLike(result)){
        return Promise.resolve(result)
            .then(saved => finalizeScenarioSave(saved, {
                data,
                isEditing,
                onSaved,
                saveAuthor,
                successMessage
            }))
            .catch(error => {
                showToast(error?.message || "保存に失敗しました", "error");
                return false;
            });
    }

    return finalizeScenarioSave(result, {
        data,
        isEditing,
        onSaved,
        saveAuthor,
        successMessage
    });
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
        successMessage: "保存して続けて追加できます"
    });

    if(isPromiseLike(saved)){
        return Promise.resolve(saved).then(success => {
            if(success){
                restoreScenarioCopyData(copyData);
            }
            return success;
        });
    }

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

    return scenario;
}

export function duplicateScenario(id){
    const scenario = getScenarios()
    .find(item=>item.id === id);

    if(!scenario){
        return false;
    }

    editingId = null;
    const duplicate = {
        ...scenario,
        id: "",
        title: `${scenario.title || "無題"} コピー`,
        status: "draft",
        createdAt: "",
        updatedAt: ""
    };

    applyScenarioEditorData(duplicate);

    showToast("複製して新規追加の入力欄へ入れました。保存すると別シナリオになります。", "success");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    return duplicate;
}

export function clearForm(){
    editingId = null;
    resetScenarioEditorFields();
}

export function getEditingScenarioId(){
    return editingId;
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

function finalizeScenarioSave(result, {
    data,
    isEditing,
    onSaved,
    saveAuthor,
    successMessage
}){
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

function showScenarioControllerError(result){
    const firstError = result.errors?.[0];
    const message = firstError?.message || "保存に失敗しました";
    const level = firstError?.code === "local-storage-failed"
        ? "error"
        : "warning";

    showToast(`入力内容を確認してください: ${message}`, level);
}

function isPromiseLike(value){
    return Boolean(value && typeof value.then === "function");
}
