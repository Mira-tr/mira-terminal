import {
    HOME_CONFIG_SCHEMA_VERSION,
    HOME_LAYOUTS,
    HOME_SECTION_TYPES,
    HOME_SELECTION_MODES
} from "./homeConfig.js";

export function validateHomeConfig(config){
    const errors = [];

    if(!config || typeof config !== "object"){
        errors.push("Home Configuration must be an object.");
    }

    if(config?.schemaVersion !== HOME_CONFIG_SCHEMA_VERSION){
        errors.push("Home Configuration schemaVersion is not supported.");
    }

    if(!Array.isArray(config?.sections)){
        errors.push("Home Configuration sections must be an array.");
    }else{
        validateSections(config.sections, errors);
    }

    if(errors.length){
        throw new Error(errors.join("\n"));
    }

    return true;
}

function validateSections(sections, errors){
    const ids = new Set();

    sections.forEach((section, index) => {
        const label = `sections[${index}]`;

        if(!section || typeof section !== "object"){
            errors.push(`${label} must be an object.`);
            return;
        }

        if(!section.id){
            errors.push(`${label}.id is required.`);
        }else if(ids.has(section.id)){
            errors.push(`Home Section id is duplicated: ${section.id}`);
        }else{
            ids.add(section.id);
        }

        if(!HOME_SECTION_TYPES.includes(section.type)){
            errors.push(`${label}.type is invalid: ${section.type}`);
        }

        if(typeof section.enabled !== "boolean"){
            errors.push(`${label}.enabled must be boolean.`);
        }

        if(!Number.isFinite(section.order) || section.order < 1){
            errors.push(`${label}.order must be a positive number.`);
        }

        if(typeof section.title !== "string"){
            errors.push(`${label}.title must be a string.`);
        }

        if(typeof section.description !== "string"){
            errors.push(`${label}.description must be a string.`);
        }

        if(!HOME_LAYOUTS.includes(section.layout)){
            errors.push(`${label}.layout is invalid: ${section.layout}`);
        }

        if(!HOME_SELECTION_MODES.includes(section.selectionMode)){
            errors.push(`${label}.selectionMode is invalid: ${section.selectionMode}`);
        }

        if(!Number.isInteger(section.limit) || section.limit < 1){
            errors.push(`${label}.limit must be a positive integer.`);
        }

        if(!Array.isArray(section.itemIds)){
            errors.push(`${label}.itemIds must be an array.`);
        }else if(section.itemIds.some(item => typeof item !== "string")){
            errors.push(`${label}.itemIds must contain strings only.`);
        }
    });
}
