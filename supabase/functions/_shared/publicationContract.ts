export const PUBLICATION_PACKAGE_SCHEMA_VERSION = 2;
export const PUBLICATION_PACKAGE_MODULE = "public-snapshot-package";

export const LEGACY_PUBLICATION_TARGETS_V1 = Object.freeze([
    Object.freeze({ targetId: "home", filename: "public-home.json", destination: "apps/web/data/public-home.json" }),
    Object.freeze({ targetId: "projects", filename: "public-games.json", destination: "apps/web/game/data/public-games.json" }),
    Object.freeze({ targetId: "tools", filename: "public-tools.json", destination: "apps/web/tools/data/public-tools.json" }),
    Object.freeze({ targetId: "notes", filename: "public-notes.json", destination: "apps/web/notes/data/public-notes.json" }),
    Object.freeze({ targetId: "creators", filename: "public-creators.json", destination: "apps/web/data/public-creators.json" }),
    Object.freeze({ targetId: "profile", filename: "public-profile.json", destination: "apps/web/data/public-profile.json" }),
    Object.freeze({ targetId: "trpg-scenarios", filename: "public-scenarios.json", destination: "apps/web/data/creators/chikage/trpg/public-scenarios.json" }),
    Object.freeze({ targetId: "house-rules", filename: "house-rules.json", destination: "apps/web/data/creators/chikage/trpg/house-rules.json" })
]);

export const PUBLICATION_TARGETS = Object.freeze([
    Object.freeze({ targetId: "home", filename: "public-home.json", destination: "apps/web/data/public-home.json" }),
    Object.freeze({ targetId: "brand-site", filename: "public-brand.json", destination: "apps/web/data/public-brand.json" }),
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
const TARGETS_BY_SCHEMA_VERSION = new Map<number, readonly any[]>([
    [1, LEGACY_PUBLICATION_TARGETS_V1],
    [PUBLICATION_PACKAGE_SCHEMA_VERSION, PUBLICATION_TARGETS]
]);

export function validatePublicSnapshotPackage(pack: any){
    if(!pack || typeof pack !== "object" || Array.isArray(pack)){
        throw new Error("Invalid public snapshot package.");
    }
    if(pack.module !== PUBLICATION_PACKAGE_MODULE){
        throw new Error("Invalid public snapshot package module.");
    }
    const targets = targetsForSchemaVersion(pack.schemaVersion);
    if(!Array.isArray(pack.files) || pack.files.length !== targets.length){
        throw new Error(`Public snapshot package must contain ${targets.length} files for schema v${pack.schemaVersion}.`);
    }
    if(pack.generatedAt && !Number.isFinite(Date.parse(String(pack.generatedAt)))){
        throw new Error("Public snapshot package generatedAt is invalid.");
    }

    const targetsById = new Map(targets.map(target => [target.targetId, target]));
    const seen = new Set<string>();
    for(const file of pack.files){
        const targetId = String(file?.targetId || "");
        const target = targetsById.get(targetId);
        if(!target){
            throw new Error(`Unknown public target for schema v${pack.schemaVersion}: ${targetId || "unknown"}`);
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

    for(const target of targets){
        if(!seen.has(target.targetId)){
            throw new Error(`Missing public target: ${target.targetId}`);
        }
    }
    return true;
}

export async function computePublicSnapshotFingerprint(pack: any){
    return computeFingerprint(pack, true);
}

export async function computeLegacyPublicSnapshotFingerprint(pack: any){
    return computeFingerprint(pack, false);
}

async function computeFingerprint(pack: any, ignoreVolatileMetadata: boolean){
    validatePublicSnapshotPackage(pack);
    const canonical = canonicalStringify({
        schemaVersion: pack.schemaVersion,
        module: PUBLICATION_PACKAGE_MODULE,
        files: pack.files
            .map((file: any) => ({
                targetId: file.targetId,
                filename: file.filename,
                destination: file.destination,
                payload: ignoreVolatileMetadata
                    ? withoutVolatileExportMetadata(file.payload)
                    : file.payload
            }))
            .sort(ignoreVolatileMetadata ? compareTargetIds : compareTargetIdsLegacy)
    });
    const bytes = new TextEncoder().encode(canonical);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)]
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}

function compareTargetIds(left: any, right: any){
    const leftId = String(left?.targetId || "");
    const rightId = String(right?.targetId || "");
    return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
}

function compareTargetIdsLegacy(left: any, right: any){
    return String(left?.targetId || "").localeCompare(String(right?.targetId || ""));
}

function withoutVolatileExportMetadata(value: any): any{
    if(Array.isArray(value)){
        return value.map(withoutVolatileExportMetadata);
    }
    if(!value || typeof value !== "object"){
        return value;
    }
    return Object.fromEntries(Object.entries(value)
        .filter(([key]) => key !== "exportedAt")
        .map(([key, item]) => [key, withoutVolatileExportMetadata(item)]));
}

function targetsForSchemaVersion(schemaVersion: unknown){
    if(typeof schemaVersion !== "number" || !Number.isInteger(schemaVersion)){
        throw new Error("Unsupported public snapshot package schemaVersion.");
    }
    const targets = TARGETS_BY_SCHEMA_VERSION.get(schemaVersion);
    if(!targets){
        throw new Error("Unsupported public snapshot package schemaVersion.");
    }
    return targets;
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
