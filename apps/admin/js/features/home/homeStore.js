import {
    HOME_CONFIG_KEY,
    load as loadStorage,
    save as saveStorage
} from "../../store.js";

import {
    getDefaultHomeConfig,
    normalizeHomeConfig
} from "./homeConfig.js";

import {
    validateHomeConfig
} from "./homeValidation.js";

import {
    hydrateGlobalCmsSnapshot,
    persistGlobalCmsSnapshot
} from "../cms/cmsCanonicalStore.js";

const HOME_CMS_COLLECTION = "home";
const HOME_CMS_RECORD_KEY = "config";

export function loadHomeConfig(){
    const loaded = loadStorage(HOME_CONFIG_KEY, null);
    const normalized = normalizeHomeConfig(loaded);

    try{
        validateHomeConfig(normalized);
        return normalized;
    }catch(error){
        console.warn("[home-config] Failed to validate stored config", error);
        return getDefaultHomeConfig();
    }
}

export function saveHomeConfig(config){
    const normalized = normalizeHomeConfig(config);

    validateHomeConfig(normalized);

    return saveStorage(HOME_CONFIG_KEY, normalized)
        ? normalized
        : false;
}

export function resetHomeConfig(){
    globalThis.localStorage?.removeItem?.(HOME_CONFIG_KEY);

    return getDefaultHomeConfig();
}

export async function hydrateHomeConfigFromCms(){
    const result = await hydrateGlobalCmsSnapshot(createHomeCmsContract());
    return result.value;
}

export async function saveHomeConfigCanonical(config){
    const result = await persistGlobalCmsSnapshot(
        createHomeCmsContract(),
        config
    );
    return result.value;
}

export async function resetHomeConfigCanonical(){
    const result = await persistGlobalCmsSnapshot(
        createHomeCmsContract(),
        getDefaultHomeConfig()
    );
    return result.value;
}

function createHomeCmsContract(){
    return {
        collection: HOME_CMS_COLLECTION,
        recordKey: HOME_CMS_RECORD_KEY,
        status: "private",
        readLocal: loadHomeConfig,
        normalize: normalizeHomeConfig,
        validate: validateHomeConfig,
        writeCache(value){
            if(saveStorage(HOME_CONFIG_KEY, value) === false){
                throw new Error("Homeのローカルcacheを更新できませんでした");
            }
        }
    };
}

export {
    getDefaultHomeConfig,
    normalizeHomeConfig
};
