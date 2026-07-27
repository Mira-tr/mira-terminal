import {
    getLastBackupExportAt
} from "./backupMeta.js";

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
        href: "./home/",
        tone: "standard"
    },
    {
        id: "add-project",
        title: "作品を追加",
        description: "Projectsの編集画面を開きます。",
        href: "./game/",
        tone: "standard"
    },
    {
        id: "publish-check",
        title: "公開前チェック",
        description: "公開前に不足や破損がないか確認します。",
        href: "./system/publish/",
        tone: "standard"
    }
]);

const WORKSPACE_CARDS = Object.freeze([
    {
        id: "home",
        title: "Home",
        description: "Homeの表示順、Hero、Featured、CTAなど公開サイトの入口を管理します。",
        href: "./home/",
        primary: createPrimary("Sections", 4, ""),
        stats: [
            createStat("active", 4, "public"),
            createStat("export", 1, "ready")
        ],
        lastUpdated: "Home Editor"
    },
    {
        id: "projects",
        title: "Projects",
        description: "作品一覧、公開状態、リンク、タグを管理します。",
        href: "./game/",
        primary: createPrimary("Module", "作品", ""),
        stats: [
            createStat("public", 1, "public"),
            createStat("draft", 1, "ready")
        ],
        lastUpdated: "Projects Editor"
    },
    {
        id: "tools",
        title: "Tools",
        description: "道具、URL、説明、メンテナーを管理します。",
        href: "./tools/",
        primary: createPrimary("Module", "道具", ""),
        stats: [
            createStat("public", 1, "public"),
            createStat("backup", 1, "ready")
        ],
        lastUpdated: "Tools Editor"
    },
    {
        id: "notes",
        title: "Notes",
        description: "記録、カテゴリ、本文、公開状態を管理します。",
        href: "./notes/",
        primary: createPrimary("Module", "記録", ""),
        stats: [
            createStat("public", 1, "public"),
            createStat("draft", 1, "ready")
        ],
        lastUpdated: "Notes Editor"
    },
    {
        id: "creators",
        title: "Creators",
        description: "活動者、プロフィール、リンクを管理します。",
        href: "./creators/",
        primary: createPrimary("Creators", 2, ""),
        stats: [
            createStat("千景", 1, "public"),
            createStat("朝霧", 1, "ready")
        ],
        lastUpdated: "Creators Editor"
    },
    {
        id: "trpg",
        title: "TRPG",
        description: "シナリオ追加、検索、絞り込み、お気に入り、Export、House Rulesを管理します。",
        href: "./trpg/",
        primary: createPrimary("Collection", "TRPG", ""),
        stats: [
            createStat("scenario", 1, "public"),
            createStat("rules", 1, "ready")
        ],
        lastUpdated: "Scenario Library"
    },
    {
        id: "system",
        title: "System",
        description: "Backup、Import、Export、Settings、Publish Preflight、Activity Logを管理します。",
        href: "./system/publish/",
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
