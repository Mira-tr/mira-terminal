const DEFAULT_DATA_URL = "./data/public-profile.json";

const SUPPORTED_SCHEMA_VERSION = 1;

export async function fetchPublicProfile(dataUrl = getProfileDataUrl()){
    const response = await fetch(dataUrl, {
        cache: "no-store"
    });

    if(!response.ok){
        throw new Error(`Profileデータの読み込みに失敗しました: ${response.status}`);
    }

    const data = await response.json();

    validateProfilePayload(data);

    return normalizeProfile(data);
}

function getProfileDataUrl(){
    if(typeof document === "undefined"){
        return DEFAULT_DATA_URL;
    }

    return document.body?.dataset.profileDataUrl || DEFAULT_DATA_URL;
}

function renderProfileSummary(profile){
    const displayNameElement = document.getElementById("profileDisplayName");
    const bioElement = document.getElementById("profileBio");
    const activitiesElement = document.getElementById("profileActivities");

    if(displayNameElement && profile.displayName){
        displayNameElement.textContent = profile.displayName;
    }

    if(bioElement && profile.bio){
        bioElement.textContent = profile.bio;
    }

    if(activitiesElement){
        const activityElements = profile.activities.map(activity => {
            const element = document.createElement("span");
            element.className = "activity-tag";
            element.textContent = activity;
            return element;
        });

        if(activityElements.length > 0){
            activitiesElement.replaceChildren(...activityElements);
        }else if(activitiesElement.dataset.emptyMessage){
            const message = document.createElement("p");
            message.className = "profile-empty-message-inline";
            message.textContent = activitiesElement.dataset.emptyMessage;
            activitiesElement.replaceChildren(message);
        }
    }
}

function renderProfileLinks(profile){
    const linksElement = document.getElementById("profileLinks");

    if(!linksElement){
        return;
    }

    if(profile.links.length === 0){
        if(linksElement.dataset.emptyMessage){
            const item = document.createElement("li");
            item.className = "profile-empty-message";
            item.textContent = linksElement.dataset.emptyMessage;
            linksElement.replaceChildren(item);
        }
        return;
    }

    const linkElements = profile.links.map(link => {
        const item = document.createElement("li");
        const anchor = document.createElement("a");
        anchor.textContent = link.label;
        anchor.href = link.url;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        item.appendChild(anchor);
        return item;
    });

    linksElement.replaceChildren(...linkElements);
}

async function initProfile(){
    try{
        const profile = await fetchPublicProfile();
        renderProfileSummary(profile);
        renderProfileLinks(profile);
    }catch(error){
        console.warn("Profileの読み込みに失敗しました", error);
        renderProfileSummary({
            displayName: "",
            bio: "",
            activities: []
        });
        renderProfileLinks({ links: [] });
    }
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

if(typeof document !== "undefined"){
    initProfile();
}
