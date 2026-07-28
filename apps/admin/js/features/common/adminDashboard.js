import {
    getLastBackupExportAt
} from "./backupMeta.js";

import {
    getAdminRoute,
    getRouteHref
} from "../navigation/adminRouteRegistry.js";

const QUICK_ACTIONS = Object.freeze([
    {
        id: "add-trpg",
        title: "TRPGシナリオを追加",
        description: "一番使う登録フォームへ直接移動します。",
        href: "./trpg/#scenarioFormTitle",
        tone: "primary"
    },
    {
        id: "edit-home",
        title: "Homeを編集",
        description: "トップページの表示順、見出し、件数を調整します。",
        href: getRouteHref(getAdminRoute("homeEditor")),
        tone: "standard"
    },
    {
        id: "check-release",
        title: "公開前チェック",
        description: "公開前に不足や破損がないか確認します。",
        href: getRouteHref(getAdminRoute("publish")),
        tone: "standard"
    },
    {
        id: "open-brand",
        title: "全体を整える",
        description: "Home、Projects、Tools、Notesの入口を開きます。",
        href: getRouteHref(getAdminRoute("brand")),
        tone: "standard"
    }
]);

const WORKSPACE_CARDS = Object.freeze([
    {
        id: "brand",
        title: "Brand",
        description: "RELMUA全体のHome、Projects、Tools、Notesと公開内容を管理します。",
        href: getRouteHref(getAdminRoute("brand")),
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
        description: "活動者を分けて管理します。千景のTRPGは千景の領域だけで扱います。",
        href: getRouteHref(getAdminRoute("creators")),
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
        description: "Validation、Public Export、Backup、Import、Build、Publishと操作履歴を管理します。",
        href: getRouteHref(getAdminRoute("system")),
        primary: createPrimary("Screens", 7, ""),
        stats: [
            createStat("active", 7, "public"),
            createStat("planned", 0, "ready")
        ],
        lastUpdated: "System Operations"
    },
    {
        id: "desktop",
        title: "Desktop機能",
        description: "ファイル保存、Build、Git確認など、デスクトップ環境で使う補助機能を開きます。",
        href: getRouteHref(getAdminRoute("desktop")),
        primary: createPrimary("Mode", "Desktop", ""),
        stats: [
            createStat("scope", 1, "ready"),
            createStat("state", 1, "ready")
        ],
        lastUpdated: "Admin Desktop"
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
