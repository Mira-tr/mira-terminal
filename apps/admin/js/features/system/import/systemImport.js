import {
    SYSTEM_BACKUP_TYPE,
    createSystemBackup,
    validateSystemBackup
} from "../backup/systemBackup.js";

import {
    getStorageTargets
} from "../systemInventory.js";

import {
    recordActivity
} from "../activityLog.js";

export async function readJsonFile(file){
    const text = await file.text();
    try{
        return {
            ok: true,
            payload: JSON.parse(text),
            text
        };
    }catch(error){
        return {
            ok: false,
            payload: null,
            text,
            errors: [`Invalid JSON: ${error.message}`]
        };
    }
}

export function previewSystemImport(payload, storage = localStorage){
    const errors = validateSystemBackup(payload);
    if(errors.length > 0){
        return {
            ok: false,
            errors,
            changes: [],
            rollback: null
        };
    }

    const allowedKeys = new Set(getStorageTargets().map(target => target.storageKey));
    const incoming = payload.data.items || {};
    const changes = Object.entries(incoming)
        .filter(([key]) => allowedKeys.has(key))
        .map(([key, value]) => ({
            key,
            exists: storage.getItem(key) !== null,
            incomingBytes: value ? new Blob([String(value)]).size : 0,
            action: value === null ? "remove" : "replace"
        }));

    const unexpectedKeys = Object.keys(incoming).filter(key => !allowedKeys.has(key));

    return {
        ok: true,
        backupType: SYSTEM_BACKUP_TYPE,
        exportedAt: payload.exportedAt || "",
        changes,
        warnings: unexpectedKeys.map(key => `Ignored unknown storage key: ${key}`),
        rollback: createSystemBackup(storage)
    };
}

export function applySystemImport(payload, storage = localStorage){
    const preview = previewSystemImport(payload, storage);

    if(!preview.ok){
        return preview;
    }

    const allowedKeys = new Set(getStorageTargets().map(target => target.storageKey));
    Object.entries(payload.data.items || {}).forEach(([key, value]) => {
        if(!allowedKeys.has(key)){
            return;
        }

        if(value === null){
            storage.removeItem(key);
        }else{
            storage.setItem(key, String(value));
        }
    });

    recordActivity({
        action: "import",
        workspace: "system",
        module: "import",
        summary: `Imported ${preview.changes.length} storage targets from backup.`,
        result: "success",
        severity: "high"
    }, storage);

    return {
        ...preview,
        applied: true
    };
}
