export const SYSTEM_SECTION_STATUSES = Object.freeze({
    active: "稼働中",
    planned: "計画中",
    unavailable: "未使用"
});

const SYSTEM_SECTIONS = Object.freeze([
    {
        id: "system-backup",
        title: "Backup",
        description: "各WorkspaceのBackup Export状態と復元導線を確認します。処理本体は既存Editorに分散しています。",
        adminPath: "../",
        status: "active",
        order: 1,
        category: "data-safety"
    },
    {
        id: "system-import",
        title: "Import",
        description: "既存Backup Importの入口を対象Workspaceへ案内します。統合Import Centerは後続Phaseで扱います。",
        adminPath: "../",
        status: "active",
        order: 2,
        category: "data-safety"
    },
    {
        id: "system-export",
        title: "Export",
        description: "Public Exportの責務と出力先を確認します。Export処理本体は既存Featureを維持します。",
        adminPath: "../",
        status: "active",
        order: 3,
        category: "publish"
    },
    {
        id: "system-settings",
        title: "Settings",
        description: "Terminal全体設定の予定領域です。現Phaseでは設定保存を追加しません。",
        adminPath: "",
        status: "planned",
        order: 4,
        category: "terminal"
    },
    {
        id: "system-publish",
        title: "Publish",
        description: "Build、検証、配信の統合入口予定です。現Phaseでは既存Publish処理を変更しません。",
        adminPath: "",
        status: "planned",
        order: 5,
        category: "publish"
    },
    {
        id: "system-activity-log",
        title: "Activity Log",
        description: "保存、Import、Export、Publishの履歴表示予定です。現Phaseではログ保存を追加しません。",
        adminPath: "",
        status: "planned",
        order: 6,
        category: "audit"
    }
]);

export function getSystemSections(){
    return [...SYSTEM_SECTIONS].sort((a, b) => a.order - b.order);
}

export function getSystemSectionStatusLabel(status){
    return SYSTEM_SECTION_STATUSES[status] || SYSTEM_SECTION_STATUSES.unavailable;
}
