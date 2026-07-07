import {
    PROFILE_KEY,
    load,
    save
} from "../../store.js";

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
    const normalized = {
        displayName: String(profile.displayName || "").trim(),
        bio: String(profile.bio || "").trim().slice(0, 160),
        activities: normalizeActivities(profile.activities),
        links: normalizeLinks(profile.links),
        updatedAt: new Date().toISOString()
    };
    
    return save(PROFILE_KEY, normalized);
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
    
    if(text.startsWith("http://") || text.startsWith("https://")){
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

function generateId(){
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
