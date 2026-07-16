import test from "node:test";
import assert from "node:assert/strict";
import {
    readFile,
    readdir
} from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

test("TRPG年齢区分UIは全年齢 / R18の2択", async ()=>{
    const adminView = await read("apps/admin/js/features/trpg/scenarios/scenarioEditorView.js");
    const publicPage = await read("apps/web/creators/chikage/trpg/index.html");
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

test("v1.0文書に実装済みモジュールと公開境界が記載されている", async ()=>{
    const readme = await read("README.md");

    [
        "v1.0",
        "Tools",
        "Notes",
        "localStorage",
        "Public Export",
        "Backup",
        "apps/admin/ は公開対象に含まれません"
    ].forEach(text=>assert.ok(readme.includes(text), text));
});

test("Public配下のJSONは公開用ファイルだけ", async ()=>{
    const jsonFiles = await collectJsonFiles(
        new URL("apps/web/", ROOT)
    );

    [
        "data/public-creators.json",
        "data/public-home.json",
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
