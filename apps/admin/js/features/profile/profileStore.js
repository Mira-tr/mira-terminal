import {
    PROFILE_KEY,
    load,
    save
} from "../../store.js";

import {
    isSafeHttpUrl
} from "../../utils.js";

const DEFAULT_PROFILE = {
    displayName: "",
    bio: "",
    activities: [],
    links: [],
    updatedAt: null
};

const LINK_TYPES = ["social", "code", "video", "shop", "contact", "other"];

export function loadProfile(){
    return load(
        PROFILE_KEY,
        DEFAULT_PROFILE
    );
}

export function saveProfile(profile){
    return save(
        PROFILE_KEY,
        normalizeProfile(profile, {
            touchUpdatedAt: true
        })
    );
}

export function normalizeProfile(profile, options = {}){
    const source = profile && typeof profile === "object"
        ? profile
        : DEFAULT_PROFILE;

    return {
        displayName: String(source.displayName || "").trim(),
        bio: String(source.bio || "").trim().slice(0, 160),
        activities: normalizeActivities(source.activities),
        links: normalizeLinks(source.links),
        updatedAt: options.touchUpdatedAt
            ? new Date().toISOString()
            : normalizeTimestamp(source.updatedAt)
    };
}

export function getProfile(){
    return loadProfile();
}

function normalizeActivities(activities){
    if(!Array.isArray(activities)){
        return [];
    }
    
    return activities
        .map(a => String(a || "").trim())
        .filter(a => a.length > 0)
        .slice(0, 6)
        .map(a => a.slice(0, 24));
}

function normalizeLinks(links){
    if(!Array.isArray(links)){
        return [];
    }
    
    return links
        .filter(link => link && typeof link === "object")
        .map(link => ({
            id: link.id || generateId(),
            label: String(link.label || "").trim(),
            url: normalizeUrl(link.url),
            type: normalizeLinkType(link.type),
            order: Number(link.order) || 0,
            status: normalizeLinkStatus(link.status)
        }))
        .filter(link => link.label && link.url)
        .sort((a, b) => a.order - b.order);
}

function normalizeUrl(url){
    const text = String(url || "").trim();
    
    if(!text){
        return "";
    }
    
    if(isSafeHttpUrl(text)){
        return text;
    }
    
    return "";
}

function normalizeLinkType(type){
    const normalized = String(type || "other").trim().toLowerCase();
    
    if(LINK_TYPES.includes(normalized)){
        return normalized;
    }
    
    return "other";
}

function normalizeLinkStatus(status){
    const normalized = String(status || "private").trim().toLowerCase();
    
    if(normalized === "public"){
        return "public";
    }
    
    return "private";
}

function normalizeTimestamp(value){
    const timestamp = String(value || "").trim();
    return timestamp || null;
}

function generateId(){
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
