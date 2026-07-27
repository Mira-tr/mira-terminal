import {
    normalizePublicHomeConfig
} from "../../../web/js/homeConfigApi.js";

export const HOME_GENERATOR_VERSION = 1;

const DEFAULT_HOME_SECTIONS = Object.freeze([
    Object.freeze({
        id: "hero",
        type: "hero",
        enabled: true,
        order: 10,
        title: "RELMUA",
        description: "",
        layout: "hero"
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

export function generateHomeArtifacts(componentModel){
    const publicHome = generatePublicHome(componentModel);

    return {
        schemaVersion: 1,
        generator: "relmua-home-generator",
        generatorVersion: HOME_GENERATOR_VERSION,
        outputs: {
            "apps/web/data/public-home.json": publicHome
        },
        publicHome
    };
}

export function generatePublicHome(componentModel){
    const model = componentModel?.blocks
        ? pageModelToComponentModel(componentModel)
        : componentModel;
    const sectionById = new Map(DEFAULT_HOME_SECTIONS.map(section => [section.id, { ...section }]));

    applyHero(sectionById.get("hero"), getComponentByType(model, "Hero"));
    applyFeatured(
        sectionById.get("featured-projects"),
        getComponentByType(model, "Featured") || getComponentByType(model, "Card Grid")
    );
    (model?.components || []).forEach(component => {
        const section = sectionById.get(component.id);
        if(section){
            applyEditableSection(section, component);
        }
    });

    const payload = {
        schemaVersion: 1,
        exportType: "public-home",
        module: "home",
        sections: Array.from(sectionById.values())
    };

    return normalizePublicHomeConfig(payload);
}

export function validateGeneratedHomeArtifacts(artifacts){
    const errors = [];

    if(!artifacts || typeof artifacts !== "object"){
        return ["Home artifacts must be an object."];
    }

    try{
        normalizePublicHomeConfig(artifacts.publicHome);
    }catch(error){
        errors.push(error.message);
    }

    return errors;
}

function applyHero(section, component){
    if(!section || !component){
        return;
    }

    const props = component.props || {};
    section.enabled = !props.hidden && props.displayMode !== "Hidden";
    section.title = text(props.title, 80) || section.title;
    section.description = text(props.description, 240);
}

function applyFeatured(section, component){
    if(!section || !component){
        return;
    }

    const props = component.props || {};
    section.enabled = !props.hidden && props.displayMode !== "Hidden";
    section.title = text(props.title, 80) || section.title;
    section.description = text(props.description, 240);
}

function applyEditableSection(section, component){
    if(!section || !component){
        return;
    }

    const props = component.props || {};
    section.enabled = !props.hidden && props.displayMode !== "Hidden";
    section.title = text(props.title, 80) || section.title;
    section.description = text(props.description, 240);
}

function text(value, maxLength){
    return String(value ?? "").trim().slice(0, maxLength);
}

function getComponentByType(model, type){
    return model?.components?.find(component => component.type === type) || null;
}

function pageModelToComponentModel(pageModel){
    return {
        schemaVersion: 1,
        id: pageModel.id,
        title: pageModel.title,
        source: pageModel.source,
        components: (pageModel.blocks || []).map(block => {
            const main = block.components?.find(component => component.id.endsWith(":main")) ||
                block.components?.[0] ||
                {};

            return {
                id: block.id,
                type: block.label || main.type || block.type,
                props: main.props || {},
                children: []
            };
        })
    };
}
