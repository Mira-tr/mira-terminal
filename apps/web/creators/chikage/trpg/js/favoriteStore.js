import {
    FAVORITE_STORAGE_KEY
} from "./config.js";

export function getFavoriteIds(){
    try {
        const value = JSON.parse(
            localStorage.getItem(FAVORITE_STORAGE_KEY) || "[]"
        );

        return Array.isArray(value)
            ? value.map(String)
            : [];
    } catch {
        return [];
    }
}

export function saveFavoriteIds(ids){
    const safeIds = Array.isArray(ids)
        ? [...new Set(ids.map(String).filter(Boolean))]
        : [];

    localStorage.setItem(
        FAVORITE_STORAGE_KEY,
        JSON.stringify(safeIds)
    );
}