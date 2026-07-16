import {
    value,
    setValue
} from "../../../utils.js";

import {
    showToast
} from "../../common/toastService.js";

import {
    DEFAULT_PRIMARY_CREATOR_ID
} from "../../creators/creatorStore.js";

import {
    getSelectedTags,
    setSelectedTags
} from "../tags.js";

import {
    getScenarios
} from "./scenarioStore.js";

import {
    createDefaultScenarioEditorController
} from "./scenarioDraftAdapter.js";

import {
    getSelectedStorageLocations,
    setSelectedStorageLocations
} from "./scenarioStorage.js";

const STORAGE_LOCATION_OPTIONS_ID = "storageLocationOptions";

let editingId = null;
const defaultScenarioController = createDefaultScenarioEditorController();

const FORM_FIELD_IDS = [
    "title",
    "kana",
    "author",
    "system",
    "playersRaw",
    "playersMin",
    "playersMax",
    "timeRaw",
    "timeMin",
    "timeMax",
    "loss",
    "rating",
    "scenarioType",
    "series",
    "summary",
    "notes",
    "url",
    "storageNote",
    "status",
    "memo"
];

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
    const copyData = {
        author: value("author"),
        system: value("system"),
        playersRaw: value("playersRaw"),
        playersMin: value("playersMin"),
        playersMax: value("playersMax"),
        timeRaw: value("timeRaw"),
        timeMin: value("timeMin"),
        timeMax: value("timeMax"),
        loss: value("loss"),
        rating: value("rating"),
        scenarioType: value("scenarioType"),
        series: value("series"),
        tags: getSelectedTags(),
        storageLocations: getSelectedStorageLocations(
            STORAGE_LOCATION_OPTIONS_ID
        ),
        status: value("status")
    };

    const saved = saveScenario({
        onSaved,
        saveAuthor,
        controller,
        successMessage: "保存して複製しました"
    });

    if(!saved){
        return false;
    }

    setValue("author", copyData.author);
    setValue("system", copyData.system);
    setValue("playersRaw", copyData.playersRaw);
    setValue("playersMin", copyData.playersMin);
    setValue("playersMax", copyData.playersMax);
    setValue("timeRaw", copyData.timeRaw);
    setValue("timeMin", copyData.timeMin);
    setValue("timeMax", copyData.timeMax);
    setValue("loss", copyData.loss);
    setValue("rating", copyData.rating);
    setValue("scenarioType", copyData.scenarioType);
    setValue("series", copyData.series);
    setValue("status", copyData.status);

    setSelectedTags(copyData.tags);
    setSelectedStorageLocations(
        STORAGE_LOCATION_OPTIONS_ID,
        copyData.storageLocations
    );

    return true;
}

export function editScenario(id){
    const scenario = getScenarios()
    .find(item=>item.id === id);

    if(!scenario){
        return;
    }

    editingId = id;

    FORM_FIELD_IDS.forEach(fieldId=>{
        setValue(
            fieldId,
            scenario[fieldId]
        );
    });

    setValue("rating", scenario.rating || "all");
    setValue("status", scenario.status || "draft");
    setSelectedTags(scenario.tags || []);
    setSelectedStorageLocations(
        STORAGE_LOCATION_OPTIONS_ID,
        scenario.storageLocations
    );

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

export function clearForm(){
    FORM_FIELD_IDS.forEach(fieldId=>{
        setValue(fieldId, "");
    });

    setValue("system", "CoC6");
    setValue("loss", "不明");
    setValue("rating", "all");
    setValue("status", "draft");

    setSelectedTags([]);
    setSelectedStorageLocations(
        STORAGE_LOCATION_OPTIONS_ID,
        []
    );
}

function buildScenarioData(){
    const existing = editingId
        ? getScenarios().find(scenario=>scenario.id === editingId)
        : null;

    const now = Date.now();

    return {
        id: editingId || crypto.randomUUID(),
        title: value("title"),
        kana: value("kana"),
        author: value("author"),
        system: value("system"),
        playersRaw: value("playersRaw"),
        playersMin: value("playersMin"),
        playersMax: value("playersMax"),
        timeRaw: value("timeRaw"),
        timeMin: value("timeMin"),
        timeMax: value("timeMax"),
        loss: value("loss"),
        rating: value("rating"),
        scenarioType: value("scenarioType"),
        series: value("series"),
        summary: value("summary"),
        notes: value("notes"),
        tags: getSelectedTags(),
        ownerCreatorId: existing?.ownerCreatorId || DEFAULT_PRIMARY_CREATOR_ID,
        url: value("url"),
        storageLocations: getSelectedStorageLocations(
            STORAGE_LOCATION_OPTIONS_ID
        ),
        storageNote: value("storageNote"),
        status: value("status"),
        memo: value("memo"),
        createdAt: existing?.createdAt || now,
        updatedAt: now
    };
}

function showScenarioControllerError(result){
    const firstError = result.errors?.[0];
    const message = firstError?.message || "保存に失敗しました";
    const level = firstError?.code === "local-storage-failed"
        ? "error"
        : "warning";

    showToast(`入力内容を確認してください：${message}`, level);
}
