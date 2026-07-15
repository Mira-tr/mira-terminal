import {
    getRules,
    normalizeRules
} from "./rulesStore.js";

import {
    showToast
} from "../../common/toastService.js";

import { recordPublicExport } from "../../common/operationMeta.js";

const APP_NAME = "MIRA Terminal";
const MODULE_NAME = "trpg";
const EXPORT_TYPE = "house-rules";
const EXPORT_VERSION = "1.0.0";
const SCHEMA_VERSION = 1;
const PUBLIC_EXPORT_FILENAME = "house-rules.json";
const PUBLIC_EXPORT_DESTINATION = "apps/web/data/creators/chikage/trpg/house-rules.json";

export function exportPublicRules(){
    const exportData = createPublicRulesPayload(getRules());

    const blob = new Blob(
        [JSON.stringify(exportData, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = PUBLIC_EXPORT_FILENAME;
    a.click();

    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 0);

    recordPublicExport(MODULE_NAME);

    showToast("Public JSONを出力しました", "success");
}

export function createPublicRulesPayload(sourceRules){
    const rules = normalizeRules(sourceRules);

    return {
        app: APP_NAME,
        module: MODULE_NAME,
        exportType: EXPORT_TYPE,
        exportVersion: EXPORT_VERSION,
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        systems: rules.systems
            .filter(system => system.status === "public")
            .map(system => ({
                id: system.id,
                label: system.label,
                title: system.title,
                version: system.version,
                description: system.description,
                sections: system.sections
                    .filter(section => section.status === "public")
                    .map(section => ({
                        id: section.id,
                        order: section.order,
                        category: section.category,
                        title: section.title,
                        body: section.body
                    }))
                    .sort((a, b) => a.order - b.order)
            }))
    };
}
