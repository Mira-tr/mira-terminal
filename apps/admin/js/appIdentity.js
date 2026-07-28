export const APP_NAME = "RELMUA Terminal";
export const PRODUCT_VERSION = "1.0.0";

const LEGACY_APP_NAMES = new Set([
    "MIRA Terminal",
    APP_NAME
]);

export function isSupportedAppName(value){
    return LEGACY_APP_NAMES.has(String(value ?? "").trim());
}
