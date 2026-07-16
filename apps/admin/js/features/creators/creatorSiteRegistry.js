export const CREATOR_SITE_STATUSES = Object.freeze({
    active: "Active",
    planned: "Planned",
    unavailable: "Unavailable"
});

const CREATOR_SITES = Object.freeze([
    {
        creatorId: "creator-chikage",
        title: "千景",
        description: "千景のCreatorサイトを管理します。プロフィール、作品、連絡先、TRPGを千景の場所として扱います。",
        adminPath: "../creators/",
        status: "active",
        order: 1,
        sections: Object.freeze([
            createSection("chikage-home", "Home", "公開中の千景サイト入口と責務を確認します。", "../creators/", "active", 1),
            createSection("chikage-profile", "Profile", "千景のプロフィールと公開リンクを編集します。", "../profile/", "active", 2),
            createSection("chikage-works", "Works", "千景専用の作品管理は準備中です。ブランドProjectsとは分けて扱います。", "", "planned", 3),
            createSection("chikage-contact", "Contact", "千景専用の連絡先管理は準備中です。ブランドContactとは分けて扱います。", "", "planned", 4)
        ])
    },
    {
        creatorId: "creator-asagiri",
        title: "朝霧",
        description: "朝霧のCreatorサイトを管理します。プロフィール、作品、連絡先を朝霧の場所として扱います。",
        adminPath: "../creators/",
        status: "active",
        order: 2,
        sections: Object.freeze([
            createSection("asagiri-home", "Home", "公開中の朝霧サイト入口と責務を確認します。", "../creators/", "active", 1),
            createSection("asagiri-profile", "Profile", "朝霧のプロフィールと公開リンクを編集します。", "../creators/", "active", 2),
            createSection("asagiri-works", "Works", "朝霧専用の作品管理は準備中です。", "", "planned", 3),
            createSection("asagiri-contact", "Contact", "朝霧専用の連絡先管理は準備中です。", "", "planned", 4)
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
