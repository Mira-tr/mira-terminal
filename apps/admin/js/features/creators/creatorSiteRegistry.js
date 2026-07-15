export const CREATOR_SITE_STATUSES = Object.freeze({
    active: "Active",
    planned: "Planned",
    unavailable: "Unavailable"
});

const CREATOR_SITES = Object.freeze([
    {
        creatorId: "creator-chikage",
        title: "千景",
        description: "Creator site workspace for Chikage: profile, works, contact, and personal TRPG features.",
        adminPath: "../creators/",
        status: "active",
        order: 1,
        sections: Object.freeze([
            createSection("chikage-home", "Home", "Review the public creator entry and site landing responsibility.", "../creators/", "active", 1),
            createSection("chikage-profile", "Profile", "Edit Chikage profile data and public links.", "../profile/", "active", 2),
            createSection("chikage-works", "Works", "Creator-specific works editor is planned. Current brand works stay under Brand Projects.", "", "planned", 3),
            createSection("chikage-contact", "Contact", "Creator-specific contact editor is planned. Current public contact policy stays under Brand Contact.", "", "planned", 4)
        ])
    },
    {
        creatorId: "creator-asagiri",
        title: "朝霧",
        description: "Creator site workspace for Asagiri. It currently contains profile-oriented creator site responsibilities.",
        adminPath: "../creators/",
        status: "active",
        order: 2,
        sections: Object.freeze([
            createSection("asagiri-home", "Home", "Review the public creator entry and site landing responsibility.", "../creators/", "active", 1),
            createSection("asagiri-profile", "Profile", "Edit Asagiri public creator data in the creator registry.", "../creators/", "active", 2),
            createSection("asagiri-works", "Works", "Creator-specific works editor is planned.", "", "planned", 3),
            createSection("asagiri-contact", "Contact", "Creator-specific contact editor is planned.", "", "planned", 4)
        ])
    }
]);

export function getCreatorSites(){
    return CREATOR_SITES
        .map(site => ({
            ...site,
            sections: [...site.sections].sort((a, b) => a.order - b.order)
        }))
        .sort((a, b) => a.order - b.order);
}

export function getCreatorSiteStatusLabel(status){
    return CREATOR_SITE_STATUSES[status] || CREATOR_SITE_STATUSES.unavailable;
}

function createSection(id, title, description, adminPath, status, order){
    return Object.freeze({
        id,
        title,
        description,
        adminPath,
        status,
        order
    });
}
