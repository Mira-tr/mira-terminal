import {
    AUTHOR_KEY,
    CREATORS_KEY,
    GAME_KEY,
    HOME_CONFIG_KEY,
    NOTES_KEY,
    PROFILE_KEY,
    RULES_KEY,
    STORAGE_KEY,
    TAG_KEY,
    TOOLS_KEY
} from "../../store.js";

import {
    hydrateCreatorsFromCms,
    saveCreatorsCanonical
} from "../creators/creatorCmsStore.js";

import {
    getCreators
} from "../creators/creatorStore.js";

import {
    hydrateProfileFromCms,
    saveProfileCanonical
} from "../profile/profileStore.js";

import {
    getDefaultHomeConfig,
    hydrateHomeConfigFromCms,
    loadHomeConfig,
    saveHomeConfigCanonical
} from "../home/homeStore.js";

import {
    getGames,
    hydrateGamesFromCms,
    setGamesCanonical
} from "../game/gameStore.js";

import {
    getTools,
    hydrateToolsFromCms,
    setToolsCanonical
} from "../tools/toolStore.js";

import {
    getNotes,
    hydrateNotesFromCms,
    setNotesCanonical
} from "../notes/noteStore.js";

import {
    hydrateScenariosFromCms,
    setScenarioBundleCanonical
} from "../trpg/scenarios/scenarioCmsStore.js";

import {
    getScenarios
} from "../trpg/scenarios/scenarioStore.js";

import {
    getAuthors
} from "../trpg/authors.js";

import {
    hydrateRulesFromCms,
    saveRulesCanonical
} from "../trpg/rules/rulesCmsStore.js";

import {
    getRules
} from "../trpg/rules/rulesStore.js";

const PRIMARY_CREATOR_ID = "creator-chikage";

export async function hydrateCanonicalAdminState(){
    await hydrateCreatorsFromCms();

    await Promise.all([
        hydrateHomeConfigFromCms(),
        hydrateGamesFromCms(),
        hydrateToolsFromCms(),
        hydrateNotesFromCms(),
        hydrateScenariosFromCms(PRIMARY_CREATOR_ID),
        hydrateRulesFromCms(PRIMARY_CREATOR_ID)
    ]);

    return true;
}

export async function restoreCanonicalAdminState(items){
    const parsed = parseRestoreItems(items);
    const before = captureCanonicalCache();

    try{
        await applyCanonicalRestore(parsed);
        return {
            ok: true,
            restored: parsed.included
        };
    }catch(error){
        try{
            await rollbackCanonicalState(before);
        }catch(rollbackError){
            console.error("[cms] Canonical restore rollback failed", rollbackError);
        }
        throw error;
    }
}

function parseRestoreItems(items){
    if(!items || typeof items !== "object" || Array.isArray(items)){
        throw new Error("Backupのdata.itemsが正しくありません");
    }

    const parsed = new Map();
    const included = [];

    [
        HOME_CONFIG_KEY,
        GAME_KEY,
        TOOLS_KEY,
        NOTES_KEY,
        CREATORS_KEY,
        PROFILE_KEY,
        STORAGE_KEY,
        TAG_KEY,
        AUTHOR_KEY,
        RULES_KEY
    ].forEach(key => {
        if(!Object.prototype.hasOwnProperty.call(items, key)){
            return;
        }

        included.push(key);
        const raw = items[key];

        if(raw === null){
            parsed.set(key, null);
            return;
        }

        if(typeof raw !== "string"){
            throw new Error(`${key} のBackup値が文字列ではありません`);
        }

        try{
            parsed.set(key, JSON.parse(raw));
        }catch(error){
            throw new Error(`${key} のJSONが壊れています: ${error.message}`);
        }
    });

    return {
        values: parsed,
        included
    };
}

async function applyCanonicalRestore(parsed){
    const values = parsed.values;

    if(values.has(CREATORS_KEY) && values.get(CREATORS_KEY) !== null){
        await saveCreatorsCanonical(values.get(CREATORS_KEY));
    }else if(values.has(PROFILE_KEY) && values.get(PROFILE_KEY) !== null){
        await saveProfileCanonical(values.get(PROFILE_KEY));
    }

    if(values.has(HOME_CONFIG_KEY)){
        await saveHomeConfigCanonical(
            values.get(HOME_CONFIG_KEY) ?? getDefaultHomeConfig()
        );
    }

    if(values.has(GAME_KEY)){
        await setGamesCanonical(values.get(GAME_KEY) ?? { games: [] });
    }

    if(values.has(TOOLS_KEY)){
        await setToolsCanonical(values.get(TOOLS_KEY) ?? { tools: [] });
    }

    if(values.has(NOTES_KEY)){
        await setNotesCanonical(values.get(NOTES_KEY) ?? { notes: [] });
    }

    if(
        values.has(STORAGE_KEY) ||
        values.has(TAG_KEY) ||
        values.has(AUTHOR_KEY)
    ){
        await setScenarioBundleCanonical(
            {
                scenarios: values.has(STORAGE_KEY)
                    ? values.get(STORAGE_KEY) ?? []
                    : getScenarios(),
                tags: values.has(TAG_KEY)
                    ? values.get(TAG_KEY) ?? []
                    : readArrayFromStorage(TAG_KEY),
                authors: values.has(AUTHOR_KEY)
                    ? values.get(AUTHOR_KEY) ?? []
                    : getAuthors()
            },
            PRIMARY_CREATOR_ID
        );
    }

    if(values.has(RULES_KEY)){
        await saveRulesCanonical(
            values.get(RULES_KEY) ?? { systems: [] },
            PRIMARY_CREATOR_ID
        );
    }
}

function captureCanonicalCache(){
    return {
        creators: getCreators(),
        home: loadHomeConfig(),
        games: getGames(),
        tools: getTools(),
        notes: getNotes(),
        scenarioBundle: {
            scenarios: getScenarios(),
            tags: readArrayFromStorage(TAG_KEY),
            authors: getAuthors()
        },
        rules: getRules()
    };
}

async function rollbackCanonicalState(before){
    await saveCreatorsCanonical(before.creators);
    await saveHomeConfigCanonical(before.home);
    await setGamesCanonical(before.games);
    await setToolsCanonical(before.tools);
    await setNotesCanonical(before.notes);
    await setScenarioBundleCanonical(before.scenarioBundle, PRIMARY_CREATOR_ID);
    await saveRulesCanonical(before.rules, PRIMARY_CREATOR_ID);
}

function readArrayFromStorage(key){
    const storage = globalThis.localStorage;
    if(!storage){
        return [];
    }

    const raw = storage.getItem(key);
    if(raw === null){
        return [];
    }

    try{
        const value = JSON.parse(raw);
        return Array.isArray(value) ? value : [];
    }catch{
        return [];
    }
}
