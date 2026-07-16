import {
    getModules
} from "../modules/moduleRegistry.js";

export const COLLECTION_TYPES = Object.freeze([
    Object.freeze({
        id: "trpg",
        title: "TRPG",
        description: "所持しているシナリオや遊んだ記録を登録します。",
        status: "active",
        moduleType: "trpg",
        adminPath: "../trpg/",
        storageByOwnerCreatorId: Object.freeze({
            "creator-chikage": Object.freeze({
                contentType: "collection",
                collectionType: "trpg",
                ownerCreatorId: "creator-chikage",
                module: "trpg",
                localStorageKeys: Object.freeze([
                    "mira_terminal_scenarios",
                    "mira_terminal_tags",
                    "mira_terminal_authors"
                ]),
                publicScenariosJson: "apps/web/data/creators/chikage/trpg/public-scenarios.json",
                houseRulesJson: "apps/web/data/creators/chikage/trpg/house-rules.json",
                publicPath: "/creators/chikage/trpg/",
                previewPath: "../../web/creators/chikage/trpg/"
            })
        })
    })
]);

export const CREATOR_REGISTRY = Object.freeze([
    Object.freeze({
        id: "creator-chikage",
        displayName: "千景",
        slug: "chikage",
        status: "active"
    }),
    Object.freeze({
        id: "creator-asagiri",
        displayName: "朝霧",
        slug: "asagiri",
        status: "active"
    })
]);

export function getCollectionTypes(){
    return COLLECTION_TYPES.map(type => ({
        ...type,
        storageByOwnerCreatorId: {
            ...type.storageByOwnerCreatorId
        }
    }));
}

export function getActiveCollectionTypes(){
    return getCollectionTypes().filter(type => type.status === "active");
}

export function getCreatorRegistry(){
    return CREATOR_REGISTRY.map(creator => ({ ...creator }));
}

export function getAvailableCollectionOwners(collectionTypeId){
    const type = getCollectionTypes().find(item => item.id === collectionTypeId);

    if(!type){
        return [];
    }

    const ownerIds = new Set(
        getModules()
        .filter(module => module.status === "active")
        .filter(module => module.type === type.moduleType)
        .map(module => module.ownerCreatorId)
        .filter(Boolean)
    );

    return getCreatorRegistry()
    .filter(creator => creator.status === "active")
    .filter(creator => ownerIds.has(creator.id));
}

export function resolveCollectionType(collectionTypeId){
    return getCollectionTypes().find(type => type.id === collectionTypeId) || null;
}

export function resolveCollectionOwner(collectionTypeId, ownerCreatorId){
    return getAvailableCollectionOwners(collectionTypeId)
    .find(creator => creator.id === ownerCreatorId) || null;
}

export function createCollectionEditorRoute({
    collectionTypeId,
    ownerCreatorId,
    source = "studio",
    context = "admin"
}){
    const type = resolveCollectionType(collectionTypeId);
    const owner = resolveCollectionOwner(collectionTypeId, ownerCreatorId);

    if(!type || !owner){
        return "";
    }

    const params = new URLSearchParams({
        source,
        collection: collectionTypeId,
        owner: owner.slug,
        mode: "beginner"
    });

    const basePath = context === "studio"
        ? "../admin/trpg/"
        : type.adminPath;

    return `${basePath}?${params.toString()}#scenarioFormTitle`;
}

export function getCollectionStorageMapping(collectionTypeId, ownerCreatorId){
    const type = resolveCollectionType(collectionTypeId);
    const owner = resolveCollectionOwner(collectionTypeId, ownerCreatorId);

    if(!type || !owner){
        return null;
    }

    return type.storageByOwnerCreatorId?.[owner.id] || null;
}
