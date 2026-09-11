import {
    CREATORS_KEY,
    save
} from "../../store.js";

import {
    getCmsAccessState
} from "../cms/cmsClient.js";

import {
    archiveCreatorByLegacyId,
    listCreators as listCmsCreators,
    upsertCreatorByLegacyId
} from "../cms/cmsRepository.js";

import {
    getCreators,
    normalizeCreator,
    normalizeCreatorsCollection,
    saveCreators,
    validateCreatorsCollection
} from "./creatorStore.js";

const CREATOR_CMS_SCHEMA_VERSION = 1;

export async function hydrateCreatorsFromCms(){
    const local = getCreators();
    let access;

    try{
        access = await getCmsAccessState();
    }catch(error){
        console.warn("[cms] Creator hydrate fell back to local cache", error);
        return local;
    }

    if(!access.configured || !access.authenticated || !access.isAdmin){
        return local;
    }

    let rows = await listCmsCreators();
    const initialized = rows.some(row => (
        Number(row?.profile?.adminSchemaVersion) >= CREATOR_CMS_SCHEMA_VERSION
    ));

    if(!initialized){
        await persistCreatorsToCms(local, rows);
        rows = await listCmsCreators();
    }

    return writeCreatorCache(createCollectionFromCms(rows));
}

export async function saveCreatorsCanonical(collection){
    const normalized = normalizeCreatorsCollection(collection);
    validateCreatorsCollection(normalized);

    const access = await getCmsAccessState();

    if(!access.configured || !access.authenticated){
        const saved = saveCreators(normalized);
        if(saved === false){
            throw new Error("Creatorsの保存に失敗しました");
        }
        return normalizeCreatorsCollection(normalized);
    }

    if(!access.isAdmin){
        throw new Error("RELMUA CMSのAdmin権限がありません。System > Databaseで権限を確認してください。");
    }

    const rows = await listCmsCreators();
    await persistCreatorsToCms(normalized, rows);
    const refreshed = await listCmsCreators();
    return writeCreatorCache(createCollectionFromCms(refreshed));
}

export async function addCreatorCanonical(creator){
    const collection = getCreators();
    const created = normalizeCreator(
        {
            ...creator,
            order: nextOrder(collection.creators)
        },
        { touchTimestamps: true }
    );

    await saveCreatorsCanonical({
        ...collection,
        creators: [...collection.creators, created]
    });
    return created;
}

export async function updateCreatorCanonical(id, updates){
    const collection = getCreators();
    const index = collection.creators.findIndex(creator => creator.id === id);
    if(index < 0){
        return false;
    }

    const current = collection.creators[index];
    const creators = collection.creators.slice();
    creators[index] = normalizeCreator(
        {
            ...current,
            ...updates,
            id: current.id,
            createdAt: current.createdAt
        },
        { touchUpdatedAt: true }
    );

    await saveCreatorsCanonical({
        ...collection,
        creators
    });
    return true;
}

export async function deleteCreatorCanonical(id){
    const collection = getCreators();
    if(collection.primaryCreatorId === id){
        return false;
    }

    const creators = collection.creators.filter(creator => creator.id !== id);
    if(creators.length === collection.creators.length){
        return false;
    }

    await saveCreatorsCanonical({
        ...collection,
        creators
    });
    return true;
}

export async function moveCreatorCanonical(id, direction){
    const collection = getCreators();
    const creators = collection.creators
        .slice()
        .sort((a, b) => a.order - b.order);
    const index = creators.findIndex(creator => creator.id === id);
    const delta = direction === "up" ? -1 : 1;
    const nextIndex = index + delta;

    if(index < 0 || nextIndex < 0 || nextIndex >= creators.length){
        return false;
    }

    const moved = creators[index];
    creators[index] = creators[nextIndex];
    creators[nextIndex] = moved;

    await saveCreatorsCanonical({
        ...collection,
        creators: creators.map((creator, order) => ({
            ...creator,
            order: order + 1
        }))
    });
    return true;
}

export async function setPrimaryCreatorCanonical(id){
    const collection = getCreators();
    if(!collection.creators.some(creator => creator.id === id)){
        return false;
    }

    await saveCreatorsCanonical({
        ...collection,
        primaryCreatorId: id
    });
    return true;
}

export async function resolveCmsCreatorId(legacyId){
    const target = String(legacyId || "").trim();
    if(!target){
        return null;
    }

    const rows = await listCmsCreators();
    return rows.find(row => (
        row.legacy_id === target && row.status !== "archived"
    ))?.id || null;
}

export function createCollectionFromCms(rows){
    const activeRows = (Array.isArray(rows) ? rows : [])
        .filter(row => row && row.status !== "archived")
        .slice()
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

    const creators = activeRows.map((row, index) => normalizeCreator({
        id: row.legacy_id || `creator-${row.slug}`,
        slug: row.slug,
        displayName: row.display_name,
        nameEn: row.name_en,
        bio: row.bio,
        activities: row.activities,
        works: row.profile?.works,
        links: row.profile?.links,
        status: row.status,
        order: Number(row.sort_order) || index + 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));

    const primary = activeRows.find(row => row.is_primary);
    const primaryCreatorId = primary?.legacy_id || creators[0]?.id || "";

    const collection = normalizeCreatorsCollection({
        primaryCreatorId,
        creators
    });
    validateCreatorsCollection(collection);
    return collection;
}

async function persistCreatorsToCms(collection, existingRows = []){
    const normalized = normalizeCreatorsCollection(collection);
    validateCreatorsCollection(normalized);

    const rows = Array.isArray(existingRows) ? existingRows : [];
    const existingByLegacyId = new Map(
        rows.map(row => [String(row.legacy_id || ""), row])
    );
    const desiredIds = new Set(normalized.creators.map(creator => creator.id));

    for(const row of rows){
        if(row?.legacy_id && !desiredIds.has(row.legacy_id) && row.status !== "archived"){
            await archiveCreatorByLegacyId(row.legacy_id);
        }
    }

    const nonPrimary = normalized.creators.filter(
        creator => creator.id !== normalized.primaryCreatorId
    );
    const primary = normalized.creators.find(
        creator => creator.id === normalized.primaryCreatorId
    );

    for(const creator of nonPrimary){
        await upsertCreatorByLegacyId(
            toCmsCreator(creator, false, existingByLegacyId.get(creator.id))
        );
    }

    if(primary){
        await upsertCreatorByLegacyId(
            toCmsCreator(primary, true, existingByLegacyId.get(primary.id))
        );
    }
}

function toCmsCreator(creator, isPrimary, existingRow){
    return {
        legacy_id: creator.id,
        slug: creator.slug,
        display_name: creator.displayName,
        name_en: creator.nameEn || "",
        bio: creator.bio || "",
        activities: Array.isArray(creator.activities) ? creator.activities : [],
        status: creator.status,
        is_primary: Boolean(isPrimary),
        sort_order: Number(creator.order) || 0,
        profile: {
            ...(existingRow?.profile && typeof existingRow.profile === "object"
                ? existingRow.profile
                : {}),
            adminSchemaVersion: CREATOR_CMS_SCHEMA_VERSION,
            works: Array.isArray(creator.works) ? creator.works : [],
            links: Array.isArray(creator.links) ? creator.links : []
        }
    };
}

function writeCreatorCache(collection){
    const normalized = normalizeCreatorsCollection(collection);
    validateCreatorsCollection(normalized);
    if(save(CREATORS_KEY, normalized) === false){
        throw new Error("Creatorsのローカルcacheを更新できませんでした");
    }
    return normalized;
}

function nextOrder(creators){
    return creators.reduce(
        (max, creator) => Math.max(max, Number(creator.order) || 0),
        0
    ) + 1;
}
