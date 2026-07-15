export const SYSTEM_SECTION_STATUSES = Object.freeze({
    active: "Active",
    planned: "Planned",
    unavailable: "Unavailable"
});

const SYSTEM_SECTIONS = Object.freeze([
    {
        id: "system-backup",
        title: "Backup",
        description: "Create a full local backup before risky edits, imports, or publish preparation.",
        adminPath: "../system/backup/",
        status: "active",
        order: 1,
        category: "data-safety"
    },
    {
        id: "system-import",
        title: "Import",
        description: "Preview backup files, validate their impact, and import only after confirmation.",
        adminPath: "../system/import/",
        status: "active",
        order: 2,
        category: "data-safety"
    },
    {
        id: "system-export",
        title: "Export",
        description: "Check Public Export targets, filenames, destinations, and export history.",
        adminPath: "../system/export/",
        status: "active",
        order: 3,
        category: "publish"
    },
    {
        id: "system-settings",
        title: "Settings",
        description: "Review fixed production settings such as brand URL, build command, CNAME, and creator registry.",
        adminPath: "../system/settings/",
        status: "active",
        order: 4,
        category: "terminal"
    },
    {
        id: "system-publish",
        title: "Publish",
        description: "Run the publish preflight checklist before GitHub Pages release work.",
        adminPath: "../system/publish/",
        status: "active",
        order: 5,
        category: "publish"
    },
    {
        id: "system-activity-log",
        title: "Activity Log",
        description: "Review local save, backup, import, export, validation, build, and publish-prep activity.",
        adminPath: "../system/logs/",
        status: "active",
        order: 6,
        category: "audit"
    },
    {
        id: "system-validation",
        title: "Validation Center",
        description: "Check registry, local data, export targets, and release-blocking issues before publish.",
        adminPath: "../system/validation/",
        status: "active",
        order: 7,
        category: "audit"
    },
    {
        id: "system-guide",
        title: "Operations Guide",
        description: "Read the operating rules for backup, export, build, and publish preparation.",
        adminPath: "../system/guide/",
        status: "active",
        order: 8,
        category: "support"
    }
]);

export function getSystemSections(){
    return [...SYSTEM_SECTIONS].sort((a, b) => a.order - b.order);
}

export function getSystemSectionStatusLabel(status){
    return SYSTEM_SECTION_STATUSES[status] || SYSTEM_SECTION_STATUSES.unavailable;
}
