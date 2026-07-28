export const ADMIN_PRODUCT_NAME = "RELMUA Admin";

const ADMIN_ROUTES = Object.freeze({
    home: createRoute("admin-home", "Admin Home", "./", "../admin/"),
    desktop: createRoute("admin-desktop", "Desktop機能", "../studio/", "./"),
    brand: createRoute("admin-brand", "Brand", "./brand/", "../admin/brand/"),
    creators: createRoute("admin-creators", "Creators", "./creators/", "../admin/creators/"),
    system: createRoute("admin-system", "System", "./system/", "../admin/system/"),
    homeEditor: createRoute("brand-home", "Home", "./home/", "../admin/home/"),
    projects: createRoute("brand-projects", "Projects", "./game/", "../admin/game/"),
    tools: createRoute("brand-tools", "Tools", "./tools/", "../admin/tools/"),
    notes: createRoute("brand-notes", "Notes", "./notes/", "../admin/notes/"),
    validation: createRoute("system-validation", "Validation", "./system/validation/", "../admin/system/validation/"),
    publicExport: createRoute("system-export", "Public Export", "./system/export/", "../admin/system/export/"),
    backup: createRoute("system-backup", "Backup", "./system/backup/", "../admin/system/backup/"),
    import: createRoute("system-import", "Import", "./system/import/", "../admin/system/import/"),
    publish: createRoute("system-publish", "Build / Publish", "./system/publish/", "../admin/system/publish/"),
    activity: createRoute("system-activity", "Activity Log", "./system/logs/", "../admin/system/logs/")
});

export function getAdminRoute(id){
    return ADMIN_ROUTES[id] || null;
}

export function getAdminPrimaryNavigation(){
    return ["home", "brand", "creators", "system", "desktop"]
        .map(id => ADMIN_ROUTES[id]);
}

export function getAdminWorkspaceRoutes(){
    return {
        brand: ["homeEditor", "projects", "tools", "notes", "creators"].map(id => ADMIN_ROUTES[id]),
        creators: [ADMIN_ROUTES.creators],
        system: ["validation", "publicExport", "backup", "import", "publish", "activity"].map(id => ADMIN_ROUTES[id])
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
