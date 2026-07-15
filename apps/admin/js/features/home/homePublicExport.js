import {
    loadHomeConfig
} from "./homeStore.js";

import {
    HOME_CONFIG_SCHEMA_VERSION,
    HOME_LAYOUTS,
    HOME_SECTION_LIMIT_MAX,
    HOME_SECTION_TYPES,
    HOME_SELECTION_MODES,
    normalizeHomeConfig
} from "./homeConfig.js";

import {
    showToast
} from "../common/toastService.js";

import { recordPublicExport } from "../common/operationMeta.js";

const EXPORT_TYPE = "public-home";
const MODULE_NAME = "home";
const PUBLIC_EXPORT_FILENAME = "public-home.json";
const PUBLIC_EXPORT_DESTINATION = "apps/web/data/public-home.json";

const TOP_LEVEL_FIELDS = new Set([
    "schemaVersion",
    "exportType",
    "module",
    "sections"
]);

const HERO_SECTION_FIELDS = new Set([
    "id",
    "type",
    "enabled",
    "order",
    "title",
    "description",
    "layout"
]);

const CONTENT_SECTION_FIELDS = new Set([
    ...HERO_SECTION_FIELDS,
    "selectionMode",
    "limit",
    "itemIds"
]);

const ADMIN_ONLY_FIELDS = new Set([
    "status",
    "createdAt",
    "updatedAt",
    "memo",
    "dirty",
    "storageKey",
    "localStorageKey",
    "validationMessage"
]);

export function exportPublicHome(){
    const payload = createPublicHomePayload();

    downloadJson(payload, PUBLIC_EXPORT_FILENAME);
    recordPublicExport(MODULE_NAME);
    showToast(`Public JSON exported: ${PUBLIC_EXPORT_FILENAME}`, "success");

    return payload;
}

export function createPublicHomePayload(config){
    const normalized = normalizeHomeConfig(config ?? loadHomeConfig());
    const payload = {
        schemaVersion: HOME_CONFIG_SCHEMA_VERSION,
        exportType: EXPORT_TYPE,
        module: MODULE_NAME,
        sections: normalized.sections.map(toPublicSection)
    };

    validatePublicHomePayload(payload);

    return payload;
}

export function validatePublicHomePayload(payload){
    const errors = [];

    validateAllowedFields(payload, TOP_LEVEL_FIELDS, "public-home", errors);

    if(payload?.schemaVersion !== HOME_CONFIG_SCHEMA_VERSION){
        errors.push("public-home.schemaVersion must be 1.");
    }

    if(payload?.exportType !== EXPORT_TYPE){
        errors.push("public-home.exportType must be public-home.");
    }

    if(payload?.module !== MODULE_NAME){
        errors.push("public-home.module must be home.");
    }

    if(!Array.isArray(payload?.sections)){
        errors.push("public-home.sections must be an array.");
    }else{
        validateSections(payload.sections, errors);
    }

    if(errors.length){
        throw new Error(errors.join("\n"));
    }

    return true;
}

export function getHomePublicExportContract(){
    return {
        filename: PUBLIC_EXPORT_FILENAME,
        destination: PUBLIC_EXPORT_DESTINATION,
        exportType: EXPORT_TYPE,
        module: MODULE_NAME
    };
}

function toPublicSection(section){
    const publicSection = {
        id: section.id,
        type: section.type,
        enabled: section.enabled,
        order: section.order,
        title: section.title,
        description: section.description,
        layout: section.layout
    };

    if(section.type !== "hero"){
        publicSection.selectionMode = section.selectionMode;
        publicSection.limit = section.limit;
        publicSection.itemIds = [...section.itemIds];
    }

    return publicSection;
}

function validateSections(sections, errors){
    const ids = new Set();

    sections.forEach((section, index) => {
        const label = `sections[${index}]`;
        const allowedFields = section?.type === "hero"
            ? HERO_SECTION_FIELDS
            : CONTENT_SECTION_FIELDS;

        validateAllowedFields(section, allowedFields, label, errors);

        if(!section || typeof section !== "object"){
            errors.push(`${label} must be an object.`);
            return;
        }

        if(!section.id){
            errors.push(`${label}.id is required.`);
        }else if(ids.has(section.id)){
            errors.push(`Home Public Section id is duplicated: ${section.id}`);
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

        if(section.type === "hero"){
            validateHeroSection(section, label, errors);
        }else{
            validateContentSection(section, label, errors);
        }
    });
}

function validateHeroSection(section, label, errors){
    ["selectionMode", "limit", "itemIds"].forEach(field => {
        if(Object.hasOwn(section, field)){
            errors.push(`${label}.${field} is not allowed for Hero.`);
        }
    });
}

function validateContentSection(section, label, errors){
    if(!HOME_SELECTION_MODES.includes(section.selectionMode)){
        errors.push(`${label}.selectionMode is invalid: ${section.selectionMode}`);
    }

    if(
        !Number.isInteger(section.limit) ||
        section.limit < 1 ||
        section.limit > HOME_SECTION_LIMIT_MAX
    ){
        errors.push(`${label}.limit must be a positive integer.`);
    }

    if(!Array.isArray(section.itemIds)){
        errors.push(`${label}.itemIds must be an array.`);
    }else if(section.itemIds.some(item => typeof item !== "string")){
        errors.push(`${label}.itemIds must contain strings only.`);
    }
}

function validateAllowedFields(value, allowedFields, label, errors){
    if(!value || typeof value !== "object" || Array.isArray(value)){
        return;
    }

    Object.keys(value).forEach(field => {
        if(ADMIN_ONLY_FIELDS.has(field)){
            errors.push(`${label}.${field} is an Admin-only field.`);
            return;
        }

        if(!allowedFields.has(field)){
            errors.push(`${label}.${field} is not allowed.`);
        }
    });
}

function downloadJson(payload, filename){
    const blob = new Blob(
        [JSON.stringify(payload, null, 2)],
        { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;
    anchor.click();

    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 0);
}
