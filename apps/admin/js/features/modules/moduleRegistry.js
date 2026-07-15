export const MODULE_STATUSES = Object.freeze({
    active: "Active",
    planned: "Planned",
    unavailable: "Unavailable"
});

const MODULES = Object.freeze([
    {
        id: "module-trpg",
        nextId: "module-creator-chikage-trpg",
        ownerCreatorId: "creator-chikage",
        type: "trpg",
        title: "TRPG",
        description: "Chikage personal TRPG feature set. It is displayed under Chikage, not as a brand-wide module.",
        adminPath: "../trpg/",
        publicPath: "/creators/chikage/trpg/",
        status: "active",
        order: 1,
        features: Object.freeze([
            Object.freeze({
                id: "feature-trpg-scenario-library",
                title: "Scenario Library",
                description: "Manage public scenario records, search metadata, tags, and export validation.",
                adminPath: "../trpg/",
                publicPath: "/creators/chikage/trpg/",
                status: "active",
                order: 1
            }),
            Object.freeze({
                id: "feature-trpg-house-rules",
                title: "House Rules",
                description: "Manage Chikage personal house rules and public rule export.",
                adminPath: "../trpg/rules/",
                publicPath: "/creators/chikage/trpg/rules/",
                status: "active",
                order: 2
            })
        ])
    }
]);

export function getModules(){
    return [...MODULES]
        .map(module => ({
            ...module,
            features: [...module.features].sort((a, b) => a.order - b.order)
        }))
        .sort((a, b) => a.order - b.order);
}

export function getModuleStatusLabel(status){
    return MODULE_STATUSES[status] || MODULE_STATUSES.unavailable;
}
