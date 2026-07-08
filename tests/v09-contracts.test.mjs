import test from "node:test";
import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

test("TRPG年齢区分UIは全年齢 / R18の2択", async ()=>{
    const pages = [
        "apps/admin/trpg/index.html",
        "apps/web/trpg/index.html",
        "apps/web/trpg/rules/index.html"
    ];

    for(const page of pages){
        const html = await read(page);
        assert.doesNotMatch(html, />\s*R18G\s*</i, page);
    }

    const admin = await read(pages[0]);
    const publicPage = await read(pages[1]);
    [admin, publicPage].forEach(html=>{
        assert.match(html, /<option value="all">全年齢<\/option>/);
        assert.match(html, /<option value="r18">R18<\/option>/);
        assert.doesNotMatch(html, /<option value="r18g">/i);
    });
});

test("Public Scenario JSONのratingはall / r18だけ", async ()=>{
    const data = JSON.parse(
        await read("apps/web/trpg/data/public-scenarios.json")
    );

    data.scenarios.forEach(scenario=>{
        assert.ok(
            ["all", "r18"].includes(scenario.rating),
            `${scenario.id}: ${scenario.rating}`
        );
    });
});

test("v0.9文書に実装済みモジュールと公開境界が記載されている", async ()=>{
    const readme = await read("README.md");

    [
        "v0.9 Preview",
        "Tools",
        "Notes",
        "localStorage",
        "Public Export",
        "Backup",
        "apps/admin/ は公開対象に含まれません"
    ].forEach(text=>assert.ok(readme.includes(text), text));
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
