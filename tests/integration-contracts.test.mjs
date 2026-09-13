import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { extname } from "node:path";

const ROOT = new URL("../", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

async function collectSourceFiles(directory){
    const entries = await readdir(directory, { withFileTypes: true });
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

test("current Public surfaces use canonical routes and data sources", async ()=>{
    const creators = await read("apps/web/creators/index.html");
    const creatorDetail = await read("apps/web/creators/chikage/index.html");
    const rules = await read("apps/web/creators/chikage/trpg/rules/index.html");
    const projects = await read("apps/web/projects/index.html");
    const projectsScript = await read("apps/web/projects/js/projects.js");

    assert.match(creators, /public-creators\.json/);
    assert.match(creatorDetail, /data-creator-slug="chikage"/);
    assert.match(rules, /src="\.\/js\/rules\.js"/);
    assert.match(projects, /src="\.\/js\/projects\.js"/);
    assert.match(projectsScript, /\.\.\/game\/data\/public-games\.json/);
});

test("obsolete compatibility surfaces are absent", async ()=>{
    for(const path of [
        "apps/studio",
        "apps/web/creator",
        "apps/web/trpg",
        "apps/web/creators/chikage/legacy",
        "apps/web/game/index.html"
    ]){
        await assert.rejects(access(new URL(path, ROOT)), undefined, path);
    }
});

test("Admin navigation contains only current Admin routes", async ()=>{
    const registry = await import("../apps/admin/js/features/navigation/adminRouteRegistry.js");
    assert.deepEqual(
        registry.getAdminPrimaryNavigation().map(route => route.label),
        ["ホーム", "サイト編集", "活動者", "サイト運用"]
    );
    assert.equal(registry.getAdminRoute("desktop"), null);
    for(const route of registry.getAdminPrimaryNavigation()){
        const target = new URL(route.adminHref, new URL("apps/admin/index.html", ROOT));
        const fileTarget = target.pathname.endsWith("/") ? new URL("index.html", target) : target;
        await access(fileTarget);
    }
});

test("Creator registry has no Studio/Desktop compatibility fields", async ()=>{
    const source = await read("apps/admin/js/features/creators/creatorSiteRegistry.js");
    assert.doesNotMatch(source, /desktopPath|workspaceDesktopPath|toStudioAdminPath|studio/i);
    assert.match(source, /creator-chikage/);
    assert.match(source, /TRPGシナリオ/);
    assert.match(source, /ハウスルール/);
});

test("active Admin module references resolve", async ()=>{
    const gameStore = await import("../apps/admin/js/features/game/gameStore.js");
    const profileBackup = await import("../apps/admin/js/features/profile/profileBackup.js");
    const creatorStore = await import("../apps/admin/js/features/creators/creatorStore.js");
    assert.equal(typeof gameStore.getGames, "function");
    assert.equal(typeof profileBackup.importBackupProfile, "function");
    assert.equal(typeof creatorStore.getCreators, "function");
});

test("Public export contracts still point at current fixed targets", async ()=>{
    const contracts = [
        ["apps/admin/js/features/creators/creatorPublicExport.js", "public-creators.json", "apps/web/data/public-creators.json"],
        ["apps/admin/js/features/profile/profilePublicExport.js", "public-profile.json", "apps/web/data/public-profile.json"],
        ["apps/admin/js/features/trpg/scenarios/scenarioPublicExport.js", "public-scenarios.json", "apps/web/data/creators/chikage/trpg/public-scenarios.json"],
        ["apps/admin/js/features/trpg/rules/rulesPublicExport.js", "house-rules.json", "apps/web/data/creators/chikage/trpg/house-rules.json"],
        ["apps/admin/js/features/game/gamePublicExport.js", "public-games.json", "apps/web/game/data/public-games.json"],
        ["apps/admin/js/features/tools/toolPublicExport.js", "public-tools.json", "apps/web/tools/data/public-tools.json"],
        ["apps/admin/js/features/notes/notePublicExport.js", "public-notes.json", "apps/web/notes/data/public-notes.json"],
        ["apps/admin/js/features/home/homePublicExport.js", "public-home.json", "apps/web/data/public-home.json"]
    ];
    for(const [file, filename, destination] of contracts){
        const source = await read(file);
        assert.ok(source.includes(filename), `${file}: filename`);
        assert.ok(source.includes(destination), `${file}: destination`);
    }
});

test("Public creator data remains public-safe", async ()=>{
    const payload = JSON.parse(await read("apps/web/data/public-creators.json"));
    assert.equal(payload.primaryCreatorId, "creator-chikage");
    assert.ok(Array.isArray(payload.creators));
    assert.equal(payload.creators[0]?.slug, "chikage");
    payload.creators.forEach(creator => {
        assert.equal("status" in creator, false);
        assert.equal("memo" in creator, false);
        assert.equal("createdAt" in creator, false);
        assert.equal("updatedAt" in creator, false);
    });
});

test("application code contains no innerHTML", async ()=>{
    const files = await collectSourceFiles(new URL("apps/", ROOT));
    for(const file of files){
        const source = await readFile(file, "utf8");
        assert.doesNotMatch(source, /\binnerHTML\b/, file.pathname);
    }
});
