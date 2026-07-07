import {
    getRules
} from "./rulesStore.js";

const APP_NAME = "MIRA Terminal";
const MODULE_NAME = "trpg";
const EXPORT_TYPE = "house-rules";
const EXPORT_VERSION = "1.0.0";
const SCHEMA_VERSION = 1;

export function exportPublicRules(){
    const rules = getRules();
    
    const exportData = {
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
                description: system.description,
                sections: system.sections
                    .filter(section => section.status === "public")
                    .map(section => ({
                        id: section.id,
                        title: section.title,
                        body: section.body,
                        order: section.order
                    }))
                    .sort((a, b) => a.order - b.order)
            }))
    };
    
    const blob = new Blob(
        [JSON.stringify(exportData, null, 2)],
        { type: "application/json" }
    );
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "house-rules.json";
    a.click();
    URL.revokeObjectURL(url);
}
