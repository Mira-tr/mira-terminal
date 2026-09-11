import {
    ACTIVITY_LOG_KEY,
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

import {
    getCmsAccessState
} from "./cmsClient.js";

import {
    appendCmsActivity,
    getContentRecord,
    upsertContentRecord
} from "./cmsRepository.js";

export const LEGACY_STORAGE_KEYS = Object.freeze([
    CREATORS_KEY,
    PROFILE_KEY,
    HOME_CONFIG_KEY,
    GAME_KEY,
    TOOLS_KEY,
    NOTES_KEY,
    STORAGE_KEY,
    TAG_KEY,
    AUTHOR_KEY,
    RULES_KEY,
    ACTIVITY_LOG_KEY
]);

export async function exportLegacyStorageToCms(storage = globalThis.localStorage){
    if(!storage){
        throw new Error("localStorageを利用できません");
    }

    const access = await getCmsAccessState();
    if(!access.authenticated || !access.isAdmin){
        throw new Error("RELMUA Admin権限でのログインが必要です");
    }

    const snapshot = createLegacySnapshot(storage);
    const migrated = [];

    for(const item of snapshot.items){
        await upsertContentRecord({
            collection: "legacy-snapshot",
            recordKey: item.key,
            status: "private",
            data: {
                schemaVersion: 1,
                storageKey: item.key,
                value: item.value,
                capturedAt: snapshot.capturedAt
            }
        });
        migrated.push(item.key);
    }

    await appendCmsActivity("legacy_storage_imported", "cms", "legacy-snapshot", {
        migratedKeys: migrated,
        capturedAt: snapshot.capturedAt
    });

    return {
        ...snapshot,
        migratedKeys: migrated
    };
}

export async function restoreLegacyStorageFromCms(storage = globalThis.localStorage){
    if(!storage){
        throw new Error("localStorageを利用できません");
    }

    const access = await getCmsAccessState();
    if(!access.authenticated || !access.isAdmin){
        throw new Error("RELMUA Admin権限でのログインが必要です");
    }

    const restored = [];
    for(const key of LEGACY_STORAGE_KEYS){
        const record = await getContentRecord("legacy-snapshot", key);
        if(!record?.data || record.data.storageKey !== key){
            continue;
        }
        storage.setItem(key, JSON.stringify(record.data.value));
        restored.push(key);
    }

    await appendCmsActivity("legacy_storage_restored", "cms", "legacy-snapshot", {
        restoredKeys: restored
    });

    return restored;
}

export function createLegacySnapshot(storage = globalThis.localStorage){
    const capturedAt = new Date().toISOString();
    const items = LEGACY_STORAGE_KEYS.flatMap(key => {
        const raw = storage?.getItem?.(key);
        if(raw === null || raw === undefined){
            return [];
        }
        return [{
            key,
            value: parseJson(raw)
        }];
    });

    return {
        schemaVersion: 1,
        capturedAt,
        items
    };
}

function parseJson(raw){
    try{
        return JSON.parse(raw);
    }catch{
        return String(raw);
    }
}
