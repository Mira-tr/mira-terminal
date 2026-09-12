export const PUBLIC_ADMIN_SURFACES = Object.freeze([
    createSurface({
        id: "relmua-home", scope: "brand", ownerId: "relmua", label: "Home", editorLabel: "トップページ",
        publicPath: "", adminPath: "home/", exportTargetIds: ["home"], description: "RELMUAの入口と掲載セクションを編集します。"
    }),
    createSurface({
        id: "relmua-projects", scope: "brand", ownerId: "relmua", label: "Projects", editorLabel: "作品",
        publicPath: "projects/", adminPath: "game/", exportTargetIds: ["projects"], description: "RELMUAとして公開する制作物を管理します。"
    }),
    createSurface({
        id: "relmua-tools", scope: "brand", ownerId: "relmua", label: "Tools", editorLabel: "ツール",
        publicPath: "tools/", adminPath: "tools/", exportTargetIds: ["tools"], description: "公開ツールの内容と導線を管理します。"
    }),
    createSurface({
        id: "relmua-notes", scope: "brand", ownerId: "relmua", label: "Notes", editorLabel: "ノート",
        publicPath: "notes/", adminPath: "notes/", exportTargetIds: ["notes"], description: "RELMUAの制作記録・公開メモを管理します。"
    }),
    createSurface({
        id: "relmua-about", scope: "brand", ownerId: "relmua", label: "About", editorLabel: "RELMUAについて",
        publicPath: "about/", adminPath: "system/settings/#brand-about", exportTargetIds: [], description: "ブランドそのものの説明と基本情報を管理します。"
    }),
    createSurface({
        id: "relmua-contact", scope: "brand", ownerId: "relmua", label: "Contact", editorLabel: "連絡先",
        publicPath: "contact/", adminPath: "system/settings/#brand-contact", exportTargetIds: [], description: "RELMUA全体の連絡先と公開方針を管理します。"
    }),
    createSurface({
        id: "relmua-creators", scope: "brand", ownerId: "relmua", label: "Creators", editorLabel: "活動者",
        publicPath: "creators/", adminPath: "creators/", exportTargetIds: ["creators"], description: "RELMUAに参加するCreatorの一覧を管理します。"
    }),
    createSurface({
        id: "creator-chikage-home", scope: "creator", ownerId: "creator-chikage", creatorSlug: "chikage", label: "Home", editorLabel: "千景 Home",
        publicPath: "creators/chikage/", adminPath: "creators/chikage/#site-home", exportTargetIds: ["creators"], description: "千景の個人サイトの入口です。"
    }),
    createSurface({
        id: "creator-chikage-works", scope: "creator", ownerId: "creator-chikage", creatorSlug: "chikage", label: "Works", editorLabel: "千景 Works",
        publicPath: "creators/chikage/works/", adminPath: "creators/chikage/#site-works", exportTargetIds: ["creators"], description: "千景の制作物とページの語り口を管理します。"
    }),
    createSurface({
        id: "creator-chikage-trpg", scope: "creator", ownerId: "creator-chikage", creatorSlug: "chikage", label: "TRPG", editorLabel: "千景 TRPG",
        publicPath: "creators/chikage/trpg/", adminPath: "creators/chikage/#site-trpg", exportTargetIds: ["creators", "trpg-scenarios", "house-rules"], description: "千景のPlay RoomとTRPG専門管理への入口です。"
    }),
    createSurface({
        id: "creator-chikage-scenarios", scope: "creator", ownerId: "creator-chikage", creatorSlug: "chikage", label: "Scenarios", editorLabel: "千景 Scenarios",
        publicPath: "creators/chikage/trpg/scenarios/", adminPath: "trpg/", exportTargetIds: ["trpg-scenarios"], description: "千景が管理するTRPGシナリオライブラリです。"
    }),
    createSurface({
        id: "creator-chikage-rules", scope: "creator", ownerId: "creator-chikage", creatorSlug: "chikage", label: "House Rules", editorLabel: "千景 House Rules",
        publicPath: "creators/chikage/trpg/rules/", adminPath: "trpg/rules/", exportTargetIds: ["house-rules"], description: "千景卓の公開ハウスルールです。"
    }),
    createSurface({
        id: "creator-chikage-scheduler", scope: "creator", ownerId: "creator-chikage", creatorSlug: "chikage", label: "Scheduler", editorLabel: "千景 Scheduler",
        publicPath: "creators/chikage/trpg/scheduler/", adminPath: "creators/chikage/#trpg-scheduler", exportTargetIds: [], description: "千景のTRPG日程調整ツールの運用入口です。"
    }),
    createSurface({
        id: "creator-chikage-calendar", scope: "creator", ownerId: "creator-chikage", creatorSlug: "chikage", label: "Calendar", editorLabel: "千景 Calendar",
        publicPath: "creators/chikage/trpg/calendar/", adminPath: "creators/chikage/#trpg-calendar", exportTargetIds: [], description: "確定済みセッションを表示する千景のTRPGカレンダーです。"
    }),
    createSurface({
        id: "creator-chikage-profile", scope: "creator", ownerId: "creator-chikage", creatorSlug: "chikage", label: "Profile", editorLabel: "千景 Profile",
        publicPath: "creators/chikage/profile/", adminPath: "creators/chikage/#site-profile", exportTargetIds: ["creators"], description: "千景のプロフィールと制作姿勢を管理します。"
    }),
    createSurface({
        id: "creator-chikage-contact", scope: "creator", ownerId: "creator-chikage", creatorSlug: "chikage", label: "Contact", editorLabel: "千景 Contact",
        publicPath: "creators/chikage/contact/", adminPath: "creators/chikage/#site-contact", exportTargetIds: ["creators"], description: "千景個人の公開連絡先を管理します。"
    })
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

export function getPublicAdminSurfaceForAdminLocation(adminRootUrl, locationLike = window.location){
    const adminRoot = adminRootUrl instanceof URL ? adminRootUrl : new URL(String(adminRootUrl));
    const pathname = normalizePath(locationLike?.pathname || "");
    const adminRootPath = normalizePath(adminRoot.pathname);
    const relativePath = pathname.startsWith(adminRootPath)
        ? pathname.slice(adminRootPath.length)
        : pathname.replace(/^\/+/, "");
    const hash = String(locationLike?.hash || "").toLowerCase();

    if(relativePath === "creators/chikage/"){
        const byHash = {
            "#site-home": "creator-chikage-home",
            "#site-works": "creator-chikage-works",
            "#site-trpg": "creator-chikage-trpg",
            "#trpg-scheduler": "creator-chikage-scheduler",
            "#trpg-calendar": "creator-chikage-calendar",
            "#site-profile": "creator-chikage-profile",
            "#site-contact": "creator-chikage-contact"
        };
        return getPublicAdminSurface(byHash[hash] || "creator-chikage-home");
    }

    return PUBLIC_ADMIN_SURFACES.find(surface => {
        const [surfacePath, surfaceHash = ""] = surface.adminPath.toLowerCase().split("#");
        if(normalizePath(surfacePath) !== relativePath) return false;
        return !surfaceHash || `#${surfaceHash}` === hash;
    }) || null;
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

function createSurface(surface){
    return Object.freeze({
        ...surface,
        exportTargetIds: Object.freeze([...(surface.exportTargetIds || [])])
    });
}

function normalizePath(value){
    const path = String(value || "").replaceAll("\\", "/").toLowerCase();
    return path.endsWith("/") || !path ? path : `${path}/`;
}
