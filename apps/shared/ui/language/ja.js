export const UI_TERMS_JA = Object.freeze({
    dashboard: "ホーム",
    workspace: "管理する場所",
    recentWork: "最近編集したもの",
    quickActions: "よく使う操作",
    projectHealth: "サイトの状態",
    activity: "最近の操作",
    preview: "表示を確認する",
    draft: "下書き",
    publicExport: "公開用データを作る",
    build: "公開サイトを組み立てる",
    publish: "サイトを公開する",
    backup: "バックアップを作る",
    importData: "データを取り込む",
    exportData: "データを書き出す",
    validation: "入力内容を確認する",
    repository: "保存場所の情報",
    manifest: "組み立て結果",
    status: "状態",
    open: "開く",
    edit: "編集する",
    active: "利用可能",
    collection: "コレクション",
    collectionHelp: "所持品や外部作品を整理する場所",
    terminal: "全体入口",
    beginnerMode: "かんたん表示",
    advancedMode: "詳しい表示"
});

export function term(key){
    return UI_TERMS_JA[key] || key;
}
