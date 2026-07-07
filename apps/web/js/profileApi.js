import {
    DATA_URL
} from "./trpg/js/config.js";

const SUPPORTED_SCHEMA_VERSION = 1;

export async function fetchPublicProfile(){
    const response = await fetch(DATA_URL.replace("public-scenarios.json", "public-profile.json"), {
        cache: "no-store"
    });

    if(!response.ok){
        throw new Error(`Profileデータの読み込みに失敗しました: ${response.status}`);
    }

    const data = await response.json();

    validateProfilePayload(data);

    return normalizeProfile(data);
}

function validateProfilePayload(data){
    if(typeof data !== "object" || data === null){
        throw new Error("Profileデータの形式が正しくありません");
    }

    if(data.module !== undefined && data.module !== "site"){
        throw new Error("Profileデータのモジュールが正しくありません");
    }

    if(data.exportType !== undefined && data.exportType !== "public-profile"){
        throw new Error("Profileデータのエクスポートタイプが正しくありません");
    }

    if(data.schemaVersion !== undefined){
        const version = Number(data.schemaVersion);
        if(!Number.isInteger(version) || version > SUPPORTED_SCHEMA_VERSION){
            throw new Error(`Profileデータのスキーマバージョン${version}はサポートされていません`);
        }
    }

    if(!data.profile || typeof data.profile !== "object"){
        throw new Error("Profileデータのprofileが正しくありません");
    }

    if(!Array.isArray(data.profile.links)){
        throw new Error("Profileデータのlinksが正しくありません");
    }
}

function normalizeProfile(data){
    const profile = data.profile || {};

    return {
        displayName: toText(profile.displayName),
        bio: toText(profile.bio),
        activities: normalizeActivities(profile.activities),
        links: normalizeLinks(profile.links)
    };
}

function normalizeActivities(activities){
    if(!Array.isArray(activities)){
        return [];
    }

    return activities
        .map(toText)
        .filter(Boolean);
}

function normalizeLinks(links){
    if(!Array.isArray(links)){
        return [];
    }

    return links
        .filter(link => link && typeof link === "object")
        .map(link => ({
            id: toText(link.id),
            label: toText(link.label),
            url: normalizeUrl(link.url),
            type: toText(link.type),
            order: Number(link.order) || 0
        }))
        .filter(link => link.label && link.url && isSafeHttpUrl(link.url))
        .sort((a, b) => a.order - b.order);
}

function toText(value){
    return String(value ?? "").trim();
}

function normalizeUrl(url){
    const text = toText(url);
    
    if(!text){
        return "";
    }
    
    if(text.startsWith("http://") || text.startsWith("https://")){
        return text;
    }
    
    return "";
}

function isSafeHttpUrl(url){
    if(!url){
        return false;
    }

    try{
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    }catch{
        return false;
    }
}
