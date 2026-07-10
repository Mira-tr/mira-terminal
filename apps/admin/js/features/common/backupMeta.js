import {
    LAST_BACKUP_EXPORT_KEY
} from "../../store.js";

export function recordBackupExport(
    storage = localStorage,
    date = new Date()
){
    try{
        const timestamp = date instanceof Date
            ? date
            : new Date(date);
        const value = timestamp.toISOString();

        storage.setItem(LAST_BACKUP_EXPORT_KEY, value);
        return value;
    }catch{
        return "";
    }
}

export function getLastBackupExportAt(storage = localStorage){
    try{
        const value = String(
            storage.getItem(LAST_BACKUP_EXPORT_KEY) || ""
        ).trim();

        if(!value || !Number.isFinite(Date.parse(value))){
            return "";
        }

        return value;
    }catch{
        return "";
    }
}
