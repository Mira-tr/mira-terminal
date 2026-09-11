export async function fetchBuildManifest(path = null){
    const candidates = path
        ? [path]
        : globalThis.location?.pathname?.startsWith("/admin/")
            ? ["/build-manifest.json"]
            : ["../../../../dist/build-manifest.json", "/dist/build-manifest.json"];
    let lastError = "Build manifest is unavailable";

    for(const candidate of candidates){
        try{
            const response = await fetch(candidate, {
                cache: "no-store"
            });

            if(!response.ok){
                lastError = `Build manifest HTTP ${response.status}`;
                continue;
            }

            const manifest = await response.json();
            return {
                ok: true,
                error: "",
                manifest
            };
        }catch(error){
            lastError = error.message;
        }
    }

    return {
        ok: false,
        error: lastError,
        manifest: null
    };
}

export function validateBuildManifest(manifest){
    const issues = [];

    if(!manifest || typeof manifest !== "object"){
        return [createIssue("critical", "Build manifest is missing", "Run node scripts/build-public.mjs.")];
    }

    if(!manifest.adminIncluded){
        issues.push(createIssue("critical", "Published Admin route is missing", "dist/admin must contain the isolated Admin bundle."));
    }

    if(manifest.adminIncluded && manifest.adminOutputRoot !== "dist/admin"){
        issues.push(createIssue("critical", "Admin output root is invalid", "Admin must be isolated under dist/admin."));
    }

    if(manifest.cname !== "relmua.com"){
        issues.push(createIssue("high", "CNAME is not relmua.com", "Confirm dist/CNAME is generated."));
    }

    if(manifest.canonicalOrigin !== "https://relmua.com"){
        issues.push(createIssue("high", "Canonical origin is not relmua.com", "Confirm SEO metadata before release."));
    }

    if(manifest.status !== "success"){
        issues.push(createIssue("critical", "Build status is not success", "Run the public build again."));
    }

    return issues;
}

function createIssue(severity, title, summary){
    return {
        id: `${severity}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        severity,
        title,
        summary,
        href: "../system/publish/"
    };
}
