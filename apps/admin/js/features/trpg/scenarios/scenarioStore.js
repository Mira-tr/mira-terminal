import {
    STORAGE_KEY,
    load,
    save
} from "../../../store.js";

import {
    normalizeStorageLocations
} from "./scenarioStorage.js";

import {
    normalizeScenarioRating
} from "./scenarioRating.js";

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
    const nextScenarios = [
        normalizeScenario(data),
        ...scenarios
    ];

    return commitScenarios(nextScenarios);
}

export function updateScenario(data){
    const nextScenarios = scenarios.map(
        scenario=>
            scenario.id === data.id
            ? normalizeScenario(data)
            : scenario
    );

    return commitScenarios(nextScenarios);
}

export function deleteScenario(id){
    const nextScenarios = scenarios.filter(
        scenario=>scenario.id !== id
    );

    return commitScenarios(nextScenarios);
}

export function setScenarios(data){
    return commitScenarios(normalizeScenarios(data));
}

export function saveScenarios(){
    return save(
        STORAGE_KEY,
        scenarios
    );
}

function commitScenarios(nextScenarios){
    if(!save(STORAGE_KEY, nextScenarios)){
        return false;
    }

    scenarios = nextScenarios;
    return true;
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
        rating: normalizeScenarioRating(data.rating),
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
