import {
    ACTIVITY_LOG_KEY,
    load,
    save
} from "../../store.js";

const MAX_LOG_ITEMS = 500;
const DEFAULT_ACTOR = "local-admin";

export function createActivityEntry({
    action,
    workspace = "",
    module = "",
    creatorId = "",
    targetId = "",
    summary = "",
    result = "info",
    severity = "info",
    at = new Date()
}){
    return {
        id: `activity-${toSafeTimestamp(at)}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: toIsoString(at),
        actor: DEFAULT_ACTOR,
        action: String(action || "unknown"),
        workspace: String(workspace || ""),
        module: String(module || ""),
        creatorId: String(creatorId || ""),
        targetId: String(targetId || ""),
        summary: String(summary || ""),
        result: normalizeResult(result),
        severity: normalizeSeverity(severity)
    };
}

export function getActivityLog(storage = localStorage){
    const payload = normalizeActivityPayload(load(ACTIVITY_LOG_KEY, null, storage));
    return payload.entries;
}

export function getActivityPayload(storage = localStorage){
    return normalizeActivityPayload(load(ACTIVITY_LOG_KEY, null, storage));
}

export function recordActivity(entry, storage = localStorage){
    const payload = normalizeActivityPayload(load(ACTIVITY_LOG_KEY, null, storage));
    const nextEntry = createActivityEntry(entry);
    const entries = [nextEntry, ...payload.entries].slice(0, MAX_LOG_ITEMS);
    const nextPayload = {
        schemaVersion: 1,
        maxItems: MAX_LOG_ITEMS,
        entries
    };
    save(ACTIVITY_LOG_KEY, nextPayload, storage);
    return nextEntry;
}

export function clearActivityLog(storage = localStorage){
    storage.removeItem(ACTIVITY_LOG_KEY);
    return {
        schemaVersion: 1,
        maxItems: MAX_LOG_ITEMS,
        entries: []
    };
}

export function exportActivityLogPayload(storage = localStorage){
    return {
        app: "RELMUA Terminal",
        module: "system",
        exportType: "activity-log",
        exportVersion: "1.0.0",
        exportedAt: new Date().toISOString(),
        data: getActivityPayload(storage)
    };
}

export function normalizeActivityPayload(value){
    if(!value || typeof value !== "object" || Array.isArray(value)){
        return {
            schemaVersion: 1,
            maxItems: MAX_LOG_ITEMS,
            entries: []
        };
    }

    const entries = Array.isArray(value.entries)
        ? value.entries.map(normalizeEntry).filter(Boolean).slice(0, MAX_LOG_ITEMS)
        : [];

    return {
        schemaVersion: 1,
        maxItems: MAX_LOG_ITEMS,
        entries
    };
}

function normalizeEntry(entry){
    if(!entry || typeof entry !== "object"){
        return null;
    }

    return {
        id: String(entry.id || `activity-${toSafeTimestamp(entry.timestamp || new Date())}`),
        timestamp: toIsoString(entry.timestamp || new Date()),
        actor: String(entry.actor || DEFAULT_ACTOR),
        action: String(entry.action || "unknown"),
        workspace: String(entry.workspace || ""),
        module: String(entry.module || ""),
        creatorId: String(entry.creatorId || ""),
        targetId: String(entry.targetId || ""),
        summary: String(entry.summary || ""),
        result: normalizeResult(entry.result),
        severity: normalizeSeverity(entry.severity)
    };
}

function normalizeResult(value){
    return ["success", "error", "warning", "info"].includes(value) ? value : "info";
}

function normalizeSeverity(value){
    return ["critical", "high", "warning", "info"].includes(value) ? value : "info";
}

function toIsoString(value){
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function toSafeTimestamp(value){
    return toIsoString(value).replace(/[^0-9]/g, "").slice(0, 14);
}
