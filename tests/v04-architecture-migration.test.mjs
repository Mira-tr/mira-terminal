import test from "node:test";
import assert from "node:assert/strict";
import {
    access,
    readFile
} from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

const CURRENT_TRPG = Object.freeze({
    publicHtml: "apps/web/creators/chikage/trpg/index.html",
    rulesHtml: "apps/web/creators/chikage/trpg/rules/index.html",
    publicJs: "apps/web/creators/chikage/trpg/js/app.js",
    publicCss: "apps/web/creators/chikage/trpg/css/style.css",
    publicAsset: "apps/web/creators/chikage/trpg/assets/trpg-library.png",
    oldPublicHtml: "apps/web/trpg/index.html",
    oldRulesHtml: "apps/web/trpg/rules/index.html",
    publicJson: "apps/web/data/creators/chikage/trpg/public-scenarios.json",
    rulesJson: "apps/web/data/creators/chikage/trpg/house-rules.json",
    oldPublicJson: "apps/web/trpg/data/public-scenarios.json",
    oldRulesJson: "apps/web/trpg/rules/data/house-rules.json",
    adminHtml: "apps/admin/trpg/index.html",
    adminRulesHtml: "apps/admin/trpg/rules/index.html",
    adminFeatureRoot: "apps/admin/js/features/trpg/",
    registry: "apps/admin/js/features/modules/moduleRegistry.js",
    build: "scripts/build-public.mjs"
});

const V04_CONTRACT = Object.freeze({
    ownerCreatorId: "creator-chikage",
    moduleId: "module-creator-chikage-trpg",
    publicUrl: "/creators/chikage/trpg/",
    rulesUrl: "/creators/chikage/trpg/rules/",
    adminLocationLabel: "Creators > 千景 > TRPG",
    dataRoot: "apps/web/data/creators/chikage/trpg/",
    scenariosData: "apps/web/data/creators/chikage/trpg/public-scenarios.json",
    rulesData: "apps/web/data/creators/chikage/trpg/house-rules.json",
    assetsRoot: "apps/web/assets/creators/chikage/trpg/",
    sourceRoot: "apps/web/creators/chikage/trpg/",
    forbiddenSharedDataRoot: "apps/web/data/trpg/",
    forbiddenSharedAssetsRoot: "apps/web/assets/trpg/",
    oldUrls: Object.freeze(["/trpg/", "/trpg/rules/"]),
    oldUrlPolicy: "redirect-only-during-migration",
    jsonAuthority: "single-creator-source"
});

const LOCAL_STORAGE_KEYS = Object.freeze([
    "mira_terminal_scenarios",
    "mira_terminal_tags",
    "mira_terminal_authors",
    "mira_terminal_profile",
    "mira_terminal_creators",
    "mira_terminal_rules",
    "mira_terminal_games",
    "mira_terminal_tools",
    "mira_terminal_notes",
    "mira_terminal_home_config",
    "mira_terminal_last_backup_at",
    "mira_terminal_trpg_favorites",
    "mira-terminal-theme"
]);

test("Phase D records canonical TRPG source and JSON authority under Chikage", async ()=>{
    for(const [key, file] of Object.entries(CURRENT_TRPG)){
        if(file.endsWith("/") || key === "oldPublicJson" || key === "oldRulesJson"){
            continue;
        }
        await exists(file);
    }

    await rejectsAccess(CURRENT_TRPG.oldPublicJson);
    await rejectsAccess(CURRENT_TRPG.oldRulesJson);

    await exists(`${CURRENT_TRPG.adminFeatureRoot}scenarios/scenarioPublicExport.js`);
    await exists(`${CURRENT_TRPG.adminFeatureRoot}rules/rulesPublicExport.js`);

    const moduleRegistry = await read(CURRENT_TRPG.registry);
    const build = await read(CURRENT_TRPG.build);
    const publicConfig = await read("apps/web/creators/chikage/trpg/js/config.js");
    const rulesScript = await read("apps/web/creators/chikage/trpg/rules/js/rules.js");

    assert.match(moduleRegistry, /id:\s*"module-trpg"/);
    assert.match(moduleRegistry, /ownerCreatorId:\s*"creator-chikage"/);
    assert.match(moduleRegistry, /publicPath:\s*"\/creators\/chikage\/trpg\/"/);
    assert.match(moduleRegistry, /publicPath:\s*"\/creators\/chikage\/trpg\/rules\/"/);
    assert.match(moduleRegistry, /adminPath:\s*"\.\.\/trpg\/"/);

    assert.match(build, /"data\/creators\/chikage\/trpg\/public-scenarios\.json"/);
    assert.match(build, /"data\/creators\/chikage\/trpg\/house-rules\.json"/);
    assert.doesNotMatch(build, /"trpg\/data\/public-scenarios\.json"/);
    assert.doesNotMatch(build, /"trpg\/rules\/data\/house-rules\.json"/);
    assert.match(publicConfig, /\.\.\/\.\.\/\.\.\/\.\.\/data\/creators\/chikage\/trpg\/public-scenarios\.json/);
    assert.match(rulesScript, /\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/data\/creators\/chikage\/trpg\/house-rules\.json/);
});

test("Phase C old TRPG URLs are redirect pages only", async ()=>{
    const scenarioRedirect = await read(CURRENT_TRPG.oldPublicHtml);
    const rulesRedirect = await read(CURRENT_TRPG.oldRulesHtml);

    assert.match(scenarioRedirect, /http-equiv="refresh" content="0; url=\.\.\/creators\/chikage\/trpg\/"/);
    assert.match(scenarioRedirect, /rel="canonical" href="https:\/\/relmua\.com\/creators\/chikage\/trpg\/"/);
    assert.match(scenarioRedirect, /location\.replace\("\.\.\/creators\/chikage\/trpg\/" \+ location\.search \+ location\.hash\)/);
    assert.doesNotMatch(scenarioRedirect, /keywordInput|scenarioList|\.\/js\/app\.js/);

    assert.match(rulesRedirect, /http-equiv="refresh" content="0; url=\.\.\/\.\.\/creators\/chikage\/trpg\/rules\/"/);
    assert.match(rulesRedirect, /rel="canonical" href="https:\/\/relmua\.com\/creators\/chikage\/trpg\/rules\/"/);
    assert.match(rulesRedirect, /location\.replace\("\.\.\/\.\.\/creators\/chikage\/trpg\/rules\/" \+ location\.search \+ location\.hash\)/);
    assert.doesNotMatch(rulesRedirect, /rulesApp|\.\/js\/rules\.js/);
});

test("Phase C internal Creator links point at canonical TRPG URL", async ()=>{
    const pages = [
        "apps/web/creators/chikage/index.html",
        "apps/web/creators/chikage/profile/index.html",
        "apps/web/creators/chikage/works/index.html",
        "apps/web/creators/chikage/contact/index.html"
    ];

    const combined = (await Promise.all(pages.map(read))).join("\n");

    assert.match(combined, /href="\.\/trpg\/"|href="\.\.\/trpg\/"/);
    assert.match(combined, /href="\.\/trpg\/rules\/"|href="\.\.\/trpg\/rules\/"/);
    assert.doesNotMatch(combined, /href="\.\.\/\.\.\/trpg\/|href="\.\.\/\.\.\/\.\.\/trpg\//);
});

test("Phase C compatibility keys and backup/export identity are preserved", async ()=>{
    const store = await read("apps/admin/js/store.js");
    const theme = await read("apps/web/js/theme.js");
    const publicConfig = await read("apps/web/creators/chikage/trpg/js/config.js");

    for(const key of LOCAL_STORAGE_KEYS){
        assert.ok(
            store.includes(key) ||
            theme.includes(key) ||
            publicConfig.includes(key),
            key
        );
    }

    const scenarioExport = await read("apps/admin/js/features/trpg/scenarios/scenarioPublicExport.js");
    const rulesExport = await read("apps/admin/js/features/trpg/rules/rulesPublicExport.js");
    const rulesBackup = await read("apps/admin/js/features/trpg/rules/rulesBackup.js");

    assert.match(scenarioExport, /exportType:\s*"public-scenarios"/);
    assert.match(scenarioExport, /PUBLIC_EXPORT_FILENAME\s*=\s*"public-scenarios\.json"/);
    assert.match(scenarioExport, /PUBLIC_EXPORT_DESTINATION\s*\=\s*"apps\/web\/data\/creators\/chikage\/trpg\/public-scenarios\.json"/);
    assert.match(rulesExport, /const EXPORT_TYPE\s*=\s*"house-rules"/);
    assert.match(rulesExport, /PUBLIC_EXPORT_FILENAME\s*=\s*"house-rules\.json"/);
    assert.match(rulesExport, /PUBLIC_EXPORT_DESTINATION\s*\=\s*"apps\/web\/data\/creators\/chikage\/trpg\/house-rules\.json"/);
    assert.match(rulesBackup, /const BACKUP_TYPE\s*=\s*"house-rules"/);
});

test("Phase D Public JSON schemas remain parseable and are not duplicated", async ()=>{
    const creators = JSON.parse(await read("apps/web/data/public-creators.json"));
    const scenarios = JSON.parse(await read(CURRENT_TRPG.publicJson));
    const rules = JSON.parse(await read(CURRENT_TRPG.rulesJson));

    assert.equal(creators.exportType, "public-creators");
    assert.equal(creators.primaryCreatorId, "creator-chikage");
    assert.ok(creators.creators.some(creator=>creator.id === V04_CONTRACT.ownerCreatorId));

    assert.equal(scenarios.exportType, "public-scenarios");
    assert.ok(Array.isArray(scenarios.scenarios));
    for(const scenario of scenarios.scenarios){
        assert.equal("memo" in scenario, false);
        assert.equal("status" in scenario, false);
        assert.equal("createdAt" in scenario, false);
        assert.equal("updatedAt" in scenario, false);
    }

    assert.equal(rules.exportType, "house-rules");
    assert.ok(Array.isArray(rules.systems));
    await rejectsAccess(CURRENT_TRPG.oldPublicJson);
    await rejectsAccess(CURRENT_TRPG.oldRulesJson);
});

test("v0.4 architecture contract uses Creator JSON authority without old fallback", ()=>{
    assert.equal(V04_CONTRACT.ownerCreatorId, "creator-chikage");
    assert.equal(V04_CONTRACT.moduleId, "module-creator-chikage-trpg");
    assert.equal(V04_CONTRACT.publicUrl, "/creators/chikage/trpg/");
    assert.equal(V04_CONTRACT.rulesUrl, "/creators/chikage/trpg/rules/");
    assert.equal(V04_CONTRACT.adminLocationLabel, "Creators > 千景 > TRPG");
    assert.equal(V04_CONTRACT.dataRoot, "apps/web/data/creators/chikage/trpg/");
    assert.equal(V04_CONTRACT.scenariosData, `${V04_CONTRACT.dataRoot}public-scenarios.json`);
    assert.equal(V04_CONTRACT.rulesData, `${V04_CONTRACT.dataRoot}house-rules.json`);
    assert.equal(V04_CONTRACT.assetsRoot, "apps/web/assets/creators/chikage/trpg/");
    assert.equal(V04_CONTRACT.sourceRoot, "apps/web/creators/chikage/trpg/");

    assert.equal(V04_CONTRACT.oldUrlPolicy, "redirect-only-during-migration");
    assert.equal(V04_CONTRACT.jsonAuthority, "single-creator-source");
    assert.ok(V04_CONTRACT.oldUrls.includes("/trpg/"));
    assert.ok(V04_CONTRACT.oldUrls.includes("/trpg/rules/"));

    assert.notEqual(V04_CONTRACT.publicUrl, "/trpg/");
    assert.notEqual(V04_CONTRACT.rulesUrl, "/trpg/rules/");
    assert.notEqual(V04_CONTRACT.moduleId, "module-trpg");
    assert.equal(V04_CONTRACT.scenariosData.includes("apps/web/trpg/data/"), false);
    assert.equal(V04_CONTRACT.rulesData.includes("apps/web/trpg/rules/data/"), false);
    assert.equal(V04_CONTRACT.dataRoot.startsWith(V04_CONTRACT.forbiddenSharedDataRoot), false);
    assert.equal(V04_CONTRACT.assetsRoot.startsWith(V04_CONTRACT.forbiddenSharedAssetsRoot), false);
});

async function exists(path){
    await access(new URL(path, ROOT));
}

async function rejectsAccess(path){
    await assert.rejects(
        access(new URL(path, ROOT)),
        error => error?.code === "ENOENT"
    );
}

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}