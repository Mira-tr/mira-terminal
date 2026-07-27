export const THEME_ENGINE_SCHEMA_VERSION = 1;

export const THEME_GROUPS = Object.freeze([
    createThemeGroup("color", "Color", [
        createThemeField("primary", "Primary", "color", "#19584d"),
        createThemeField("secondary", "Secondary", "color", "#d8b35a"),
        createThemeField("surface", "Surface", "color", "#f6f1e7")
    ]),
    createThemeGroup("typography", "Typography", [
        createThemeField("fontFamily", "Font Family", "text", "system-ui"),
        createThemeField("headingScale", "Heading Scale", "range", "18")
    ]),
    createThemeGroup("radius", "Radius", [
        createThemeField("radius", "Radius", "range", "8")
    ]),
    createThemeGroup("shadow", "Shadow", [
        createThemeField("shadow", "Shadow", "range", "2")
    ]),
    createThemeGroup("motion", "Motion", [
        createThemeField("motion", "Motion", "range", "1")
    ]),
    createThemeGroup("spacing", "Spacing", [
        createThemeField("spacing", "Spacing", "range", "16")
    ])
]);

export function createDefaultTheme(){
    return normalizeTheme({
        schemaVersion: THEME_ENGINE_SCHEMA_VERSION,
        tokens: Object.fromEntries(THEME_GROUPS.flatMap(group => (
            group.fields.map(field => [field.id, field.defaultValue])
        )))
    });
}

export function normalizeTheme(theme){
    const source = theme && typeof theme === "object"
        ? theme
        : {};
    const tokens = source.tokens && typeof source.tokens === "object"
        ? source.tokens
        : source;

    return {
        schemaVersion: THEME_ENGINE_SCHEMA_VERSION,
        tokens: Object.fromEntries(THEME_GROUPS.flatMap(group => (
            group.fields.map(field => [field.id, tokens[field.id] ?? field.defaultValue])
        )))
    };
}

export function themeToPreviewTokens(theme){
    const normalized = normalizeTheme(theme).tokens;

    return {
        primary: normalized.primary,
        secondary: normalized.secondary,
        radius: normalized.radius,
        shadow: normalized.shadow,
        spacing: normalized.spacing,
        typography: normalized.fontFamily
    };
}

function createThemeGroup(id, label, fields){
    return Object.freeze({
        id,
        label,
        fields: Object.freeze(fields)
    });
}

function createThemeField(id, label, type, defaultValue){
    return Object.freeze({
        id,
        label,
        type,
        defaultValue
    });
}
