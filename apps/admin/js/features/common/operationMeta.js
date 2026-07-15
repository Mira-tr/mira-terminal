import {
    LAST_PUBLIC_EXPORT_KEY
} from "../../store.js";

export function recordPublicExport(moduleName, storage = localStorage, date = new Date()){
    try{
        const current = getPublicExportHistory(storage);
        current[String(moduleName || "unknown")] = new Date(date).toISOString();
        storage.setItem(LAST_PUBLIC_EXPORT_KEY, JSON.stringify(current));
        return current;
    }catch{
        return {};
    }
}

export function getPublicExportHistory(storage = localStorage){
    try{
        const parsed = JSON.parse(storage.getItem(LAST_PUBLIC_EXPORT_KEY) || "{}");
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    }catch{
        return {};
    }
}

export function getLastPublicExport(storage = localStorage){
    return Object.entries(getPublicExportHistory(storage))
        .filter(([, value]) => Number.isFinite(Date.parse(value)))
        .sort((a, b) => Date.parse(b[1]) - Date.parse(a[1]))[0] || null;
}
