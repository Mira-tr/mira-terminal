import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

const PUBLIC_PAGES = [
    { page: "apps/web/404.html", ogImage: "https://relmua.com/assets/brand/og/og-relmua.svg", assetPrefix: "./", kind: "brand" },
    { page: "apps/web/index.html", ogImage: "https://relmua.com/assets/brand/og/og-relmua.svg", assetPrefix: "./", kind: "brand" },
    { page: "apps/web/projects/index.html", ogImage: "https://relmua.com/assets/brand/og/og-relmua.svg", assetPrefix: "../", kind: "brand" },
    { page: "apps/web/projects/niia/index.html", ogImage: "https://relmua.com/assets/brand/og/og-relmua.svg", assetPrefix: "../../", kind: "brand" },
    { page: "apps/web/tools/index.html", ogImage: "https://relmua.com/assets/brand/og/og-relmua.svg", assetPrefix: "../", kind: "brand" },
    { page: "apps/web/tools/image-toolkit/index.html", ogImage: "https://relmua.com/assets/brand/og/og-relmua.svg", assetPrefix: "../../", kind: "brand" },
    { page: "apps/web/notes/index.html", ogImage: "https://relmua.com/assets/brand/og/og-relmua.svg", assetPrefix: "../", kind: "brand" },
    { page: "apps/web/about/index.html", ogImage: "https://relmua.com/assets/brand/og/og-relmua.svg", assetPrefix: "../", kind: "brand" },
    { page: "apps/web/contact/index.html", ogImage: "https://relmua.com/assets/brand/og/og-relmua.svg", assetPrefix: "../", kind: "brand" },
    { page: "apps/web/creators/index.html", ogImage: "https://relmua.com/assets/brand/og/og-relmua.svg", assetPrefix: "../", kind: "brand" },
    { page: "apps/web/creators/chikage/index.html", ogImage: "https://relmua.com/assets/brand/og/og-chikage.svg", assetPrefix: "../../", kind: "creator" },
    { page: "apps/web/creators/chikage/profile/index.html", ogImage: "https://relmua.com/assets/brand/og/og-chikage.svg", assetPrefix: "../../../", kind: "creator" },
    { page: "apps/web/creators/chikage/works/index.html", ogImage: "https://relmua.com/assets/brand/og/og-chikage.svg", assetPrefix: "../../../", kind: "creator" },
    { page: "apps/web/creators/chikage/contact/index.html", ogImage: "https://relmua.com/assets/brand/og/og-chikage.svg", assetPrefix: "../../../", kind: "creator" },
    { page: "apps/web/creators/chikage/trpg/index.html", ogImage: "https://relmua.com/assets/creators/chikage/trpg/og-trpg.svg", assetPrefix: "../../../", kind: "trpg" },
    { page: "apps/web/creators/chikage/trpg/calendar/index.html", ogImage: "https://relmua.com/assets/creators/chikage/trpg/og-trpg.svg", assetPrefix: "../../../../", kind: "trpg" },
    { page: "apps/web/creators/chikage/trpg/scenarios/index.html", ogImage: "https://relmua.com/assets/creators/chikage/trpg/og-trpg.svg", assetPrefix: "../../../../", kind: "trpg" },
    { page: "apps/web/creators/chikage/trpg/picker/index.html", ogImage: "https://relmua.com/assets/creators/chikage/trpg/og-trpg.svg", assetPrefix: "../../../../", kind: "trpg" },
    { page: "apps/web/creators/chikage/trpg/scheduler/index.html", ogImage: "https://relmua.com/assets/creators/chikage/trpg/og-trpg.svg", assetPrefix: "../../../../", kind: "trpg" },
    { page: "apps/web/creators/chikage/trpg/rules/index.html", ogImage: "https://relmua.com/assets/creators/chikage/trpg/og-trpg.svg", assetPrefix: "../../../../", kind: "trpg" }
];

const TRPG_PAGES = PUBLIC_PAGES.filter(({ kind }) => kind === "trpg").map(({ page }) => page);
const CREATOR_PAGES = PUBLIC_PAGES.filter(({ kind }) => kind === "creator").map(({ page }) => page);

const RETIRED_SURFACES = [
    "apps/studio",
    "apps/web/creator",
    "apps/web/trpg",
    "apps/web/creators/chikage/legacy",
    "apps/web/game/index.html"
];

test("Public HTML inventory contains only the current canonical surfaces", async () => {
    const actual = (await collectHtmlFiles(new URL("apps/web/", ROOT)))
        .map(path => `apps/web/${path}`)
        .sort();
    const expected = PUBLIC_PAGES.map(({ page }) => page).sort();

    assert.deepEqual(actual, expected);
    for(const path of RETIRED_SURFACES){
        await assert.rejects(access(new URL(path, ROOT)), undefined, path);
    }
});

test("all current Public pages keep RELMUA metadata and social preview basics", async () => {
    for(const { page, ogImage } of PUBLIC_PAGES){
        const html = await read(page);
        [
            /<title>[^<]*RELMUA[^<]*<\/title>/,
            /<meta name="description" content="[^"]+">/,
            /<meta name="viewport" content="width=device-width, initial-scale=1.0">/,
            /<meta property="og:title" content="[^"]*RELMUA[^"]*">/,
            /<meta property="og:description" content="[^"]+">/,
            new RegExp(`<meta property="og:image" content="${escapeRegExp(ogImage)}">`),
            /<meta property="og:type" content="website">/,
            /<meta name="twitter:card" content="summary_large_image">/
        ].forEach((pattern, index) => assert.match(html, pattern, `${page}: meta ${index}`));
    }
});

test("all current Public pages resolve the shared RELMUA identity assets", async () => {
    for(const { page, assetPrefix, kind } of PUBLIC_PAGES){
        const html = await read(page);
        assert.ok(html.includes(`<link rel="icon" type="image/svg+xml" href="${assetPrefix}assets/brand/relmua-icon.svg">`), `${page}: favicon`);
        assert.ok(html.includes(`<link rel="apple-touch-icon" href="${assetPrefix}assets/brand/relmua-icon.svg">`), `${page}: apple-touch-icon`);
        assert.ok(html.includes(`<link rel="manifest" href="${assetPrefix}manifest.webmanifest">`), `${page}: manifest`);

        if(kind === "trpg"){
            assert.match(html, /class="[^"]*trpg-shell-brand[^"]*"/i, `${page}: TRPG identity`);
            assert.ok(html.includes(`href="${assetPrefix}">RELMUA</a>`), `${page}: RELMUA route`);
        }else{
            assert.ok(html.includes(`<img class="site-logo" src="${assetPrefix}assets/brand/relmua-logo.svg" alt="RELMUA">`), `${page}: header logo`);
            assert.match(html, new RegExp(`<a class="site-logo-link" href="${escapeRegExp(assetPrefix)}"`), `${page}: logo route`);
        }
    }
});

test("Public pages do not reference retired brand images or retired site names", async () => {
    for(const { page } of PUBLIC_PAGES){
        const html = await read(page);
        assert.doesNotMatch(html, /assets\/brand\/(?:logo|icon)\.png|assets\/brand\/og\/og-[a-z]+\.png/, page);
        assert.doesNotMatch(html, /MIRA Terminal|MIRA卓|MIRAが|Find MIRA/, page);
    }
});

test("RELMUA SVG brand assets exist and remain safe", async () => {
    const paths = [
        "apps/web/assets/brand/relmua-logo.svg",
        "apps/web/assets/brand/relmua-icon.svg",
        "apps/web/assets/brand/og/og-relmua.svg",
        "apps/web/assets/brand/og/og-chikage.svg",
        "apps/web/assets/creators/chikage/trpg/og-trpg.svg"
    ];

    await Promise.all(paths.map(path => access(new URL(path, ROOT))));
    for(const path of paths){
        const svg = await read(path);
        assert.ok(svg.length < 8000, path);
        assert.doesNotMatch(svg, /<script|<foreignObject|@font-face|url\(/i, path);
        assert.doesNotMatch(svg, /\b(?:href|src)=["']https?:/i, path);
        if(path.endsWith("relmua-logo.svg")){
            assert.match(svg, />RELMUA<\/text>/, path);
            assert.doesNotMatch(svg, /RELMAU/, path);
        }
    }
});

test("Brand pages keep Brand navigation free of retired TRPG shortcuts", async () => {
    for(const { page, kind } of PUBLIC_PAGES){
        if(kind !== "brand") continue;
        const html = await read(page);
        const nav = html.match(/<nav class="[^"]*header-nav[^"]*"[\s\S]*?<\/nav>/)?.[0] || "";
        assert.ok(nav, `${page}: header nav`);
        assert.doesNotMatch(nav, />TRPG<\/a>|>Game<\/a>|>House Rules<\/a>/, page);
    }
});

test("Creator pages keep one canonical local navigation", async () => {
    const expected = ["Home", "Works", "TRPG", "Profile", "Contact"];
    for(const page of CREATOR_PAGES){
        const html = await read(page);
        const nav = html.match(/<nav class="creator-local-nav"[\s\S]*?<\/nav>/)?.[0] || "";
        const labels = [...nav.matchAll(/<a\b[^>]*>([^<]+)<\/a>/g)].map(match => match[1]);
        assert.deepEqual(labels, expected, page);
        assert.doesNotMatch(html, /href="(?:\.\.\/)*creator\/|href="(?:\.\.\/)*trpg\/"/, `${page}: no compatibility route`);
    }
});

test("TRPG pages share the current Chikage House shell and canonical tool routes", async () => {
    for(const page of TRPG_PAGES){
        const html = await read(page);
        assert.match(html, /<header class="trpg-shell-header">/, page);
        assert.match(html, /class="ch-house-shell"/, page);
        assert.match(html, /class="[^"]*trpg-shell-primary[^"]*"/, page);
        assert.doesNotMatch(html, /trpg-mobile-dock|creator-local-nav|cx-bottom-nav|trpg-sub-nav/, page);
        for(const label of ["概要", "予定", "シナリオ", "ルール"]){
            assert.match(html, new RegExp(`>${label}<\\/a>`), `${page}: ${label}`);
        }
        assert.match(html, /Scenario Picker/, page);
        assert.match(html, /chikage-ui-refresh\.css/, page);
    }
});

test("Creator detail reaches the canonical TRPG surface", async () => {
    const html = await read("apps/web/creators/chikage/index.html");
    assert.match(html, /千景/);
    assert.match(html, /href="\.\/trpg\/"/);
    assert.match(html, /href="\.\/trpg\/scenarios\/"/);
});

test("Public 404 keeps RELMUA recovery routes", async () => {
    const html = await read("apps/web/404.html");
    assert.match(html, /<script src="\.\/js\/theme\.js"><\/script>/);
    [["Home", "./"], ["Projects", "./projects/"], ["About", "./about/"], ["Creators", "./creators/"]].forEach(([label, href]) => {
        assert.ok(html.includes(`href="${href}"`), label);
    });
    const primaryLinks = html.match(/<section class="not-found-panel"[\s\S]*?<\/section>/)?.[0] || "";
    assert.doesNotMatch(primaryLinks, /TRPG|House Rules/);
});

test("relmua.com publication metadata is present", async () => {
    const cname = await read("apps/web/CNAME");
    const robots = await read("apps/web/robots.txt");
    const sitemap = await read("apps/web/sitemap.xml");
    const manifest = JSON.parse(await read("apps/web/manifest.webmanifest"));

    assert.equal(cname.trim(), "relmua.com");
    assert.match(robots, /Sitemap: https:\/\/relmua\.com\/sitemap\.xml/);
    assert.match(sitemap, /<loc>https:\/\/relmua\.com\/<\/loc>/);
    assert.match(sitemap, /<loc>https:\/\/relmua\.com\/creators\/chikage\/trpg\/<\/loc>/);
    assert.match(sitemap, /<loc>https:\/\/relmua\.com\/creators\/chikage\/trpg\/calendar\/<\/loc>/);
    assert.match(sitemap, /<loc>https:\/\/relmua\.com\/creators\/chikage\/trpg\/scenarios\/<\/loc>/);
    assert.match(sitemap, /<loc>https:\/\/relmua\.com\/creators\/chikage\/trpg\/scheduler\/<\/loc>/);
    assert.doesNotMatch(sitemap, /mira-tr\.github\.io|mira-terminal/);
    assert.equal(manifest.name, "RELMUA");
    assert.equal(manifest.start_url, "/");
    assert.equal(manifest.scope, "/");
});

async function collectHtmlFiles(directory, prefix = ""){
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for(const entry of entries){
        const path = `${prefix}${entry.name}`;
        if(entry.isDirectory()){
            files.push(...await collectHtmlFiles(new URL(`${entry.name}/`, directory), `${path}/`));
        }else if(entry.name.toLowerCase().endsWith(".html")){
            files.push(path);
        }
    }
    return files;
}

function escapeRegExp(value){
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
