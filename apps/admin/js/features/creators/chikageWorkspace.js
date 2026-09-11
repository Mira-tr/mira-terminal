import {
    DEFAULT_PRIMARY_CREATOR_ID
} from "./creatorStore.js";

export const CHIKAGE_CREATOR_ID = DEFAULT_PRIMARY_CREATOR_ID;

export function buildChikageWorkspaceSummary(creator, scenarios = []){
    const source = creator && typeof creator === "object"
        ? creator
        : createEmptyCreator();
    const works = Array.isArray(source.works) ? source.works : [];
    const links = Array.isArray(source.links) ? source.links : [];
    const ownedScenarios = Array.isArray(scenarios) ? scenarios : [];

    return {
        creatorId: String(source.id || CHIKAGE_CREATOR_ID),
        displayName: String(source.displayName || "千景"),
        slug: String(source.slug || "chikage"),
        bio: String(source.bio || ""),
        status: normalizeStatus(source.status),
        updatedAt: findLatestTimestamp([
            source.updatedAt,
            ...ownedScenarios.map(scenario => scenario?.updatedAt)
        ]),
        works: countStatuses(works),
        links: countStatuses(links),
        scenarios: countStatuses(ownedScenarios)
    };
}

export function formatChikageWorkspaceTimestamp(value){
    const timestamp = normalizeTimestamp(value);
    if(timestamp === null){
        return "更新記録なし";
    }

    return new Intl.DateTimeFormat("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Tokyo"
    }).format(new Date(timestamp));
}

export function createChikageWorkspaceDestinations(){
    return [
        {
            id: "profile",
            title: "プロフィール",
            description: "表示名、Bio、活動内容、公開ステータスを編集します。",
            href: "../?creator=creator-chikage#formTitle",
            action: "プロフィールを編集"
        },
        {
            id: "works",
            title: "作品",
            description: "千景名義の作品と公開状態を管理します。",
            href: "../?creator=creator-chikage#creatorWorksSection",
            action: "作品を編集"
        },
        {
            id: "contact",
            title: "公開連絡先",
            description: "公開サイトに出す連絡先やリンクを管理します。",
            href: "../?creator=creator-chikage#creatorLinksSection",
            action: "連絡先を編集"
        },
        {
            id: "trpg",
            title: "TRPGシナリオ",
            description: "シナリオ、タグ、作者候補など千景のTRPG管理へ進みます。",
            href: "../../trpg/",
            action: "TRPGを開く"
        },
        {
            id: "rules",
            title: "ハウスルール",
            description: "公開するTRPGハウスルールを編集します。",
            href: "../../trpg/rules/",
            action: "ルールを開く"
        }
    ];
}

function countStatuses(items){
    const result = {
        total: 0,
        public: 0,
        draft: 0,
        private: 0,
        other: 0
    };

    items.forEach(item => {
        if(!item || typeof item !== "object"){
            return;
        }

        result.total += 1;
        const status = normalizeStatus(item.status);
        if(Object.hasOwn(result, status)){
            result[status] += 1;
        }else{
            result.other += 1;
        }
    });

    return result;
}

function normalizeStatus(value){
    const status = String(value || "draft").trim().toLowerCase();
    return ["public", "draft", "private"].includes(status)
        ? status
        : "draft";
}

function findLatestTimestamp(values){
    const timestamps = values
        .map(normalizeTimestamp)
        .filter(value => value !== null);

    return timestamps.length
        ? Math.max(...timestamps)
        : null;
}

function normalizeTimestamp(value){
    if(typeof value === "number"){
        return Number.isFinite(value) ? value : null;
    }

    const text = String(value || "").trim();
    if(!text){
        return null;
    }

    const timestamp = /^\d+$/.test(text)
        ? Number(text)
        : Date.parse(text);

    return Number.isFinite(timestamp) ? timestamp : null;
}

function createEmptyCreator(){
    return {
        id: CHIKAGE_CREATOR_ID,
        slug: "chikage",
        displayName: "千景",
        bio: "",
        works: [],
        links: [],
        status: "draft",
        updatedAt: null
    };
}
