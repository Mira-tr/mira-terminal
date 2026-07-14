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
    "apps/web/creators/chikage/trpg/index.html",
    "apps/web/creators/chikage/trpg/rules/index.html"
];

test("Brand pages load the shared Brand shell CSS", async () => {
    for(const page of BRAND_PAGES){
        const html = await read(page);

        assert.match(html, /class="brand-page"/, page);
        assert.match(html, /brand\/index\.css/, page);
        assert.match(html, /class="site-header brand-header"/, page);
        assert.match(html, /class="site-footer brand-footer"/, page);
        assert.match(html, /brand-footer__nav/, page);
        assert.match(html, /href="(?:\.\/|\.\.\/)creators\/"/, `${page}: creators nav`);
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
        "--brand-accent-hover",
        "--brand-accent-contrast",
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

test("Brand logo and Primary CTA keep Light and Dark contrast hooks", async () => {
    const tokens = await read("apps/web/css/brand/tokens.css");
    const components = await read("apps/web/css/brand/components.css");
    const header = await read("apps/web/css/brand/header.css");
    const logo = await read("apps/web/assets/brand/relmua-logo.svg");

    assert.match(logo, />RELMUA<\/text>/);
    assert.doesNotMatch(logo, /RELMAU/);
    assert.match(tokens, /--brand-logo-filter:\s*none;/);
    assert.match(tokens, /\[data-theme="dark"\][\s\S]*--brand-logo-filter:\s*invert/);
    assert.match(header, /filter:\s*var\(--brand-logo-filter\)/);
    assert.match(header, /\.brand-page \.theme-toggle\s*{[\s\S]*border-radius:\s*2px;/);
    assert.match(header, /\.brand-page \.theme-toggle\s*{[\s\S]*background:\s*transparent;/);
    assert.match(header, /\.brand-page \.site-header-inner\s*{[\s\S]*1280px/);
    assert.match(components, /\.brand-page \.brand-button,/);
    assert.match(components, /color:\s*var\(--brand-accent-contrast\)/);
    assert.match(components, /background:\s*var\(--brand-accent\)/);
    assert.match(components, /background:\s*var\(--brand-accent-hover\)/);
});


test("Theme Toggle is placed after navigation in the shared Header", async () => {
    const theme = await read("apps/web/js/theme.js");

    assert.match(theme, /actions\.append\(nav, button\);/);
    assert.doesNotMatch(theme, /actions\.append\(button, nav\);/);
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

test("Creator site CSS and RELMUA pattern asset stay scoped and decorative", async () => {
    const chikageHtml = await read("apps/web/creators/chikage/index.html");
    const creatorsHtml = await read("apps/web/creators/index.html");
    const chikageCss = await read("apps/web/creators/chikage/chikage.css");
    const patternSvg = await read("apps/web/assets/brand/relmua-pattern.svg");
    const compassSvg = await read("apps/web/assets/brand/relmua-compass.svg");
    const chikageMarkSvg = await read("apps/web/assets/creators/chikage-mark.svg");
    const brandTokens = await read("apps/web/css/brand/tokens.css");
    assert.match(chikageHtml, /creators\/chikage\/chikage\.css|\.\/chikage\.css/);
    assert.doesNotMatch(creatorsHtml, /chikage\.css/);
    assert.match(chikageCss, /\.creator-site-page--chikage/);
    assert.doesNotMatch(chikageCss, /^body\s*{|\.brand-page|\.trpg-/m);
    assert.match(brandTokens, /relmua-pattern\.svg/);
    assert.ok(patternSvg.length < 2000);
    assert.doesNotMatch(patternSvg, /<script|<foreignObject|@font-face|url\(/i);
    assert.doesNotMatch(patternSvg, /\b(?:href|src)=["']https?:/i);
    assert.doesNotMatch(patternSvg, /role=|aria-label=/i);

    for(const svg of [compassSvg, chikageMarkSvg]){
        assert.ok(svg.length < 3000);
        assert.doesNotMatch(svg, /<script|<foreignObject|@font-face|url\(/i);
        assert.doesNotMatch(svg, /\b(?:href|src)=["']https?:/i);
        assert.doesNotMatch(svg, /role=|aria-label=/i);
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
