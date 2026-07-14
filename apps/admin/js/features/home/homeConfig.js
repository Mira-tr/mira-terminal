export const HOME_CONFIG_SCHEMA_VERSION = 1;
export const HOME_SECTION_LIMIT_MAX = 12;
export const HOME_SECTION_ITEM_ID_MAX = 50;

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

export const DEFAULT_HOME_SECTIONS = Object.freeze([
    Object.freeze({
        id: "hero",
        type: "hero",
        enabled: true,
        order: 10,
        title: "RELMUA",
        description: "",
        layout: "hero",
        selectionMode: "source-order",
        limit: 1,
        itemIds: []
    }),
    Object.freeze({
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
    Object.freeze({
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
    Object.freeze({
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
    Object.freeze({
        id: "creators",
        type: "creators",
        enabled: false,
        order: 50,
        title: "Creators",
        description: "",
        layout: "cards",
        selectionMode: "manual",
        limit: 4,
        itemIds: []
    })
]);

const DEFAULT_SECTION_BY_ID = new Map(
    DEFAULT_HOME_SECTIONS.map(section => [section.id, section])
);

export function getDefaultHomeConfig(){
    return {
        schemaVersion: HOME_CONFIG_SCHEMA_VERSION,
        sections: DEFAULT_HOME_SECTIONS.map(cloneSection)
    };
}

export function normalizeHomeConfig(config){
    const source = config && typeof config === "object"
        ? config
        : {};

    if(shouldFallbackSchemaVersion(source)){
        return getDefaultHomeConfig();
    }

    const sourceSections = Array.isArray(source.sections)
        ? source.sections
        : [];
    const usedIds = new Set();
    const normalizedSections = [];

    sourceSections.forEach(section => {
        if(!section || typeof section !== "object"){
            return;
        }

        const sectionId = text(section.id, 80);
        const defaultSection = DEFAULT_SECTION_BY_ID.get(sectionId);

        if(!defaultSection || usedIds.has(sectionId)){
            return;
        }

        usedIds.add(sectionId);
        normalizedSections.push(normalizeHomeSection(section, defaultSection));
    });

    DEFAULT_HOME_SECTIONS.forEach(defaultSection => {
        if(!usedIds.has(defaultSection.id)){
            normalizedSections.push(cloneSection(defaultSection));
        }
    });

    return {
        schemaVersion: HOME_CONFIG_SCHEMA_VERSION,
        sections: stableSortByOrder(normalizedSections)
    };
}

export function normalizeHomeSection(section, defaultSection){
    const source = section && typeof section === "object"
        ? section
        : {};

    return {
        id: defaultSection.id,
        type: defaultSection.type,
        enabled: normalizeEnabled(source.enabled, defaultSection.enabled),
        order: normalizeOrder(source.order, defaultSection.order),
        title: text(source.title, 80) || defaultSection.title,
        description: text(source.description, 240),
        layout: normalizeOption(source.layout, HOME_LAYOUTS, defaultSection.layout),
        selectionMode: normalizeOption(
            source.selectionMode,
            HOME_SELECTION_MODES,
            defaultSection.selectionMode
        ),
        limit: normalizeLimit(source.limit, defaultSection.limit),
        itemIds: normalizeItemIds(source.itemIds)
    };
}

export function getKnownHomeSectionIds(){
    return DEFAULT_HOME_SECTIONS.map(section => section.id);
}

function cloneSection(section){
    return {
        ...section,
        itemIds: [...section.itemIds]
    };
}

function normalizeEnabled(value, fallback){
    if(typeof value === "boolean"){
        return value;
    }

    if(value === "true" || value === "1" || value === 1){
        return true;
    }

    if(value === "false" || value === "0" || value === 0){
        return false;
    }

    return fallback;
}

function normalizeOrder(value, fallback){
    const normalized = Number(value);

    return Number.isFinite(normalized) && normalized >= 1
        ? normalized
        : fallback;
}

function normalizeLimit(value, fallback){
    const normalized = Number(value);

    if(!Number.isInteger(normalized) || normalized < 1){
        return fallback;
    }

    return Math.min(normalized, HOME_SECTION_LIMIT_MAX);
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
    const used = new Set();

    value.forEach(item => {
        if(typeof item !== "string"){
            return;
        }

        const id = item.trim();

        if(!id || used.has(id)){
            return;
        }

        used.add(id);
        ids.push(id.slice(0, 120));
    });

    return ids.slice(0, HOME_SECTION_ITEM_ID_MAX);
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

            return a.index - b.index;
        })
        .map(item => item.section);
}

function shouldFallbackSchemaVersion(source){
    if(!Object.hasOwn(source, "schemaVersion")){
        return false;
    }

    const version = Number(source.schemaVersion);

    return !Number.isInteger(version) ||
        version < HOME_CONFIG_SCHEMA_VERSION ||
        version > HOME_CONFIG_SCHEMA_VERSION;
}

function text(value, maxLength){
    return String(value ?? "").trim().slice(0, maxLength);
}
