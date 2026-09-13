import {
    BRAND_SITE_KEY,
    load as loadStorage,
    save as saveStorage
} from "../../store.js";

import {
    getDefaultBrandSiteConfig,
    normalizeBrandSiteConfig,
    validateBrandSiteConfig
} from "./brandSiteConfig.js";

import {
    hydrateGlobalCmsSnapshot,
    persistGlobalCmsSnapshot
} from "../cms/cmsCanonicalStore.js";

const BRAND_SITE_CMS_COLLECTION = "brand-site";
const BRAND_SITE_CMS_RECORD_KEY = "public";

export function loadBrandSiteConfig(){
    const loaded = loadStorage(BRAND_SITE_KEY, null);
    const normalized = normalizeBrandSiteConfig(loaded);

    try{
        validateBrandSiteConfig(normalized);
        return normalized;
    }catch(error){
        console.warn("[brand-site] Failed to validate stored config", error);
        return getDefaultBrandSiteConfig();
    }
}

export function saveBrandSiteConfig(config){
    const normalized = normalizeBrandSiteConfig(config);
    validateBrandSiteConfig(normalized);

    return saveStorage(BRAND_SITE_KEY, normalized)
        ? normalized
        : false;
}

export async function hydrateBrandSiteFromCms(){
    const result = await hydrateGlobalCmsSnapshot(createBrandSiteCmsContract());
    return result.value;
}

export async function saveBrandSiteCanonical(config){
    const result = await persistGlobalCmsSnapshot(
        createBrandSiteCmsContract(),
        config
    );
    return result.value;
}

export async function resetBrandSiteCanonical(){
    return saveBrandSiteCanonical(getDefaultBrandSiteConfig());
}

function createBrandSiteCmsContract(){
    return {
        collection: BRAND_SITE_CMS_COLLECTION,
        recordKey: BRAND_SITE_CMS_RECORD_KEY,
        status: "private",
        readLocal: loadBrandSiteConfig,
        normalize: normalizeBrandSiteConfig,
        validate: validateBrandSiteConfig,
        writeCache(value){
            if(saveStorage(BRAND_SITE_KEY, value) === false){
                throw new Error("Brand Siteのローカルcacheを更新できませんでした");
            }
        }
    };
}

export {
    getDefaultBrandSiteConfig,
    normalizeBrandSiteConfig,
    validateBrandSiteConfig
};
