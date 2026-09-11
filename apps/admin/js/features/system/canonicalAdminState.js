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
    listSiteSections,
    upsertSiteSectionByKey
} from "../cms/cmsRepository.js";

import {
    hydrateCreatorsFromCms,
    saveCreatorsCanonical
} from "../creators/creatorCmsStore.js";

import {
    getCreators
} from "../creators/creatorStore.js";

import {
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
const SITE_SECTION_STATUSES = new Set(["draft", "published", "hidden", "archived"]);
const SITE_SECTION_TYPES = new Set(["home", "page", "collection", "creators", "system"]);

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

export async function restoreCanonicalAdminState(items, cms = null){
    const parsed = parseRestoreItems(items);
    const parsedCms = parseCmsRestore(cms);
    const before = await captureCanonicalCache(parsedCms.hasSiteSections);

    try{
        await applyCanonicalRestore(parsed);

        if(parsedCms.hasSiteSections){
            await replaceSiteSections(parsedCms.siteSections);
        }

        return {
            ok: true,
            restored: [
                ...parsed.included,
                ...(parsedCms.hasSiteSections ? ["cms_site_sections"] : [])
            ]
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

function parseCmsRestore(cms){
    if(cms === null || cms === undefined){
        return {
            hasSiteSections: false,
            siteSections: []
        };
    }

    if(typeof cms !== "object" || Array.isArray(cms)){
        throw new Error("Backupのdata.cmsが正しくありません");
    }

    if(!Object.prototype.hasOwnProperty.call(cms, "siteSections")){
        return {
            hasSiteSections: false,
            siteSections: []
        };
    }

    if(!Array.isArray(cms.siteSections)){
        throw new Error("BackupのSite Structureが正しくありません");
    }

    const seen = new Set();
    const siteSections = cms.siteSections.map((section, index) => {
        const normalized = normalizeSiteSection(section, index);
        if(seen.has(normalized.section_key)){
            throw new Error(`Site Structureのsection_keyが重複しています: ${normalized.section_key}`);
        }
        seen.add(normalized.section_key);
        return normalized;
    });

    return {
        hasSiteSections: true,
        siteSections
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

async function replaceSiteSections(siteSections){
    const current = await listSiteSections();
    const restoredKeys = new Set(siteSections.map(section => section.section_key));

    for(const section of siteSections){
        await upsertSiteSectionByKey(section);
    }

    for(const section of current){
        if(restoredKeys.has(section.section_key)){
            continue;
        }

        await upsertSiteSectionByKey({
            ...normalizeSiteSection(section),
            status: "archived",
            show_in_navigation: false
        });
    }
}

async function captureCanonicalCache(includeSiteSections){
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
        rules: getRules(),
        siteSections: includeSiteSections
            ? await listSiteSections()
            : null
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

    if(before.siteSections){
        await replaceSiteSections(before.siteSections.map(normalizeSiteSection));
    }
}

function normalizeSiteSection(section, index = 0){
    if(!section || typeof section !== "object" || Array.isArray(section)){
        throw new Error(`Site Structure ${index + 1}件目の形式が正しくありません`);
    }

    const sectionKey = String(section.section_key || "").trim();
    const title = String(section.title || "").trim();
    const slug = String(section.slug || "").trim().toLowerCase();
    const sectionType = String(section.section_type || "page").trim();
    const status = String(section.status || "draft").trim();

    if(!/^[a-z0-9-]+$/.test(sectionKey)){
        throw new Error(`Site Structureのsection_keyが不正です: ${sectionKey || "(empty)"}`);
    }
    if(!title || title.length > 120){
        throw new Error(`Site Structureのtitleが不正です: ${sectionKey}`);
    }
    if(slug && !/^[a-z0-9-]+$/.test(slug)){
        throw new Error(`Site Structureのslugが不正です: ${sectionKey}`);
    }
    if(!SITE_SECTION_TYPES.has(sectionType)){
        throw new Error(`Site Structureのsection_typeが不正です: ${sectionKey}`);
    }
    if(!SITE_SECTION_STATUSES.has(status)){
        throw new Error(`Site Structureのstatusが不正です: ${sectionKey}`);
    }

    return {
        section_key: sectionKey,
        title,
        slug,
        section_type: sectionType,
        status,
        navigation_label: String(section.navigation_label || "").trim().slice(0, 80),
        show_in_navigation: Boolean(section.show_in_navigation),
        sort_order: Math.max(0, Number(section.sort_order) || 0),
        content: section.content && typeof section.content === "object" && !Array.isArray(section.content)
            ? JSON.parse(JSON.stringify(section.content))
            : {}
    };
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
