import {
    GAME_KEY,
    NOTES_KEY,
    PROFILE_KEY,
    RULES_KEY,
    STORAGE_KEY,
    TOOLS_KEY
} from "../../store.js";

import {
    normalizeScenarios
} from "../trpg/scenarios/scenarioStore.js";

import {
    normalizeRules
} from "../trpg/rules/rulesStore.js";

import {
    normalizeProfile
} from "../profile/profileStore.js";

import {
    normalizeGamesCollection
} from "../game/gameStore.js";

import {
    normalizeToolsCollection
} from "../tools/toolStore.js";

import {
    normalizeNotesCollection
} from "../notes/noteStore.js";

const MODULES = [
    {
        id: "scenarios",
        title: "TRPG Scenario",
        description: "シナリオ管理",
        href: "./trpg/index.html",
        storageKey: STORAGE_KEY,
        emptyValue: () => [],
        isValid: Array.isArray,
        normalize: normalizeScenarios,
        summarize: summarizeScenarios
    },
    {
        id: "rules",
        title: "House Rules",
        description: "ハウスルール管理",
        href: "./trpg/rules/index.html",
        storageKey: RULES_KEY,
        emptyValue: () => ({ systems: [] }),
        isValid: value => isObject(value) && Array.isArray(value.systems),
        normalize: normalizeRules,
        summarize: summarizeRules
    },
    {
        id: "profile",
        title: "Profile / Links",
        description: "プロフィール・リンク管理",
        href: "./profile/index.html",
        storageKey: PROFILE_KEY,
        emptyValue: () => ({}),
        isValid: value => isObject(value),
        normalize: normalizeProfile,
        summarize: summarizeProfile
    },
    {
        id: "games",
        title: "Game",
        description: "ゲーム制作物管理",
        href: "./game/index.html",
        storageKey: GAME_KEY,
        emptyValue: () => ({ games: [] }),
        isValid: value => isObject(value) && Array.isArray(value.games),
        normalize: normalizeGamesCollection,
        summarize: (value, source) => summarizeStatusCollection(
            value.games,
            source.games
        )
    },
    {
        id: "tools",
        title: "Tools",
        description: "ツール管理",
        href: "./tools/index.html",
        storageKey: TOOLS_KEY,
        emptyValue: () => ({ tools: [] }),
        isValid: value => isObject(value) && Array.isArray(value.tools),
        normalize: normalizeToolsCollection,
        summarize: (value, source) => summarizeStatusCollection(
            value.tools,
            source.tools
        )
    },
    {
        id: "notes",
        title: "Notes",
        description: "メモ管理",
        href: "./notes/index.html",
        storageKey: NOTES_KEY,
        emptyValue: () => ({ notes: [] }),
        isValid: value => isObject(value) && Array.isArray(value.notes),
        normalize: normalizeNotesCollection,
        summarize: (value, source) => summarizeStatusCollection(
            value.notes,
            source.notes
        )
    }
];

export function loadAdminDashboardCards(storage = localStorage){
    return MODULES.map(module => loadModuleCard(module, storage));
}

export function formatDashboardDate(value){
    const timestamp = toTimestamp(value);

    if(timestamp === null){
        return "更新記録なし";
    }

    return new Intl.DateTimeFormat("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).format(new Date(timestamp));
}

function loadModuleCard(module, storage){
    const base = {
        id: module.id,
        title: module.title,
        description: module.description,
        href: module.href
    };

    try{
        const source = readStoredValue(module, storage);
        const normalized = module.normalize(source);

        return {
            ...base,
            ...module.summarize(normalized, source),
            error: ""
        };
    }catch{
        return {
            ...base,
            primary: null,
            stats: [],
            lastUpdated: "",
            error: "保存データを読み込めませんでした"
        };
    }
}

function readStoredValue(module, storage){
    const serialized = storage.getItem(module.storageKey);

    if(serialized === null){
        return module.emptyValue();
    }

    const value = JSON.parse(serialized);

    if(!module.isValid(value)){
        throw new TypeError(`Invalid dashboard data: ${module.id}`);
    }

    return value;
}

function summarizeScenarios(scenarios, source){
    return {
        primary: createPrimary("総数", scenarios.length, "件"),
        stats: createStatusStats(scenarios, [
            "public",
            "ready",
            "draft",
            "private"
        ]),
        lastUpdated: latestUpdatedAt(source)
    };
}

function summarizeRules(rules, source){
    const systems = rules.systems;
    const sections = systems.flatMap(system => system.sections);
    const sourceSystems = source.systems.filter(isObject);
    const sourceSections = sourceSystems.flatMap(system => (
        Array.isArray(system.sections) ? system.sections : []
    ));

    return {
        primary: createPrimary("System総数", systems.length, "件"),
        stats: [
            createStat("公開System", countStatus(systems, "public"), "public"),
            createStat("Section総数", sections.length, "neutral"),
            createStat("公開Section", countStatus(sections, "public"), "public")
        ],
        lastUpdated: latestUpdatedAt([
            ...sourceSystems,
            ...sourceSections
        ])
    };
}

function summarizeProfile(profile, source){
    const configured = Boolean(
        profile.displayName ||
        profile.bio ||
        profile.activities.length ||
        profile.links.length
    );

    return {
        primary: createPrimary(
            "Profile",
            configured ? "設定済み" : "未設定",
            ""
        ),
        stats: [
            createStat("公開Link", countStatus(profile.links, "public"), "public"),
            createStat("非公開Link", countStatus(profile.links, "private"), "private")
        ],
        lastUpdated: latestUpdatedAt([source])
    };
}

function summarizeStatusCollection(items, sourceItems){
    return {
        primary: createPrimary("総数", items.length, "件"),
        stats: createStatusStats(items, [
            "public",
            "draft",
            "private"
        ]),
        lastUpdated: latestUpdatedAt(sourceItems)
    };
}

function createStatusStats(items, statuses){
    return statuses.map(status => createStat(
        status,
        countStatus(items, status),
        status
    ));
}

function createPrimary(label, value, suffix){
    return {
        label,
        value,
        suffix
    };
}

function createStat(label, value, tone){
    return {
        label,
        value,
        tone
    };
}

function countStatus(items, status){
    return items.filter(item => item.status === status).length;
}

function latestUpdatedAt(items){
    const list = Array.isArray(items) ? items : [];
    const timestamps = list
        .filter(isObject)
        .flatMap(item => [item.updatedAt, item.createdAt])
        .map(toTimestamp)
        .filter(timestamp => timestamp !== null);

    if(timestamps.length === 0){
        return "更新記録なし";
    }

    return formatDashboardDate(Math.max(...timestamps));
}

function toTimestamp(value){
    if(typeof value === "number"){
        return Number.isFinite(value) ? value : null;
    }

    const text = String(value ?? "").trim();

    if(!text){
        return null;
    }

    const timestamp = /^\d+$/.test(text)
        ? Number(text)
        : Date.parse(text);

    return Number.isFinite(timestamp) ? timestamp : null;
}

function isObject(value){
    return Boolean(
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}
