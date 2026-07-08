import {
    GAME_KEY,
    load,
    save
} from "../../store.js";

import {
    isSafeHttpUrl
} from "../../utils.js";

const DEFAULT_GAMES = {
    games: []
};

function generateUUID(){
    if(globalThis.crypto?.randomUUID){
        return `game-${globalThis.crypto.randomUUID()}`;
    }

    return "game-" + Date.now() + "-" + Math.random().toString(36).substring(2, 12);
}

function generateUniqueId(usedIds){
    let id = generateUUID();

    while(usedIds.has(id)){
        id = generateUUID();
    }

    return id;
}

function normalizeGame(game, options = {}){
    const now = options.now || new Date().toISOString();

    return {
        id: options.id || String(game.id || "").trim() || generateUUID(),
        title: String(game.title || "").trim().substring(0, 80),
        summary: String(game.summary || "").trim().substring(0, 160),
        description: String(game.description || "").trim().substring(0, 1000),
        status: normalizeStatus(game.status),
        developmentStatus: normalizeDevelopmentStatus(game.developmentStatus),
        platform: String(game.platform || "").trim().substring(0, 80),
        genre: String(game.genre || "").trim().substring(0, 80),
        role: String(game.role || "").trim().substring(0, 120),
        url: normalizeURL(game.url),
        tags: normalizeTags(game.tags),
        order: options.order ?? normalizeOrder(game.order),
        createdAt: normalizeTimestamp(game.createdAt, now),
        updatedAt: options.touchUpdatedAt
            ? now
            : normalizeTimestamp(game.updatedAt, now)
    };
}

export function normalizeGamesCollection(value){
    const source = value && typeof value === "object" && Array.isArray(value.games)
        ? value.games
        : [];
    const now = new Date().toISOString();
    const usedIds = new Set();

    const sorted = source
        .filter(game => game && typeof game === "object")
        .map((game, index) => ({
            game,
            index,
            order: normalizeOrder(game.order)
        }))
        .sort((a, b) => {
            if(a.order === b.order){
                return a.index - b.index;
            }

            if(a.order === 0){
                return 1;
            }

            if(b.order === 0){
                return -1;
            }

            return a.order - b.order;
        });

    const games = sorted.map(({ game }, index) => {
        const sourceId = String(game.id || "").trim();
        const id = sourceId && !usedIds.has(sourceId)
            ? sourceId
            : generateUniqueId(usedIds);

        usedIds.add(id);

        return normalizeGame(game, {
            id,
            order: index + 1,
            now
        });
    });

    return { games };
}

function normalizeStatus(status){
    const allowed = ["draft", "public", "private"];
    const normalized = String(status || "draft").trim().toLowerCase();
    return allowed.includes(normalized) ? normalized : "draft";
}

function normalizeDevelopmentStatus(status){
    const allowed = ["planning", "development", "released", "archived"];
    const normalized = String(status || "planning").trim().toLowerCase();
    return allowed.includes(normalized) ? normalized : "planning";
}

function normalizeURL(url){
    const normalized = String(url || "").trim();

    if(!normalized){
        return "";
    }

    if(isSafeHttpUrl(normalized)){
        return normalized;
    }

    return "";
}

function normalizeTags(tags){
    if(!Array.isArray(tags)){
        tags = String(tags || "").split(/[\n,]/);
    }

    return tags
        .map(tag => String(tag || "").trim())
        .filter(tag => tag)
        .map(tag => tag.substring(0, 24))
        .slice(0, 12);
}

function normalizeOrder(order){
    const normalized = Number(order);

    return Number.isInteger(normalized) && normalized > 0
        ? normalized
        : 0;
}

function normalizeTimestamp(value, fallback){
    const normalized = String(value || "").trim();
    return normalized || fallback;
}

export function loadGames(){
    const loaded = load(
        GAME_KEY,
        DEFAULT_GAMES
    );
    const normalized = normalizeGamesCollection(loaded);

    if(JSON.stringify(loaded) !== JSON.stringify(normalized)){
        saveGames(normalized);
    }

    return normalized;
}

export function saveGames(games){
    return save(
        GAME_KEY,
        games
    );
}

export function getGames(){
    return loadGames();
}

export function setGames(games){
    const normalized = normalizeGamesCollection(games);
    saveGames(normalized);
    return normalized;
}

export function addGame(game){
    const games = getGames();
    const usedIds = new Set(games.games.map(item => item.id));
    const normalized = normalizeGame(game, {
        id: generateUniqueId(usedIds),
        order: games.games.length + 1,
        touchUpdatedAt: true
    });

    games.games.push(normalized);
    setGames(games);

    return normalized;
}

export function updateGame(gameId, updates){
    const games = getGames();
    const gameIndex = games.games.findIndex(g => g.id === gameId);

    if(gameIndex === -1){
        return false;
    }

    games.games[gameIndex] = normalizeGame({
        ...games.games[gameIndex],
        ...updates
    }, {
        id: games.games[gameIndex].id,
        order: games.games[gameIndex].order,
        touchUpdatedAt: true
    });

    setGames(games);
    return true;
}

export function deleteGame(gameId){
    const games = getGames();
    games.games = games.games.filter(g => g.id !== gameId);
    setGames(games);
    return true;
}

export function moveGame(gameId, direction){
    const games = getGames();
    games.games.sort((a, b) => a.order - b.order);
    const gameIndex = games.games.findIndex(g => g.id === gameId);

    if(gameIndex === -1){
        return false;
    }

    const targetIndex = direction === "up" ? gameIndex - 1 : gameIndex + 1;

    if(targetIndex < 0 || targetIndex >= games.games.length){
        return false;
    }

    const [game] = games.games.splice(gameIndex, 1);
    games.games.splice(targetIndex, 0, game);
    games.games.forEach((item, index) => {
        item.order = index + 1;
    });

    setGames(games);
    return true;
}
