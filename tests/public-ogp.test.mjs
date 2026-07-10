import test from "node:test";
import assert from "node:assert/strict";
import {
    access,
    readFile
} from "node:fs/promises";

const PUBLIC_PAGES = [
    {
        page: "apps/web/404.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-home.png",
        assetPrefix: "./"
    },
    {
        page: "apps/web/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-home.png",
        assetPrefix: "./"
    },
    {
        page: "apps/web/about/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-home.png",
        assetPrefix: "../"
    },
    {
        page: "apps/web/trpg/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-trpg.png",
        assetPrefix: "../"
    },
    {
        page: "apps/web/trpg/rules/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-rules.png",
        assetPrefix: "../../"
    },
    {
        page: "apps/web/game/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-game.png",
        assetPrefix: "../"
    },
    {
        page: "apps/web/tools/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-tools.png",
        assetPrefix: "../"
    },
    {
        page: "apps/web/notes/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-notes.png",
        assetPrefix: "../"
    }
];

const GLOBAL_NAV = new Map([
    ["apps/web/404.html", [
        ["Home", "./"],
        ["TRPG", "./trpg/"],
        ["Game", "./game/"],
        ["Tools", "./tools/"],
        ["Notes", "./notes/"],
        ["About", "./about/"]
    ]],
    ["apps/web/index.html", [
        ["Home", "./"],
        ["TRPG", "./trpg/"],
        ["Game", "./game/"],
        ["Tools", "./tools/"],
        ["Notes", "./notes/"],
        ["About", "./about/"]
    ]],
    ["apps/web/about/index.html", [
        ["Home", "../"],
        ["TRPG", "../trpg/"],
        ["Game", "../game/"],
        ["Tools", "../tools/"],
        ["Notes", "../notes/"],
        ["About", "./"]
    ]],
    ["apps/web/trpg/index.html", [
        ["Home", "../"],
        ["TRPG", "./"],
        ["Game", "../game/"],
        ["Tools", "../tools/"],
        ["Notes", "../notes/"],
        ["About", "../about/"]
    ]],
    ["apps/web/trpg/rules/index.html", [
        ["Home", "../../"],
        ["TRPG", "../"],
        ["Game", "../../game/"],
        ["Tools", "../../tools/"],
        ["Notes", "../../notes/"],
        ["About", "../../about/"]
    ]],
    ["apps/web/game/index.html", [
        ["Home", "../"],
        ["TRPG", "../trpg/"],
        ["Game", "./"],
        ["Tools", "../tools/"],
        ["Notes", "../notes/"],
        ["About", "../about/"]
    ]],
    ["apps/web/tools/index.html", [
        ["Home", "../"],
        ["TRPG", "../trpg/"],
        ["Game", "../game/"],
        ["Tools", "./"],
        ["Notes", "../notes/"],
        ["About", "../about/"]
    ]],
    ["apps/web/notes/index.html", [
        ["Home", "../"],
        ["TRPG", "../trpg/"],
        ["Game", "../game/"],
        ["Tools", "../tools/"],
        ["Notes", "./"],
        ["About", "../about/"]
    ]]
]);

const TRPG_SUB_NAV = [
    {
        page: "apps/web/trpg/index.html",
        current: "Scenario Library",
        links: [
            ["Scenario Library", "./"],
            ["House Rules", "./rules/"]
        ]
    },
    {
        page: "apps/web/trpg/rules/index.html",
        current: "House Rules",
        links: [
            ["Scenario Library", "../"],
            ["House Rules", "./"]
        ]
    }
];

function extractLinks(nav){
    return [...nav.matchAll(
        /<a class="([^"]+)" href="([^"]+)"([^>]*)>([^<]+)<\/a>/g
    )].map(match=>({
        className: match[1],
        href: match[2],
        attributes: match[3],
        label: match[4]
    }));
}

test("全PublicページにOGPとTwitter Cardがある", async ()=>{
    for(const { page, ogImage } of PUBLIC_PAGES){
        const html = await readFile(
            new URL(`../${page}`, import.meta.url),
            "utf8"
        );

        [
            /<title>[^<]+<\/title>/,
            /<meta name="description" content="[^"]*">|<meta property="og:description" content="[^"]+">/,
            /<meta name="viewport" content="width=device-width, initial-scale=1.0">/,
            /<meta property="og:title" content="MIRA Terminal">/,
            /<meta property="og:description" content="[^"]+">/,
            new RegExp(`<meta property="og:image" content="${ogImage}">`),
            /<meta property="og:type" content="website">/,
            /<meta name="twitter:card" content="summary_large_image">/,
            /<meta name="twitter:title" content="MIRA Terminal">/,
            /<meta name="twitter:description" content="[^"]+">/,
            new RegExp(`<meta name="twitter:image" content="${ogImage}">`)
        ].forEach((pattern, index)=>{
            assert.match(html, pattern, `${page}: meta ${index}`);
        });
    }
});

test("全Publicページに正式ロゴとfaviconがある", async ()=>{
    for(const { page, assetPrefix } of PUBLIC_PAGES){
        const html = await readFile(
            new URL(`../${page}`, import.meta.url),
            "utf8"
        );

        assert.ok(
            html.includes(`<link rel="icon" type="image/png" href="${assetPrefix}assets/brand/icon.png">`),
            `${page}: favicon`
        );
        assert.ok(
            html.includes(`<link rel="apple-touch-icon" href="${assetPrefix}assets/brand/icon.png">`),
            `${page}: apple-touch-icon`
        );
        assert.ok(
            html.includes(`<img class="site-logo" src="${assetPrefix}assets/brand/logo.png" alt="MIRA Terminal">`),
            `${page}: header logo`
        );
    }
});

test("正式ブランド画像が配置されている", async ()=>{
    await Promise.all([
        "apps/web/assets/brand/logo.png",
        "apps/web/assets/brand/icon.png",
        "apps/web/assets/brand/og/og-home.png",
        "apps/web/assets/brand/og/og-trpg.png",
        "apps/web/assets/brand/og/og-rules.png",
        "apps/web/assets/brand/og/og-game.png",
        "apps/web/assets/brand/og/og-tools.png",
        "apps/web/assets/brand/og/og-notes.png"
    ].map(path=>access(new URL(`../${path}`, import.meta.url))));
});

test("Public Global Navigationは全ページで統一されている", async ()=>{
    for(const { page } of PUBLIC_PAGES){
        const html = await readFile(
            new URL(`../${page}`, import.meta.url),
            "utf8"
        );
        const nav = html.match(/<nav class="header-nav"[\s\S]*?<\/nav>/)?.[0] || "";
        const links = extractLinks(nav);

        assert.deepEqual(
            links.map(link=>[link.label, link.href]),
            GLOBAL_NAV.get(page),
            `${page}: global nav`
        );
        assert.doesNotMatch(nav, />House Rules<\/a>/, `${page}: no house rules in global nav`);
        assert.doesNotMatch(nav, />シナリオ<\/a>|>ルール<\/a>|>House rule<\/a>|>Scenario<\/a>|>TRPG Scenario<\/a>/, `${page}: legacy nav label`);
    }
});

test("TRPGページはScenario LibraryとHouse Rulesのサブナビを持つ", async ()=>{
    for(const page of TRPG_SUB_NAV){
        const html = await readFile(
            new URL(`../${page.page}`, import.meta.url),
            "utf8"
        );
        const nav = html.match(/<nav class="trpg-sub-nav"[\s\S]*?<\/nav>/)?.[0] || "";
        const links = extractLinks(nav);
        const currentLinks = links.filter(
            link=>link.attributes.includes('aria-current="page"')
        );

        assert.deepEqual(
            links.map(link=>[link.label, link.href]),
            page.links,
            `${page.page}: sub nav`
        );
        assert.equal(currentLinks.length, 1, `${page.page}: current count`);
        assert.equal(currentLinks[0].label, page.current, `${page.page}: current label`);
        assert.ok(currentLinks[0].className.includes("is-current"), `${page.page}: current class`);
    }
});

test("Public 404ページはテーマ切り替えと主要導線を持つ", async ()=>{
    const html = await readFile(
        new URL("../apps/web/404.html", import.meta.url),
        "utf8"
    );

    assert.match(html, /<script src="\.\/js\/theme\.js"><\/script>/);

    [
        ["Home", "./"],
        ["About", "./about/"],
        ["TRPG", "./trpg/"],
        ["House Rules", "./trpg/rules/"],
        ["Game", "./game/"],
        ["Tools", "./tools/"],
        ["Notes", "./notes/"]
    ].forEach(([label, href])=>{
        assert.ok(html.includes(`href="${href}"`), label);
    });
});
