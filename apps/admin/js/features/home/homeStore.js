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

export {
    getDefaultHomeConfig,
    normalizeHomeConfig
};
