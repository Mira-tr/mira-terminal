export const ADMIN_PRODUCT_NAME = "RELMUA 編集室";

const ADMIN_ROUTES = Object.freeze({
    home: createRoute("admin-home", "ホーム", "./", "../admin/"),
    brand: createRoute("admin-relmua", "サイト編集", "./brand/", "../admin/brand/"),
    creators: createRoute("admin-creators", "活動者", "./creators/", "../admin/creators/"),
    system: createRoute("admin-system", "サイト運用", "./system/", "../admin/system/"),
    siteStructure: createRoute("relmua-structure", "サイト構成", "./brand/structure/", "../admin/brand/structure/"),
    homeEditor: createRoute("relmua-home", "トップページ", "./home/", "../admin/home/"),
    projects: createRoute("relmua-projects", "作品", "./game/", "../admin/game/"),
    tools: createRoute("relmua-tools", "ツール", "./tools/", "../admin/tools/"),
    notes: createRoute("relmua-notes", "ノート", "./notes/", "../admin/notes/"),
    chikage: createRoute("creator-chikage", "千景サイト", "./creators/chikage/", "../admin/creators/chikage/"),
    chikageEditor: createRoute("creator-chikage-editor", "基本情報", "./creators/?creator=creator-chikage#formTitle", "../admin/creators/?creator=creator-chikage#formTitle"),
    chikageTrpg: createRoute("creator-chikage-trpg", "TRPG", "./trpg/", "../admin/trpg/"),
    chikageRules: createRoute("creator-chikage-rules", "ハウスルール", "./trpg/rules/", "../admin/trpg/rules/"),
    database: createRoute("system-database", "データ接続", "./system/database/", "../admin/system/database/"),
    validation: createRoute("system-validation", "公開前チェック", "./system/validation/", "../admin/system/validation/"),
    publicExport: createRoute("system-export", "公開データ", "./system/export/", "../admin/system/export/"),
    backup: createRoute("system-backup", "バックアップ", "./system/backup/", "../admin/system/backup/"),
    import: createRoute("system-import", "復元", "./system/import/", "../admin/system/import/"),
    publish: createRoute("system-publish", "公開する", "./system/publish/", "../admin/system/publish/"),
    activity: createRoute("system-activity", "操作履歴", "./system/logs/", "../admin/system/logs/"),
    desktop: createRoute("legacy-desktop", "旧管理画面", "../studio/", "./")
});

export function getAdminRoute(id){
    return ADMIN_ROUTES[id] || null;
}

export function getAdminPrimaryNavigation(){
    return ["home", "brand", "creators", "system"].map(id => ADMIN_ROUTES[id]);
}

// Kept as a compatibility export. Child navigation belongs inside the active workspace.
export function getAdminContextNavigation(){
    return [];
}

export function getAdminWorkspaceRoutes(){
    return {
        relmua: ["homeEditor", "projects", "tools", "notes", "siteStructure"].map(id => ADMIN_ROUTES[id]),
        brand: ["homeEditor", "projects", "tools", "notes", "siteStructure"].map(id => ADMIN_ROUTES[id]),
        creators: ["creators", "chikage", "chikageTrpg", "chikageRules"].map(id => ADMIN_ROUTES[id]),
        system: ["database", "backup", "validation", "publish", "publicExport", "import", "activity"].map(id => ADMIN_ROUTES[id])
    };
}

export function getRouteHref(route, surface = "admin"){
    if(!route){
        return "";
    }
    return surface === "desktop" ? route.desktopHref : route.adminHref;
}

function createRoute(id, label, adminHref, desktopHref){
    return Object.freeze({ id, label, adminHref, desktopHref });
}
