import {
    getGames
} from "./gameStore.js";

import {
    showMessage
} from "../../utils.js";

const APP_NAME = "MIRA Terminal";
const MODULE_NAME = "game";
const EXPORT_TYPE = "public-games";
const EXPORT_VERSION = "1.0.0";
const SCHEMA_VERSION = 1;
const PUBLIC_EXPORT_FILENAME = "public-games.json";
const PUBLIC_EXPORT_DESTINATION = "apps/web/game/data/public-games.json";

export function exportPublicGames(){
    const games = getGames();

    const exportData = {
        app: APP_NAME,
        module: MODULE_NAME,
        exportType: EXPORT_TYPE,
        exportVersion: EXPORT_VERSION,
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        games: games.games
            .filter(game => game.status === "public")
            .map(game => ({
                id: game.id,
                title: game.title,
                summary: game.summary,
                description: game.description,
                developmentStatus: game.developmentStatus,
                platform: game.platform,
                genre: game.genre,
                role: game.role,
                url: game.url,
                tags: game.tags,
                order: game.order
            }))
            .sort((a, b) => a.order - b.order)
    };

    const blob = new Blob(
        [JSON.stringify(exportData, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = PUBLIC_EXPORT_FILENAME;
    a.click();

    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 0);

    showMessage(
        `Public Export完了 / ファイル名: ${PUBLIC_EXPORT_FILENAME} / ` +
        `配置先: ${PUBLIC_EXPORT_DESTINATION}`
    );
}
