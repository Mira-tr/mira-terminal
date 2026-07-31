import {
    isSafeHttpUrl
} from "../../utils.js";

import {
    getCreators,
    updateCreator
} from "../creators/creatorStore.js";

const DEFAULT_PROFILE = {
    displayName: "",
    bio: "",
    activities: [],
    links: [],
    updatedAt: null
};

const LINK_TYPES = ["social", "code", "video", "shop", "contact", "other"];

export function loadProfile(){
    const collection = getCreators();
    const primary = collection.creators.find(
        creator => creator.id === collection.primaryCreatorId
    );

    if(!primary){
        return normalizeProfile(DEFAULT_PROFILE);
    }

    return normalizeProfile({
        displayName: primary.displayName,
        bio: primary.bio,
        activities: primary.activities,
        links: primary.links.map(link => ({
            ...link,
            type: link.type || "other"
        })),
        updatedAt: primary.updatedAt
    });
}

export function saveProfile(profile){
    const collection = getCreators();
    const primary = collection.creators.find(
        creator => creator.id === collection.primaryCreatorId
    );

    if(!primary){
        return false;
    }

    const normalized = normalizeProfile(profile, {
        touchUpdatedAt: true
    });

    return updateCreator(primary.id, {
        displayName: normalized.displayName,
        bio: normalized.bio,
        activities: normalized.activities,
        links: normalized.links.map(link => ({
            id: link.id,
            label: link.label,
            url: link.url,
            status: link.status,
            order: link.order
        }))
    });
}

export function normalizeProfile(profile, options = {}){
    const source = profile && typeof profile === "object"
        ? profile
        : DEFAULT_PROFILE;

    return {
        displayName: String(source.displayName || "").trim(),
        bio: String(source.bio || "").trim().slice(0, 500),
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
        .slice(0, 12)
        .map(a => a.slice(0, 80));
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
