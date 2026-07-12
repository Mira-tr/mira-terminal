import {
    value,
    setValue,
    isSafeHttpUrl
} from "../../../utils.js";

import {
    showToast
} from "../../common/toastService.js";

import {
    getSelectedTags,
    setSelectedTags
} from "../tags.js";

import {
    getScenarios,
    addScenario,
    updateScenario
} from "./scenarioStore.js";

import {
    getSelectedStorageLocations,
    setSelectedStorageLocations
} from "./scenarioStorage.js";

const STORAGE_LOCATION_OPTIONS_ID = "storageLocationOptions";

let editingId = null;

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
    "ownerCreatorId",
    "url",
    "storageNote",
    "status",
    "memo"
];

export function saveScenario({ onSaved, saveAuthor, successMessage }){
    const data = buildScenarioData();

    if(!validateScenario(data)){
        return;
    }

    const isEditing = Boolean(editingId);
    const saved = isEditing
        ? updateScenario(data)
        : addScenario(data);

    if(!saved){
        showToast("保存に失敗しました", "error");
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
        onSaved();
    }

    return true;
}

export function saveAndCopyScenario({ onSaved, saveAuthor }){
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
        ownerCreatorId: value("ownerCreatorId"),
        tags: getSelectedTags(),
        storageLocations: getSelectedStorageLocations(
            STORAGE_LOCATION_OPTIONS_ID
        ),
        status: value("status")
    };

    const saved = saveScenario({
        onSaved,
        saveAuthor,
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
    setValue("ownerCreatorId", copyData.ownerCreatorId);
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
        ownerCreatorId: value("ownerCreatorId"),
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

function validateScenario(data){
    if(!data.title){
        showToast("入力内容を確認してください：タイトルは必須です", "warning");
        return false;
    }

    if(isInvalidRange(data.playersMin, data.playersMax)){
        showToast("入力内容を確認してください：人数の最小・最大が逆です", "warning");
        return false;
    }

    if(isInvalidRange(data.timeMin, data.timeMax)){
        showToast("入力内容を確認してください：時間の最小・最大が逆です", "warning");
        return false;
    }

    if(data.url && !isSafeHttpUrl(data.url)){
        showToast("入力内容を確認してください：URLはhttp://またはhttps://で入力してください", "warning");
        return false;
    }

    if(data.summary.length > 240){
        showToast("入力内容を確認してください：短い概要は240文字以内です", "warning");
        return false;
    }

    if(data.notes.length > 240){
        showToast("入力内容を確認してください：注意事項は240文字以内です", "warning");
        return false;
    }

    if(data.storageNote.length > 240){
        showToast("入力内容を確認してください：保存場所メモは240文字以内です", "warning");
        return false;
    }

    return true;
}

function isInvalidRange(min, max){
    if(!min || !max){
        return false;
    }

    return Number(min) > Number(max);
}
