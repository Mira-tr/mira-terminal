import {
    createBlockFromRegistry,
    getStarterBlockTypes
} from "./componentRegistry.js";

export const PAGE_MODEL_SCHEMA_VERSION = 1;

export function createPageModel({
    id,
    title,
    source,
    blocks,
    theme = null,
    assets = [],
    settings = null
}){
    return normalizePageModel({
        schemaVersion: PAGE_MODEL_SCHEMA_VERSION,
        id,
        title,
        source,
        blocks,
        theme,
        assets,
        settings
    });
}

export function createStarterPageModel({
    id,
    title,
    source,
    pageId = "home"
}){
    return createPageModel({
        id,
        title,
        source,
        blocks: getStarterBlockTypes(pageId).map((type, index) => createBlockFromRegistry(type, index))
    });
}

export function normalizePageModel(model){
    const source = model && typeof model === "object"
        ? model
        : {};

    return {
        schemaVersion: PAGE_MODEL_SCHEMA_VERSION,
        id: text(source.id, 80) || "page",
        title: text(source.title, 100) || "Page",
        source: text(source.source, 80),
        blocks: Array.isArray(source.blocks)
            ? source.blocks.map(normalizeBlock).filter(Boolean).sort((a, b) => a.order - b.order)
            : [],
        theme: source.theme && typeof source.theme === "object" ? { ...source.theme } : null,
        assets: Array.isArray(source.assets) ? source.assets : [],
        settings: normalizePageSettings(source.settings)
    };
}

export function moveBlock(pageModel, blockId, direction){
    const model = normalizePageModel(pageModel);
    const index = model.blocks.findIndex(block => block.id === blockId);
    const offset = direction === "up" ? -1 : 1;
    const nextIndex = index + offset;

    if(index < 0 || nextIndex < 0 || nextIndex >= model.blocks.length){
        return model;
    }

    const blocks = [...model.blocks];
    const current = blocks[index];
    blocks[index] = blocks[nextIndex];
    blocks[nextIndex] = current;

    return normalizePageModel({
        ...model,
        blocks: blocks.map((block, orderIndex) => ({
            ...block,
            order: (orderIndex + 1) * 10
        }))
    });
}

export function addBlockToPage(pageModel, type){
    const model = normalizePageModel(pageModel);
    const block = createBlockFromRegistry(type, model.blocks.length);

    return normalizePageModel({
        ...model,
        blocks: [...model.blocks, block]
    });
}

export function pageModelToComponentModel(pageModel){
    const model = normalizePageModel(pageModel);

    return {
        schemaVersion: 1,
        id: model.id,
        title: model.title,
        source: model.source,
        theme: model.theme,
        settings: model.settings,
        assets: model.assets,
        components: model.blocks.map(blockToComponent)
    };
}

function blockToComponent(block){
    const main = block.components.find(component => component.id.endsWith(":main")) || block.components[0];

    return {
        id: block.id,
        type: block.label || main?.type || block.type,
        props: main?.props || {},
        children: block.components.flatMap(component => component.properties || []).map(property => ({
            id: `${block.id}.${property.id}`,
            type: "Property",
            props: {
                label: property.label,
                field: property.id,
                group: property.group,
                binding: property.binding || null
            },
            children: []
        }))
    };
}

function normalizeBlock(block){
    if(!block || typeof block !== "object"){
        return null;
    }

    const id = text(block.id, 120);
    const type = text(block.type, 80);

    if(!id || !type){
        return null;
    }

    return {
        id,
        type,
        label: text(block.label, 80) || type,
        order: Number.isFinite(Number(block.order)) ? Number(block.order) : 0,
        components: Array.isArray(block.components)
            ? block.components.map(normalizeBlockComponent).filter(Boolean)
            : []
    };
}

function normalizeBlockComponent(component){
    if(!component || typeof component !== "object"){
        return null;
    }

    const id = text(component.id, 140);
    const type = text(component.type, 80);

    if(!id || !type){
        return null;
    }

    return {
        id,
        type,
        props: component.props && typeof component.props === "object" && !Array.isArray(component.props)
            ? { ...component.props }
            : {},
        properties: Array.isArray(component.properties)
            ? component.properties.map(normalizeProperty).filter(Boolean)
            : []
    };
}

function normalizeProperty(property){
    if(!property || typeof property !== "object"){
        return null;
    }

    const id = text(property.id, 80);

    if(!id){
        return null;
    }

    return {
        id,
        label: text(property.label, 80) || id,
        group: text(property.group, 40) || "property",
        binding: property.binding || null
    };
}

function normalizePageSettings(settings){
    const source = settings && typeof settings === "object" && !Array.isArray(settings)
        ? settings
        : {};
    const bgm = source.bgm && typeof source.bgm === "object" && !Array.isArray(source.bgm)
        ? source.bgm
        : {};

    return {
        bgm: {
            enabled: Boolean(bgm.enabled),
            assetId: text(bgm.assetId, 140),
            volume: clamp(Number(bgm.volume), 0, 1, 0.6),
            loop: bgm.loop !== false,
            showControl: bgm.showControl !== false
        }
    };
}

function clamp(value, min, max, fallback){
    if(!Number.isFinite(value)){
        return fallback;
    }

    return Math.max(min, Math.min(max, value));
}

function text(value, maxLength){
    return String(value ?? "").trim().slice(0, maxLength);
}
