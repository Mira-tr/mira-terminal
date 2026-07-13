export const MODULE_STATUSES = Object.freeze({
    active: "Active",
    planned: "Planned",
    unavailable: "Unavailable"
});

const MODULES = Object.freeze([
    {
        id: "module-trpg",
        ownerCreatorId: "creator-chikage",
        type: "trpg",
        title: "TRPG",
        description: "千景の個人TRPG活動を扱う完成済みModuleです。",
        adminPath: "../trpg/",
        publicPath: "/trpg/",
        status: "active",
        order: 1,
        features: [
            {
                id: "feature-trpg-scenario-library",
                title: "Scenario Library",
                description: "条件検索、タグ、URL復元、お気に入りを備えた公開シナリオ一覧です。",
                adminPath: "../trpg/",
                publicPath: "/trpg/",
                status: "active",
                order: 1
            },
            {
                id: "feature-trpg-house-rules",
                title: "House Rules",
                description: "千景の個人卓で使用するハウスルール本文です。",
                adminPath: "../trpg/rules/",
                publicPath: "/trpg/rules/",
                status: "active",
                order: 2
            }
        ]
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
