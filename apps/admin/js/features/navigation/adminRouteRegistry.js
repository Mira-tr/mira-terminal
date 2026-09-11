export const ADMIN_PRODUCT_NAME = "RELMUA Admin";

const ADMIN_ROUTES = Object.freeze({
    home: createRoute("admin-home", "Dashboard", "./", "../admin/"),
    brand: createRoute("admin-relmua", "RELMUA", "./brand/", "../admin/brand/"),
    creators: createRoute("admin-creators", "Creators", "./creators/", "../admin/creators/"),
    system: createRoute("admin-system", "System", "./system/", "../admin/system/"),
    siteStructure: createRoute("relmua-structure", "Site Structure", "./brand/structure/", "../admin/brand/structure/"),
    homeEditor: createRoute("relmua-home", "Home", "./home/", "../admin/home/"),
    projects: createRoute("relmua-projects", "Projects", "./game/", "../admin/game/"),
    tools: createRoute("relmua-tools", "Tools", "./tools/", "../admin/tools/"),
    notes: createRoute("relmua-notes", "Notes", "./notes/", "../admin/notes/"),
    chikage: createRoute("creator-chikage", "千景", "./creators/chikage/", "../admin/creators/chikage/"),
    chikageEditor: createRoute("creator-chikage-editor", "基本情報", "./creators/?creator=creator-chikage#formTitle", "../admin/creators/?creator=creator-chikage#formTitle"),
    chikageTrpg: createRoute("creator-chikage-trpg", "TRPG", "./trpg/", "../admin/trpg/"),
    chikageRules: createRoute("creator-chikage-rules", "ハウスルール", "./trpg/rules/", "../admin/trpg/rules/"),
    database: createRoute("system-database", "Database", "./system/database/", "../admin/system/database/"),
    validation: createRoute("system-validation", "Validation", "./system/validation/", "../admin/system/validation/"),
    publicExport: createRoute("system-export", "Public Snapshot", "./system/export/", "../admin/system/export/"),
    backup: createRoute("system-backup", "Backup", "./system/backup/", "../admin/system/backup/"),
    import: createRoute("system-import", "Import", "./system/import/", "../admin/system/import/"),
    publish: createRoute("system-publish", "Build / Publish", "./system/publish/", "../admin/system/publish/"),
    activity: createRoute("system-activity", "Activity Log", "./system/logs/", "../admin/system/logs/"),
    desktop: createRoute("legacy-desktop", "Legacy Desktop", "../studio/", "./")
});

export function getAdminRoute(id){
    return ADMIN_ROUTES[id] || null;
}

export function getAdminPrimaryNavigation(){
    return ["home", "brand", "creators", "system"].map(id => ADMIN_ROUTES[id]);
}

// Kept as a compatibility export. V2 deliberately has no global quick/context rail:
// child navigation belongs inside the active workspace.
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
