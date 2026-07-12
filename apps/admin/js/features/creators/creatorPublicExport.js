import {
    getCreators,
    normalizeCreatorsCollection,
    validateCreatorsCollection
} from "./creatorStore.js";

import {
    isSafeHttpUrl
} from "../../utils.js";

import {
    showToast
} from "../common/toastService.js";

const APP_NAME = "RELMUA Terminal";
const BRAND_NAME = "RELMUA";
const MODULE_NAME = "creators";
const EXPORT_TYPE = "public-creators";
const EXPORT_VERSION = "1.0.0";
const SCHEMA_VERSION = 1;
const PUBLIC_EXPORT_FILENAME = "public-creators.json";
const PUBLIC_EXPORT_DESTINATION = "apps/web/data/public-creators.json";

export function createPublicCreatorsPayload(collection = getCreators()){
    const normalized = normalizeCreatorsCollection(collection);
    const warnings = [];

    validateCreatorsCollection(normalized);
    validatePublicExportRules(normalized);

    const publicCreators = normalized.creators
        .filter(creator => creator.status === "public")
        .sort((a, b) => a.order - b.order)
        .map(creator => toPublicCreator(creator, warnings));

    return {
        app: APP_NAME,
        brand: BRAND_NAME,
        module: MODULE_NAME,
        exportType: EXPORT_TYPE,
        exportVersion: EXPORT_VERSION,
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        primaryCreatorId: normalized.primaryCreatorId,
        creators: publicCreators,
        warnings
    };
}

export function exportPublicCreators(){
    const exportData = createPublicCreatorsPayload();
    const blob = new Blob(
        [JSON.stringify(exportData, null, 2)],
        { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = PUBLIC_EXPORT_FILENAME;
    a.click();

    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 0);

    showToast(
        `Public JSONを出力しました: ${PUBLIC_EXPORT_DESTINATION}`,
        "success"
    );
}

export function getCreatorsPublicExportContract(){
    return {
        filename: PUBLIC_EXPORT_FILENAME,
        destination: PUBLIC_EXPORT_DESTINATION
    };
}

function validatePublicExportRules(collection){
    const publicCreators = collection.creators.filter(
        creator => creator.status === "public"
    );
    const primary = collection.creators.find(
        creator => creator.id === collection.primaryCreatorId
    );
    const publicSlugs = new Set();

    if(!collection.primaryCreatorId){
        throw new Error("Primary Creatorが設定されていません");
    }

    if(publicCreators.length === 0){
        throw new Error("public Creatorが0件です");
    }

    if(!primary){
        throw new Error("Primary Creatorが存在しません");
    }

    if(primary.status !== "public"){
        throw new Error("Primary Creatorがpublicではありません");
    }

    publicCreators.forEach(creator => {
        if(publicSlugs.has(creator.slug)){
            throw new Error(`public Creator間でslugが重複しています: ${creator.slug}`);
        }
        publicSlugs.add(creator.slug);
    });
}

function toPublicCreator(creator, warnings){
    return {
        id: creator.id,
        slug: creator.slug,
        displayName: creator.displayName,
        nameEn: creator.nameEn,
        bio: creator.bio,
        activities: creator.activities,
        links: creator.links
            .filter(link => link.status === "public")
            .filter(link => {
                const valid = Boolean(link.label && link.url && isSafeHttpUrl(link.url));

                if(!valid){
                    warnings.push(`Invalid public link skipped: ${creator.id}/${link.id}`);
                }

                return valid;
            })
            .map(link => ({
                id: link.id,
                label: link.label,
                url: link.url,
                order: link.order
            }))
            .sort((a, b) => a.order - b.order),
        order: creator.order
    };
}
