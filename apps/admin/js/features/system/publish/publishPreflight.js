import {
    runSystemValidation
} from "../validation/validationCenter.js";

import {
    fetchBuildManifest,
    validateBuildManifest
} from "../build/buildManifest.js";

import {
    getPublicExportTargets
} from "../systemInventory.js";

export async function runPublishPreflight({
    storage = localStorage,
    manifestPath = "../../../../dist/build-manifest.json"
} = {}){
    const validation = runSystemValidation(storage);
    const manifestResult = await fetchBuildManifest(manifestPath);
    const manifestIssues = validateBuildManifest(manifestResult.manifest);
    const exportIssues = validateExportReview();
    const issues = [
        ...validation.issues,
        ...manifestIssues,
        ...exportIssues
    ];

    return {
        status: issues.some(issue => issue.severity === "critical") ? "blocked" : issues.some(issue => issue.severity === "high") ? "attention" : "ready",
        validation,
        buildManifest: manifestResult,
        issues,
        ready: issues.filter(issue => ["critical", "high"].includes(issue.severity)).length === 0
    };
}

function validateExportReview(){
    return getPublicExportTargets()
        .filter(target => target.filename !== "static-html")
        .map(target => ({
            id: `export-check-${target.id}`,
            severity: "warning",
            title: `${target.title} export confirmation required`,
            summary: `${target.filename} should be exported after edits and before build.`,
            href: "../system/export/"
        }));
}
