export async function fetchBuildManifest(path = "../../../dist/build-manifest.json"){
    try{
        const response = await fetch(path, {
            cache: "no-store"
        });

        if(!response.ok){
            return {
                ok: false,
                error: `Build manifest HTTP ${response.status}`,
                manifest: null
            };
        }

        const manifest = await response.json();
        return {
            ok: true,
            error: "",
            manifest
        };
    }catch(error){
        return {
            ok: false,
            error: error.message,
            manifest: null
        };
    }
}

export function validateBuildManifest(manifest){
    const issues = [];

    if(!manifest || typeof manifest !== "object"){
        return [createIssue("critical", "Build manifest is missing", "Run node scripts/build-public.mjs.")];
    }

    if(manifest.adminIncluded){
        issues.push(createIssue("critical", "Admin files are included in dist", "dist/admin must not exist."));
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
