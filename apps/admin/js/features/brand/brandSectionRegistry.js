export const BRAND_SECTION_STATUSES = Object.freeze({
    active: "Active",
    planned: "Planned",
    unavailable: "Unavailable"
});

const BRAND_SECTIONS = Object.freeze([
    {
        id: "brand-home",
        title: "Home",
        description: "Manage the RELMUA Home configuration and Public Export.",
        adminPath: "../home/",
        status: "active",
        order: 1,
        category: "public-site"
    },
    {
        id: "brand-projects",
        title: "Projects",
        description: "Manage RELMUA works. The current entry point still uses the existing Game Admin as the Projects editor.",
        adminPath: "../game/",
        status: "active",
        order: 2,
        category: "public-content"
    },
    {
        id: "brand-tools",
        title: "Tools",
        description: "Manage public RELMUA tools that belong to the brand, not to a personal TRPG module.",
        adminPath: "../tools/",
        status: "active",
        order: 3,
        category: "public-content"
    },
    {
        id: "brand-notes",
        title: "Notes",
        description: "Manage production notes and public records.",
        adminPath: "../notes/",
        status: "active",
        order: 4,
        category: "public-content"
    },
    {
        id: "brand-creators",
        title: "Creators",
        description: "Manage the public creator registry and primary creator settings.",
        adminPath: "../creators/",
        status: "active",
        order: 5,
        category: "people"
    },
    {
        id: "brand-about",
        title: "About",
        description: "Track the static About page responsibility until a dedicated editor is introduced.",
        adminPath: "../system/settings/#brand-about",
        status: "active",
        order: 6,
        category: "public-site"
    },
    {
        id: "brand-contact",
        title: "Contact",
        description: "Track the static Contact page responsibility and contact policy until a dedicated editor is introduced.",
        adminPath: "../system/settings/#brand-contact",
        status: "active",
        order: 7,
        category: "public-site"
    },
    {
        id: "brand-navigation",
        title: "Navigation",
        description: "Public navigation is currently maintained in static HTML and verified by contract tests.",
        adminPath: "../system/settings/#brand-navigation",
        status: "active",
        order: 8,
        category: "structure"
    },
    {
        id: "brand-news",
        title: "News",
        description: "Future brand news area. Not exposed as an editor yet.",
        adminPath: "",
        status: "planned",
        order: 9,
        category: "communication"
    },
    {
        id: "brand-roadmap",
        title: "Roadmap",
        description: "Future public roadmap area. Not exposed as an editor yet.",
        adminPath: "",
        status: "planned",
        order: 10,
        category: "planning"
    }
]);

export function getBrandSections(){
    return [...BRAND_SECTIONS].sort((a, b) => a.order - b.order);
}

export function getBrandSectionStatusLabel(status){
    return BRAND_SECTION_STATUSES[status] || BRAND_SECTION_STATUSES.unavailable;
}
