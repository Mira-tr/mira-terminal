import {
    STORAGE_KEY,
    load,
    save
} from "../../../store.js";

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
        title: data.title || "",
        kana: data.kana || "",
        author: data.author || "",
        system: data.system || "CoC6",
        playersRaw: data.playersRaw || "",
        playersMin: data.playersMin || "",
        playersMax: data.playersMax || "",
        timeRaw: data.timeRaw || "",
        timeMin: data.timeMin || "",
        timeMax: data.timeMax || "",
        loss: data.loss || "不明",
        rating: data.rating || "all",
        tags: Array.isArray(data.tags) ? data.tags : [],
        url: data.url || "",
        status: data.status || "draft",
        memo: data.memo || "",
        createdAt,
        updatedAt
    };
}