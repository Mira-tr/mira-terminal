import test from "node:test";
import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

const BRAND_PAGES = [
    "apps/web/index.html",
    "apps/web/projects/index.html",
    "apps/web/tools/index.html",
    "apps/web/notes/index.html",
    "apps/web/creators/index.html",
    "apps/web/about/index.html",
    "apps/web/contact/index.html"
];

const EXCLUDED_PAGES = [
    "apps/web/creators/chikage/index.html",
    "apps/web/trpg/index.html",
    "apps/web/trpg/rules/index.html"
];

test("Brand pages load the shared Brand shell CSS", async () => {
    for(const page of BRAND_PAGES){
        const html = await read(page);

        assert.match(html, /class="brand-page"/, page);
        assert.match(html, /brand\/index\.css/, page);
        assert.match(html, /class="site-header brand-header"/, page);
        assert.match(html, /class="site-footer brand-footer"/, page);
        assert.match(html, /brand-footer__nav/, page);
    }
});

test("Brand page titles live in main, not in the Header", async () => {
    for(const page of BRAND_PAGES){
        const html = await read(page);
        const header = matchBlock(html, "header");
        const main = matchBlock(html, "main");

        assert.doesNotMatch(header, /<h1\b|site-lead/, page);
        assert.match(main, /class="brand-page-heading"/, page);
        assert.match(main, /<h1\b/, page);
    }
});

test("Creator site and TRPG pages are excluded from Brand shell CSS", async () => {
    for(const page of EXCLUDED_PAGES){
        const html = await read(page);

        assert.doesNotMatch(html, /brand-page|brand\/index\.css|brand-footer__nav/, page);
    }
});

test("Brand tokens expose the v2 design primitives", async () => {
    const tokens = await read("apps/web/css/brand/tokens.css");

    [
        "--brand-bg",
        "--brand-bg-soft",
        "--brand-surface",
        "--brand-surface-subtle",
        "--brand-border",
        "--brand-border-strong",
        "--brand-text",
        "--brand-text-muted",
        "--brand-text-subtle",
        "--brand-accent",
        "--brand-accent-soft",
        "--brand-accent-ink",
        "--brand-text-display",
        "--brand-text-page-title",
        "--brand-text-section-title",
        "--brand-text-card-title",
        "--brand-text-body",
        "--brand-text-caption",
        "--brand-space-4",
        "--brand-space-8",
        "--brand-space-12",
        "--brand-space-16",
        "--brand-space-24",
        "--brand-space-32",
        "--brand-space-48",
        "--brand-space-64",
        "--brand-space-96",
        "--brand-space-128",
        "--brand-radius-small",
        "--brand-radius-medium",
        "--brand-radius-large",
        "--brand-shadow-soft"
    ].forEach(token => assert.match(tokens, new RegExp(token), token));
});

test("Brand CSS is split by responsibility and avoids glass blur", async () => {
    const index = await read("apps/web/css/brand/index.css");
    const files = [
        "tokens",
        "base",
        "layout",
        "components",
        "header",
        "footer",
        "utilities"
    ];

    assert.deepEqual(
        index.trim().split(/\r?\n/),
        files.map(name => `@import "./${name}.css";`)
    );

    for(const file of files){
        const css = await read(`apps/web/css/brand/${file}.css`);
        assert.doesNotMatch(css, /backdrop-filter:\s*blur/i, file);
        assert.doesNotMatch(css, /!important/i, file);
    }
});

test("Brand Footer hides empty Social area without adding fake links", async () => {
    const footer = await read("apps/web/css/brand/footer.css");

    assert.match(footer, /\.brand-footer__social:empty\s*{\s*display:\s*none;/s);

    for(const page of BRAND_PAGES){
        const html = await read(page);
        const social = html.match(/<div class="brand-footer__social"[^>]*><\/div>/);

        assert.ok(social, page);
        assert.doesNotMatch(html, /https?:\/\/(?:x|twitter|github|instagram|youtube)\.com/i, page);
    }
});

test("Brand Shell keeps keyboard focus available", async () => {
    const base = await read("apps/web/css/brand/base.css");
    const header = await read("apps/web/css/brand/header.css");

    assert.match(base, /\.brand-page :focus-visible\s*{/);
    assert.match(base, /outline:\s*2px solid var\(--brand-accent\)/);
    assert.doesNotMatch(`${base}\n${header}`, /outline:\s*none/i);

    for(const page of BRAND_PAGES){
        const html = await read(page);

        assert.doesNotMatch(html, /tabindex="-1"/, page);
        assert.match(html, /<nav class="header-nav"/, page);
        assert.match(html, /<a class="nav-item"[^>]+href=/, page);
    }
});

test("Brand selectors stay scoped without excessive specificity", async () => {
    const css = await Promise.all(
        [
            "base",
            "layout",
            "components",
            "header",
            "footer",
            "utilities"
        ].map(file => read(`apps/web/css/brand/${file}.css`))
    );

    const source = css.join("\n");

    assert.doesNotMatch(source, /body\.brand-page\s+[^,{]+\s+[^,{]+\s+[^,{]+\s+[^,{]+\s+[^,{]+/);
    assert.doesNotMatch(source, /!important/i);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

function matchBlock(html, tagName){
    const match = html.match(new RegExp(`<${tagName}\\b[\\s\\S]*?<\\/${tagName}>`, "i"));
    assert.ok(match, `${tagName} block must exist`);
    return match[0];
}
