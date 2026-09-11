export const PUBLIC_ADMIN_SURFACES = Object.freeze([
    {
        id: "relmua-home",
        scope: "brand",
        ownerId: "relmua",
        label: "Home",
        editorLabel: "トップページ",
        publicPath: "",
        adminPath: "home/",
        description: "RELMUAの入口と掲載セクションを編集します。"
    },
    {
        id: "relmua-projects",
        scope: "brand",
        ownerId: "relmua",
        label: "Projects",
        editorLabel: "作品",
        publicPath: "projects/",
        adminPath: "game/",
        description: "RELMUAとして公開する制作物を管理します。"
    },
    {
        id: "relmua-tools",
        scope: "brand",
        ownerId: "relmua",
        label: "Tools",
        editorLabel: "ツール",
        publicPath: "tools/",
        adminPath: "tools/",
        description: "公開ツールの内容と導線を管理します。"
    },
    {
        id: "relmua-notes",
        scope: "brand",
        ownerId: "relmua",
        label: "Notes",
        editorLabel: "ノート",
        publicPath: "notes/",
        adminPath: "notes/",
        description: "RELMUAの制作記録・公開メモを管理します。"
    },
    {
        id: "relmua-about",
        scope: "brand",
        ownerId: "relmua",
        label: "About",
        editorLabel: "RELMUAについて",
        publicPath: "about/",
        adminPath: "system/settings/#brand-about",
        description: "ブランドそのものの説明と基本情報を管理します。"
    },
    {
        id: "relmua-contact",
        scope: "brand",
        ownerId: "relmua",
        label: "Contact",
        editorLabel: "連絡先",
        publicPath: "contact/",
        adminPath: "system/settings/#brand-contact",
        description: "RELMUA全体の連絡先と公開方針を管理します。"
    },
    {
        id: "relmua-creators",
        scope: "brand",
        ownerId: "relmua",
        label: "Creators",
        editorLabel: "活動者",
        publicPath: "creators/",
        adminPath: "creators/",
        description: "RELMUAに参加するCreatorの一覧を管理します。"
    },
    {
        id: "creator-chikage-home",
        scope: "creator",
        ownerId: "creator-chikage",
        creatorSlug: "chikage",
        label: "Home",
        editorLabel: "千景 Home",
        publicPath: "creators/chikage/",
        adminPath: "creators/chikage/#site-home",
        description: "千景の個人サイトの入口です。"
    },
    {
        id: "creator-chikage-works",
        scope: "creator",
        ownerId: "creator-chikage",
        creatorSlug: "chikage",
        label: "Works",
        editorLabel: "千景 Works",
        publicPath: "creators/chikage/works/",
        adminPath: "creators/chikage/#site-works",
        description: "千景の制作物とページの語り口を管理します。"
    },
    {
        id: "creator-chikage-trpg",
        scope: "creator",
        ownerId: "creator-chikage",
        creatorSlug: "chikage",
        label: "TRPG",
        editorLabel: "千景 TRPG",
        publicPath: "creators/chikage/trpg/",
        adminPath: "creators/chikage/#site-trpg",
        description: "千景のPlay RoomとTRPG専門管理への入口です。"
    },
    {
        id: "creator-chikage-profile",
        scope: "creator",
        ownerId: "creator-chikage",
        creatorSlug: "chikage",
        label: "Profile",
        editorLabel: "千景 Profile",
        publicPath: "creators/chikage/profile/",
        adminPath: "creators/chikage/#site-profile",
        description: "千景のプロフィールと制作姿勢を管理します。"
    },
    {
        id: "creator-chikage-contact",
        scope: "creator",
        ownerId: "creator-chikage",
        creatorSlug: "chikage",
        label: "Contact",
        editorLabel: "千景 Contact",
        publicPath: "creators/chikage/contact/",
        adminPath: "creators/chikage/#site-contact",
        description: "千景個人の公開連絡先を管理します。"
    }
]);

export function getPublicAdminSurfaces(scope, ownerId = ""){
    return PUBLIC_ADMIN_SURFACES.filter(surface => {
        if(scope && surface.scope !== scope) return false;
        if(ownerId && surface.ownerId !== ownerId) return false;
        return true;
    });
}

export function getPublicAdminSurface(id){
    return PUBLIC_ADMIN_SURFACES.find(surface => surface.id === id) || null;
}

export function resolveSurfaceUrls(surface, adminRootUrl){
    if(!surface) return null;
    const adminRoot = adminRootUrl instanceof URL ? adminRootUrl : new URL(String(adminRootUrl));
    const publicRoot = adminRoot.pathname.includes("/apps/admin/")
        ? new URL("../web/", adminRoot)
        : new URL("../", adminRoot);
    return {
        adminHref: new URL(surface.adminPath, adminRoot).href,
        publicHref: new URL(surface.publicPath, publicRoot).href
    };
}
