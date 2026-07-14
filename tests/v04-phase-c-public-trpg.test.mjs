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
const NEW_TRPG_URL = "https://relmua.com/creators/chikage/trpg/";
const NEW_RULES_URL = "https://relmua.com/creators/chikage/trpg/rules/";
const NEW_OG_IMAGE = "https://relmua.com/assets/creators/chikage/trpg/og-trpg.svg";

test("Phase C canonical TRPG pages live under Chikage with canonical and OGP URLs", async ()=>{
    const scenario = await read("apps/web/creators/chikage/trpg/index.html");
    const rules = await read("apps/web/creators/chikage/trpg/rules/index.html");

    assert.match(scenario, new RegExp(`<link rel="canonical" href="${escapeRegExp(NEW_TRPG_URL)}">`));
    assert.match(scenario, new RegExp(`<meta property="og:url" content="${escapeRegExp(NEW_TRPG_URL)}">`));
    assert.match(scenario, new RegExp(`<meta property="og:image" content="${escapeRegExp(NEW_OG_IMAGE)}">`));
    assert.match(scenario, /<script type="module" src="\.\/js\/app\.js"><\/script>/);
    assert.match(scenario, /href="\.\.\/profile\/"/);
    assert.match(scenario, /href="\.\/rules\/"/);

    assert.match(rules, new RegExp(`<link rel="canonical" href="${escapeRegExp(NEW_RULES_URL)}">`));
    assert.match(rules, new RegExp(`<meta property="og:url" content="${escapeRegExp(NEW_RULES_URL)}">`));
    assert.match(rules, new RegExp(`<meta property="og:image" content="${escapeRegExp(NEW_OG_IMAGE)}">`));
    assert.match(rules, /<script type="module" src="\.\/js\/rules\.js"><\/script>/);
    assert.match(rules, /href="\.\.\/"/);
});

test("Phase C old TRPG URLs are redirect shells without feature UI", async ()=>{
    const scenarioRedirect = await read("apps/web/trpg/index.html");
    const rulesRedirect = await read("apps/web/trpg/rules/index.html");

    assert.match(scenarioRedirect, /http-equiv="refresh" content="0; url=\.\.\/creators\/chikage\/trpg\/"/);
    assert.match(scenarioRedirect, new RegExp(`<link rel="canonical" href="${escapeRegExp(NEW_TRPG_URL)}">`));
    assert.match(scenarioRedirect, /location\.replace\("\.\.\/creators\/chikage\/trpg\/" \+ location\.search \+ location\.hash\)/);
    assert.doesNotMatch(scenarioRedirect, /keywordInput|scenarioList|tagFilter|\.\/js\/app\.js/);

    assert.match(rulesRedirect, /http-equiv="refresh" content="0; url=\.\.\/\.\.\/creators\/chikage\/trpg\/rules\/"/);
    assert.match(rulesRedirect, new RegExp(`<link rel="canonical" href="${escapeRegExp(NEW_RULES_URL)}">`));
    assert.match(rulesRedirect, /location\.replace\("\.\.\/\.\.\/creators\/chikage\/trpg\/rules\/" \+ location\.search \+ location\.hash\)/);
    assert.doesNotMatch(rulesRedirect, /rulesApp|rules-document|\.\/js\/rules\.js/);
});

test("Phase C removes Brand dependency on Chikage TRPG CSS", async ()=>{
    const htmlFiles = await collectFiles(new URL("apps/web/", ROOT), ".html");

    for(const file of htmlFiles){
        const relative = toRelative(file);
        const html = await readFile(file, "utf8");

        if(relative.startsWith("apps/web/creators/chikage/trpg/")){
            continue;
        }

        assert.doesNotMatch(html, /trpg\/css\/style\.css/, relative);
    }
});

test("Phase D has no old TRPG internal links outside redirect shells", async ()=>{
    const files = await collectFiles(new URL("apps/web/", ROOT), [".html", ".js", ".json"]);

    for(const file of files){
        const relative = toRelative(file);

        if(
            relative === "apps/web/trpg/index.html" ||
            relative === "apps/web/trpg/rules/index.html"
        ){
            continue;
        }

        const source = await readFile(file, "utf8");

        if(relative.startsWith("apps/web/creators/chikage/") &&
            !relative.startsWith("apps/web/creators/chikage/trpg/")){
            assert.doesNotMatch(source, /href="(?:\.\.\/\.\.\/|\.\.\/\.\.\/\.\.\/)trpg\//, relative);
        }else{
            assert.doesNotMatch(source, /href="(?:\.\/|\.\.\/|\.\.\/\.\.\/|\.\.\/\.\.\/\.\.\/)trpg\//, relative);
        }

        assert.doesNotMatch(source, /https:\/\/mira-tr\.github\.io\/mira-terminal\/trpg\//, relative);
    }
});

test("Phase D uses Creator JSON authority without old JSON fallback", async ()=>{
    const scenarioConfig = await read("apps/web/creators/chikage/trpg/js/config.js");
    const rulesScript = await read("apps/web/creators/chikage/trpg/rules/js/rules.js");
    const scenarioExport = await read("apps/admin/js/features/trpg/scenarios/scenarioPublicExport.js");
    const rulesExport = await read("apps/admin/js/features/trpg/rules/rulesPublicExport.js");
    const build = await read("scripts/build-public.mjs");

    assert.match(scenarioConfig, /data\/creators\/chikage\/trpg\/public-scenarios\.json/);
    assert.match(rulesScript, /data\/creators\/chikage\/trpg\/house-rules\.json/);
    assert.match(scenarioExport, /apps\/web\/data\/creators\/chikage\/trpg\/public-scenarios\.json/);
    assert.match(rulesExport, /apps\/web\/data\/creators\/chikage\/trpg\/house-rules\.json/);
    assert.match(build, /"data\/creators\/chikage\/trpg\/public-scenarios\.json"/);
    assert.match(build, /"data\/creators\/chikage\/trpg\/house-rules\.json"/);
    assert.doesNotMatch(build, /"trpg\/data\/public-scenarios\.json"|"trpg\/rules\/data\/house-rules\.json"/);

    await access(new URL("apps/web/data/creators/chikage/trpg/public-scenarios.json", ROOT));
    await access(new URL("apps/web/data/creators/chikage/trpg/house-rules.json", ROOT));
    await rejectsAccess("apps/web/trpg/data/public-scenarios.json");
    await rejectsAccess("apps/web/trpg/rules/data/house-rules.json");
});

test("Phase D removes Chikage TRPG internals from Brand Tools", async ()=>{
    const toolsData = JSON.parse(await read("apps/web/tools/data/public-tools.json"));
    const toolsScript = await read("apps/web/tools/js/tools.js");

    assert.equal(toolsData.exportType, "public-tools");
    assert.deepEqual(toolsData.tools, []);
    assert.doesNotMatch(JSON.stringify(toolsData), /TRPG|Scenario Library|House Rules/);
    assert.match(toolsScript, /createToolsEmptyState/);
});
test("Phase C tag filter states keep neutral unselected tags separate from active tags", async ()=>{
    const app = await read("apps/web/creators/chikage/trpg/js/app.js");
    const css = await read("apps/web/creators/chikage/trpg/css/filters.css");

    assert.match(app, /button\.textContent = selected\s*\?\s*`\$\{tag\} ×`\s*:\s*tag;/);
    assert.match(app, /selected \? `\$\{tag\}を解除` : `\$\{tag\}で絞り込む`/);
    assert.match(css, /\.tag-button\.is-active\s*{[\s\S]*background: var\(--color-accent\);/);
    assert.match(css, /@media \(hover: hover\)/);
    assert.match(css, /\.tag-button:hover:not\(\.is-active\)/);
    assert.doesNotMatch(css, /\.tag-button:hover,\s*\n\.tag-button\.is-active/);
});

async function rejectsAccess(path){
    await assert.rejects(
        access(new URL(path, ROOT)),
        error => error?.code === "ENOENT"
    );
}

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

async function collectFiles(directory, extensions){
    const extensionList = Array.isArray(extensions) ? extensions : [extensions];
    const entries = await readdir(directory, {
        withFileTypes: true
    });
    const files = [];

    for(const entry of entries){
        const url = new URL(entry.name, directory);

        if(entry.isDirectory()){
            files.push(...await collectFiles(new URL(`${entry.name}/`, directory), extensionList));
            continue;
        }

        if(extensionList.includes(extname(entry.name))){
            files.push(url);
        }
    }

    return files;
}

function toRelative(url){
    return url.pathname
        .replace(ROOT.pathname, "")
        .replace(/^\//, "")
        .replace(/%20/g, " ");
}

function escapeRegExp(value){
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


