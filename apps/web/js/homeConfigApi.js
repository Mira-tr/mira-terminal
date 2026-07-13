export const PUBLIC_HOME_CONFIG_URL = "./data/public-home.json";

export const HOME_DATA_URLS = Object.freeze({
    projects: "./game/data/public-games.json",
    tools: "./tools/data/public-tools.json",
    notes: "./notes/data/public-notes.json",
    creators: "./data/public-creators.json"
});

export const HOME_SECTION_TYPES = Object.freeze([
    "hero",
    "projects",
    "tools",
    "notes",
    "creators"
]);

export const HOME_SELECTION_MODES = Object.freeze([
    "manual",
    "source-order"
]);

export const HOME_LAYOUTS = Object.freeze([
    "hero",
    "cards",
    "list",
    "compact"
]);

export const HOME_SECTION_IDS = Object.freeze([
    "hero",
    "featured-projects",
    "featured-tools",
    "notes",
    "creators"
]);

const SECTION_DEFAULTS = Object.freeze({
    hero: Object.freeze({
        id: "hero",
        type: "hero",
        enabled: true,
        order: 10,
        title: "RELMUA",
        description: "",
        layout: "hero"
    }),
    "featured-projects": Object.freeze({
        id: "featured-projects",
        type: "projects",
        enabled: true,
        order: 20,
        title: "Projects",
        description: "",
        layout: "cards",
        selectionMode: "manual",
        limit: 3,
        itemIds: []
    }),
    "featured-tools": Object.freeze({
        id: "featured-tools",
        type: "tools",
        enabled: true,
        order: 30,
        title: "Tools",
        description: "",
        layout: "cards",
        selectionMode: "manual",
        limit: 3,
        itemIds: []
    }),
    notes: Object.freeze({
        id: "notes",
        type: "notes",
        enabled: true,
        order: 40,
        title: "Notes",
        description: "",
        layout: "list",
        selectionMode: "source-order",
        limit: 3,
        itemIds: []
    }),
    creators: Object.freeze({
        id: "creators",
        type: "creators",
        enabled: true,
        order: 50,
        title: "Creators",
        description: "",
        layout: "cards",
        selectionMode: "manual",
        limit: 4,
        itemIds: []
    })
});

const CONTENT_TYPES = new Set(["projects", "tools", "notes", "creators"]);

export async function loadPublicHomeConfig({
    fetcher = globalThis.fetch,
    url = PUBLIC_HOME_CONFIG_URL
} = {}){
    const payload = await fetchJson(fetcher, url);
    return normalizePublicHomeConfig(payload);
}

export async function loadHomeSectionData(sectionType, {
    fetcher = globalThis.fetch,
    urls = HOME_DATA_URLS
} = {}){
    if(!CONTENT_TYPES.has(sectionType)){
        return [];
    }

    const payload = await fetchJson(fetcher, urls[sectionType]);
    return normalizeHomeItems(sectionType, payload);
}

export async function loadHomeDataByType(sectionTypes, options = {}){
    const uniqueTypes = Array.from(new Set(sectionTypes)).filter(type => CONTENT_TYPES.has(type));
    const entries = await Promise.all(uniqueTypes.map(async type => {
        try{
            return [
                type,
                {
                    items: await loadHomeSectionData(type, options),
                    error: null
                }
            ];
        }catch(error){
            return [
                type,
                {
                    items: null,
                    error
                }
            ];
        }
    }));

    return Object.fromEntries(entries);
}

export function normalizePublicHomeConfig(payload){
    if(!payload || typeof payload !== "object"){
        throw new Error("public-home.json must be an object.");
    }

    if(payload.schemaVersion !== 1){
        throw new Error("public-home.schemaVersion must be 1.");
    }

    if(payload.exportType !== "public-home"){
        throw new Error("public-home.exportType must be public-home.");
    }

    if(payload.module !== "home"){
        throw new Error("public-home.module must be home.");
    }

    if(!Array.isArray(payload.sections)){
        throw new Error("public-home.sections must be an array.");
    }

    const usedIds = new Set();
    const sections = [];

    payload.sections.forEach((section, index) => {
        const normalized = normalizeHomeSection(section, index);

        if(!normalized || usedIds.has(normalized.id)){
            return;
        }

        usedIds.add(normalized.id);
        sections.push(normalized);
    });

    if(!sections.length){
        throw new Error("public-home.sections must include at least one known section.");
    }

    return {
        schemaVersion: 1,
        exportType: "public-home",
        module: "home",
        sections: stableSortByOrder(sections)
    };
}

export function getHomeSection(config, id){
    return config?.sections?.find(section => section.id === id) ?? null;
}

export function selectHomeItems(items, section){
    if(!Array.isArray(items) || !items.length || !section || section.type === "hero"){
        return [];
    }

    const limit = normalizeLimit(section.limit, SECTION_DEFAULTS[section.id]?.limit ?? 3);
    const sourceOrder = stableSortItems(items);

    if(section.selectionMode !== "manual"){
        return sourceOrder.slice(0, limit);
    }

    const itemById = new Map(sourceOrder.map(item => [item.id, item]));
    const selected = [];
    const usedIds = new Set();

    normalizeItemIds(section.itemIds).forEach(id => {
        const item = itemById.get(id);

        if(!item || usedIds.has(id)){
            return;
        }

        selected.push(item);
        usedIds.add(id);
    });

    if(selected.length < limit){
        sourceOrder.forEach(item => {
            if(selected.length >= limit || usedIds.has(item.id)){
                return;
            }

            selected.push(item);
            usedIds.add(item.id);
        });
    }

    return selected.slice(0, limit);
}

export function normalizeHomeItems(type, payload){
    const source = getSourceItems(type, payload);

    return source
        .map((item, index) => normalizeHomeItem(type, item, index))
        .filter(Boolean);
}

function normalizeHomeSection(section, index){
    if(!section || typeof section !== "object"){
        return null;
    }

    const id = text(section.id, 80);
    const defaults = SECTION_DEFAULTS[id];

    if(!defaults){
        return null;
    }

    const normalized = {
        id: defaults.id,
        type: defaults.type,
        enabled: typeof section.enabled === "boolean"
            ? section.enabled
            : defaults.enabled,
        order: normalizeOrder(section.order, defaults.order),
        title: text(section.title, 80) || defaults.title,
        description: text(section.description, 240),
        layout: normalizeOption(section.layout, HOME_LAYOUTS, defaults.layout),
        sourceIndex: index
    };

    if(defaults.type !== "hero"){
        normalized.selectionMode = normalizeOption(
            section.selectionMode,
            HOME_SELECTION_MODES,
            defaults.selectionMode
        );
        normalized.limit = normalizeLimit(section.limit, defaults.limit);
        normalized.itemIds = normalizeItemIds(section.itemIds);
    }

    return normalized;
}

function getSourceItems(type, payload){
    if(!payload || typeof payload !== "object"){
        return [];
    }

    if(type === "projects" && Array.isArray(payload.games)){
        return payload.games;
    }

    if(type === "tools" && Array.isArray(payload.tools)){
        return payload.tools;
    }

    if(type === "notes" && Array.isArray(payload.notes)){
        return payload.notes;
    }

    if(type === "creators" && Array.isArray(payload.creators)){
        return payload.creators;
    }

    return [];
}

function normalizeHomeItem(type, item, index){
    if(!item || typeof item !== "object"){
        return null;
    }

    const id = text(item.id, 120);

    if(!id){
        return null;
    }

    return {
        id,
        type,
        title: getItemTitle(type, item),
        summary: text(item.summary ?? item.bio ?? item.description, 180),
        order: normalizeItemOrder(item.order),
        sourceIndex: index
    };
}

function getItemTitle(type, item){
    if(type === "tools"){
        return text(item.name, 100) || text(item.title, 100) || item.id;
    }

    if(type === "creators"){
        return text(item.displayName, 100) || text(item.name, 100) || item.id;
    }

    return text(item.title, 100) || text(item.name, 100) || item.id;
}

async function fetchJson(fetcher, url){
    if(typeof fetcher !== "function"){
        throw new Error("fetch is not available.");
    }

    const response = await fetcher(url);

    if(!response || response.ok === false){
        throw new Error(`Failed to fetch ${url}.`);
    }

    return response.json();
}

function normalizeOrder(value, fallback){
    const order = Number(value);
    return Number.isFinite(order) && order >= 1
        ? order
        : fallback;
}

function normalizeLimit(value, fallback){
    const limit = Number(value);
    return Number.isInteger(limit) && limit >= 1
        ? Math.min(limit, 12)
        : fallback;
}

function normalizeItemOrder(value){
    const order = Number(value);
    return Number.isFinite(order) && order >= 1
        ? order
        : Number.MAX_SAFE_INTEGER;
}

function normalizeOption(value, allowedValues, fallback){
    const normalized = text(value, 40);
    return allowedValues.includes(normalized)
        ? normalized
        : fallback;
}

function normalizeItemIds(value){
    if(!Array.isArray(value)){
        return [];
    }

    const ids = [];
    const usedIds = new Set();

    value.forEach(item => {
        if(typeof item !== "string"){
            return;
        }

        const id = item.trim();

        if(!id || usedIds.has(id)){
            return;
        }

        usedIds.add(id);
        ids.push(id.slice(0, 120));
    });

    return ids;
}

function stableSortItems(items){
    return items
        .map((item, index) => ({
            item,
            index
        }))
        .sort((a, b) => {
            if(a.item.order !== b.item.order){
                return a.item.order - b.item.order;
            }

            return a.index - b.index;
        })
        .map(entry => entry.item);
}

function stableSortByOrder(sections){
    return sections
        .map((section, index) => ({
            section,
            index
        }))
        .sort((a, b) => {
            if(a.section.order !== b.section.order){
                return a.section.order - b.section.order;
            }

            return a.section.sourceIndex - b.section.sourceIndex || a.index - b.index;
        })
        .map(entry => {
            const {
                sourceIndex,
                ...section
            } = entry.section;

            return section;
        });
}

function text(value, maxLength){
    return String(value ?? "").trim().slice(0, maxLength);
}
