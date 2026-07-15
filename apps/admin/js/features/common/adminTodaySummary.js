import {
    CREATORS_KEY,
    GAME_KEY,
    HOME_CONFIG_KEY,
    NOTES_KEY,
    PROFILE_KEY,
    RULES_KEY,
    STORAGE_KEY,
    TOOLS_KEY
} from "../../store.js";

import { getLastBackupExportAt } from "./backupMeta.js";
import { formatDashboardDate, getAdminDashboardBackupText } from "./adminDashboard.js";
import { getLastPublicExport } from "./operationMeta.js";

const COLLECTIONS = Object.freeze([
    { label: "Projects", key: GAME_KEY, field: "games", href: "./game/" },
    { label: "Tools", key: TOOLS_KEY, field: "tools", href: "./tools/" },
    { label: "Notes", key: NOTES_KEY, field: "notes", href: "./notes/" },
    { label: "Creators", key: CREATORS_KEY, field: "creators", href: "./creators/" },
    { label: "TRPG", key: STORAGE_KEY, field: "", href: "./trpg/" }
]);

export function loadAdminTodaySummary(storage = localStorage){
    const collections = COLLECTIONS.map(config => summarizeCollection(config, storage));
    const recent = collections
        .flatMap(collection => collection.items.map(item => ({ ...item, module: collection.label, href: collection.href })))
        .filter(item => item.updatedAt)
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .slice(0, 6);
    const total = collections.reduce((sum, item) => sum + item.total, 0);
    const publicCount = collections.reduce((sum, item) => sum + item.publicCount, 0);
    const attention = collections.reduce((sum, item) => sum + item.attention, 0);
    const configured = [PROFILE_KEY, RULES_KEY, HOME_CONFIG_KEY].filter(key => hasStoredValue(storage, key)).length;
    const lastPublicExport = getLastPublicExport(storage);
    const lastBackup = getLastBackupExportAt(storage);

    return {
        metrics: [
            { label: "公開中", value: publicCount, note: `全${total}件`, tone: "success" },
            { label: "公開待ち", value: attention, note: "Draft / Ready", tone: attention ? "warning" : "neutral" },
            { label: "設定済み", value: configured, note: "Profile / Rules / Home", tone: "neutral" },
            { label: "最終Public Export", value: lastPublicExport?.[0] || "未実施", note: lastPublicExport ? formatDashboardDate(lastPublicExport[1]) : "公開用JSONは未出力", tone: lastPublicExport ? "success" : "warning" },
            { label: "最終Backup", value: lastBackup ? "記録あり" : "未実施", note: getAdminDashboardBackupText(storage), tone: lastBackup ? "success" : "warning" }
        ],
        recent,
        storageAvailable: isStorageAvailable(storage)
    };
}

function summarizeCollection(config, storage){
    const parsed = readJson(storage, config.key);
    const source = config.field ? parsed?.[config.field] : parsed;
    const items = Array.isArray(source) ? source : [];
    return {
        ...config,
        items: items.map(item => ({
            title: String(item.title || item.name || item.displayName || "名称未設定"),
            status: String(item.status || "draft"),
            updatedAt: String(item.updatedAt || item.createdAt || "")
        })),
        total: items.length,
        publicCount: items.filter(item => item?.status === "public").length,
        attention: items.filter(item => ["draft", "ready"].includes(item?.status)).length
    };
}

function readJson(storage, key){
    try{ const value = storage.getItem(key); return value ? JSON.parse(value) : null; }catch{ return null; }
}

function hasStoredValue(storage, key){
    try{ return Boolean(storage.getItem(key)); }catch{ return false; }
}

function isStorageAvailable(storage){
    try{
        const key = "__relmua_admin_healthcheck__";
        storage.setItem(key, "1");
        storage.removeItem(key);
        return true;
    }catch{
        return false;
    }
}
