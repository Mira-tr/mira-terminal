export const CREATOR_SITE_STATUSES = Object.freeze({
    active: "稼働中",
    planned: "計画中",
    unavailable: "未使用"
});

const CREATOR_SITES = Object.freeze([
    {
        creatorId: "creator-chikage",
        title: "千景",
        description: "千景サイトの管理領域です。",
        adminPath: "../creators/",
        status: "active",
        order: 1,
        sections: Object.freeze([
            Object.freeze({
                id: "chikage-home",
                title: "Home",
                description: "活動者サイトHomeの設定領域です。Editorは後続で追加します。",
                adminPath: "",
                status: "planned",
                order: 1
            }),
            Object.freeze({
                id: "chikage-profile",
                title: "プロフィール",
                description: "現在の活動者プロフィールとリンクを管理します。",
                adminPath: "../profile/",
                status: "active",
                order: 2
            }),
            Object.freeze({
                id: "chikage-works",
                title: "Works",
                description: "活動者専用の作品領域です。Editorは後続で追加します。",
                adminPath: "",
                status: "planned",
                order: 3
            }),
            Object.freeze({
                id: "chikage-contact",
                title: "連絡",
                description: "活動者専用の連絡領域です。Editorは後続で追加します。",
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
