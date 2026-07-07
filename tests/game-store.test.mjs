import test from "node:test";
import assert from "node:assert/strict";

import {
    normalizeGamesCollection
} from "../apps/admin/js/features/game/gameStore.js";

test("Game Backupの重複IDと不正orderを正規化する", ()=>{
    const normalized = normalizeGamesCollection({
        games: [
            createGame({
                id: "duplicate",
                title: "order 2 first",
                order: 2
            }),
            createGame({
                id: "duplicate",
                title: "invalid order",
                order: -1
            }),
            createGame({
                id: "",
                title: "order 1",
                order: 1
            }),
            createGame({
                id: "fourth",
                title: "order 2 second",
                order: "2"
            }),
            null
        ]
    });

    assert.deepEqual(
        normalized.games.map(game=>game.title),
        [
            "order 1",
            "order 2 first",
            "order 2 second",
            "invalid order"
        ]
    );
    assert.deepEqual(
        normalized.games.map(game=>game.order),
        [1, 2, 3, 4]
    );

    const ids = normalized.games.map(game=>game.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.every(Boolean));
    assert.equal(normalized.games[1].id, "duplicate");
    assert.notEqual(normalized.games[3].id, "duplicate");
});

test("Game Backupの不正な公開状態とURLを安全な値へ正規化する", ()=>{
    const [game] = normalizeGamesCollection({
        games: [createGame({
            status: "unknown",
            developmentStatus: "unknown",
            url: "javascript:alert(1)",
            tags: " alpha, beta "
        })]
    }).games;

    assert.equal(game.status, "draft");
    assert.equal(game.developmentStatus, "planning");
    assert.equal(game.url, "");
    assert.deepEqual(game.tags, ["alpha", "beta"]);
});

function createGame(overrides = {}){
    return {
        id: "game",
        title: "Game",
        summary: "Summary",
        description: "Description",
        status: "public",
        developmentStatus: "released",
        platform: "Web",
        genre: "RPG",
        role: "企画・実装",
        url: "https://example.com/game",
        tags: ["RPG"],
        order: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        ...overrides
    };
}
