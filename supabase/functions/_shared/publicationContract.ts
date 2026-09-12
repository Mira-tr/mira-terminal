export const PUBLICATION_PACKAGE_SCHEMA_VERSION = 1;
export const PUBLICATION_PACKAGE_MODULE = "public-snapshot-package";

export const PUBLICATION_TARGETS = Object.freeze([
    Object.freeze({ targetId: "home", filename: "public-home.json", destination: "apps/web/data/public-home.json" }),
    Object.freeze({ targetId: "projects", filename: "public-games.json", destination: "apps/web/game/data/public-games.json" }),
    Object.freeze({ targetId: "tools", filename: "public-tools.json", destination: "apps/web/tools/data/public-tools.json" }),
    Object.freeze({ targetId: "notes", filename: "public-notes.json", destination: "apps/web/notes/data/public-notes.json" }),
    Object.freeze({ targetId: "creators", filename: "public-creators.json", destination: "apps/web/data/public-creators.json" }),
    Object.freeze({ targetId: "profile", filename: "public-profile.json", destination: "apps/web/data/public-profile.json" }),
    Object.freeze({ targetId: "trpg-scenarios", filename: "public-scenarios.json", destination: "apps/web/data/creators/chikage/trpg/public-scenarios.json" }),
    Object.freeze({ targetId: "house-rules", filename: "house-rules.json", destination: "apps/web/data/creators/chikage/trpg/house-rules.json" })
]);

const ADMIN_ONLY_FIELDS = new Set(["memo", "status", "createdAt", "updatedAt"]);
const SAFE_EXTERNAL_PROTOCOLS = new Set(["http:", "https:"]);
const TARGETS_BY_ID = new Map(PUBLICATION_TARGETS.map(target => [target.targetId, target]));

export function validatePublicSnapshotPackage(pack: any){
    if(!pack || typeof pack !== "object" || Array.isArray(pack)){
        throw new Error("Invalid public snapshot package.");
    }
    if(pack.schemaVersion !== PUBLICATION_PACKAGE_SCHEMA_VERSION){
        throw new Error("Unsupported public snapshot package schemaVersion.");
    }
    if(pack.module !== PUBLICATION_PACKAGE_MODULE){
        throw new Error("Invalid public snapshot package module.");
    }
    if(!Array.isArray(pack.files) || pack.files.length !== PUBLICATION_TARGETS.length){
        throw new Error(`Public snapshot package must contain ${PUBLICATION_TARGETS.length} files.`);
    }
    if(pack.generatedAt && !Number.isFinite(Date.parse(String(pack.generatedAt)))){
        throw new Error("Public snapshot package generatedAt is invalid.");
    }

    const seen = new Set<string>();
    for(const file of pack.files){
        const targetId = String(file?.targetId || "");
        const target = TARGETS_BY_ID.get(targetId);
        if(!target){
            throw new Error(`Unknown public target: ${targetId || "unknown"}`);
        }
        if(seen.has(targetId)){
            throw new Error(`Duplicate public target: ${targetId}`);
        }
        seen.add(targetId);
        if(file?.filename !== target.filename || file?.destination !== target.destination){
            throw new Error(`Public target contract mismatch: ${targetId}`);
        }
        assertPublicSafe(file?.payload, targetId);
    }

    for(const target of PUBLICATION_TARGETS){
        if(!seen.has(target.targetId)){
            throw new Error(`Missing public target: ${target.targetId}`);
        }
    }
    return true;
}

export async function computePublicSnapshotFingerprint(pack: any){
    validatePublicSnapshotPackage(pack);
    const canonical = canonicalStringify({
        schemaVersion: PUBLICATION_PACKAGE_SCHEMA_VERSION,
        module: PUBLICATION_PACKAGE_MODULE,
        files: pack.files
            .map((file: any) => ({
                targetId: file.targetId,
                filename: file.filename,
                destination: file.destination,
                payload: file.payload
            }))
            .sort((left: any, right: any) => String(left.targetId).localeCompare(String(right.targetId)))
    });
    const bytes = new TextEncoder().encode(canonical);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)]
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}

function assertPublicSafe(value: any, path: string){
    if(Array.isArray(value)){
        value.forEach((item, index) => assertPublicSafe(item, `${path}[${index}]`));
        return;
    }
    if(!value || typeof value !== "object"){
        return;
    }
    for(const [key, item] of Object.entries(value)){
        if(ADMIN_ONLY_FIELDS.has(key)){
            throw new Error(`${path}.${key} is an Admin-only field.`);
        }
        if(key === "url" && String(item || "").trim()){
            assertSafeExternalUrl(item, `${path}.${key}`);
        }
        assertPublicSafe(item, `${path}.${key}`);
    }
}

function assertSafeExternalUrl(value: unknown, path: string){
    let url: URL;
    try{
        url = new URL(String(value));
    }catch{
        throw new Error(`${path} must be an absolute http/https URL.`);
    }
    if(!SAFE_EXTERNAL_PROTOCOLS.has(url.protocol)){
        throw new Error(`${path} must use http or https.`);
    }
}

function canonicalStringify(value: any): string{
    if(value === null){
        return "null";
    }
    if(Array.isArray(value)){
        return `[${value.map(canonicalStringify).join(",")}]`;
    }
    if(typeof value === "object"){
        return `{${Object.keys(value)
            .sort()
            .map(key => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`)
            .join(",")}}`;
    }
    const encoded = JSON.stringify(value);
    return encoded === undefined ? "null" : encoded;
}
