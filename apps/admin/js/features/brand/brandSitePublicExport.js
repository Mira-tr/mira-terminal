import {
    BRAND_SITE_MODULE,
    BRAND_SITE_SCHEMA_VERSION,
    normalizeBrandSiteConfig,
    validateBrandSiteConfig
} from "./brandSiteConfig.js";
import { loadBrandSiteConfig } from "./brandSiteStore.js";

export const BRAND_SITE_PUBLIC_EXPORT_FILENAME = "public-brand.json";
export const BRAND_SITE_PUBLIC_EXPORT_DESTINATION = "apps/web/data/public-brand.json";
export const BRAND_SITE_PUBLIC_EXPORT_TYPE = "public-brand";

export function createPublicBrandSitePayload(config){
    const normalized = normalizeBrandSiteConfig(config ?? loadBrandSiteConfig());
    validateBrandSiteConfig(normalized);

    return {
        schemaVersion: BRAND_SITE_SCHEMA_VERSION,
        exportType: BRAND_SITE_PUBLIC_EXPORT_TYPE,
        module: BRAND_SITE_MODULE,
        navigation: { ...normalized.navigation },
        about: clone(normalized.about),
        contact: clone(normalized.contact)
    };
}

export function validatePublicBrandSitePayload(payload){
    if(!payload || typeof payload !== "object" || Array.isArray(payload)){
        throw new Error("public-brand payload must be an object.");
    }
    if(payload.schemaVersion !== BRAND_SITE_SCHEMA_VERSION){
        throw new Error("public-brand.schemaVersion must be 1.");
    }
    if(payload.exportType !== BRAND_SITE_PUBLIC_EXPORT_TYPE){
        throw new Error("public-brand.exportType must be public-brand.");
    }
    if(payload.module !== BRAND_SITE_MODULE){
        throw new Error("public-brand.module must be brand-site.");
    }

    validateBrandSiteConfig({
        schemaVersion: payload.schemaVersion,
        navigation: payload.navigation,
        about: payload.about,
        contact: payload.contact
    });
    return true;
}

export function getBrandSitePublicExportContract(){
    return {
        filename: BRAND_SITE_PUBLIC_EXPORT_FILENAME,
        destination: BRAND_SITE_PUBLIC_EXPORT_DESTINATION,
        exportType: BRAND_SITE_PUBLIC_EXPORT_TYPE,
        module: BRAND_SITE_MODULE
    };
}

function clone(value){
    return JSON.parse(JSON.stringify(value));
}
