import {
    AUTHOR_KEY,
    CREATORS_KEY,
    GAME_KEY,
    HOME_CONFIG_KEY,
    NOTES_KEY,
    PROFILE_KEY,
    RULES_KEY,
    STORAGE_KEY,
    TAG_KEY,
    TOOLS_KEY
} from "../../store.js";

export const SYSTEM_STORAGE_TARGETS = Object.freeze([
    createStorageTarget("home", "Brand Home", HOME_CONFIG_KEY, "brand"),
    createStorageTarget("projects", "Projects", GAME_KEY, "brand"),
    createStorageTarget("tools", "Tools", TOOLS_KEY, "brand"),
    createStorageTarget("notes", "Notes", NOTES_KEY, "brand"),
    createStorageTarget("creators", "Creators", CREATORS_KEY, "brand"),
    createStorageTarget("profile", "Chikage Profile", PROFILE_KEY, "creator-chikage"),
    createStorageTarget("trpg-scenarios", "Scenario Library", STORAGE_KEY, "creator-chikage"),
    createStorageTarget("trpg-tags", "TRPG Tags", TAG_KEY, "creator-chikage"),
    createStorageTarget("trpg-authors", "TRPG Authors", AUTHOR_KEY, "creator-chikage"),
    createStorageTarget("house-rules", "House Rules", RULES_KEY, "creator-chikage")
]);

export const PUBLIC_EXPORT_TARGETS = Object.freeze([
    createExportTarget("home", "Brand Home", "public-home.json", "apps/web/data/public-home.json", "brand"),
    createExportTarget("projects", "Projects", "public-games.json", "apps/web/game/data/public-games.json", "brand"),
    createExportTarget("tools", "Tools", "public-tools.json", "apps/web/tools/data/public-tools.json", "brand"),
    createExportTarget("notes", "Notes", "public-notes.json", "apps/web/notes/data/public-notes.json", "brand"),
    createExportTarget("creators", "Creators", "public-creators.json", "apps/web/data/public-creators.json", "brand"),
    createExportTarget("profile", "Chikage Profile", "public-profile.json", "apps/web/data/public-profile.json", "creator-chikage"),
    createExportTarget("trpg-scenarios", "Scenario Library", "public-scenarios.json", "apps/web/data/creators/chikage/trpg/public-scenarios.json", "creator-chikage"),
    createExportTarget("house-rules", "House Rules", "house-rules.json", "apps/web/data/creators/chikage/trpg/house-rules.json", "creator-chikage"),
    createExportTarget("about", "About", "static-html", "apps/web/about/index.html", "brand"),
    createExportTarget("contact", "Contact", "static-html", "apps/web/contact/index.html", "brand")
]);

export function getStorageTargets(){
    return SYSTEM_STORAGE_TARGETS.map(target => ({ ...target }));
}

export function getPublicExportTargets(){
    return PUBLIC_EXPORT_TARGETS.map(target => ({ ...target }));
}

export function collectStorageSnapshot(storage = localStorage){
    const targets = getStorageTargets();
    const items = {};

    targets.forEach(target => {
        const raw = storage.getItem(target.storageKey);
        items[target.storageKey] = raw;
    });

    return {
        targets,
        items
    };
}

export function summarizeStorageTarget(target, storage = localStorage){
    const raw = storage.getItem(target.storageKey);
    const parsed = parseJson(raw);
    return {
        ...target,
        exists: raw !== null,
        validJson: raw === null || parsed.valid,
        count: parsed.valid ? estimateCount(target.id, parsed.value) : 0,
        bytes: raw ? new Blob([raw]).size : 0
    };
}

export function estimateCount(targetId, value){
    if(!value || typeof value !== "object"){
        return 0;
    }

    const knownCollections = {
        home: "sections",
        projects: "games",
        tools: "tools",
        notes: "notes",
        creators: "creators",
        "trpg-scenarios": "scenarios",
        "trpg-tags": "tags",
        "trpg-authors": "authors",
        "house-rules": "sections"
    };
    const key = knownCollections[targetId];
    if(key && Array.isArray(value[key])){
        return value[key].length;
    }

    if(targetId === "profile"){
        return value.profile || value.displayName ? 1 : 0;
    }

    if(Array.isArray(value)){
        return value.length;
    }

    return Object.keys(value).length;
}

function parseJson(raw){
    if(raw === null){
        return {
            valid: true,
            value: null
        };
    }

    try{
        return {
            valid: true,
            value: JSON.parse(raw)
        };
    }catch{
        return {
            valid: false,
            value: null
        };
    }
}

function createStorageTarget(id, title, storageKey, workspace){
    return {
        id,
        title,
        storageKey,
        workspace
    };
}

function createExportTarget(id, title, filename, destination, workspace){
    return {
        id,
        title,
        filename,
        destination,
        workspace
    };
}
