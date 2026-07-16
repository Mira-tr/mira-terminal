import {
    exportPublicScenarios
} from "./scenarioPublicExport.js";

export function createScenarioExportAdapter({
    repository
}){
    return {
        kind: "ExportAdapter",
        exportPublicData(options = {}){
            return exportPublicScenarios(
                repository.listDrafts(),
                {
                    moduleName: "trpg",
                    ...options
                }
            );
        }
    };
}
