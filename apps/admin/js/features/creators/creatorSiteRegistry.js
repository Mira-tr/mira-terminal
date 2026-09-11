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
        description: "千景のCreator Workspaceです。プロフィール、作品、連絡先、TRPG、公開状態をここから管理します。",
        publicPath: "../../web/creators/chikage/",
        adminPath: "./chikage/",
        desktopPath: "../admin/creators/chikage/",
        status: "active",
        order: 1,
        features: Object.freeze([
            createFeature("chikage-trpg-scenarios", "TRPGシナリオ", "../trpg/", "../admin/trpg/", 1),
            createFeature("chikage-trpg-rules", "ハウスルール", "../trpg/rules/", "../admin/trpg/rules/", 2)
        ]),
        sections: Object.freeze([
            createSection("chikage-home", "活動者情報", "千景の表示名、紹介、公開ステータスを編集します。", "./?creator=creator-chikage#formTitle", "active", 1),
            createSection("chikage-works", "作品", "千景名義の作品と公開状態を管理します。", "./?creator=creator-chikage#creatorWorksSection", "active", 2),
            createSection("chikage-contact", "公開連絡先", "千景の公開連絡先と外部リンクを管理します。", "./?creator=creator-chikage#creatorLinksSection", "active", 3)
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
