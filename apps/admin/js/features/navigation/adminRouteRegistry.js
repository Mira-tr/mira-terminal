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
    chikage: createRoute("creator-chikage", "千景", "./creators/?creator=creator-chikage#formTitle", "../admin/creators/?creator=creator-chikage#formTitle"),
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
    return ["home", "brand", "creators", "system"]
        .map(id => ADMIN_ROUTES[id]);
}

export function getAdminContextNavigation(sectionId){
    const map = {
        "admin-home": ["chikage", "chikageTrpg", "database", "publish"],
        "admin-relmua": ["chikage", "homeEditor", "projects", "tools", "notes", "siteStructure"],
        "admin-creators": ["chikage", "chikageTrpg", "chikageRules", "creators"],
        "admin-system": ["chikage", "database", "backup", "import", "publish", "validation", "publicExport"]
    };

    return (map[sectionId] || ["chikage"])
        .map(id => ADMIN_ROUTES[id])
        .filter(Boolean);
}

export function getAdminWorkspaceRoutes(){
    const relmua = ["siteStructure", "homeEditor", "projects", "tools", "notes", "creators"].map(id => ADMIN_ROUTES[id]);
    return {
        relmua,
        brand: relmua,
        creators: [ADMIN_ROUTES.creators],
        system: ["database", "validation", "publicExport", "backup", "import", "publish", "activity"].map(id => ADMIN_ROUTES[id])
    };
}

export function getRouteHref(route, surface = "admin"){
    if(!route){
        return "";
    }

    return surface === "desktop"
        ? route.desktopHref
        : route.adminHref;
}

function createRoute(id, label, adminHref, desktopHref){
    return Object.freeze({
        id,
        label,
        adminHref,
        desktopHref
    });
}
