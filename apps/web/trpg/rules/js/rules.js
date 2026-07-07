import {
    DATA_URL
} from "../js/config.js";

const SUPPORTED_SCHEMA_VERSION = 1;

export async function fetchHouseRules(){
    const response = await fetch(DATA_URL.replace("public-scenarios.json", "house-rules.json"), {
        cache: "no-store"
    });

    if(!response.ok){
        throw new Error(`House Rulesデータの読み込みに失敗しました: ${response.status}`);
    }

    const data = await response.json();

    validateRulesPayload(data);

    return normalizeRules(data);
}

function validateRulesPayload(data){
    if(typeof data !== "object" || data === null){
        throw new Error("House Rulesデータの形式が正しくありません");
    }

    if(data.module !== undefined && data.module !== "trpg"){
        throw new Error("House Rulesデータのモジュールが正しくありません");
    }

    if(data.exportType !== undefined && data.exportType !== "house-rules"){
        throw new Error("House Rulesデータのエクスポートタイプが正しくありません");
    }

    if(data.schemaVersion !== undefined){
        const version = Number(data.schemaVersion);
        if(!Number.isInteger(version) || version > SUPPORTED_SCHEMA_VERSION){
            throw new Error(`House Rulesデータのスキーマバージョン${version}はサポートされていません`);
        }
    }

    if(!Array.isArray(data.systems)){
        throw new Error("House Rulesデータのsystemsが正しくありません");
    }
}

function normalizeRules(data){
    const systems = data.systems || [];

    return systems
        .filter(system => system && typeof system === "object")
        .map(system => ({
            id: toText(system.id),
            label: toText(system.label),
            description: toText(system.description),
            sections: normalizeSections(system.sections || [])
        }))
        .filter(system => system.id);
}

function normalizeSections(sections){
    if(!Array.isArray(sections)){
        return [];
    }

    return sections
        .filter(section => section && typeof section === "object")
        .map(section => ({
            id: toText(section.id),
            title: toText(section.title),
            body: toText(section.body),
            order: Number(section.order) || 0
        }))
        .filter(section => section.id)
        .sort((a, b) => a.order - b.order);
}

function toText(value){
    return String(value ?? "").trim();
}
