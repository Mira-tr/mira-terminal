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
    PROFILE_KEY,
    RULES_KEY,
    STORAGE_KEY,
    TOOLS_KEY
} from "../apps/admin/js/store.js";

const ROOT = new URL("../", import.meta.url);
const UPDATED_AT = "2026-07-10T12:34:00+09:00";

test("Admin Dashboardは各store形式から指定統計を集計する", () => {
    const storage = createStorage({
        [STORAGE_KEY]: [
            scenario("public"),
            scenario("ready"),
            scenario("draft"),
            scenario("private")
        ],
        [RULES_KEY]: {
            systems: [
                ruleSystem("public", ["public", "draft"]),
                ruleSystem("draft", ["public"])
            ]
        },
        [PROFILE_KEY]: {
            displayName: "MIRA",
            bio: "profile",
            activities: [],
            links: [
                link("public"),
                link("private")
            ],
            updatedAt: UPDATED_AT
        },
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
    const scenarios = findCard(cards, "scenarios");
    const rules = findCard(cards, "rules");
    const profile = findCard(cards, "profile");
    const creators = findCard(cards, "creators");
    const games = findCard(cards, "games");
    const tools = findCard(cards, "tools");
    const notes = findCard(cards, "notes");

    assert.deepEqual(scenarios.primary, {
        label: "総数",
        value: 4,
        suffix: "件"
    });
    assert.deepEqual(statValues(scenarios), {
        public: 1,
        ready: 1,
        draft: 1,
        private: 1
    });
    assert.equal(rules.primary.value, 2);
    assert.deepEqual(statValues(rules), {
        "公開System": 1,
        "Section総数": 3,
        "公開Section": 2
    });
    assert.equal(profile.primary.value, "設定済み");
    assert.deepEqual(statValues(profile), {
        "公開Link": 1,
        "非公開Link": 1
    });
    assert.equal(creators.primary.value, 3);
    assert.deepEqual(statValues(creators), {
        public: 1,
        draft: 1,
        private: 1
    });
    assert.deepEqual(statValues(games), {
        public: 1,
        draft: 1,
        private: 1
    });
    assert.deepEqual(statValues(tools), {
        public: 2,
        draft: 1,
        private: 0
    });
    assert.deepEqual(statValues(notes), {
        public: 0,
        draft: 1,
        private: 1
    });
    cards.forEach(card => {
        assert.equal(card.error, "", card.id);
        assert.notEqual(card.lastUpdated, "更新記録なし", card.id);
    });
});

test("localStorageが空なら全件数を0・Profileを未設定として表示する", () => {
    const cards = loadAdminDashboardCards(createStorage());

    cards.forEach(card => {
        assert.equal(card.error, "", card.id);
        assert.equal(card.lastUpdated, "更新記録なし", card.id);
    });

    assert.equal(findCard(cards, "scenarios").primary.value, 0);
    assert.equal(findCard(cards, "rules").primary.value, 0);
    assert.equal(findCard(cards, "profile").primary.value, "未設定");
    assert.equal(findCard(cards, "creators").primary.value, 0);
    assert.equal(findCard(cards, "games").primary.value, 0);
    assert.equal(findCard(cards, "tools").primary.value, 0);
    assert.equal(findCard(cards, "notes").primary.value, 0);
});

test("不正JSONと不正構造のエラーは該当カード内に限定する", () => {
    const storage = createStorage({
        [GAME_KEY]: collection("games", ["public"]),
        [TOOLS_KEY]: collection("tools", [])
    });

    storage.setRaw(STORAGE_KEY, "{broken-json");
    storage.setRaw(NOTES_KEY, "[]");

    const cards = loadAdminDashboardCards(storage);

    assert.match(findCard(cards, "scenarios").error, /読み込めませんでした/);
    assert.match(findCard(cards, "notes").error, /読み込めませんでした/);
    assert.equal(findCard(cards, "games").error, "");
    assert.equal(findCard(cards, "games").primary.value, 1);
    assert.equal(cards.length, 7);
});

test("Dashboardカードのリンク先が存在しDOM生成と390px対応を維持する", async () => {
    const cards = loadAdminDashboardCards(createStorage());

    for(const card of cards){
        await access(new URL(card.href, new URL("apps/admin/index.html", ROOT)));
    }

    const html = await read("apps/admin/index.html");
    const page = await read("apps/admin/js/pages/adminDashboardPage.js");
    const css = await read("apps/admin/css/pages/dashboard.css");

    assert.match(html, /id="moduleDashboard"/);
    assert.match(html, /id="lastBackupExportAt"/);
    assert.match(html, /adminDashboardPage\.js/);
    assert.match(page, /createElement\s*\(/);
    assert.match(page, /textContent\s*=/);
    assert.match(page, /replaceChildren\s*\(/);
    assert.doesNotMatch(page, /innerHTML/);
    assert.match(css, /@media \(max-width: 390px\)/);
    assert.match(css, /repeat\(auto-fit, minmax\(280px, 1fr\)\)/);
    assert.match(css, /\.dashboard-overview\s*\{[\s\S]*?display:\s*block/);
    assert.match(css, /grid-template-columns:\s*minmax\(0, 1fr\)/);
});

test("pnpmのローカルstoreは削除されGit管理対象外になっている", async () => {
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

function scenario(status){
    return {
        id: `scenario-${status}`,
        title: status,
        status,
        updatedAt: UPDATED_AT
    };
}

function ruleSystem(status, sectionStatuses){
    return {
        id: `system-${status}`,
        label: status,
        title: status,
        status,
        updatedAt: UPDATED_AT,
        sections: sectionStatuses.map((sectionStatus, index) => ({
            id: `${status}-${sectionStatus}-${index}`,
            title: sectionStatus,
            status: sectionStatus,
            order: index + 1,
            updatedAt: UPDATED_AT
        }))
    };
}

function link(status){
    return {
        id: `link-${status}`,
        label: status,
        url: `https://example.com/${status}`,
        type: "other",
        status
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
