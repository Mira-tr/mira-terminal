export const SYSTEM_SECTION_STATUSES = Object.freeze({
    active: "Active",
    planned: "Planned",
    unavailable: "Unavailable"
});

const SYSTEM_SECTIONS = Object.freeze([
    {
        id: "system-database",
        title: "Database",
        description: "Check Supabase CMS access, permissions, and the safe migration bridge from legacy localStorage.",
        adminPath: "../system/database/",
        status: "active",
        order: 1,
        category: "data"
    },
    {
        id: "system-backup",
        title: "Backup",
        description: "Create a compatibility backup before risky edits, imports, or migration work.",
        adminPath: "../system/backup/",
        status: "active",
        order: 2,
        category: "data-safety"
    },
    {
        id: "system-import",
        title: "Import",
        description: "Preview legacy backup files and import them only after confirmation.",
        adminPath: "../system/import/",
        status: "active",
        order: 3,
        category: "data-safety"
    },
    {
        id: "system-export",
        title: "Public Snapshot",
        description: "Review the static Public Snapshot targets produced from managed content.",
        adminPath: "../system/export/",
        status: "active",
        order: 4,
        category: "publish"
    },
    {
        id: "system-settings",
        title: "Settings",
        description: "Review production settings such as brand URL, build command, CNAME, creator registry and DB mode.",
        adminPath: "../system/settings/",
        status: "active",
        order: 5,
        category: "settings"
    },
    {
        id: "system-publish",
        title: "Publish",
        description: "Run the publish preflight checklist before a static GitHub Pages release.",
        adminPath: "../system/publish/",
        status: "active",
        order: 6,
        category: "publish"
    },
    {
        id: "system-activity-log",
        title: "Activity Log",
        description: "Review local compatibility actions today; CMS audit history becomes canonical after migration.",
        adminPath: "../system/logs/",
        status: "active",
        order: 7,
        category: "audit"
    },
    {
        id: "system-validation",
        title: "Validation Center",
        description: "Check registry, local compatibility data, export targets, and release-blocking issues before publish.",
        adminPath: "../system/validation/",
        status: "active",
        order: 8,
        category: "audit"
    },
    {
        id: "system-guide",
        title: "Operations Guide",
        description: "Read the operating rules for database migration, snapshots, backup, build, and publish preparation.",
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
