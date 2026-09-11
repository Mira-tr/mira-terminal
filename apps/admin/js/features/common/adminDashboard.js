import {
    getLastBackupExportAt
} from "./backupMeta.js";

import {
    getAdminRoute,
    getRouteHref
} from "../navigation/adminRouteRegistry.js";

const QUICK_ACTIONS = Object.freeze([
    {
        id: "open-relmua",
        title: "RELMUAを管理",
        description: "Home、Projects、Tools、Notes、Navigationなど公開サイト全体を管理します。",
        href: getRouteHref(getAdminRoute("brand")),
        tone: "primary"
    },
    {
        id: "open-creators",
        title: "Creatorsを管理",
        description: "Creatorごとのサイト、世界観、作品、TRPG、公開設定を管理します。",
        href: getRouteHref(getAdminRoute("creators")),
        tone: "standard"
    },
    {
        id: "open-system",
        title: "Systemを管理",
        description: "Database、Backup、Validation、Public Snapshot、Build / Publishを管理します。",
        href: getRouteHref(getAdminRoute("system")),
        tone: "standard"
    }
]);

const WORKSPACE_CARDS = Object.freeze([
    {
        id: "relmua",
        title: "RELMUA",
        description: "公開サイトそのものを管理します。Home、Navigation、Projects、Tools、Notes、About、Contact、Creatorsはこちらです。",
        href: getRouteHref(getAdminRoute("brand")),
        primary: createPrimary("Scope", "Site", ""),
        stats: [
            createStat("published sections", 7, "public"),
            createStat("DB-backed", 1, "ready")
        ],
        lastUpdated: "RELMUA Workspace"
    },
    {
        id: "creators",
        title: "Creators",
        description: "Creatorごとのサイト全体を管理します。各Creatorの世界観、ページ、作品、TRPG、公開設定はこの配下です。",
        href: getRouteHref(getAdminRoute("creators")),
        primary: createPrimary("Creators", 1, ""),
        stats: [
            createStat("千景", 1, "public")
        ],
        lastUpdated: "Creator Workspaces"
    },
    {
        id: "system",
        title: "System",
        description: "Database、Validation、Public Snapshot、Backup、Import、Build / Publish、Activity Logを管理します。",
        href: getRouteHref(getAdminRoute("system")),
        primary: createPrimary("Data", "DB", ""),
        stats: [
            createStat("CMS foundation", 1, "public"),
            createStat("legacy bridge", 1, "ready")
        ],
        lastUpdated: "System Operations"
    }
]);

export function loadAdminDashboardCards(){
    return WORKSPACE_CARDS.map(card => ({
        ...card,
        stats: card.stats.map(stat => ({ ...stat })),
        primary: { ...card.primary },
        error: ""
    }));
}

export function loadAdminQuickActions(){
    return QUICK_ACTIONS.map(action => ({ ...action }));
}

export function getAdminDashboardBackupText(storage = localStorage){
    const value = getLastBackupExportAt(storage);

    return value
        ? `Last Backup: ${formatDashboardDate(value)}`
        : "Backup not recorded";
}

export function formatDashboardDate(value){
    const timestamp = toTimestamp(value);

    if(timestamp === null){
        return "No valid timestamp";
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
