import {
    CREATORS_KEY,
    PROFILE_KEY,
    load,
    save
} from "../../store.js";

import {
    isSafeHttpUrl
} from "../../utils.js";

export const DEFAULT_PRIMARY_CREATOR_ID = "creator-chikage";
export const DEFAULT_CREATOR_SLUG = "chikage";
export const CREATOR_SLUG_PATTERN = /^[a-z0-9-]+$/;

const DEFAULT_CREATORS_COLLECTION = {
    primaryCreatorId: DEFAULT_PRIMARY_CREATOR_ID,
    creators: [
        {
            id: DEFAULT_PRIMARY_CREATOR_ID,
            slug: DEFAULT_CREATOR_SLUG,
            displayName: "千景",
            bio: "TRPGでKP / PLとして遊びつつ、ゲーム制作や制作ツール、Web制作の記録をまとめる活動者です。",
            activities: ["TRPG", "KP / PL", "Game", "Tools", "Notes", "Web制作"],
            links: [],
            status: "public",
            order: 1
        },
        {
            id: "creator-asagiri",
            slug: "asagiri",
            displayName: "朝霧",
            nameEn: "Asagiri",
            bio: "柔らかな光や霧の気配を手がかりに、イラストとビジュアル表現の活動を準備しているCreatorです。",
            activities: ["Illustration", "Visual"],
            links: [],
            status: "public",
            order: 2
        }
    ]
};

const CREATOR_STATUSES = ["draft", "public", "private"];
const LINK_STATUSES = ["public", "private"];

export function getCreators(){
    const rawCreators = localStorage.getItem(CREATORS_KEY);

    if(rawCreators !== null){
        const stored = parseStoredCreators(rawCreators);
        return normalizeCreatorsCollection(stored);
    }

    const legacyProfile = load(PROFILE_KEY, null);

    if(legacyProfile && typeof legacyProfile === "object"){
        const migrated = createCreatorsFromProfile(legacyProfile);
        save(CREATORS_KEY, migrated);
        return migrated;
    }

    return normalizeCreatorsCollection(DEFAULT_CREATORS_COLLECTION);
}

export function saveCreators(collection){
    const normalized = normalizeCreatorsCollection(collection, {
        touchUpdatedAt: true
    });

    validateCreatorsCollection(normalized);

    return save(CREATORS_KEY, normalized);
}

export function addCreator(creator){
    const collection = getCreators();
    const normalized = normalizeCreator(
        {
            ...creator,
            order: nextOrder(collection.creators)
        },
        {
            touchTimestamps: true
        }
    );
    const next = {
        ...collection,
        creators: [
            ...collection.creators,
            normalized
        ]
    };

    return saveCreators(next);
}

export function updateCreator(id, updates){
    const collection = getCreators();
    const index = collection.creators.findIndex(creator => creator.id === id);

    if(index < 0){
        return false;
    }

    const current = collection.creators[index];
    const nextCreators = collection.creators.slice();
    nextCreators[index] = normalizeCreator(
        {
            ...current,
            ...updates,
            id: current.id,
            createdAt: current.createdAt
        },
        {
            touchUpdatedAt: true
        }
    );

    return saveCreators({
        ...collection,
        creators: nextCreators
    });
}

export function deleteCreator(id){
    const collection = getCreators();

    if(collection.primaryCreatorId === id){
        return false;
    }

    return saveCreators({
        ...collection,
        creators: collection.creators.filter(creator => creator.id !== id)
    });
}

export function moveCreator(id, direction){
    const collection = getCreators();
    const creators = collection.creators
        .slice()
        .sort((a, b) => a.order - b.order);
    const index = creators.findIndex(creator => creator.id === id);
    const delta = direction === "up" ? -1 : 1;
    const nextIndex = index + delta;

    if(index < 0 || nextIndex < 0 || nextIndex >= creators.length){
        return false;
    }

    const moved = creators[index];
    creators[index] = creators[nextIndex];
    creators[nextIndex] = moved;

    return saveCreators({
        ...collection,
        creators: creators.map((creator, order) => ({
            ...creator,
            order: order + 1
        }))
    });
}

export function setPrimaryCreator(id){
    const collection = getCreators();

    return saveCreators({
        ...collection,
        primaryCreatorId: id
    });
}

export function normalizeCreatorsCollection(collection, options = {}){
    const source = collection && typeof collection === "object"
        ? collection
        : DEFAULT_CREATORS_COLLECTION;
    const creators = Array.isArray(source.creators)
        ? source.creators
        : [];

    return {
        primaryCreatorId: String(
            source.primaryCreatorId || ""
        ).trim(),
        creators: creators
            .filter(creator => creator && typeof creator === "object")
            .map((creator, index) => normalizeCreator(
                {
                    order: index + 1,
                    ...creator
                },
                options
            ))
            .sort((a, b) => a.order - b.order)
    };
}

export function parseStoredCreators(raw){
    try{
        return JSON.parse(raw);
    }catch(error){
        console.warn(`[storage] Failed to parse ${CREATORS_KEY}`, error);
        throw new Error("Creatorsデータが破損しています");
    }
}

export function normalizeCreator(creator, options = {}){
    const source = creator && typeof creator === "object"
        ? creator
        : {};
    const now = new Date().toISOString();
    const createdAt = options.touchTimestamps
        ? now
        : normalizeTimestamp(source.createdAt);
    const updatedAt = options.touchTimestamps || options.touchUpdatedAt
        ? now
        : normalizeTimestamp(source.updatedAt);

    return {
        id: String(source.id || generateId()).trim(),
        slug: String(source.slug || "").trim(),
        displayName: String(source.displayName || "").trim(),
        nameEn: String(source.nameEn || "").trim(),
        bio: String(source.bio || "").trim().slice(0, 500),
        activities: normalizeActivities(source.activities),
        links: normalizeCreatorLinks(source.links),
        status: normalizeCreatorStatus(source.status),
        order: Number(source.order) || 0,
        createdAt,
        updatedAt
    };
}

export function normalizeCreatorLinks(links){
    if(!Array.isArray(links)){
        return [];
    }

    return links
        .filter(link => link && typeof link === "object")
        .map((link, index) => ({
            id: String(link.id || createLinkId(link.label, index)).trim(),
            label: String(link.label || "").trim().slice(0, 60),
            url: normalizeUrl(link.url),
            status: normalizeLinkStatus(link.status),
            order: Number(link.order) || index + 1
        }))
        .filter(link => link.id && link.label && link.url)
        .sort((a, b) => a.order - b.order);
}

export function validateCreatorsCollection(collection, options = {}){
    const errors = [];
    const ids = new Set();
    const slugs = new Set();
    const creators = Array.isArray(collection.creators)
        ? collection.creators
        : [];

    creators.forEach(creator => {
        if(!creator.id){
            errors.push("Creator IDは必須です");
        }else if(ids.has(creator.id)){
            errors.push(`Creator IDが重複しています: ${creator.id}`);
        }else{
            ids.add(creator.id);
        }

        if(!creator.slug){
            errors.push(`${creator.displayName || creator.id}: slugは必須です`);
        }else if(!CREATOR_SLUG_PATTERN.test(creator.slug)){
            errors.push(`${creator.displayName || creator.id}: slugの形式が正しくありません`);
        }else if(slugs.has(creator.slug)){
            errors.push(`slugが重複しています: ${creator.slug}`);
        }else{
            slugs.add(creator.slug);
        }

        if(!creator.displayName){
            errors.push(`${creator.id}: 表示名は必須です`);
        }
    });

    if(!collection.primaryCreatorId){
        errors.push("Primary Creatorが設定されていません");
    }else if(!creators.some(creator => creator.id === collection.primaryCreatorId)){
        errors.push("Primary Creatorが存在しません");
    }

    if(options.requirePublic && creators.filter(
        creator => creator.status === "public"
    ).length === 0){
        errors.push("public Creatorが0件です");
    }

    if(errors.length){
        throw new Error(errors.join("\n"));
    }

    return true;
}

export function createCreatorsFromProfile(profile){
    const source = profile && typeof profile === "object"
        ? profile
        : {};

    return normalizeCreatorsCollection({
        primaryCreatorId: DEFAULT_PRIMARY_CREATOR_ID,
        creators: [
            {
                id: DEFAULT_PRIMARY_CREATOR_ID,
                slug: DEFAULT_CREATOR_SLUG,
                displayName: "千景",
                bio: source.bio || "",
                activities: source.activities || [],
                links: source.links || [],
                status: "public",
                order: 1
            }
        ]
    }, {
        touchTimestamps: true
    });
}

export function parseCreatorLinksText(text){
    return String(text || "")
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map((line, index) => {
            const parts = line.split("|").map(part => part.trim());
            const [id, label, url, status] = parts.length >= 4
                ? parts
                : [
                    createLinkId(parts[0], index),
                    parts[0] || "",
                    parts[1] || "",
                    parts[2] || "private"
                ];

            return {
                id,
                label,
                url,
                status,
                order: index + 1
            };
        });
}

export function stringifyCreatorLinks(links){
    return normalizeCreatorLinks(links)
        .map(link => [
            link.id,
            link.label,
            link.url,
            link.status
        ].join(" | "))
        .join("\n");
}

function normalizeActivities(activities){
    if(Array.isArray(activities)){
        return activities
            .map(activity => String(activity || "").trim())
            .filter(Boolean)
            .slice(0, 12)
            .map(activity => activity.slice(0, 80));
    }

    return String(activities || "")
        .split(/\r?\n/)
        .map(activity => activity.trim())
        .filter(Boolean)
        .slice(0, 12)
        .map(activity => activity.slice(0, 80));
}

function normalizeCreatorStatus(status){
    const normalized = String(status || "draft").trim().toLowerCase();
    return CREATOR_STATUSES.includes(normalized)
        ? normalized
        : "draft";
}

function normalizeLinkStatus(status){
    const normalized = String(status || "private").trim().toLowerCase();
    return LINK_STATUSES.includes(normalized)
        ? normalized
        : "private";
}

function normalizeUrl(url){
    const text = String(url || "").trim();

    return isSafeHttpUrl(text)
        ? text
        : "";
}

function normalizeTimestamp(value){
    const text = String(value || "").trim();
    return text || null;
}

function nextOrder(items){
    return items.reduce((max, item) => Math.max(max, item.order || 0), 0) + 1;
}

function createLinkId(label, index){
    const text = String(label || `link-${index + 1}`)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return text || `link-${index + 1}`;
}

function generateId(){
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
