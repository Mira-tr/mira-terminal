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
        assetPrefix: "./",
        navPrefix: "./",
        current: ""
    },
    {
        page: "apps/web/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-home.png",
        assetPrefix: "./",
        navPrefix: "./",
        current: "Home"
    },
    {
        page: "apps/web/projects/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-game.png",
        assetPrefix: "../",
        navPrefix: "../",
        current: "Projects"
    },
    {
        page: "apps/web/tools/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-tools.png",
        assetPrefix: "../",
        navPrefix: "../",
        current: "Tools"
    },
    {
        page: "apps/web/notes/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-notes.png",
        assetPrefix: "../",
        navPrefix: "../",
        current: "Notes"
    },
    {
        page: "apps/web/about/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-home.png",
        assetPrefix: "../",
        navPrefix: "../",
        current: "About"
    },
    {
        page: "apps/web/contact/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-home.png",
        assetPrefix: "../",
        navPrefix: "../",
        current: "Contact"
    },
    {
        page: "apps/web/creators/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-home.png",
        assetPrefix: "../",
        navPrefix: "../",
        current: ""
    },
    {
        page: "apps/web/creators/chikage/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-home.png",
        assetPrefix: "../../",
        navPrefix: "../../",
        current: ""
    },
    {
        page: "apps/web/creator/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-home.png",
        assetPrefix: "../",
        navPrefix: "../",
        current: ""
    },
    {
        page: "apps/web/trpg/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-trpg.png",
        assetPrefix: "../",
        navPrefix: "../",
        current: ""
    },
    {
        page: "apps/web/trpg/rules/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-rules.png",
        assetPrefix: "../../",
        navPrefix: "../../",
        current: ""
    },
    {
        page: "apps/web/game/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-game.png",
        assetPrefix: "../",
        navPrefix: "../",
        current: ""
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

function expectedNav(prefix, current){
    return [
        ["ホーム", current === "Home" ? "./" : prefix],
        ["作品", current === "Projects" ? "./" : `${prefix}projects/`],
        ["道具", current === "Tools" ? "./" : `${prefix}tools/`],
        ["記録", current === "Notes" ? "./" : `${prefix}notes/`],
        ["ブランド", current === "About" ? "./" : `${prefix}about/`],
        ["連絡", current === "Contact" ? "./" : `${prefix}contact/`]
    ];
}

function expectedCurrentLabel(current){
    return new Map([
        ["Home", "ホーム"],
        ["Projects", "作品"],
        ["Tools", "道具"],
        ["Notes", "記録"],
        ["About", "ブランド"],
        ["Contact", "連絡"]
    ]).get(current);
}

test("全PublicページにRELMUAのOGPとTwitter Cardがある", async ()=>{
    for(const { page, ogImage } of PUBLIC_PAGES){
        const html = await readFile(
            new URL(`../${page}`, import.meta.url),
            "utf8"
        );

        [
            /<title>[^<]*RELMUA[^<]*<\/title>/,
            /<meta name="description" content="[^"]+">/,
            /<meta name="viewport" content="width=device-width, initial-scale=1.0">/,
            /<meta property="og:title" content="[^"]*RELMUA[^"]*">/,
            /<meta property="og:description" content="[^"]+">/,
            new RegExp(`<meta property="og:image" content="${ogImage}">`),
            /<meta property="og:type" content="website">/,
            /<meta name="twitter:card" content="summary_large_image">/,
            /<meta name="twitter:title" content="[^"]*RELMUA[^"]*">/,
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
            html.includes(`<img class="site-logo" src="${assetPrefix}assets/brand/logo.png" alt="RELMUA">`),
            `${page}: header logo`
        );
        assert.ok(
            html.includes(`<a class="site-logo-link" href="${assetPrefix}" aria-label="Home">`),
            `${page}: header logo link`
        );
    }
});

test("既存ブランド画像はPhase 1で維持する", async ()=>{
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

test("Public Global NavigationはPhase 1仕様で統一されている", async ()=>{
    for(const { page, navPrefix, current } of PUBLIC_PAGES){
        const html = await readFile(
            new URL(`../${page}`, import.meta.url),
            "utf8"
        );
        const nav = html.match(/<nav class="header-nav"[\s\S]*?<\/nav>/)?.[0] || "";
        const links = extractLinks(nav);

        assert.deepEqual(
            links.map(link=>[link.label, link.href]),
            expectedNav(navPrefix, current),
            `${page}: global nav`
        );
        assert.doesNotMatch(nav, />TRPG<\/a>|>Game<\/a>|>House Rules<\/a>/, `${page}: legacy global nav`);

        const currentLinks = links.filter(
            link=>link.attributes.includes('aria-current="page"')
        );

        if(current){
            assert.equal(currentLinks.length, 1, `${page}: current count`);
            assert.equal(currentLinks[0].label, expectedCurrentLabel(current), `${page}: current label`);
            assert.ok(currentLinks[0].className.includes("is-current"), `${page}: current class`);
        }else{
            assert.equal(currentLinks.length, 0, `${page}: no global current`);
        }
    }
});

test("TRPGページはGlobal Navigationから独立し、サブナビを維持する", async ()=>{
    const contracts = [
        {
            page: "apps/web/trpg/index.html",
            current: "シナリオ",
            links: [
                ["シナリオ", "./"],
                ["ハウスルール", "./rules/"]
            ]
        },
        {
            page: "apps/web/trpg/rules/index.html",
            current: "ハウスルール",
            links: [
                ["シナリオ", "../"],
                ["ハウスルール", "./"]
            ]
        }
    ];

    for(const page of contracts){
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

test("Creator詳細からTRPGへ到達でき、千景表記がある", async ()=>{
    const html = await readFile(
        new URL("../apps/web/creators/chikage/index.html", import.meta.url),
        "utf8"
    );

    assert.match(html, /千景/);
    assert.match(html, /href="\.\.\/\.\.\/trpg\/"/);
    assert.match(html, /href="\.\.\/\.\.\/trpg\/rules\/"/);
});

test("Public 404ページはRELMUA仕様の主要導線を持つ", async ()=>{
    const html = await readFile(
        new URL("../apps/web/404.html", import.meta.url),
        "utf8"
    );

    assert.match(html, /<script src="\.\/js\/theme\.js"><\/script>/);

    [
        ["Home", "./"],
        ["Projects", "./projects/"],
        ["About", "./about/"],
        ["Creators", "./creators/"]
    ].forEach(([label, href])=>{
        assert.ok(html.includes(`href="${href}"`), label);
    });

    const primaryLinks = html.match(/<section class="not-found-panel"[\s\S]*?<\/section>/)?.[0] || "";
    assert.doesNotMatch(primaryLinks, /TRPG|House Rules/);
});

test("新規Public固定文言に旧活動名と旧サイト名を追加しない", async ()=>{
    const pages = PUBLIC_PAGES.map(page=>page.page);

    for(const page of pages){
        const html = await readFile(
            new URL(`../${page}`, import.meta.url),
            "utf8"
        );

        assert.doesNotMatch(html, /MIRA Terminal|MIRA卓|MIRAが|Find MIRA/, page);
    }
});
