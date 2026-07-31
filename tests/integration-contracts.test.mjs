import test from "node:test";
import assert from "node:assert/strict";
import {
    access,
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
    const creatorStore = await import(
        "../apps/admin/js/features/creators/creatorStore.js"
    );

    assert.equal(typeof gameStore.getGames, "function");
    assert.equal(typeof profileBackup.importBackupProfile, "function");
    assert.equal(typeof creatorStore.getCreators, "function");
});

test("Scenario Public Exportのファイル名は固定されている", async ()=>{
    const source = await read("apps/admin/js/features/trpg/scenarios/scenarioPublicExport.js");

    assert.match(
        source,
        /PUBLIC_EXPORT_FILENAME\s*=\s*"public-scenarios\.json"/
    );
    assert.doesNotMatch(source, /options\.filename/);
});

test("Publicページは外部moduleとページ別データ取得先を使う", async ()=>{
    const creatorCompat = await read("apps/web/creator/index.html");
    const creators = await read("apps/web/creators/index.html");
    const creatorDetail = await read("apps/web/creators/chikage/index.html");
    const profileApi = await read("apps/web/js/profileApi.js");
    const rules = await read("apps/web/creators/chikage/trpg/rules/index.html");
    const projects = await read("apps/web/projects/index.html");
    const projectsScript = await read("apps/web/projects/js/projects.js");
    const gameCompat = await read("apps/web/game/index.html");

    assert.match(creatorCompat, /http-equiv="refresh" content="0; url=\.\.\/creators\/chikage\/"/);
    assert.match(creatorCompat, /href="\.\.\/creators\/chikage\/"/);
    assert.match(creators, /data-creators-data-url="\.\.\/data\/public-creators\.json"/);
    assert.match(creatorDetail, /data-creators-data-url="\.\.\/\.\.\/data\/public-creators\.json"/);
    assert.match(creatorDetail, /data-creator-slug="chikage"/);
    assert.doesNotMatch(creatorDetail, /profileApi\.js/);
    assert.match(profileApi, /dataset\.preserveText\s*!==\s*"true"/);
    assert.match(rules, /src="\.\/js\/rules\.js"/);
    assert.match(projects, /src="\.\/js\/projects\.js"/);
    assert.match(projectsScript, /\.\.\/game\/data\/public-games\.json/);
    assert.match(gameCompat, /http-equiv="refresh" content="0; url=\.\.\/projects\/"/);
    assert.match(gameCompat, /href="\.\.\/projects\/"/);

    [creatorCompat, creators, creatorDetail, rules, projects, gameCompat].forEach(html=>{
        assert.doesNotMatch(html, /<script\s+type="module"\s*>/);
    });
});

test("全Public Export画面に固定名と配置先が表示される", async ()=>{
    const contracts = [
        [
            "apps/admin/creators/index.html",
            "public-creators.json",
            "apps/web/data/public-creators.json"
        ],
        [
            "apps/admin/profile/index.html",
            "public-profile.json",
            "apps/web/data/public-profile.json"
        ],
        [
            "apps/admin/trpg/index.html",
            "public-scenarios.json",
            "apps/web/data/creators/chikage/trpg/public-scenarios.json"
        ],
        [
            "apps/admin/trpg/rules/index.html",
            "house-rules.json",
            "apps/web/data/creators/chikage/trpg/house-rules.json"
        ],
        [
            "apps/admin/game/index.html",
            "public-games.json",
            "apps/web/game/data/public-games.json"
        ],
        [
            "apps/admin/tools/index.html",
            "public-tools.json",
            "apps/web/tools/data/public-tools.json"
        ],
        [
            "apps/admin/notes/index.html",
            "public-notes.json",
            "apps/web/notes/data/public-notes.json"
        ],
        [
            "apps/admin/home/index.html",
            "public-home.json",
            "apps/web/data/public-home.json",
            false
        ]
    ];

    for(const [file, filename, destination, requiresBackupWarning = true] of contracts){
        const html = await read(file);
        if(!requiresBackupWarning){
            assert.ok(html.includes("通常は意識しなくて大丈夫です。"), `${file}: beginner copy`);
            assert.ok(!html.includes(destination), `${file}: hides internal destination`);
            continue;
        }
        assert.ok(html.includes(filename), `${file}: filename`);
        assert.ok(html.includes(destination), `${file}: destination`);
        assert.ok(html.includes("Publicには配置しないでください"), `${file}: backup warning`);
    }
});

test("AdminのExportと並び替えボタン表記が統一されている", async ()=>{
    const pages = [
        "apps/admin/profile/index.html",
        "apps/admin/creators/index.html",
        "apps/admin/trpg/index.html",
        "apps/admin/trpg/rules/index.html",
        "apps/admin/game/index.html",
        "apps/admin/tools/index.html",
        "apps/admin/notes/index.html"
    ];

    for(const page of pages){
        const html = await read(page);
        assert.match(html, />\s*Public Export\s*</, `${page}: Public Export`);
        assert.match(html, />\s*Backup Export\s*</, `${page}: Backup Export`);
        assert.match(html, />\s*Backup Import\s*</, `${page}: Backup Import`);
        assert.doesNotMatch(html, /出力\s*<\/button>|読み込み\s*<\/button>|読込\s*<\/button>/, page);
    }

    const actionSources = [
        await read("apps/admin/js/features/common/simpleCollectionForm.js"),
        await read("apps/admin/js/features/game/gameForm.js"),
        await read("apps/admin/js/features/profile/profileForm.js"),
        await read("apps/admin/js/features/trpg/rules/rulesForm.js")
    ].join("\n");

    assert.match(actionSources, /"上へ"/);
    assert.match(actionSources, /"下へ"/);
    assert.doesNotMatch(actionSources, /"↑"|"↓"|button-ghost/);
});

test("全Public Export処理が固定名と配置先を完了表示する", async ()=>{
    const contracts = [
        [
            "apps/admin/js/features/creators/creatorPublicExport.js",
            "public-creators.json",
            "apps/web/data/public-creators.json"
        ],
        [
            "apps/admin/js/features/profile/profilePublicExport.js",
            "public-profile.json",
            "apps/web/data/public-profile.json"
        ],
        [
            "apps/admin/js/features/trpg/scenarios/scenarioPublicExport.js",
            "public-scenarios.json",
            "apps/web/data/creators/chikage/trpg/public-scenarios.json"
        ],
        [
            "apps/admin/js/features/trpg/rules/rulesPublicExport.js",
            "house-rules.json",
            "apps/web/data/creators/chikage/trpg/house-rules.json"
        ],
        [
            "apps/admin/js/features/game/gamePublicExport.js",
            "public-games.json",
            "apps/web/game/data/public-games.json"
        ],
        [
            "apps/admin/js/features/tools/toolPublicExport.js",
            "public-tools.json",
            "apps/web/tools/data/public-tools.json"
        ],
        [
            "apps/admin/js/features/notes/notePublicExport.js",
            "public-notes.json",
            "apps/web/notes/data/public-notes.json"
        ],
        [
            "apps/admin/js/features/home/homePublicExport.js",
            "public-home.json",
            "apps/web/data/public-home.json"
        ]
    ];

    for(const [file, filename, destination] of contracts){
        const source = await read(file);
        assert.ok(source.includes(filename), `${file}: filename`);
        assert.ok(source.includes(destination), `${file}: destination`);
        assert.match(source, /showToast\s*\(/, `${file}: completion toast`);
    }
});

test("Admin Home keeps canonical Admin sections and Desktop as a secondary capability", async ()=>{
    const html = await read("apps/admin/index.html");
    const nav = html.match(/<nav class="header-nav"[\s\S]*?<\/nav>/)?.[0] || "";
    const shell = await read("apps/admin/js/adminShell.js");
    const registry = await import("../apps/admin/js/features/navigation/adminRouteRegistry.js");

    assert.equal(nav, '<nav class="header-nav" aria-label="Admin navigation"></nav>');
    assert.match(shell, /getAdminPrimaryNavigation/);
    assert.match(shell, /navigationRegistryPromise\s*=\s*import/);
    assert.match(shell, /createPrimaryNavigation/);
    assert.match(shell, /getCurrentAdminSection/);
    assert.match(shell, /navigation\.replaceChildren/);
    assert.match(shell, /aria-current/);
    assert.deepEqual(
        registry.getAdminPrimaryNavigation().map(route => route.label),
        ["Admin Home", "Brand", "Creators", "System", "Desktop機能"]
    );

    for(const route of registry.getAdminPrimaryNavigation()){
        const target = new URL(route.adminHref, new URL("apps/admin/index.html", ROOT));
        const fileTarget = target.pathname.endsWith("/")
            ? new URL("index.html", target)
            : target;
        await access(fileTarget);
    }
});

test("Brand and System labels open matching Admin landing pages", async ()=>{
    const brand = await read("apps/admin/brand/index.html");
    const system = await read("apps/admin/system/index.html");
    const adminPages = await collectSourceFiles(new URL("apps/admin/", ROOT));

    assert.match(brand, /<title>RELMUA Admin \| Brand<\/title>/);
    assert.match(brand, /href="\.\.\/home\/"/);
    assert.match(brand, /href="\.\.\/game\/"/);
    assert.match(brand, /href="\.\.\/tools\/"/);
    assert.match(brand, /href="\.\.\/notes\/"/);
    assert.match(system, /<title>RELMUA Admin \| System<\/title>/);
    for(const route of ["validation", "export", "backup", "import", "settings", "publish", "logs", "guide"]){
        assert.match(system, new RegExp(`href="\\.\\/${route}\\/"`), route);
    }

    for(const page of adminPages.filter(file => file.pathname.endsWith(".html"))){
        const html = await readFile(page, "utf8");
        assert.doesNotMatch(html, /RELMUA Admin Admin|Studio Hub|Browser Admin/, page.pathname);
        if(html.includes("adminShell.js")){
            assert.match(html, /<script src="[^"]*adminShell\.js"><\/script>/, page.pathname);
            assert.match(html, /<nav class="header-nav" aria-label="Admin navigation"><\/nav>/, page.pathname);
            const headerNavigation = html.match(/<nav class="header-nav"[\s\S]*?<\/nav>/)?.[0] || "";
            assert.doesNotMatch(headerNavigation, /<a\b/, page.pathname);
        }
    }
});

test("Creators Workspace separates personal sites and owner-scoped features", async ()=>{
    const html = await read("apps/admin/creators/index.html");
    const page = await read("apps/admin/js/pages/creatorsPage.js");
    const registry = await read("apps/admin/js/features/creators/creatorSiteRegistry.js");

    assert.match(html, /id="creatorWorkspaces"/);
    assert.match(html, /id="creatorsListTitle"/);
    assert.match(page, /getCreatorSites/);
    assert.match(page, /個人サイトを見る/);
    assert.match(page, /site\.features\.map/);
    assert.match(registry, /creator-chikage[\s\S]*TRPGシナリオ[\s\S]*ハウスルール/);
    assert.match(registry, /creator-asagiri[\s\S]*features:\s*Object\.freeze\(\[\]\)/);
    assert.match(registry, /creator-chikage[\s\S]*desktopPath:\s*"\.\.\/admin\/creators\/\?creator=creator-chikage#formTitle"/);
    assert.match(registry, /creator-asagiri[\s\S]*desktopPath:\s*"\.\.\/admin\/creators\/\?creator=creator-asagiri#formTitle"/);
    assert.match(page, /initialCreatorId:\s*new URLSearchParams\(window\.location\.search\)\.get\("creator"\)/);
    assert.match(page, /onEditStateChange:\s*syncCreatorRoute/);
    assert.match(page, /window\.history\.replaceState/);
    assert.match(page, /section\.adminPath/);
    assert.match(page, /site\.sections\.forEach/);
    assert.match(page, /getCreatorSiteStatusLabel/);
    assert.match(page, /createCreatorWorkspaces\(getCreators\(\), getCreatorSites\(\)\)/);
    assert.match(page, /if\(site\.publicPath\)/);
    assert.match(page, /validateBeforeSave:\s*validateCreatorBeforeSave/);
    assert.match(page, /creatorWorks/);
    assert.doesNotMatch(registry, /createSection\("chikage-profile"/);
    assert.doesNotMatch(registry, /createSection\([^)]*"\.\.\/profile\/"/);
});

test("Admin pages expose current-location breadcrumbs", async ()=>{
    const pages = [
        ["apps/admin/index.html", ["RELMUA Admin"]],
        ["apps/admin/brand/index.html", ["RELMUA Admin", "Brand"]],
        ["apps/admin/home/index.html", ["RELMUA Admin", "Brand", "Home"]],
        ["apps/admin/creators/index.html", ["RELMUA Admin", "Creators"]],
        ["apps/admin/game/index.html", ["RELMUA Admin", "Brand", "Projects"]],
        ["apps/admin/tools/index.html", ["RELMUA Admin", "Brand", "Tools"]],
        ["apps/admin/notes/index.html", ["RELMUA Admin", "Brand", "Notes"]],
        ["apps/admin/profile/index.html", ["RELMUA Admin", "Creators", "千景", "Profile"]],
        ["apps/admin/trpg/index.html", ["RELMUA Admin", "Creators", "千景", "TRPG", "Scenario Library"]],
        ["apps/admin/trpg/rules/index.html", ["RELMUA Admin", "Creators", "千景", "TRPG", "House Rules"]],
        ["apps/admin/system/index.html", ["RELMUA Admin", "System"]]
    ];

    for(const [file, labels] of pages){
        const html = await read(file);
        const breadcrumb = html.match(/<nav class="admin-breadcrumb"[\s\S]*?<\/nav>/)?.[0] || "";
        labels.forEach(label => {
            assert.ok(breadcrumb.includes(label), `${file}: ${label}`);
        });
        assert.match(breadcrumb, /aria-current="page"/, `${file}: current`);
    }
});

test("Admin page entry scripts that use ES modules are loaded as modules", async ()=>{
    const pages = [
        ["apps/admin/index.html", "./js/pages/adminDashboardPage.js"],
        ["apps/admin/creators/index.html", "../js/pages/creatorsPage.js"],
        ["apps/admin/game/index.html", "../js/pages/gamePage.js"],
        ["apps/admin/home/index.html", "../js/pages/homePage.js"],
        ["apps/admin/notes/index.html", "../js/pages/notesPage.js"],
        ["apps/admin/profile/index.html", "../js/pages/profilePage.js"],
        ["apps/admin/tools/index.html", "../js/pages/toolsPage.js"],
        ["apps/admin/trpg/index.html", "../js/app.js"],
        ["apps/admin/trpg/rules/index.html", "../../js/pages/trpgRulesPage.js"],
        ["apps/admin/system/backup/index.html", "../../js/pages/systemPage.js"],
        ["apps/admin/system/export/index.html", "../../js/pages/systemPage.js"],
        ["apps/admin/system/guide/index.html", "../../js/pages/systemPage.js"],
        ["apps/admin/system/import/index.html", "../../js/pages/systemPage.js"],
        ["apps/admin/system/logs/index.html", "../../js/pages/systemPage.js"],
        ["apps/admin/system/publish/index.html", "../../js/pages/systemPage.js"],
        ["apps/admin/system/settings/index.html", "../../js/pages/systemPage.js"],
        ["apps/admin/system/validation/index.html", "../../js/pages/systemPage.js"]
    ];

    for(const [pagePath, scriptPath] of pages){
        const html = await read(pagePath);
        assert.match(
            html,
            new RegExp(`<script type="module" src="${escapeRegExp(scriptPath)}"></script>`),
            pagePath
        );
    }
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
    assert.equal(payload.profile.displayName, "千景");
    assert.ok(payload.profile.bio.includes("KP / PL"));
    assert.ok(Array.isArray(payload.profile.activities));
    assert.ok(payload.profile.activities.length <= 6);
    assert.ok(Array.isArray(payload.profile.links));

    payload.profile.links.forEach(link=>{
        const url = new URL(link.url);
        assert.ok(["http:", "https:"].includes(url.protocol), link.url);
    });
});

test("Public Creators JSONが所定の場所にあり形式が正しい", async ()=>{
    const payload = JSON.parse(
        await read("apps/web/data/public-creators.json")
    );

    assert.equal(payload.app, "RELMUA Terminal");
    assert.equal(payload.brand, "RELMUA");
    assert.equal(payload.module, "creators");
    assert.equal(payload.exportType, "public-creators");
    assert.equal(payload.primaryCreatorId, "creator-chikage");
    assert.ok(Array.isArray(payload.creators));
    assert.equal(payload.creators[0].displayName, "千景");
    assert.equal(payload.creators[0].slug, "chikage");
    assert.equal(payload.creators[1].displayName, "朝霧");
    assert.equal(payload.creators[1].slug, "asagiri");
    assert.equal(new Set(payload.creators.map(creator => creator.id)).size, payload.creators.length);
    assert.equal(new Set(payload.creators.map(creator => creator.slug)).size, payload.creators.length);

    payload.creators.forEach(creator => {
        assert.equal("status" in creator, false);
        creator.links.forEach(link => {
            assert.equal("status" in link, false);
            const url = new URL(link.url);
            assert.ok(["http:", "https:"].includes(url.protocol), link.url);
        });
    });
});

test("PublicのCreator導線は活動者ページとして分離されている", async ()=>{
    const sources = [
        await read("apps/web/index.html"),
        await read("apps/web/about/index.html"),
        await read("apps/web/creator/index.html"),
        await read("apps/web/creators/index.html"),
        await read("apps/web/creators/chikage/index.html"),
        await read("apps/web/creators/asagiri/index.html")
    ].join("\n");

    assert.match(sources, /千景/);
    assert.match(sources, /Creator/);
    assert.match(sources, /House Rules|ハウスルール/);
    assert.doesNotMatch(sources, /TRPGシナリオ制作者|シナリオ制作者|TRPG制作/);
    assert.doesNotMatch(sources, /Coming Soon/);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

function escapeRegExp(value){
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
