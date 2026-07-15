import {
    getLastPublicExport
} from "../../common/operationMeta.js";

import {
    getPublicExportTargets
} from "../systemInventory.js";

import {
    recordActivity
} from "../activityLog.js";

export function getSystemExportStatus(storage = localStorage){
    const history = readHistory(storage);
    return getPublicExportTargets().map(target => ({
        ...target,
        lastExportedAt: history[target.id] || "",
        state: history[target.id] ? "exported" : "needs-export"
    }));
}

export function getExportOverview(storage = localStorage){
    const targets = getSystemExportStatus(storage);
    const last = getLastPublicExport(storage);
    return {
        targets,
        exportedCount: targets.filter(target => target.state === "exported").length,
        pendingCount: targets.filter(target => target.state !== "exported").length,
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

function readHistory(storage){
    try{
        const raw = storage.getItem("mira_terminal_last_public_export");
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === "object" ? parsed : {};
    }catch{
        return {};
    }
}
