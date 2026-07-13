export const CREATOR_SITE_STATUSES = Object.freeze({
    active: "Active",
    planned: "Planned",
    unavailable: "Unavailable"
});

const CREATOR_SITES = Object.freeze([
    {
        creatorId: "creator-chikage",
        title: "千景",
        description: "千景 site management area.",
        adminPath: "../creators/",
        status: "active",
        order: 1,
        sections: Object.freeze([
            Object.freeze({
                id: "chikage-home",
                title: "Home",
                description: "Creator site home configuration. Editor will be added later.",
                adminPath: "",
                status: "planned",
                order: 1
            }),
            Object.freeze({
                id: "chikage-profile",
                title: "Profile",
                description: "Profile and links for the current primary creator.",
                adminPath: "../profile/",
                status: "active",
                order: 2
            }),
            Object.freeze({
                id: "chikage-works",
                title: "Works",
                description: "Creator-specific works area. Editor will be added later.",
                adminPath: "",
                status: "planned",
                order: 3
            }),
            Object.freeze({
                id: "chikage-contact",
                title: "Contact",
                description: "Creator-specific contact area. Editor will be added later.",
                adminPath: "",
                status: "planned",
                order: 4
            })
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
