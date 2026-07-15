import {
    LAST_BACKUP_EXPORT_KEY
} from "../../../store.js";

import {
    collectStorageSnapshot,
    getStorageTargets,
    summarizeStorageTarget
} from "../systemInventory.js";

import {
    recordActivity
} from "../activityLog.js";

export const SYSTEM_BACKUP_TYPE = "relmua-admin-backup";
export const SYSTEM_BACKUP_VERSION = "1.0.0";

export function createSystemBackup(storage = localStorage, now = new Date()){
    const snapshot = collectStorageSnapshot(storage);
    const targets = getStorageTargets().map(target => summarizeStorageTarget(target, storage));

    return {
        app: "RELMUA Terminal",
        module: "system",
        backupType: SYSTEM_BACKUP_TYPE,
        backupVersion: SYSTEM_BACKUP_VERSION,
        schemaVersion: 1,
        exportedAt: now.toISOString(),
        data: {
            storageTargets: targets,
            items: snapshot.items
        }
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

    if(payload.schemaVersion !== 1){
        errors.push("schemaVersion must be 1.");
    }

    if(!payload.data || typeof payload.data !== "object"){
        errors.push("data is required.");
    }else if(!payload.data.items || typeof payload.data.items !== "object"){
        errors.push("data.items is required.");
    }

    return errors;
}

export function exportSystemBackup(storage = localStorage){
    const payload = createSystemBackup(storage);
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

export function getBackupSummaries(storage = localStorage){
    return getStorageTargets().map(target => summarizeStorageTarget(target, storage));
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
