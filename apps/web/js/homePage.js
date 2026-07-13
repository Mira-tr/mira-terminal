import {
    loadHomeDataByType,
    loadPublicHomeConfig
} from "./homeConfigApi.js";

import {
    renderHome
} from "./homeRenderer.js";

const DEFAULT_DOCUMENT = typeof document === "undefined"
    ? null
    : document;

if(DEFAULT_DOCUMENT){
    initHomePage();
}

export async function initHomePage({
    documentRef = DEFAULT_DOCUMENT,
    fetcher = globalThis.fetch
} = {}){
    if(!documentRef){
        return;
    }

    try{
        const config = await loadPublicHomeConfig({
            fetcher
        });
        const sectionTypes = config.sections.map(section => section.type);
        const dataByType = await loadHomeDataByType(sectionTypes, {
            fetcher
        });

        renderHome(documentRef, config, dataByType);
    }catch(error){
        console.warn("[home] Static Home fallback is active.", error);
    }
}
