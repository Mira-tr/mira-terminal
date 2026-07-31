export const CREATOR_SITE_STATUSES = Object.freeze({
    active: "編集可能",
    planned: "準備中",
    unavailable: "利用不可"
});

const CREATOR_SITES = Object.freeze([
    {
        creatorId: "creator-chikage",
        slug: "chikage",
        title: "千景",
        description: "千景のCreatorサイトを管理します。プロフィール、作品、連絡先、TRPGを千景の場所として扱います。",
        adminPath: "./?creator=creator-chikage#formTitle",
        desktopPath: "../admin/creators/?creator=creator-chikage#formTitle",
        status: "active",
        order: 1,
        features: Object.freeze([
            createFeature("chikage-trpg-scenarios", "TRPGシナリオ", "../trpg/", "../admin/trpg/", 1),
            createFeature("chikage-trpg-rules", "ハウスルール", "../trpg/rules/", "../admin/trpg/rules/", 2)
        ]),
        sections: Object.freeze([
            createSection("chikage-home", "活動者情報", "千景の表示名、紹介、公開リンクを編集します。", "./?creator=creator-chikage#formTitle", "active", 1),
            createSection("chikage-works", "作品", "千景専用の作品管理は準備中です。ブランドProjectsとは分けて扱います。", "", "planned", 2),
            createSection("chikage-contact", "連絡先", "千景専用の連絡先管理は準備中です。ブランドContactとは分けて扱います。", "", "planned", 3)
        ])
    },
    {
        creatorId: "creator-asagiri",
        slug: "asagiri",
        title: "朝霧",
        description: "朝霧のCreatorサイトを管理します。プロフィール、作品、連絡先を朝霧の場所として扱います。",
        adminPath: "./?creator=creator-asagiri#formTitle",
        desktopPath: "../admin/creators/?creator=creator-asagiri#formTitle",
        status: "active",
        order: 2,
        features: Object.freeze([]),
        sections: Object.freeze([
            createSection("asagiri-home", "活動者情報", "朝霧の表示名、紹介、公開リンクを編集します。", "./?creator=creator-asagiri#formTitle", "active", 1),
            createSection("asagiri-profile", "プロフィール", "朝霧のプロフィールは活動者情報から編集します。", "./?creator=creator-asagiri#formTitle", "active", 2),
            createSection("asagiri-works", "作品", "朝霧専用の作品管理は準備中です。", "", "planned", 3),
            createSection("asagiri-contact", "連絡先", "朝霧専用の連絡先管理は準備中です。", "", "planned", 4)
        ])
    }
]);

export function getCreatorSites(){
    return CREATOR_SITES
        .map(site => ({
            ...site,
            features: [...site.features].sort((a, b) => a.order - b.order),
            sections: [...site.sections].sort((a, b) => a.order - b.order)
        }))
        .sort((a, b) => a.order - b.order);
}

export function getCreatorSiteStatusLabel(status){
    return CREATOR_SITE_STATUSES[status] || CREATOR_SITE_STATUSES.unavailable;
}

function createFeature(id, title, adminPath, desktopPath, order){
    return Object.freeze({
        id,
        title,
        adminPath,
        desktopPath,
        order
    });
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
