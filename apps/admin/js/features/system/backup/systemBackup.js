import {
    LAST_BACKUP_EXPORT_KEY
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
    listSiteSections
} from "../../cms/cmsRepository.js";

import {
    recordActivity
} from "../activityLog.js";

import {
    APP_NAME
} from "../../../appIdentity.js";

export const SYSTEM_BACKUP_TYPE = "relmua-admin-backup";
export const SYSTEM_BACKUP_VERSION = "2.0.0";

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

export async function createSystemBackupCanonical(
    storage = localStorage,
    now = new Date(),
    sectionLoader = listSiteSections
){
    const legacy = createSystemBackup(storage, now);
    const siteSections = await sectionLoader();

    return {
        ...legacy,
        backupVersion: SYSTEM_BACKUP_VERSION,
        schemaVersion: 2,
        data: {
            ...legacy.data,
            cms: {
                siteSections: siteSections.map(normalizeSiteSectionForBackup)
            }
        }
    };
}

export async function createSystemBackupBestAvailable(
    storage = localStorage,
    now = new Date(),
    accessResolver = getCmsAccessState,
    sectionLoader = listSiteSections
){
    let access = null;
    try{
        access = await accessResolver();
    }catch(error){
        console.warn("[cms] Backup access check failed; using local compatibility backup", error);
    }

    if(access?.configured && access?.authenticated && access?.isAdmin){
        return {
            payload: await createSystemBackupCanonical(storage, now, sectionLoader),
            mode: "canonical",
            warning: ""
        };
    }

    return {
        payload: createSystemBackup(storage, now),
        mode: "local-fallback",
        warning: "Supabase CMSへ接続できないため、現在のlocalStorageだけをschema v1で退避しました。CMS接続後にschema v2 Backupを取り直してください。"
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

    if(![1, 2].includes(payload.schemaVersion)){
        errors.push("schemaVersion must be 1 or 2.");
    }

    if(!payload.data || typeof payload.data !== "object"){
        errors.push("data is required.");
    }else{
        if(!payload.data.items || typeof payload.data.items !== "object"){
            errors.push("data.items is required.");
        }

        if(payload.schemaVersion === 2){
            if(!payload.data.cms || typeof payload.data.cms !== "object"){
                errors.push("data.cms is required for schemaVersion 2.");
            }else if(!Array.isArray(payload.data.cms.siteSections)){
                errors.push("data.cms.siteSections must be an array.");
            }
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
