export const BRAND_SECTION_STATUSES = Object.freeze({
    active: "稼働中",
    planned: "計画中",
    unavailable: "未使用"
});

const BRAND_SECTIONS = Object.freeze([
    {
        id: "brand-home",
        title: "Home設定",
        description: "RELMUAのトップページ構成と主要導線を管理する将来領域です。",
        adminPath: "../home/",
        status: "active",
        order: 1,
        category: "public-site"
    },
    {
        id: "brand-projects",
        title: "作品",
        description: "RELMUAの作品・制作物として公開するProject情報を管理します。現在は既存Game AdminをProjects管理入口として利用しています。",
        adminPath: "../game/",
        status: "active",
        order: 2,
        category: "public-content"
    },
    {
        id: "brand-tools",
        title: "道具",
        description: "RELMUAの公開ツール情報を管理します。",
        adminPath: "../tools/",
        status: "active",
        order: 3,
        category: "public-content"
    },
    {
        id: "brand-notes",
        title: "記録",
        description: "RELMUAの制作ノートと公開メモを管理します。",
        adminPath: "../notes/",
        status: "active",
        order: 4,
        category: "public-content"
    },
    {
        id: "brand-creators",
        title: "活動者",
        description: "RELMUAに関わる公開活動者Registryを管理します。",
        adminPath: "../creators/",
        status: "active",
        order: 5,
        category: "people"
    },
    {
        id: "brand-about",
        title: "ブランド説明",
        description: "RELMUAブランド説明と活動者導線を管理する将来領域です。",
        adminPath: "",
        status: "planned",
        order: 6,
        category: "public-site"
    },
    {
        id: "brand-contact",
        title: "連絡",
        description: "RELMUAブランド窓口を管理する将来領域です。活動者個人の連絡先は扱いません。",
        adminPath: "",
        status: "planned",
        order: 7,
        category: "public-site"
    },
    {
        id: "brand-navigation",
        title: "ナビゲーション",
        description: "Public Global Navigationを管理する将来領域です。",
        adminPath: "",
        status: "planned",
        order: 8,
        category: "structure"
    },
    {
        id: "brand-news",
        title: "お知らせ",
        description: "RELMUA全体のお知らせを管理する将来領域です。",
        adminPath: "",
        status: "planned",
        order: 9,
        category: "communication"
    },
    {
        id: "brand-roadmap",
        title: "ロードマップ",
        description: "RELMUAの公開計画と運用予定を管理する将来領域です。",
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
