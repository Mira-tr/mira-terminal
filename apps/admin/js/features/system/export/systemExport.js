import {
    getLastPublicExport,
    getPublicExportHistory
} from "../../common/operationMeta.js";

import {
    getPublicExportTargets
} from "../systemInventory.js";

import {
    recordActivity
} from "../activityLog.js";

export function getSystemExportStatus(storage = localStorage){
    const history = getPublicExportHistory(storage);
    return getPublicExportTargets().map(target => {
        const lastExportedAt = latestHistoryValue(target.historyKeys, history);
        return {
            ...target,
            lastExportedAt,
            state: target.filename === "static-html"
                ? "static"
                : lastExportedAt
                    ? "exported"
                    : "needs-export"
        };
    });
}

export function getExportOverview(storage = localStorage){
    const targets = getSystemExportStatus(storage);
    const last = getLastPublicExport(storage);
    return {
        targets,
        exportedCount: targets.filter(target => ["exported", "static"].includes(target.state)).length,
        pendingCount: targets.filter(target => target.state === "needs-export").length,
        last
    };
}

export function markSystemExportReview(storage = localStorage){
    recordActivity({
        action: "export-review",
        workspace: "system",
        module: "export",
        summary: "Reviewed Public Export targets.",
        result: "info",
        severity: "info"
    }, storage);
}

function latestHistoryValue(keys, history){
    return (Array.isArray(keys) ? keys : [])
        .map(key => history[key])
        .filter(value => Number.isFinite(Date.parse(value)))
        .sort((a, b) => Date.parse(b) - Date.parse(a))[0] || "";
}
