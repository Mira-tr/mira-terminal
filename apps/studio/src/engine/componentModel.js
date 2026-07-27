export const COMPONENT_MODEL_SCHEMA_VERSION = 1;

export function createComponentModelFromContracts({
    id,
    title,
    source,
    contracts,
    componentState
}){
    return normalizeComponentModel({
        schemaVersion: COMPONENT_MODEL_SCHEMA_VERSION,
        id,
        title,
        source,
        components: contracts.map(contract => createComponentFromContract(contract, componentState[contract.id]))
    });
}

export function normalizeComponentModel(model){
    const source = model && typeof model === "object"
        ? model
        : {};

    return {
        schemaVersion: COMPONENT_MODEL_SCHEMA_VERSION,
        id: text(source.id, 80) || "component-model",
        title: text(source.title, 100) || "Component Model",
        source: text(source.source, 80),
        components: Array.isArray(source.components)
            ? source.components.map(normalizeComponent).filter(Boolean)
            : []
    };
}

export function getComponentByType(model, type){
    return model?.components?.find(component => component.type === type) || null;
}

function createComponentFromContract(contract, values = {}){
    const props = Object.fromEntries(contract.fields.map(field => [
        field.id,
        values[field.id] ?? field.defaultValue
    ]));

    return {
        id: contract.id,
        type: contract.label,
        props,
        children: contract.fields.map(field => ({
            id: `${contract.id}.${field.id}`,
            type: "Field",
            props: {
                label: field.label,
                field: field.id,
                binding: field.binding || null
            },
            children: []
        }))
    };
}

function normalizeComponent(component){
    if(!component || typeof component !== "object"){
        return null;
    }

    const id = text(component.id, 120);
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
        children: Array.isArray(component.children)
            ? component.children.map(normalizeComponent).filter(Boolean)
            : []
    };
}

function text(value, maxLength){
    return String(value ?? "").trim().slice(0, maxLength);
}
