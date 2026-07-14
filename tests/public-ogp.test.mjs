import test from "node:test";
import assert from "node:assert/strict";
import {
    access,
    readFile
} from "node:fs/promises";

const PUBLIC_PAGES = [
    {
        page: "apps/web/404.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-relmua.svg",
        assetPrefix: "./",
        navPrefix: "./",
        current: ""
    },
    {
        page: "apps/web/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-relmua.svg",
        assetPrefix: "./",
        navPrefix: "./",
        current: "Home"
    },
    {
        page: "apps/web/projects/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-relmua.svg",
        assetPrefix: "../",
        navPrefix: "../",
        current: "Projects"
    },
    {
        page: "apps/web/tools/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-relmua.svg",
        assetPrefix: "../",
        navPrefix: "../",
        current: "Tools"
    },
    {
        page: "apps/web/notes/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-relmua.svg",
        assetPrefix: "../",
        navPrefix: "../",
        current: "Notes"
    },
    {
        page: "apps/web/about/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-relmua.svg",
        assetPrefix: "../",
        navPrefix: "../",
        current: "About"
    },
    {
        page: "apps/web/contact/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-relmua.svg",
        assetPrefix: "../",
        navPrefix: "../",
        current: "Contact"
    },
    {
        page: "apps/web/creators/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-relmua.svg",
        assetPrefix: "../",
        navPrefix: "../",
        current: "Creators"
    },
    {
        page: "apps/web/creators/chikage/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-chikage.svg",
        assetPrefix: "../../",
        navPrefix: "../../",
        current: ""
    },
    {
        page: "apps/web/creators/chikage/profile/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-chikage.svg",
        assetPrefix: "../../../",
        navPrefix: "../../../",
        current: ""
    },
    {
        page: "apps/web/creators/chikage/works/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-chikage.svg",
        assetPrefix: "../../../",
        navPrefix: "../../../",
        current: ""
    },
    {
        page: "apps/web/creators/chikage/contact/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-chikage.svg",
        assetPrefix: "../../../",
        navPrefix: "../../../",
        current: ""
    },
    {
        page: "apps/web/creators/asagiri/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-relmua.svg",
        assetPrefix: "../../",
        navPrefix: "../../",
        current: ""
    },
    {
        page: "apps/web/creators/asagiri/profile/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-relmua.svg",
        assetPrefix: "../../../",
        navPrefix: "../../../",
        current: ""
    },
    {
        page: "apps/web/creators/asagiri/works/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-relmua.svg",
        assetPrefix: "../../../",
        navPrefix: "../../../",
        current: ""
    },
    {
        page: "apps/web/creators/asagiri/contact/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-relmua.svg",
        assetPrefix: "../../../",
        navPrefix: "../../../",
        current: ""
    },
    {
        page: "apps/web/creator/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-chikage.svg",
        assetPrefix: "../",
        navPrefix: "../",
        current: ""
    },
    {
        page: "apps/web/trpg/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-trpg.svg",
        assetPrefix: "../",
        navPrefix: "../",
        current: ""
    },
    {
        page: "apps/web/trpg/rules/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-trpg.svg",
        assetPrefix: "../../",
        navPrefix: "../../",
        current: ""
    },
    {
        page: "apps/web/game/index.html",
        ogImage: "https://mira-tr.github.io/mira-terminal/assets/brand/og/og-relmua.svg",
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
        ["活動者", current === "Creators" ? "./" : `${prefix}creators/`],
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
        ["Creators", "活動者"],
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
            html.includes(`<link rel="icon" type="image/svg+xml" href="${assetPrefix}assets/brand/relmua-icon.svg">`),
            `${page}: favicon`
        );
        assert.ok(
            html.includes(`<link rel="apple-touch-icon" href="${assetPrefix}assets/brand/relmua-icon.svg">`),
            `${page}: apple-touch-icon`
        );
        assert.ok(
            html.includes(`<img class="site-logo" src="${assetPrefix}assets/brand/relmua-logo.svg" alt="RELMUA">`),
            `${page}: header logo`
        );
        assert.ok(
            html.includes(`<a class="site-logo-link" href="${assetPrefix}" aria-label="Home">`),
            `${page}: header logo link`
        );
    }
});

test("Publicページは旧PNGブランド画像を参照しない", async ()=>{
    for(const { page } of PUBLIC_PAGES){
        const html = await readFile(
            new URL(`../${page}`, import.meta.url),
            "utf8"
        );

        assert.doesNotMatch(html, /assets\/brand\/(?:logo|icon)\.png|assets\/brand\/og\/og-[a-z]+\.png/, page);
    }
});

test("RELMUA SVGブランド画像は存在し安全な構造を保つ", async ()=>{
    await Promise.all([
        "apps/web/assets/brand/relmua-logo.svg",
        "apps/web/assets/brand/relmua-icon.svg",
        "apps/web/assets/brand/og/og-relmua.svg",
        "apps/web/assets/brand/og/og-chikage.svg",
        "apps/web/assets/brand/og/og-trpg.svg"
    ].map(path=>access(new URL(`../${path}`, import.meta.url))));

    for(const path of [
        "apps/web/assets/brand/relmua-logo.svg",
        "apps/web/assets/brand/relmua-icon.svg",
        "apps/web/assets/brand/og/og-relmua.svg",
        "apps/web/assets/brand/og/og-chikage.svg",
        "apps/web/assets/brand/og/og-trpg.svg"
    ]){
        const svg = await readFile(new URL(`../${path}`, import.meta.url), "utf8");

        assert.ok(svg.length < 8000, path);
        assert.doesNotMatch(svg, /<script|<foreignObject|@font-face|url\(/i, path);
        assert.doesNotMatch(svg, /\b(?:href|src)=["']https?:/i, path);
    }
});

test("Public Global NavigationはBrand導線として統一されている", async ()=>{
    for(const { page, navPrefix, current } of PUBLIC_PAGES){
        const html = await readFile(
            new URL(`../${page}`, import.meta.url),
            "utf8"
        );
        const nav = html.match(/<nav class="[^"]*header-nav[^"]*"[\s\S]*?<\/nav>/)?.[0] || "";
        const links = extractLinks(nav);

        if(page.includes("apps/web/creators/chikage/") ||
            page.includes("apps/web/creators/asagiri/") ||
            page === "apps/web/trpg/index.html" ||
            page === "apps/web/trpg/rules/index.html"){
            assert.deepEqual(
                links.map(link=>[link.label, link.href]),
                [["RELMUAへ戻る", navPrefix]],
                `${page}: creator global nav`
            );
            assert.doesNotMatch(nav, />作品<\/a>|>道具<\/a>|>記録<\/a>|>ブランド<\/a>/, `${page}: no brand navigation mix`);
            continue;
        }

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

test("CreatorサイトはHomeから各ページへ1クリックのローカルナビを持つ", async ()=>{
    const contracts = [
        ["apps/web/creators/chikage/index.html", "千景"],
        ["apps/web/creators/chikage/profile/index.html", "プロフィール"],
        ["apps/web/creators/chikage/works/index.html", "作品"],
        ["apps/web/creators/chikage/contact/index.html", "連絡先"],
        ["apps/web/trpg/index.html", "TRPG"],
        ["apps/web/trpg/rules/index.html", "TRPG"],
        ["apps/web/creators/asagiri/index.html", "朝霧"],
        ["apps/web/creators/asagiri/profile/index.html", "プロフィール"],
        ["apps/web/creators/asagiri/works/index.html", "作品"],
        ["apps/web/creators/asagiri/contact/index.html", "連絡先"]
    ];

    for(const [page, current] of contracts){
        const html = await readFile(new URL(`../${page}`, import.meta.url), "utf8");
        const nav = html.match(/<nav class="creator-local-nav"[\s\S]*?<\/nav>/)?.[0] || "";
        const labels = [...nav.matchAll(/<a\b[^>]*>([^<]+)<\/a>/g)].map(match=>match[1]);
        const currentLabel = nav.match(/<a\b[^>]*aria-current="page"[^>]*>([^<]+)<\/a>/)?.[1];

        assert.deepEqual(
            labels,
            page.includes("/asagiri/")
                ? ["朝霧", "プロフィール", "作品", "連絡先"]
                : ["千景", "プロフィール", "作品", "TRPG", "連絡先"],
            page
        );
        assert.equal(currentLabel, current, page);
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
