import {
    getFavoriteIds,
    saveFavoriteIds
} from "./favoriteStore.js";

export function getFavorites(){
    return getFavoriteIds();
}

export function isFavorite(scenarioId, favoriteIds){
    return favoriteIds.includes(String(scenarioId));
}

export function toggleFavorite(scenarioId){
    const id = String(scenarioId);
    const current = getFavoriteIds();

    const next = current.includes(id)
        ? current.filter(favoriteId=>favoriteId !== id)
        : [...current, id];

    saveFavoriteIds(next);

    return next;
}