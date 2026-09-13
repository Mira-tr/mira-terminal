import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath){
    return readFileSync(new URL(`../${relativePath}`,import.meta.url),"utf8");
}

const activePublicPages = [
    "apps/web/creators/chikage/index.html",
    "apps/web/creators/chikage/works/index.html",
    "apps/web/creators/chikage/profile/index.html",
    "apps/web/creators/chikage/contact/index.html",
    "apps/web/creators/chikage/trpg/index.html",
    "apps/web/creators/chikage/trpg/scheduler/index.html",
    "apps/web/creators/chikage/trpg/calendar/index.html",
    "apps/web/creators/chikage/trpg/scenarios/index.html",
    "apps/web/creators/chikage/trpg/rules/index.html",
    "apps/web/creators/chikage/trpg/picker/index.html"
];

test("every active Chikage public page loads the final visual and motion layers",() => {
    for(const path of activePublicPages){
        const html = read(path);
        assert.match(html,/chikage-ultimate\.css\?v=/,`${path}: final style layer`);
        assert.match(html,/chikage-motion\.js\?v=/,`${path}: progressive motion layer`);
        assert.ok(
            html.indexOf("chikage-ultimate.css") < html.indexOf("</head>"),
            `${path}: final style belongs in the document head`
        );
    }
});

test("Chikage motion remains progressive, safe, and accessibility aware",() => {
    const script = read("apps/web/creators/chikage/js/chikage-motion.js");
    const css = read("apps/web/creators/chikage/css/chikage-ultimate.css");

    assert.match(script,/IntersectionObserver/);
    assert.match(script,/MutationObserver/);
    assert.match(script,/requestAnimationFrame/);
    assert.match(script,/prefers-reduced-motion/);
    assert.doesNotMatch(script,/innerHTML/);
    assert.match(css,/\.ch-motion-ready \[data-ch-reveal\]/);
    assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
    assert.match(css,/body\.creator-site-page--chikage/);
    assert.match(css,/body\.trpg-v3/);
});

test("Chikage Admin completion layer preserves the final Creator bridge contract",() => {
    const entry = read("apps/admin/css/style.css");
    const css = read("apps/admin/css/pages/chikage-ultimate.css");
    const imports = [...entry.matchAll(/@import\s+"([^"]+)"/g)].map(match => match[1]);

    const completionIndex = imports.indexOf("./pages/chikage-ultimate.css");
    const bridgeIndex = imports.indexOf("./pages/public-admin-bridge.css");
    assert.ok(completionIndex >= 0);
    assert.equal(bridgeIndex,completionIndex + 1);
    assert.equal(imports.at(-1),"./pages/public-admin-bridge.css");
    assert.match(css,/html:has\(body\.creator-admin--chikage\)/);
    assert.match(css,/overflow-x:clip/);
    assert.match(css,/\.admin-main :where\(h1,h2,h3,h4,h5,h6\)/);
    assert.match(css,/\.dashboard>\.card/);
    assert.match(css,/\.creator-feature-content \.admin-workspace/);
    assert.match(css,/@keyframes ch-admin-enter/);
    assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
});

test("the RELMUA brand home does not load Chikage's completion layer",() => {
    const brandHome = read("apps/web/index.html");
    assert.doesNotMatch(brandHome,/chikage-ultimate\.css|chikage-motion\.js/);
});

test("Admin resolves the shared RELMUA motif from its deeper CSS path",() => {
    const css = read("apps/admin/css/components/public-aligned.css");
    assert.match(css,/--brand-pattern:url\("\.\.\/\.\.\/\.\.\/assets\/brand\/relmua-pattern\.svg"\)/);
});
