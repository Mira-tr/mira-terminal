import {
    AUTHOR_KEY,
    CREATORS_KEY,
    GAME_KEY,
    HOME_CONFIG_KEY,
    LAST_BACKUP_EXPORT_KEY,
    NOTES_KEY,
    PROFILE_KEY,
    RULES_KEY,
    STORAGE_KEY,
    TAG_KEY,
    TOOLS_KEY
} from "../../../store.js";

import {
    collectStorageSnapshot,
    getStorageTargets,
    summarizeStorageTarget
} from "../systemInventory.js";

import {
    getCmsAccessState
} from "../../cms/cmsClient.js";

import {
    getContentRecord,
    listCreators,
    listSiteSections
} from "../../cms/cmsRepository.js";

import {
    createCollectionFromCms
} from "../../creators/creatorCmsStore.js";

import {
    recordActivity
} from "../activityLog.js";

import {
    APP_NAME
} from "../../../appIdentity.js";

export const SYSTEM_BACKUP_TYPE = "relmua-admin-backup";
export const SYSTEM_BACKUP_VERSION = "3.0.0";

const CANONICAL_STORAGE_KEYS = Object.freeze([
    HOME_CONFIG_KEY,
    GAME_KEY,
    TOOLS_KEY,
    NOTES_KEY,
    CREATORS_KEY,
    PROFILE_KEY,
    STORAGE_KEY,
    TAG_KEY,
    AUTHOR_KEY,
    RULES_KEY
]);

export function createSystemBackup(storage = localStorage, now = new Date()){
    const snapshot = collectStorageSnapshot(storage);
    const targets = getStorageTargets().map(target => summarizeStorageTarget(target, storage));

    return {
        app: APP_NAME,
        module: "system",
        backupType: SYSTEM_BACKUP_TYPE,
        backupVersion: "1.0.0",
        schemaVersion: 1,
        exportedAt: now.toISOString(),
        data: {
            storageTargets: targets,
            items: snapshot.items
        }
    };
}

/**
 * Create a complete canonical backup.
 *
 * Device-local storage is retained for backwards compatibility, but every
 * Admin content key is overwritten with data reconstructed directly from the
 * Supabase CMS. This makes a backup complete even on a freshly signed-in
 * device whose localStorage cache is empty or stale.
 */
export async function createSystemBackupCanonical(
    storage = localStorage,
    now = new Date(),
    sectionLoader = listSiteSections,
    canonicalItemsLoader = loadCanonicalBackupItems
){
    const legacy = createSystemBackup(storage, now);
    const [siteSections, canonicalItems] = await Promise.all([
        sectionLoader(),
        canonicalItemsLoader()
    ]);
    const items = {
        ...legacy.data.items,
        ...canonicalItems
    };
    const snapshotStorage = createItemStorage(items);
    const storageTargets = getStorageTargets().map(
        target => summarizeStorageTarget(target, snapshotStorage)
    );

    return {
        ...legacy,
        backupVersion: SYSTEM_BACKUP_VERSION,
        schemaVersion: 3,
        data: {
            storageTargets,
            items,
            cms: {
                source: "supabase",
                siteSections: siteSections.map(normalizeSiteSectionForBackup)
            }
        }
    };
}

export async function createSystemBackupBestAvailable(
    storage = localStorage,
    now = new Date(),
    accessResolver = getCmsAccessState,
    sectionLoader = listSiteSections,
    canonicalItemsLoader = loadCanonicalBackupItems
){
    let access = null;
    try{
        access = await accessResolver();
    }catch(error){
        console.warn("[cms] Backup access check failed; using local compatibility backup", error);
    }

    if(access?.configured && access?.authenticated && access?.isAdmin){
        return {
            payload: await createSystemBackupCanonical(
                storage,
                now,
                sectionLoader,
                canonicalItemsLoader
            ),
            mode: "canonical",
            warning: ""
        };
    }

    return {
        payload: createSystemBackup(storage, now),
        mode: "local-fallback",
        warning: "Supabase CMSへ接続できないため、現在のlocalStorageだけをschema v1で退避しました。CMS接続後にschema v3 Backupを取り直してください。"
    };
}

/**
 * Rebuild all canonical storage-key payloads from Supabase.
 * Internal CMS UUIDs and authority rows are intentionally not exported.
 */
export async function loadCanonicalBackupItems(){
    const creatorRows = await listCreators();
    const creators = createCollectionFromCms(creatorRows);
    const ownerRow = resolvePrimaryCreatorRow(creatorRows, creators.primaryCreatorId);

    if(!ownerRow?.id){
        throw new Error("Primary CreatorをCMS上で解決できないためBackupを作成できません。");
    }

    const [home, projects, tools, notes, scenarios, rules] = await Promise.all([
        getContentRecord("home", "config", null),
        getContentRecord("projects", "collection", null),
        getContentRecord("tools", "collection", null),
        getContentRecord("notes", "collection", null),
        getContentRecord("trpg-scenarios", "collection", ownerRow.id),
        getContentRecord("trpg-house-rules", "collection", ownerRow.id)
    ]);

    const homeData = requireRecordData(home, "Home");
    const projectData = requireRecordData(projects, "Projects");
    const toolData = requireRecordData(tools, "Tools");
    const noteData = requireRecordData(notes, "Notes");
    const scenarioData = requireRecordData(scenarios, "TRPG Scenarios");
    const ruleData = requireRecordData(rules, "House Rules");

    return {
        [HOME_CONFIG_KEY]: stringifyBackupValue(homeData),
        [GAME_KEY]: stringifyBackupValue(projectData),
        [TOOLS_KEY]: stringifyBackupValue(toolData),
        [NOTES_KEY]: stringifyBackupValue(noteData),
        [CREATORS_KEY]: stringifyBackupValue(creators),
        [PROFILE_KEY]: stringifyBackupValue(createPrimaryProfileSnapshot(creators)),
        [STORAGE_KEY]: stringifyBackupValue(asArray(scenarioData.scenarios)),
        [TAG_KEY]: stringifyBackupValue(asArray(scenarioData.tags)),
        [AUTHOR_KEY]: stringifyBackupValue(asArray(scenarioData.authors)),
        [RULES_KEY]: stringifyBackupValue(
            ruleData.rules && typeof ruleData.rules === "object"
                ? ruleData.rules
                : { systems: [] }
        )
    };
}

export function validateSystemBackup(payload){
    const errors = [];

    if(!payload || typeof payload !== "object"){
        errors.push("Backup JSON must be an object.");
        return errors;
    }

    if(payload.backupType !== SYSTEM_BACKUP_TYPE){
        errors.push(`backupType must be ${SYSTEM_BACKUP_TYPE}.`);
    }

    if(payload.module !== "system"){
        errors.push("module must be system.");
    }

    if(![1, 2, 3].includes(payload.schemaVersion)){
        errors.push("schemaVersion must be 1, 2 or 3.");
    }

    if(!payload.data || typeof payload.data !== "object"){
        errors.push("data is required.");
    }else{
        if(!payload.data.items || typeof payload.data.items !== "object"){
            errors.push("data.items is required.");
        }

        if(payload.schemaVersion >= 2){
            if(!payload.data.cms || typeof payload.data.cms !== "object"){
                errors.push(`data.cms is required for schemaVersion ${payload.schemaVersion}.`);
            }else if(!Array.isArray(payload.data.cms.siteSections)){
                errors.push("data.cms.siteSections must be an array.");
            }
        }

        if(payload.schemaVersion === 3 && payload.data.items && typeof payload.data.items === "object"){
            if(payload.data.cms?.source !== "supabase"){
                errors.push("data.cms.source must be supabase for schemaVersion 3.");
            }
            CANONICAL_STORAGE_KEYS.forEach(key => {
                if(typeof payload.data.items[key] !== "string"){
                    errors.push(`data.items.${key} must be a JSON string for schemaVersion 3.`);
                }
            });
        }
    }

    return errors;
}

export function exportSystemBackup(storage = localStorage){
    const payload = createSystemBackup(storage);
    return finishExport(payload, storage);
}

export async function exportSystemBackupCanonical(storage = localStorage){
    const backup = await createSystemBackupBestAvailable(storage);
    return {
        ...finishExport(backup.payload, storage),
        backupMode: backup.mode,
        warning: backup.warning
    };
}

export async function exportSystemBackupBestAvailable(storage = localStorage){
    return exportSystemBackupCanonical(storage);
}

export function getBackupSummaries(storage = localStorage){
    return getStorageTargets().map(target => summarizeStorageTarget(target, storage));
}

function finishExport(payload, storage){
    const filename = `relmua-terminal-system-backup-${dateStamp(new Date(payload.exportedAt))}.json`;

    downloadJson(payload, filename);
    storage.setItem(LAST_BACKUP_EXPORT_KEY, payload.exportedAt);
    recordActivity({
        action: "backup",
        workspace: "system",
        module: "backup",
        summary: `System backup exported: ${filename}`,
        result: "success",
        severity: "info"
    }, storage);

    return {
        filename,
        payload
    };
}

function resolvePrimaryCreatorRow(rows, primaryLegacyId){
    const activeRows = (Array.isArray(rows) ? rows : []).filter(
        row => row && row.status !== "archived"
    );
    return activeRows.find(row => row.legacy_id === primaryLegacyId)
        || activeRows.find(row => row.is_primary)
        || activeRows[0]
        || null;
}

function createPrimaryProfileSnapshot(collection){
    const primary = collection?.creators?.find(
        creator => creator.id === collection.primaryCreatorId
    );
    if(!primary){
        return {
            displayName: "",
            bio: "",
            activities: [],
            links: [],
            updatedAt: null
        };
    }
    return {
        displayName: String(primary.displayName || "").trim(),
        bio: String(primary.bio || "").trim(),
        activities: Array.isArray(primary.activities)
            ? JSON.parse(JSON.stringify(primary.activities))
            : [],
        links: Array.isArray(primary.links)
            ? primary.links.map(link => ({
                ...JSON.parse(JSON.stringify(link)),
                type: link?.type || "other"
            }))
            : [],
        updatedAt: primary.updatedAt || null
    };
}

function requireRecordData(record, label){
    if(!record || !record.data || typeof record.data !== "object" || Array.isArray(record.data)){
        throw new Error(`${label}のCanonical CMSデータが見つからないためBackupを作成できません。`);
    }
    return JSON.parse(JSON.stringify(record.data));
}

function stringifyBackupValue(value){
    return JSON.stringify(value ?? null);
}

function asArray(value){
    return Array.isArray(value) ? JSON.parse(JSON.stringify(value)) : [];
}

function createItemStorage(items){
    return {
        getItem(key){
            return Object.prototype.hasOwnProperty.call(items, key)
                ? items[key]
                : null;
        }
    };
}

function normalizeSiteSectionForBackup(section){
    return {
        section_key: String(section?.section_key || "").trim(),
        title: String(section?.title || "").trim(),
        slug: String(section?.slug || "").trim(),
        section_type: String(section?.section_type || "page").trim(),
        status: String(section?.status || "draft").trim(),
        navigation_label: String(section?.navigation_label || "").trim(),
        show_in_navigation: Boolean(section?.show_in_navigation),
        sort_order: Math.max(0, Number(section?.sort_order) || 0),
        content: section?.content && typeof section.content === "object" && !Array.isArray(section.content)
            ? JSON.parse(JSON.stringify(section.content))
            : {}
    };
}

function downloadJson(payload, filename){
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json"
    }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

function dateStamp(date){
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("");
}
