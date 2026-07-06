import {
    value,
    setValue,
    showMessage
} from "../../utils.js";

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

export function saveScenario({ onSaved, saveAuthor }){
    const data = {
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

        tags: getSelectedTags(),

        url: value("url"),
        status: value("status"),
        memo: value("memo"),

        createdAt:
            editingId
            ? getScenarios().find(s=>s.id===editingId).createdAt
            : Date.now(),

        updatedAt: Date.now()
    };

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

    setSelectedTags(copyData.tags);
    setValue("status", copyData.status);

    showMessage("保存して複製しました");
}

export function editScenario(id){
    const s =
        getScenarios()
        .find(x=>x.id===id);

    if(!s)return;

    editingId = id;

    setValue("title", s.title);
    setValue("kana", s.kana);
    setValue("author", s.author);
    setValue("system", s.system);

    setValue("playersRaw", s.playersRaw);
    setValue("playersMin", s.playersMin);
    setValue("playersMax", s.playersMax);

    setValue("timeRaw", s.timeRaw);
    setValue("timeMin", s.timeMin);
    setValue("timeMax", s.timeMax);

    setValue("loss", s.loss);

    setSelectedTags(s.tags);

    setValue("url", s.url);
    setValue("status", s.status);
    setValue("memo", s.memo);

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

export function clearForm(){
    document
    .querySelectorAll("input, textarea")
    .forEach(e=>e.value="");

    setValue("system", "CoC6");
    setValue("loss", "不明");
    setValue("status", "draft");

    setSelectedTags([]);
}