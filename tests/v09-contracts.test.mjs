import test from "node:test";
import assert from "node:assert/strict";
import {
    readFile,
    readdir
} from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

test("TRPG年齢区分UIは全年齢 / R18の2択", async ()=>{
    const adminView = await read("apps/admin/js/features/trpg/scenarios/scenarioEditorView.js");
    const publicPage = await read("apps/web/creators/chikage/trpg/scenarios/index.html");
    const rulesPage = await read("apps/web/creators/chikage/trpg/rules/index.html");

    [adminView, publicPage, rulesPage].forEach(source=>{
        assert.doesNotMatch(source, />\s*R18G\s*</i);
    });

    [adminView, publicPage].forEach(source=>{
        assert.match(source, /"all",\s*"全年齢"|<option value="all">全年齢<\/option>/);
        assert.match(source, /"r18",\s*"R18"|<option value="r18">R18<\/option>/);
        assert.doesNotMatch(source, /value="r18g"|\"r18g\"/i);
    });
});

test("Public Scenario JSONのratingはall / r18だけ", async ()=>{
    const data = JSON.parse(
        await read("apps/web/data/creators/chikage/trpg/public-scenarios.json")
    );

    data.scenarios.forEach(scenario=>{
        assert.ok(
            ["all", "r18"].includes(scenario.rating),
            `${scenario.id}: ${scenario.rating}`
        );
    });
});

test("現行READMEにAdmin・Public・自動公開の正本境界が記載されている", async ()=>{
    const readme = await read("README.md");

    [
        "Current architecture",
        "Supabase CMS",
        "GitHub Pages",
        "Publication",
        "Public snapshot targets",
        "Admin専用情報はPublicへ出しません",
        "npm run check",
        "npm run build:public"
    ].forEach(text=>assert.ok(readme.includes(text), text));

    assert.match(readme, /古い互換URL、旧Studio\/Desktop、旧Creator\/TRPG入口は維持しません/);
    assert.match(readme, /Public buildは`dist\/`を作り直し、Public siteと隔離された`\/admin\/`管理ルートをPages artifactへ組み立てます/);
    assert.doesNotMatch(readme, /apps\/admin\/ は公開対象に含まれません/);
});

test("Public配下のJSONは現行の公開用ファイルだけ", async ()=>{
    const jsonFiles = await collectJsonFiles(
        new URL("apps/web/", ROOT)
    );

    [
        "data/public-home.json",
        "data/public-brand.json",
        "data/public-creators.json",
        "data/public-profile.json",
        "game/data/public-games.json",
        "notes/data/public-notes.json",
        "tools/data/public-tools.json",
        "data/creators/chikage/trpg/public-scenarios.json",
        "data/creators/chikage/trpg/house-rules.json"
    ].forEach(file => {
        assert.ok(jsonFiles.includes(file), file);
    });
    assert.equal(
        jsonFiles.some(file => file.toLowerCase().includes("backup")),
        false
    );
});

test("管理用BackupディレクトリはGit管理から除外される", async ()=>{
    const gitignore = await read(".gitignore");
    assert.match(gitignore, /^\/?backup\/$/m);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

async function collectJsonFiles(directory, prefix = ""){
    const entries = await readdir(directory, {
        withFileTypes: true
    });
    const files = [];

    for(const entry of entries){
        const path = `${prefix}${entry.name}`;

        if(entry.isDirectory()){
            files.push(...await collectJsonFiles(
                new URL(`${entry.name}/`, directory),
                `${path}/`
            ));
        }else if(entry.name.toLowerCase().endsWith(".json")){
            files.push(path);
        }
    }

    return files;
}
