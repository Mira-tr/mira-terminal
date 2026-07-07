import {
    STORAGE_KEY,
    load,
    save
} from "../../../store.js";

import {
    normalizeStorageLocations
} from "./scenarioStorage.js";

let scenarios = normalizeScenarios(
    load(
        STORAGE_KEY,
        []
    )
);

export function getScenarios(){
    return [...scenarios];
}

export function addScenario(data){
    scenarios = [
        normalizeScenario(data),
        ...scenarios
    ];

    saveScenarios();
}

export function updateScenario(data){
    scenarios = scenarios.map(
        scenario=>
            scenario.id === data.id
            ? normalizeScenario(data)
            : scenario
    );

    saveScenarios();
}

export function deleteScenario(id){
    scenarios = scenarios.filter(
        scenario=>scenario.id !== id
    );

    saveScenarios();
}

export function setScenarios(data){
    scenarios = normalizeScenarios(data);
    saveScenarios();
}

export function saveScenarios(){
    save(
        STORAGE_KEY,
        scenarios
    );
}

function normalizeScenarios(data){
    if(!Array.isArray(data)){
        return [];
    }

    return data.map(normalizeScenario);
}

function normalizeScenario(data){
    const now = Date.now();
    const createdAt = Number(data.createdAt) || now;
    const updatedAt = Number(data.updatedAt) || createdAt;

    return {
        id: data.id || crypto.randomUUID(),
        title: toText(data.title),
        kana: toText(data.kana),
        author: toText(data.author),
        system: toText(data.system) || "CoC6",
        playersRaw: toText(data.playersRaw),
        playersMin: toText(data.playersMin),
        playersMax: toText(data.playersMax),
        timeRaw: toText(data.timeRaw),
        timeMin: toText(data.timeMin),
        timeMax: toText(data.timeMax),
        loss: toText(data.loss) || "不明",
        rating: toText(data.rating) || "all",
        scenarioType: toText(data.scenarioType),
        series: toText(data.series),
        summary: toText(data.summary),
        notes: toText(data.notes),
        tags: normalizeTags(data.tags),
        url: toText(data.url),
        storageLocations: normalizeStorageLocations(
            data.storageLocations
        ),
        storageNote: toText(data.storageNote),
        status: toText(data.status) || "draft",
        memo: toText(data.memo),
        createdAt,
        updatedAt
    };
}

function normalizeTags(value){
    if(Array.isArray(value)){
        return normalizeTextArray(value);
    }

    if(typeof value === "string"){
        return normalizeTextArray(
            value.split(",")
        );
    }

    return [];
}

function normalizeTextArray(values){
    return [
        ...new Set(
            values
            .map(toText)
            .map(text=>text.replace(/^#/, ""))
            .map(text=>text.trim())
            .filter(Boolean)
        )
    ];
}

function toText(value){
    return String(value ?? "").trim();
}
