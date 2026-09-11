import {
    CREATORS_KEY,
    PROFILE_KEY,
    load,
    save
} from "../../store.js";

import { isSafeHttpUrl } from "../../utils.js";

export const DEFAULT_PRIMARY_CREATOR_ID = "creator-chikage";
export const DEFAULT_CREATOR_SLUG = "chikage";
export const CREATOR_SLUG_PATTERN = /^[a-z0-9-]+$/;

const CREATOR_STATUSES = ["draft", "public", "private"];
const LINK_STATUSES = ["public", "private"];
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const SITE_PAGE_IDS = ["home", "works", "trpg", "profile", "contact"];

const DEFAULT_CREATORS_COLLECTION = {
    primaryCreatorId: DEFAULT_PRIMARY_CREATOR_ID,
    creators: [{
        id: DEFAULT_PRIMARY_CREATOR_ID,
        slug: DEFAULT_CREATOR_SLUG,
        displayName: "千景",
        bio: "TRPGでKP / PLとして遊びつつ、ゲーム制作や制作ツール、Web制作の記録をまとめる活動者です。",
        activities: ["TRPG", "KP / PL", "Game", "Tools", "Notes", "Web制作"],
        works: [],
        links: [],
        site: createDefaultCreatorSite("chikage", "千景"),
        status: "public",
        order: 1
    }]
};

export function createDefaultCreatorSite(slug = "creator", displayName = "Creator"){
    const chikage = slug === "chikage";
    return {
        schemaVersion: 1,
        theme: {
            preset: chikage ? "chikage-house" : "creator-house",
            canvas: chikage ? "#0d0b14" : "#101512",
            surface: chikage ? "#17131f" : "#18211d",
            accent: chikage ? "#8063ad" : "#8fc8b5",
            text: "#f1f3ef",
            muted: chikage ? "#b6acbf" : "#acb9b1"
        },
        navigation: [
            { id: "home", label: "Home", path: "./", visible: true, order: 1 },
            { id: "works", label: "Works", path: "./works/", visible: true, order: 2 },
            { id: "trpg", label: "TRPG", path: "./trpg/", visible: true, order: 3 },
            { id: "profile", label: "Profile", path: "./profile/", visible: true, order: 4 },
            { id: "contact", label: "Contact", path: "./contact/", visible: true, order: 5 }
        ],
        home: {
            eyebrow: chikage ? "CHIKAGE / HOUSE 00" : `${displayName} / HOME`,
            role: chikage ? "Game Planning · Interface · Web · TRPG" : "Creator",
            lead: chikage ? "考えて、作って、整える。ゲーム企画、Web、UI、TRPGを行き来しながら、遊ぶ人・使う人が迷わない形へ育てています。" : "活動と制作をまとめています。",
            sectionTitle: chikage ? "ここから、好きな部屋へ。" : "Contents",
            sectionLead: chikage ? "全部が同じ家の中にあるための入口です。" : "公開中のコンテンツです。",
            focus: chikage ? ["ゲーム企画と実装", "RELMUAの情報設計とUI", "TRPGの遊びと運用"] : []
        },
        profile: {
            eyebrow: `PROFILE / ${String(displayName).toUpperCase()}`,
            title: chikage ? "何を考えて、何をつくる人か。" : `${displayName}について。`,
            lead: chikage ? "肩書きを増やすより、制作の姿勢と扱っている領域を短くまとめます。" : "活動領域と制作の姿勢をまとめます。",
            principles: chikage ? ["遊びや機能の核を先に決め、必要なものだけを残す。", "情報の順番とUIを整え、使う人が迷わない形にする。", "作って終わりにせず、触って直して育てる。"] : []
        },
        works: {
            eyebrow: `WORKS / ${String(displayName).toUpperCase()}`,
            title: chikage ? "つくったもの。つくっているもの。" : "Works",
            lead: chikage ? "成果物と進行中の制作を、役割と現在地が分かる形でまとめています。" : "公開中の制作物です。"
        },
        trpg: {
            eyebrow: chikage ? "CHIKAGE HOUSE / PLAY ROOM" : `${String(displayName).toUpperCase()} / TRPG`,
            title: chikage ? "遊ぶための、全部。" : "TRPG",
            lead: chikage ? "次の卓を見る。予定を決める。シナリオを探す。卓中にルールを引く。TRPGで必要なものを、同じ部屋の中に。" : "TRPGの公開情報です。"
        },
        contact: {
            eyebrow: `CONTACT / ${String(displayName).toUpperCase()}`,
            title: "連絡する。",
            lead: "公開している窓口だけを掲載しています。",
            linksLead: "現在公開しているリンクを表示します。"
        },
        footer: { copyright: `© RELMUA / ${displayName}` }
    };
}

export function getCreators(){
    const rawCreators = localStorage.getItem(CREATORS_KEY);
    if(rawCreators !== null){
        return normalizeCreatorsCollection(parseStoredCreators(rawCreators));
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
    const normalized = normalizeCreatorsCollection(collection, { touchUpdatedAt: true });
    validateCreatorsCollection(normalized);
    return save(CREATORS_KEY, normalized);
}

export function addCreator(creator){
    const collection = getCreators();
    const normalized = normalizeCreator({ ...creator, order: nextOrder(collection.creators) }, { touchTimestamps: true });
    return saveCreators({ ...collection, creators: [...collection.creators, normalized] });
}

export function updateCreator(id, updates){
    const collection = getCreators();
    const index = collection.creators.findIndex(creator => creator.id === id);
    if(index < 0) return false;
    const current = collection.creators[index];
    const nextCreators = collection.creators.slice();
    nextCreators[index] = normalizeCreator({ ...current, ...updates, id: current.id, createdAt: current.createdAt }, { touchUpdatedAt: true });
    return saveCreators({ ...collection, creators: nextCreators });
}

export function deleteCreator(id){
    const collection = getCreators();
    if(collection.primaryCreatorId === id) return false;
    return saveCreators({ ...collection, creators: collection.creators.filter(creator => creator.id !== id) });
}

export function moveCreator(id, direction){
    const collection = getCreators();
    const creators = collection.creators.slice().sort((a, b) => a.order - b.order);
    const index = creators.findIndex(creator => creator.id === id);
    const nextIndex = index + (direction === "up" ? -1 : 1);
    if(index < 0 || nextIndex < 0 || nextIndex >= creators.length) return false;
    [creators[index], creators[nextIndex]] = [creators[nextIndex], creators[index]];
    return saveCreators({ ...collection, creators: creators.map((creator, order) => ({ ...creator, order: order + 1 })) });
}

export function setPrimaryCreator(id){
    return saveCreators({ ...getCreators(), primaryCreatorId: id });
}

export function normalizeCreatorsCollection(collection, options = {}){
    const source = collection && typeof collection === "object" ? collection : DEFAULT_CREATORS_COLLECTION;
    const creators = Array.isArray(source.creators) ? source.creators : [];
    return {
        primaryCreatorId: String(source.primaryCreatorId || "").trim(),
        creators: creators.filter(Boolean).map((creator, index) => normalizeCreator({ order: index + 1, ...creator }, options)).sort((a, b) => a.order - b.order)
    };
}

export function parseStoredCreators(raw){
    try{return JSON.parse(raw);}catch(error){console.warn(`[storage] Failed to parse ${CREATORS_KEY}`, error);throw new Error("Creatorsデータが破損しています");}
}

export function normalizeCreator(creator, options = {}){
    const source = creator && typeof creator === "object" ? creator : {};
    const now = new Date().toISOString();
    const createdAt = options.touchTimestamps ? now : normalizeTimestamp(source.createdAt);
    const updatedAt = options.touchTimestamps || options.touchUpdatedAt ? now : normalizeTimestamp(source.updatedAt);
    const displayName = String(source.displayName || "").trim();
    const slug = String(source.slug || "").trim();
    return {
        id: String(source.id || generateId()).trim(),
        slug,
        displayName,
        nameEn: String(source.nameEn || "").trim(),
        bio: String(source.bio || "").trim().slice(0, 500),
        activities: normalizeActivities(source.activities),
        works: normalizeCreatorWorks(source.works),
        links: normalizeCreatorLinks(source.links),
        site: normalizeCreatorSite(source.site, { slug, displayName }),
        status: normalizeCreatorStatus(source.status),
        order: Number(source.order) || 0,
        createdAt,
        updatedAt
    };
}

export function normalizeCreatorSite(site, creator = {}){
    const defaults = createDefaultCreatorSite(creator.slug || "creator", creator.displayName || "Creator");
    const source = site && typeof site === "object" ? site : {};
    const page = key => ({ ...defaults[key], ...(source[key] && typeof source[key] === "object" ? source[key] : {}) });
    const navigation = Array.isArray(source.navigation) ? source.navigation : defaults.navigation;
    return {
        schemaVersion: 1,
        theme: normalizeCreatorTheme({ ...defaults.theme, ...(source.theme || {}) }),
        navigation: normalizeCreatorNavigation(navigation, defaults.navigation),
        home: {
            ...normalizePageCopy(page("home"), defaults.home),
            role: cleanText(page("home").role, 160) || defaults.home.role,
            sectionTitle: cleanText(page("home").sectionTitle, 180) || defaults.home.sectionTitle,
            sectionLead: cleanText(page("home").sectionLead, 400) || defaults.home.sectionLead,
            focus: normalizeStringList(page("home").focus, 6, 180)
        },
        profile: {
            ...normalizePageCopy(page("profile"), defaults.profile),
            principles: normalizeStringList(page("profile").principles, 6, 240)
        },
        works: normalizePageCopy(page("works"), defaults.works),
        trpg: normalizePageCopy(page("trpg"), defaults.trpg),
        contact: {
            ...normalizePageCopy(page("contact"), defaults.contact),
            linksLead: cleanText(page("contact").linksLead, 400) || defaults.contact.linksLead
        },
        footer: {
            copyright: cleanText(source.footer?.copyright, 160) || defaults.footer.copyright
        }
    };
}

export function normalizeCreatorLinks(links){
    if(!Array.isArray(links)) return [];
    return links.filter(link => link && typeof link === "object").map((link, index) => ({
        id: String(link.id || createLinkId(link.label, index)).trim(),
        label: String(link.label || "").trim().slice(0, 60),
        url: normalizeUrl(link.url),
        status: normalizeLinkStatus(link.status),
        order: Number(link.order) || index + 1
    })).filter(link => link.id && link.label && link.url).sort((a, b) => a.order - b.order);
}

export function normalizeCreatorWorks(works){
    if(!Array.isArray(works)) return [];
    return works.filter(work => work && typeof work === "object").map((work, index) => ({
        id: String(work.id || createLinkId(work.title, index)).trim(),
        title: String(work.title || "").trim().slice(0, 100),
        summary: String(work.summary || "").trim().slice(0, 300),
        url: normalizeUrl(work.url),
        status: normalizeLinkStatus(work.status),
        order: Number(work.order) || index + 1
    })).filter(work => work.id && work.title).sort((a, b) => a.order - b.order);
}

export function validateCreatorsCollection(collection, options = {}){
    const errors = [];
    const ids = new Set();
    const slugs = new Set();
    const creators = Array.isArray(collection.creators) ? collection.creators : [];
    creators.forEach(creator => {
        if(!creator.id) errors.push("Creator IDは必須です");
        else if(ids.has(creator.id)) errors.push(`Creator IDが重複しています: ${creator.id}`);
        else ids.add(creator.id);
        if(!creator.slug) errors.push(`${creator.displayName || creator.id}: slugは必須です`);
        else if(!CREATOR_SLUG_PATTERN.test(creator.slug)) errors.push(`${creator.displayName || creator.id}: slugの形式が正しくありません`);
        else if(slugs.has(creator.slug)) errors.push(`slugが重複しています: ${creator.slug}`);
        else slugs.add(creator.slug);
        if(!creator.displayName) errors.push(`${creator.id}: 表示名は必須です`);
    });
    if(!collection.primaryCreatorId) errors.push("Primary Creatorが設定されていません");
    else if(!creators.some(creator => creator.id === collection.primaryCreatorId)) errors.push("Primary Creatorが存在しません");
    if(options.requirePublic && creators.filter(creator => creator.status === "public").length === 0) errors.push("public Creatorが0件です");
    if(errors.length) throw new Error(errors.join("\n"));
    return true;
}

export function createCreatorsFromProfile(profile){
    const source = profile && typeof profile === "object" ? profile : {};
    return normalizeCreatorsCollection({
        primaryCreatorId: DEFAULT_PRIMARY_CREATOR_ID,
        creators: [{ id: DEFAULT_PRIMARY_CREATOR_ID, slug: DEFAULT_CREATOR_SLUG, displayName: "千景", bio: source.bio || "", activities: source.activities || [], links: source.links || [], site: createDefaultCreatorSite("chikage", "千景"), status: "public", order: 1 }]
    }, { touchTimestamps: true });
}

export function parseCreatorLinksText(text){
    return String(text || "").split(/\r?\n/).map(line => line.trim()).filter(Boolean).map((line, index) => {
        const parts = line.split("|").map(part => part.trim());
        const [id, label, url, status] = parts.length >= 4 ? parts : [createLinkId(parts[0], index), parts[0] || "", parts[1] || "", parts[2] || "private"];
        return { id, label, url, status, order: index + 1 };
    });
}

export function parseCreatorWorksText(text){
    return String(text || "").split(/\r?\n/).map(line => line.trim()).filter(Boolean).map((line, index) => {
        const [id, title, summary, url, status] = line.split("|").map(part => part.trim());
        return { id, title, summary, url, status: status || "private", order: index + 1 };
    });
}

export function stringifyCreatorLinks(links){
    return normalizeCreatorLinks(links).map(link => [link.id, link.label, link.url, link.status].join(" | ")).join("\n");
}

export function stringifyCreatorWorks(works){
    return normalizeCreatorWorks(works).map(work => [work.id, work.title, work.summary, work.url, work.status].join(" | ")).join("\n");
}

function normalizeCreatorTheme(theme){
    return {
        preset: cleanText(theme.preset, 60) || "creator-house",
        canvas: normalizeColor(theme.canvas, "#0f1512"),
        surface: normalizeColor(theme.surface, "#19221e"),
        accent: normalizeColor(theme.accent, "#91c9b6"),
        text: normalizeColor(theme.text, "#eef4ef"),
        muted: normalizeColor(theme.muted, "#aebbb3")
    };
}

function normalizeCreatorNavigation(items, defaults){
    const fallbackById = new Map(defaults.map(item => [item.id, item]));
    const seen = new Set();
    const normalized = items.filter(item => item && typeof item === "object").map((item, index) => {
        const id = String(item.id || "").trim().toLowerCase();
        const fallback = fallbackById.get(id);
        if(!SITE_PAGE_IDS.includes(id) || !fallback || seen.has(id)) return null;
        seen.add(id);
        return {
            id,
            label: cleanText(item.label, 32) || fallback.label,
            path: fallback.path,
            visible: item.visible !== false,
            order: Number(item.order) || index + 1
        };
    }).filter(Boolean);
    defaults.forEach(item => { if(!seen.has(item.id)) normalized.push({ ...item }); });
    return normalized.sort((a, b) => a.order - b.order).map((item, index) => ({ ...item, order: index + 1 }));
}

function normalizePageCopy(source, defaults){
    return {
        eyebrow: cleanText(source.eyebrow, 120) || defaults.eyebrow,
        title: cleanText(source.title, 200) || defaults.title,
        lead: cleanText(source.lead, 600) || defaults.lead
    };
}

function normalizeStringList(value, maxItems, maxLength){
    const items = Array.isArray(value) ? value : String(value || "").split(/\r?\n/);
    return items.map(item => cleanText(item, maxLength)).filter(Boolean).slice(0, maxItems);
}

function normalizeActivities(activities){
    return normalizeStringList(activities, 12, 80);
}
function normalizeCreatorStatus(status){const value=String(status||"draft").trim().toLowerCase();return CREATOR_STATUSES.includes(value)?value:"draft";}
function normalizeLinkStatus(status){const value=String(status||"private").trim().toLowerCase();return LINK_STATUSES.includes(value)?value:"private";}
function normalizeUrl(url){const text=String(url||"").trim();return isSafeHttpUrl(text)?text:"";}
function normalizeTimestamp(value){const text=String(value||"").trim();return text||null;}
function normalizeColor(value,fallback){const text=String(value||"").trim();return HEX_COLOR.test(text)?text.toLowerCase():fallback;}
function cleanText(value,max){return String(value??"").trim().slice(0,max);}
function nextOrder(items){return items.reduce((max,item)=>Math.max(max,item.order||0),0)+1;}
function createLinkId(label,index){const text=String(label||`link-${index+1}`).trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");return text||`link-${index+1}`;}
function generateId(){return Date.now().toString(36)+Math.random().toString(36).slice(2);}
