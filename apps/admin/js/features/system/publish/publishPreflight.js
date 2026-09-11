import {
    runSystemValidation
} from "../validation/validationCenter.js";

import {
    fetchBuildManifest,
    validateBuildManifest
} from "../build/buildManifest.js";

import {
    createPublicSnapshotPackage
} from "./publicSnapshotPackage.js";

import {
    getPublicAdminSurface
} from "../../site/publicAdminRegistry.js";

import {
    evaluatePublicSurface
} from "../../site/surfaceReadiness.js";

export async function runPublishPreflight({
    storage = localStorage,
    manifestPath = null,
    surfaceId = ""
} = {}){
    const validation = runSystemValidation(storage);
    const manifestResult = await fetchBuildManifest(manifestPath);
    const manifestIssues = validateBuildManifest(manifestResult.manifest);
    const packageResult = validateSnapshotPackageBuild();
    const surface = surfaceId ? getPublicAdminSurface(surfaceId) : null;
    const surfaceReadiness = surface
        ? evaluatePublicSurface(surface, { storage })
        : null;
    const surfaceIssues = (surfaceReadiness?.issues || []).map(issue => ({
        ...issue,
        href: issue.href || surface?.adminPath || "../system/validation/"
    }));
    const issues = [
        ...validation.issues,
        ...manifestIssues,
        ...packageResult.issues,
        ...surfaceIssues
    ];

    return {
        status: issues.some(issue => issue.severity === "critical") ? "blocked" : issues.some(issue => issue.severity === "high") ? "attention" : "ready",
        validation,
        buildManifest: manifestResult,
        snapshotPackage: packageResult,
        surface,
        surfaceReadiness,
        issues,
        ready: issues.filter(issue => ["critical", "high"].includes(issue.severity)).length === 0
    };
}

function validateSnapshotPackageBuild(){
    try{
        const pack = createPublicSnapshotPackage();
        return {
            ok: true,
            fileCount: pack.files.length,
            generatedAt: pack.generatedAt,
            issues: []
        };
    }catch(error){
        return {
            ok: false,
            fileCount: 0,
            generatedAt: "",
            issues: [{
                id: "critical-public-snapshot-package",
                severity: "critical",
                title: "公開用データをまとめられません",
                summary: error?.message || "Public snapshot package generation failed.",
                href: "../system/validation/"
            }]
        };
    }
}
