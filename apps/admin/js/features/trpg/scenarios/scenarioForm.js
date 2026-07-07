import {
    value,
    setValue,
    showMessage,
    isSafeHttpUrl
} from "../../../utils.js";

import {
    getSelectedTags,
    setSelectedTags
} from "../tags.js";

import {
    getScenarios,
    addScenario,
    updateScenario
} from "./scenarioStore.js";

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
    "url",
    "status",
    "memo"
];

export function saveScenario({ onSaved, saveAuthor }){
    const data = buildScenarioData();

    if(!validateScenario(data)){
        return;
    }

    if(editingId){
        updateScenario(data);
        editingId = null;
        showMessage("更新しました");
    }else{
        addScenario(data);
        showMessage("保存しました");
    }

    saveAuthor(data.author);
    clearForm();

    if(onSaved){
        onSaved();
    }
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
        tags: getSelectedTags(),
        status: value("status")
    };

    saveScenario({
        onSaved,
        saveAuthor
    });

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

    showMessage("保存して複製しました");
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
        url: value("url"),
        status: value("status"),
        memo: value("memo"),
        createdAt: existing?.createdAt || now,
        updatedAt: now
    };
}

function validateScenario(data){
    if(!data.title){
        showMessage("タイトルは必須です");
        return false;
    }

    if(isInvalidRange(data.playersMin, data.playersMax)){
        showMessage("人数の最小・最大を確認してください");
        return false;
    }

    if(isInvalidRange(data.timeMin, data.timeMax)){
        showMessage("時間の最小・最大を確認してください");
        return false;
    }

    if(data.url && !isSafeHttpUrl(data.url)){
        showMessage("URLはhttp://またはhttps://から入力してください");
        return false;
    }

    if(data.summary.length > 240){
        showMessage("短い概要は240文字以内にしてください");
        return false;
    }

    if(data.notes.length > 240){
        showMessage("注意事項は240文字以内にしてください");
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
