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

const EXPECTED_META = [
    ["property", "og:title", "MIRA Terminal"],
    ["property", "og:description", "MIRAの創作・TRPG・ゲーム制作・ツールをまとめる個人ターミナルです。"],
    ["property", "og:url", "https://mira-tr.github.io/mira-terminal/"],
    ["property", "og:type", "website"],
    ["name", "twitter:card", "summary_large_image"],
    ["name", "twitter:title", "MIRA Terminal"],
    ["name", "twitter:description", "MIRAの創作・TRPG・ゲーム制作・ツールをまとめる個人ターミナルです。"]
];

test("全PublicページにOGPとTwitter Cardがある", async ()=>{
    for(const { page, ogImage } of PUBLIC_PAGES){
        const html = await readFile(
            new URL(`../${page}`, import.meta.url),
            "utf8"
        );

        EXPECTED_META.forEach(([attribute, key, content])=>{
            const tag = `<meta ${attribute}="${key}" content="${content}">`;
            assert.equal(
                html.split(tag).length - 1,
                1,
                `${page}: ${key}`
            );
        });

        [
            ["property", "og:image", ogImage],
            ["name", "twitter:image", ogImage]
        ].forEach(([attribute, key, content])=>{
            const tag = `<meta ${attribute}="${key}" content="${content}">`;
            assert.equal(
                html.split(tag).length - 1,
                1,
                `${page}: ${key}`
            );
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

test("Public上部ナビのHouse Rules表記とリンク先が統一されている", async ()=>{
    const expectedLinks = new Map([
        ["apps/web/404.html", "./trpg/rules/"],
        ["apps/web/index.html", "./trpg/rules/"],
        ["apps/web/about/index.html", "../trpg/rules/"],
        ["apps/web/trpg/index.html", "./rules/"],
        ["apps/web/trpg/rules/index.html", "./"],
        ["apps/web/game/index.html", "../trpg/rules/"],
        ["apps/web/tools/index.html", "../trpg/rules/"],
        ["apps/web/notes/index.html", "../trpg/rules/"]
    ]);

    for(const { page } of PUBLIC_PAGES){
        const html = await readFile(
            new URL(`../${page}`, import.meta.url),
            "utf8"
        );
        const nav = html.match(/<nav class="header-nav"[\s\S]*?<\/nav>/)?.[0] || "";
        const expectedHref = expectedLinks.get(page);

        assert.ok(nav.includes(">House Rules<"), `${page}: label`);
        assert.ok(nav.includes(`href="${expectedHref}"`), `${page}: href`);
        assert.doesNotMatch(nav, />ルール<\/a>/, `${page}: legacy label`);
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
