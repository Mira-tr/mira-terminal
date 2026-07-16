import {
    getAvailableCollectionOwners
} from "./collectionRegistry.js";

export const COLLECTION_EDITOR_MODES = Object.freeze([
    "beginner",
    "standard",
    "advanced"
]);

export function createCollectionContext(params = createDefaultSearchParams()){
    const source = params.get("source") === "studio"
        ? "studio"
        : "browser-admin";
    const collectionTypeId = params.get("collection") || "trpg";
    const ownerSlug = params.get("owner") || "";
    const mode = normalizeMode(params.get("mode"));
    const owner = resolveOwner(collectionTypeId, ownerSlug);

    return {
        source,
        collectionTypeId,
        ownerCreatorId: owner?.id || "",
        ownerSlug: owner?.slug || "",
        ownerDisplayName: owner?.displayName || "",
        mode,
        isStudio: source === "studio",
        isBeginner: mode === "beginner"
    };
}

export function normalizeMode(value){
    return COLLECTION_EDITOR_MODES.includes(value)
        ? value
        : "standard";
}

function resolveOwner(collectionTypeId, ownerSlug){
    const owners = getAvailableCollectionOwners(collectionTypeId);

    if(ownerSlug){
        return owners.find(owner => owner.slug === ownerSlug) || null;
    }

    return owners[0] || null;
}

function createDefaultSearchParams(){
    if(typeof window === "undefined" || !window.location){
        return new URLSearchParams();
    }

    return new URLSearchParams(window.location.search);
}
