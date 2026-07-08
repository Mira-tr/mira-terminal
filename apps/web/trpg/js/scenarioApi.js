import {
    DATA_URL
} from "./config.js";

import {
    normalizeRating
} from "./scenarioRating.js";

export async function fetchPublicScenarios(){
    const response = await fetch(DATA_URL, {
        cache: "no-store"
    });

    if(!response.ok){
        throw new Error(`公開データの読み込みに失敗しました: ${response.status}`);
    }

    const data = await response.json();

    validatePayload(data);

    return normalizePayload(data);
}

const SUPPORTED_SCHEMA_VERSION = 1;

function validatePayload(data){
    if(typeof data !== "object" || data === null){
        throw new Error("公開データの形式が正しくありません");
    }

    if(data.module !== undefined && data.module !== "trpg"){
        throw new Error("公開データのモジュールが正しくありません");
    }

    if(data.exportType !== undefined && data.exportType !== "public-scenarios"){
        throw new Error("公開データのエクスポートタイプが正しくありません");
    }

    if(data.schemaVersion !== undefined){
        const version = Number(data.schemaVersion);
        if(!Number.isInteger(version) || version > SUPPORTED_SCHEMA_VERSION){
            throw new Error(`公開データのスキーマバージョン${version}はサポートされていません`);
        }
    }

    if(!Array.isArray(data.scenarios)){
        throw new Error("公開データのシナリオリストが正しくありません");
    }
}

function normalizePayload(data){
    const scenarios = Array.isArray(data?.scenarios)
        ? data.scenarios
        : [];

    return scenarios.map(normalizeScenario);
}

function normalizeScenario(scenario){
    return {
        id: toText(scenario.id),
        title: toText(scenario.title),
        kana: toText(scenario.kana),
        author: toText(scenario.author),
        system: toText(scenario.system),
        playersRaw: toText(scenario.playersRaw),
        playersMin: toNullableNumber(scenario.playersMin),
        playersMax: toNullableNumber(scenario.playersMax),
        timeRaw: toText(scenario.timeRaw),
        timeMin: toNullableNumber(scenario.timeMin),
        timeMax: toNullableNumber(scenario.timeMax),
        loss: toText(scenario.loss || "不明"),
        rating: normalizeRating(scenario.rating),
        scenarioType: toText(scenario.scenarioType),
        series: toText(scenario.series),
        summary: toText(scenario.summary),
        notes: toText(scenario.notes),
        tags: normalizeTags(scenario.tags),
        url: toText(scenario.url)
    };
}

function normalizeTags(value){
    if(!Array.isArray(value)){
        return [];
    }

    return [
        ...new Set(
            value
            .map(toText)
            .filter(Boolean)
        )
    ];
}

function toText(value){
    return String(value ?? "").trim();
}

function toNullableNumber(value){
    const text = toText(value);

    if(!text){
        return null;
    }

    const number = Number(text);

    return Number.isFinite(number)
        ? number
        : null;
}
