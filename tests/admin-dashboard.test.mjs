import test from "node:test";
import assert from "node:assert/strict";
import {
    access,
    readFile
} from "node:fs/promises";

import {
    loadAdminDashboardCards
} from "../apps/admin/js/features/common/adminDashboard.js";

import {
    CREATORS_KEY,
    GAME_KEY,
    NOTES_KEY,
    TOOLS_KEY
} from "../apps/admin/js/store.js";

const ROOT = new URL("../", import.meta.url);
const UPDATED_AT = "2026-07-10T12:34:00+09:00";

test("Admin Dashboard shows brand-level cards only", () => {
    const storage = createStorage({
        [CREATORS_KEY]: {
            primaryCreatorId: "creator-public-0",
            creators: [
                creator("public", 0),
                creator("draft", 1),
                creator("private", 2)
            ]
        },
        [GAME_KEY]: collection("games", ["public", "draft", "private"]),
        [TOOLS_KEY]: collection("tools", ["public", "public", "draft"]),
        [NOTES_KEY]: collection("notes", ["private", "draft"])
    });

    const cards = loadAdminDashboardCards(storage);

    assert.deepEqual(
        cards.map(card => card.id),
        ["home", "creators", "games", "tools", "notes"]
    );
    assert.equal(findCard(cards, "home").primary.value, "稼働中");
    assert.equal(findCard(cards, "creators").primary.value, 3);
    assert.deepEqual(statValues(findCard(cards, "games")), {
        public: 1,
        draft: 1,
        private: 1
    });
    assert.deepEqual(statValues(findCard(cards, "tools")), {
        public: 2,
        draft: 1,
        private: 0
    });
    assert.deepEqual(statValues(findCard(cards, "notes")), {
        public: 0,
        draft: 1,
        private: 1
    });

    cards.forEach(card => {
        assert.equal(card.error, "", card.id);
    });
});

test("Admin Dashboard empty storage keeps brand cards readable", () => {
    const cards = loadAdminDashboardCards(createStorage());

    assert.equal(cards.length, 5);
    assert.equal(findCard(cards, "home").primary.value, "稼働中");
    assert.equal(findCard(cards, "creators").primary.value, 0);
    assert.equal(findCard(cards, "games").primary.value, 0);
    assert.equal(findCard(cards, "tools").primary.value, 0);
    assert.equal(findCard(cards, "notes").primary.value, 0);
});

test("Admin Dashboard errors stay scoped to affected brand cards", () => {
    const storage = createStorage({
        [GAME_KEY]: collection("games", ["public"]),
        [TOOLS_KEY]: collection("tools", [])
    });

    storage.setRaw(NOTES_KEY, "[]");

    const cards = loadAdminDashboardCards(storage);

    assert.equal(findCard(cards, "games").error, "");
    assert.equal(findCard(cards, "games").primary.value, 1);
    assert.match(findCard(cards, "notes").error, /読み込めません/);
    assert.equal(cards.length, 5);
});

test("Admin Hub removes direct creator-specific navigation", async () => {
    const cards = loadAdminDashboardCards(createStorage());

    for(const card of cards){
        await access(new URL(card.href, new URL("apps/admin/index.html", ROOT)));
    }

    const html = await read("apps/admin/index.html");
    const nav = html.match(/<nav class="header-nav"[\s\S]*?<\/nav>/)?.[0] || "";
    const page = await read("apps/admin/js/pages/adminDashboardPage.js");
    const css = await read("apps/admin/css/pages/dashboard.css");

    assert.match(html, /href="\.\/terminal\/"/);
    assert.match(html, /id="moduleDashboard"/);
    assert.match(html, /id="lastBackupExportAt"/);
    assert.match(html, /adminDashboardPage\.js/);
    assert.doesNotMatch(nav, /TRPG|House Rules|Profile \/ Links/);
    assert.doesNotMatch(html, /TRPG Scenario|House Rules|Profile \/ Links/);
    assert.match(page, /createElement\s*\(/);
    assert.match(page, /textContent\s*=/);
    assert.match(page, /replaceChildren\s*\(/);
    assert.doesNotMatch(page, /innerHTML/);
    assert.match(css, /@media \(max-width: 390px\)/);
    assert.match(css, /repeat\(auto-fit, minmax\(280px, 1fr\)\)/);
    assert.match(css, /\.dashboard-overview\s*\{[\s\S]*?display:\s*block/);
    assert.match(css, /grid-template-columns:\s*minmax\(0, 1fr\)/);
});

test("pnpm local store is ignored", async () => {
    const gitignore = await read(".gitignore");

    assert.match(gitignore, /^\.pnpm-store\/$/m);
    await assert.rejects(
        access(new URL(".pnpm-store/", ROOT)),
        error => error?.code === "ENOENT"
    );
});

function createStorage(values = {}){
    const data = new Map(
        Object.entries(values).map(([key, value]) => [
            key,
            JSON.stringify(value)
        ])
    );

    return {
        getItem: key => data.get(key) ?? null,
        setRaw: (key, value) => data.set(key, value)
    };
}

function creator(status, index){
    return {
        id: `creator-${status}-${index}`,
        slug: `creator-${status}-${index}`,
        displayName: `${status}-${index}`,
        status,
        order: index + 1,
        updatedAt: UPDATED_AT
    };
}

function collection(key, statuses){
    return {
        [key]: statuses.map((status, index) => ({
            id: `${key}-${status}-${index}`,
            name: `${status}-${index}`,
            title: `${status}-${index}`,
            status,
            order: index + 1,
            updatedAt: UPDATED_AT
        }))
    };
}

function findCard(cards, id){
    return cards.find(card => card.id === id);
}

function statValues(card){
    return Object.fromEntries(
        card.stats.map(stat => [stat.label, stat.value])
    );
}

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
