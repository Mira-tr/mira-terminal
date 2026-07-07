import test from "node:test";
import assert from "node:assert/strict";
import {
    readFile,
    readdir
} from "node:fs/promises";
import {
    extname
} from "node:path";

const ROOT = new URL("../", import.meta.url);

test("GameとProfileの管理モジュール参照が解決できる", async ()=>{
    const gameStore = await import(
        "../apps/admin/js/features/game/gameStore.js"
    );
    const profileBackup = await import(
        "../apps/admin/js/features/profile/profileBackup.js"
    );

    assert.equal(typeof gameStore.getGames, "function");
    assert.equal(typeof profileBackup.importBackupProfile, "function");
});

test("Scenario Public Exportのファイル名は固定されている", async ()=>{
    const source = await read("apps/admin/js/features/trpg/scenarios/scenarioPublicExport.js");

    assert.match(
        source,
        /PUBLIC_EXPORT_FILENAME\s*=\s*"public-scenarios\.json"/
    );
    assert.doesNotMatch(source, /options\.filename/);
});

test("Publicページは外部moduleとページ別Profile取得先を使う", async ()=>{
    const home = await read("apps/web/index.html");
    const about = await read("apps/web/about/index.html");
    const rules = await read("apps/web/trpg/rules/index.html");
    const game = await read("apps/web/game/index.html");

    assert.match(home, /data-profile-data-url="\.\/data\/public-profile\.json"/);
    assert.match(home, /src="\.\/js\/profileApi\.js"/);
    assert.match(about, /data-profile-data-url="\.\.\/data\/public-profile\.json"/);
    assert.match(about, /src="\.\.\/js\/profileApi\.js"/);
    assert.match(rules, /src="\.\/js\/rules\.js"/);
    assert.match(game, /src="\.\/js\/game\.js"/);

    [home, about, rules, game].forEach(html=>{
        assert.doesNotMatch(html, /<script\s+type="module"\s*>/);
    });
});

test("全Public Export画面に固定名と配置先が表示される", async ()=>{
    const contracts = [
        [
            "apps/admin/profile/index.html",
            "public-profile.json",
            "apps/web/data/public-profile.json"
        ],
        [
            "apps/admin/trpg/index.html",
            "public-scenarios.json",
            "apps/web/trpg/data/public-scenarios.json"
        ],
        [
            "apps/admin/trpg/rules/index.html",
            "house-rules.json",
            "apps/web/trpg/rules/data/house-rules.json"
        ],
        [
            "apps/admin/game/index.html",
            "public-games.json",
            "apps/web/game/data/public-games.json"
        ]
    ];

    for(const [file, filename, destination] of contracts){
        const html = await read(file);
        assert.ok(html.includes(filename), `${file}: filename`);
        assert.ok(html.includes(destination), `${file}: destination`);
        assert.ok(html.includes("Publicには配置しないでください"), `${file}: backup warning`);
    }
});

test("全Public Export処理が固定名と配置先を完了表示する", async ()=>{
    const contracts = [
        [
            "apps/admin/js/features/profile/profilePublicExport.js",
            "public-profile.json",
            "apps/web/data/public-profile.json"
        ],
        [
            "apps/admin/js/features/trpg/scenarios/scenarioPublicExport.js",
            "public-scenarios.json",
            "apps/web/trpg/data/public-scenarios.json"
        ],
        [
            "apps/admin/js/features/trpg/rules/rulesPublicExport.js",
            "house-rules.json",
            "apps/web/trpg/rules/data/house-rules.json"
        ],
        [
            "apps/admin/js/features/game/gamePublicExport.js",
            "public-games.json",
            "apps/web/game/data/public-games.json"
        ]
    ];

    for(const [file, filename, destination] of contracts){
        const source = await read(file);
        assert.ok(source.includes(filename), `${file}: filename`);
        assert.ok(source.includes(destination), `${file}: destination`);
        assert.match(source, /showMessage\s*\(/, `${file}: completion message`);
    }
});

test("Admin Hubと管理ナビの順序が統一されている", async ()=>{
    const expectedOrder = [
        "Admin Hub",
        "TRPG Scenario",
        "House Rules",
        "Profile / Links",
        "Game",
        "Tools",
        "Notes"
    ];
    const pages = [
        "apps/admin/trpg/index.html",
        "apps/admin/trpg/rules/index.html",
        "apps/admin/profile/index.html",
        "apps/admin/game/index.html"
    ];

    for(const file of pages){
        const html = await read(file);
        const nav = html.match(/<nav class="header-nav"[\s\S]*?<\/nav>/)?.[0] || "";
        const positions = expectedOrder.map(label=>nav.indexOf(label));
        assert.ok(positions.every(position=>position >= 0), `${file}: labels`);
        assert.deepEqual(positions, [...positions].sort((a, b)=>a - b), `${file}: order`);
        assert.match(html, /<span class="nav-item is-disabled" aria-disabled="true">Tools<\/span>/);
        assert.match(html, /<span class="nav-item is-disabled" aria-disabled="true">Notes<\/span>/);
    }

    const hub = await read("apps/admin/index.html");
    const hubOrder = expectedOrder.slice(1).map(label=>hub.indexOf(`<h3>${label}</h3>`));
    assert.deepEqual(hubOrder, [...hubOrder].sort((a, b)=>a - b));
});

test("Admin Game画面に重複したid属性がない", async ()=>{
    const html = await read("apps/admin/game/index.html");
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);

    assert.equal(new Set(ids).size, ids.length);
});

test("アプリコードにinnerHTMLと存在しないsetProfile参照がない", async ()=>{
    const files = await collectSourceFiles(new URL("apps/", ROOT));

    for(const file of files){
        const source = await readFile(file, "utf8");
        assert.doesNotMatch(source, /\binnerHTML\b/, file);
        assert.doesNotMatch(source, /\bsetProfile\b/, file);
    }
});

test("Public Profile JSONが所定の場所にあり形式が正しい", async ()=>{
    const payload = JSON.parse(
        await read("apps/web/data/public-profile.json")
    );

    assert.equal(payload.module, "site");
    assert.equal(payload.exportType, "public-profile");
    assert.ok(payload.profile && typeof payload.profile === "object");
    assert.ok(Array.isArray(payload.profile.links));
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

async function collectSourceFiles(directory){
    const entries = await readdir(directory, {
        withFileTypes: true
    });
    const files = [];

    for(const entry of entries){
        const path = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);

        if(entry.isDirectory()){
            files.push(...await collectSourceFiles(path));
        }else if([".html", ".js"].includes(extname(entry.name))){
            files.push(path);
        }
    }

    return files;
}
