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
        title: "公開サイトを編集",
        description: "トップページ、作品、ツール、ノート、サイト構成をまとめて編集します。",
        href: getRouteHref(getAdminRoute("brand")),
        tone: "primary"
    },
    {
        id: "open-creators",
        title: "千景のサイトを編集",
        description: "プロフィール、個人サイト、TRPG、ハウスルールなど千景側の内容を編集します。",
        href: getRouteHref(getAdminRoute("creators")),
        tone: "standard"
    },
    {
        id: "open-system",
        title: "公開・復旧を管理",
        description: "データ接続、バックアップ、公開前チェック、公開、復元をまとめて扱います。",
        href: getRouteHref(getAdminRoute("system")),
        tone: "standard"
    }
]);

const WORKSPACE_CARDS = Object.freeze([
    {
        id: "relmua",
        title: "サイト編集",
        description: "RELMUAの公開ページを編集します。トップページ、作品、ツール、ノート、About、Contactはこちらです。",
        href: getRouteHref(getAdminRoute("brand")),
        primary: createPrimary("対象", "RELMUA", ""),
        stats: [
            createStat("公開セクション", 7, "public"),
            createStat("DB連携", 1, "ready")
        ],
        lastUpdated: "公開サイトの編集"
    },
    {
        id: "creators",
        title: "千景",
        description: "千景の個人サイトと、千景が持つTRPG・作品・公開設定をまとめて編集します。",
        href: getRouteHref(getAdminRoute("creators")),
        primary: createPrimary("活動者", 1, "人"),
        stats: [
            createStat("千景", 1, "public")
        ],
        lastUpdated: "個人サイトの編集"
    },
    {
        id: "system",
        title: "サイト運用",
        description: "保存した内容を安全に公開するための確認、バックアップ、復元、操作履歴を扱います。",
        href: getRouteHref(getAdminRoute("system")),
        primary: createPrimary("保存先", "DB", ""),
        stats: [
            createStat("CMS接続", 1, "public"),
            createStat("旧データ互換", 1, "ready")
        ],
        lastUpdated: "公開・復旧の管理"
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
        ? `最終バックアップ: ${formatDashboardDate(value)}`
        : "まだバックアップがありません";
}

export function formatDashboardDate(value){
    const timestamp = toTimestamp(value);

    if(timestamp === null){
        return "日時を確認できません";
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
