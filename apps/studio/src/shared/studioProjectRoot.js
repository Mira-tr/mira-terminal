export const REQUIRED_PROJECT_ROOT_ENTRIES = Object.freeze([
    "apps/web",
    "apps/admin",
    "scripts/build-public.mjs",
    "apps/web/CNAME",
    ".git"
]);

export function validateProjectRootSnapshot(snapshot){
    const errors = [];

    if(!snapshot || typeof snapshot !== "object"){
        return ["Project root snapshot is required."];
    }

    if(!snapshot.rootPath || typeof snapshot.rootPath !== "string"){
        errors.push("Project root path is required.");
    }

    REQUIRED_PROJECT_ROOT_ENTRIES.forEach(entry => {
        if(!snapshot.entries?.[entry]){
            errors.push(`Missing required project entry: ${entry}`);
        }
    });

    if(!snapshot.packageJson && !snapshot.specificationDoc){
        errors.push("package.json or docs/specification.md is required as a project identity file.");
    }

    if(snapshot.publicJsonCount !== undefined && snapshot.publicJsonCount !== 8){
        errors.push(`Expected 8 public JSON files, found ${snapshot.publicJsonCount}.`);
    }

    return errors;
}

export function createProjectStatus(snapshot){
    const errors = validateProjectRootSnapshot(snapshot);
    return {
        ok: errors.length === 0,
        rootPath: String(snapshot?.rootPath || ""),
        branch: String(snapshot?.git?.branch || ""),
        headSha: String(snapshot?.git?.headSha || ""),
        dirty: Boolean(snapshot?.git?.dirty),
        publicJsonCount: Number(snapshot?.publicJsonCount || 0),
        distExists: Boolean(snapshot?.dist?.exists),
        cname: String(snapshot?.dist?.cname || snapshot?.cname || ""),
        canonicalOrigin: String(snapshot?.dist?.canonicalOrigin || ""),
        lastBackupAt: String(snapshot?.lastBackupAt || ""),
        lastBuildAt: String(snapshot?.dist?.builtAt || ""),
        errors
    };
}
