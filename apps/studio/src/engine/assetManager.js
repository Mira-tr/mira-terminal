export const ASSET_LIBRARY_SCHEMA_VERSION = 1;
export const ASSET_TYPES = Object.freeze(["image", "video", "svg", "pdf", "audio", "url"]);

export function createEmptyAssetLibrary(){
    return {
        schemaVersion: ASSET_LIBRARY_SCHEMA_VERSION,
        assets: []
    };
}

export function normalizeAssetLibrary(value){
    const source = value && typeof value === "object"
        ? value
        : {};

    return {
        schemaVersion: ASSET_LIBRARY_SCHEMA_VERSION,
        assets: Array.isArray(source.assets)
            ? source.assets.map(normalizeAsset).filter(Boolean)
            : []
    };
}

export function createAssetRecord(file, now = new Date()){
    const name = String(file?.name || "asset").slice(0, 120);
    const type = String(file?.type || "");
    const assetType = toAssetType(file);

    if(!assetType){
        return null;
    }

    return {
        id: `asset-${now.getTime()}-${slug(name)}`,
        type: assetType,
        name,
        mimeType: type,
        size: Number(file?.size || 0),
        createdAt: now.toISOString(),
        status: "draft",
        alt: "",
        src: ""
    };
}

export function createImageAssetRecord(file, now = new Date()){
    const record = createAssetRecord(file, now);
    return record?.type === "image" ? record : null;
}

export function createUrlAssetRecord(url, label = "", now = new Date()){
    const href = String(url || "").trim();

    if(!isSafeAssetUrl(href)){
        return null;
    }

    const name = String(label || href).slice(0, 120);
    return {
        id: `asset-${now.getTime()}-${slug(name)}`,
        type: "url",
        name,
        mimeType: "text/uri-list",
        size: 0,
        createdAt: now.toISOString(),
        status: "draft",
        href
    };
}

export function addAssetRecord(library, record){
    const normalized = normalizeAssetLibrary(library);

    if(!record){
        return normalized;
    }

    return normalizeAssetLibrary({
        ...normalized,
        assets: [record, ...normalized.assets]
    });
}

function normalizeAsset(asset){
    if(!asset || typeof asset !== "object"){
        return null;
    }

    const id = String(asset.id || "").trim();
    const type = String(asset.type || "").trim();

    if(!id || !ASSET_TYPES.includes(type)){
        return null;
    }

    return {
        id,
        type,
        name: String(asset.name || id).slice(0, 120),
        mimeType: String(asset.mimeType || ""),
        size: Number(asset.size || 0),
        createdAt: String(asset.createdAt || ""),
        status: String(asset.status || "draft"),
        src: String(asset.src || ""),
        href: String(asset.href || ""),
        alt: String(asset.alt || "").slice(0, 160),
        loop: Boolean(asset.loop),
        volume: clampVolume(asset.volume),
        usedBy: Array.isArray(asset.usedBy)
            ? asset.usedBy.map(item => String(item).slice(0, 120)).filter(Boolean)
            : []
    };
}

function toAssetType(file){
    const mimeType = String(file?.type || "");
    const name = String(file?.name || "").toLowerCase();

    if(mimeType.startsWith("image/")){
        return mimeType === "image/svg+xml" || name.endsWith(".svg") ? "svg" : "image";
    }

    if(mimeType.startsWith("audio/")){
        return "audio";
    }

    if(mimeType.startsWith("video/")){
        return "video";
    }

    if(mimeType === "application/pdf" || name.endsWith(".pdf")){
        return "pdf";
    }

    return null;
}

function isSafeAssetUrl(value){
    try{
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:";
    }catch{
        return false;
    }
}

function clampVolume(value){
    const number = Number(value);

    if(!Number.isFinite(number)){
        return 0.6;
    }

    return Math.max(0, Math.min(1, number));
}

function slug(value){
    return String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40) || "image";
}
