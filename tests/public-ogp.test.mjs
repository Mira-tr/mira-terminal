import test from "node:test";
import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";

const PUBLIC_PAGES = [
    "apps/web/404.html",
    "apps/web/index.html",
    "apps/web/about/index.html",
    "apps/web/trpg/index.html",
    "apps/web/trpg/rules/index.html",
    "apps/web/game/index.html",
    "apps/web/tools/index.html",
    "apps/web/notes/index.html"
];

const EXPECTED_META = [
    ["property", "og:title", "MIRA Terminal"],
    ["property", "og:description", "MIRAの創作・TRPG・ゲーム制作・ツールをまとめる個人ターミナルです。"],
    ["property", "og:image", "https://mira-tr.github.io/mira-terminal/assets/ogp/mira-terminal.png"],
    ["property", "og:url", "https://mira-tr.github.io/mira-terminal/"],
    ["property", "og:type", "website"],
    ["name", "twitter:card", "summary_large_image"],
    ["name", "twitter:title", "MIRA Terminal"],
    ["name", "twitter:description", "MIRAの創作・TRPG・ゲーム制作・ツールをまとめる個人ターミナルです。"],
    ["name", "twitter:image", "https://mira-tr.github.io/mira-terminal/assets/ogp/mira-terminal.png"]
];

test("全Publicページに共通OGPとTwitter Cardがある", async ()=>{
    for(const page of PUBLIC_PAGES){
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
