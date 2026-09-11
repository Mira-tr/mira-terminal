export const SYSTEM_SECTION_STATUSES = Object.freeze({
    active: "利用可能",
    planned: "準備中",
    unavailable: "利用不可"
});

const SYSTEM_SECTIONS = Object.freeze([
    {
        id: "system-export",
        title: "公開データを作る",
        description: "Supabaseに保存した最新の内容から、公開サイト専用のJSONを安全にまとめて作ります。",
        adminPath: "../system/export/",
        status: "active",
        order: 1,
        category: "publish"
    },
    {
        id: "system-validation",
        title: "公開前チェック",
        description: "設定漏れや公開できないデータがないか、まとめて確認します。",
        adminPath: "../system/validation/",
        status: "active",
        order: 2,
        category: "publish"
    },
    {
        id: "system-publish",
        title: "公開チェック",
        description: "Build結果と公開条件を確認し、GitHub Pagesへ反映できる状態かを判断します。",
        adminPath: "../system/publish/",
        status: "active",
        order: 3,
        category: "publish"
    },
    {
        id: "system-backup",
        title: "バックアップ",
        description: "大きな編集や復元操作の前に、現在のCMSデータを復旧用ファイルとして保存します。",
        adminPath: "../system/backup/",
        status: "active",
        order: 4,
        category: "data-safety"
    },
    {
        id: "system-database",
        title: "接続・データ",
        description: "Supabaseへの接続、ログイン状態、権限を確認します。旧データ移行は保守用です。",
        adminPath: "../system/database/",
        status: "active",
        order: 5,
        category: "data"
    },
    {
        id: "system-settings",
        title: "公開設定",
        description: "サイトURL、Build設定、Creator登録など公開まわりの固定設定を確認します。",
        adminPath: "../system/settings/",
        status: "active",
        order: 6,
        category: "settings"
    },
    {
        id: "system-import",
        title: "バックアップから復元",
        description: "バックアップ内容を先に確認してから、CMSの編集データを復元します。",
        adminPath: "../system/import/",
        status: "active",
        order: 7,
        category: "data-safety"
    },
    {
        id: "system-activity-log",
        title: "操作履歴",
        description: "保存・書き出し・チェックなど、管理画面で行った操作を確認します。",
        adminPath: "../system/logs/",
        status: "active",
        order: 8,
        category: "audit"
    },
    {
        id: "system-guide",
        title: "使い方",
        description: "公開、バックアップ、復元などの運用手順を確認します。",
        adminPath: "../system/guide/",
        status: "active",
        order: 9,
        category: "support"
    }
]);

export function getSystemSections(){
    return [...SYSTEM_SECTIONS].sort((a, b) => a.order - b.order);
}

export function getSystemSectionStatusLabel(status){
    return SYSTEM_SECTION_STATUSES[status] || SYSTEM_SECTION_STATUSES.unavailable;
}
