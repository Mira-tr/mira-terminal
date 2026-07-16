import {
    getLastBackupExportAt
} from "./backupMeta.js";

const WORKSPACE_CARDS = Object.freeze([
    {
        id: "studio",
        title: "Studio",
        description: "Open the Studio home for today's tasks, workspaces, attention items, and recent activity.",
        href: "../studio/",
        primary: createPrimary("Mode", "Studio", ""),
        stats: [
            createStat("scope", 4, "public"),
            createStat("state", 1, "ready")
        ],
        lastUpdated: "Studio Home"
    },
    {
        id: "brand",
        title: "Brand",
        description: "Manage RELMUA Home, Projects, Tools, Notes, Creators, About, Contact, and publish readiness.",
        href: "../studio/#workspaces",
        primary: createPrimary("Scope", "RELMUA", ""),
        stats: [
            createStat("active", 8, "public"),
            createStat("planned", 2, "ready")
        ],
        lastUpdated: "Brand Workspace"
    },
    {
        id: "creators",
        title: "Creators",
        description: "Manage creator workspaces separately. Chikage owns TRPG; Asagiri does not.",
        href: "../studio/#workspaces",
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
        description: "Run Backup, Import, Export, Settings, Publish preflight, Activity Log, and Operations Guide.",
        href: "../studio/#health",
        primary: createPrimary("Screens", 7, ""),
        stats: [
            createStat("active", 7, "public"),
            createStat("planned", 0, "ready")
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
