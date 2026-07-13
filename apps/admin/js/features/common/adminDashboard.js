import {
    CREATORS_KEY,
    GAME_KEY,
    NOTES_KEY,
    TOOLS_KEY
} from "../../store.js";

import {
    normalizeCreatorsCollection
} from "../creators/creatorStore.js";

import {
    normalizeGamesCollection
} from "../game/gameStore.js";

import {
    normalizeToolsCollection
} from "../tools/toolStore.js";

import {
    normalizeNotesCollection
} from "../notes/noteStore.js";

import {
    getLastBackupExportAt
} from "./backupMeta.js";

const MODULES = [
    {
        id: "home",
        title: "Home設定",
        description: "RELMUA Homeの表示設定",
        href: "./home/index.html",
        staticCard: () => ({
            primary: createPrimary("Editor", "稼働中", ""),
            stats: [],
            lastUpdated: "更新記録なし",
            error: ""
        })
    },
    {
        id: "creators",
        title: "活動者",
        description: "活動者Registry",
        href: "./creators/index.html",
        storageKey: CREATORS_KEY,
        emptyValue: () => ({ creators: [] }),
        isValid: value => isObject(value) && Array.isArray(value.creators),
        normalize: normalizeCreatorsCollection,
        summarize: summarizeCreators
    },
    {
        id: "games",
        title: "作品",
        description: "既存Game Adminを利用するブランド作品入口",
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
        title: "道具",
        description: "公開道具",
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
        title: "記録",
        description: "公開記録",
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

export function getAdminDashboardBackupText(storage = localStorage){
    const value = getLastBackupExportAt(storage);

    return value
        ? `Last Backup: ${formatDashboardDate(value)}`
        : "Backup日時は未記録です";
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
        hour12: false,
        timeZone: "Asia/Tokyo"
    }).format(new Date(timestamp));
}

function loadModuleCard(module, storage){
    const base = {
        id: module.id,
        title: module.title,
        description: module.description,
        href: module.href
    };

    if(typeof module.staticCard === "function"){
        return {
            ...base,
            ...module.staticCard()
        };
    }

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
            error: "保存データを読み込めませんでした。"
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

function summarizeCreators(collection, source){
    const creators = collection.creators;
    const sourceCreators = Array.isArray(source.creators)
        ? source.creators
        : [];

    return {
        primary: createPrimary("合計", creators.length, ""),
        stats: createStatusStats(creators, [
            "public",
            "draft",
            "private"
        ]),
        lastUpdated: latestUpdatedAt(sourceCreators)
    };
}

function summarizeStatusCollection(items, sourceItems){
    return {
        primary: createPrimary("合計", items.length, ""),
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
