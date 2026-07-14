import {
    getLastBackupExportAt
} from "./backupMeta.js";

const WORKSPACE_CARDS = Object.freeze([
    {
        id: "terminal",
        title: "Terminal",
        description: "Brand、Creators、Systemを横断して現在位置を確認する管理アプリ入口です。",
        href: "./terminal/",
        primary: createPrimary("Workspace", "Overview", ""),
        stats: [
            createStat("active", 1, "public"),
            createStat("planned", 0, "ready")
        ],
        lastUpdated: "Navigation"
    },
    {
        id: "brand",
        title: "Brand",
        description: "RELMUA全体のHome、Projects、Tools、Notes、Creators、About、Contactを扱います。",
        href: "./terminal/#workspace-brand",
        primary: createPrimary("Scope", "RELMUA", ""),
        stats: [
            createStat("active", 5, "public"),
            createStat("planned", 5, "ready")
        ],
        lastUpdated: "Brand Workspace"
    },
    {
        id: "creators",
        title: "Creators",
        description: "千景と朝霧を分離し、CreatorごとのHome、Profile、Works、Contact、Personal Moduleへ進みます。",
        href: "./terminal/#workspace-creators",
        primary: createPrimary("Creators", 2, ""),
        stats: [
            createStat("千景", 1, "public"),
            createStat("朝霧", 1, "ready")
        ],
        lastUpdated: "Creator Workspaces"
    },
    {
        id: "system",
        title: "System",
        description: "Backup、Import、Export、Settings、Publish、Activity Logの運用入口です。",
        href: "./terminal/#workspace-system",
        primary: createPrimary("Operations", 6, ""),
        stats: [
            createStat("active", 3, "public"),
            createStat("planned", 3, "ready")
        ],
        lastUpdated: "System Workspace"
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
