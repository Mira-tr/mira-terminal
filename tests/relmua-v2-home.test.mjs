import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

function mainOf(html){
    return html.match(/<main[\s\S]*?<\/main>/)?.[0] || "";
}

test("RELMUA v2 Home presents NIIA as a brand project and keeps Chikage TRPG out of the visible entrance", async () => {
    const html = await read("apps/web/index.html");
    const config = JSON.parse(await read("apps/web/data/public-home.json"));
    const main = mainOf(html);
    const trpg = config.sections.find(section => section.id === "featured-trpg");

    assert.match(main, /href="\.\/projects\/niia\/"/);
    assert.match(main, /NIIA \/ RELMUA PROJECT/);
    assert.doesNotMatch(main, /href="\.\/creators\/chikage\/trpg\//);
    assert.equal(trpg?.enabled, false);
});

test("RELMUA v2 has a dedicated NIIA project page", async () => {
    const html = await read("apps/web/projects/niia/index.html");
    const css = await read("apps/web/projects/niia/niia.css");

    assert.match(html, /<title>NIIA \| RELMUA<\/title>/);
    assert.match(html, /id="brandPageTitle">NIIA<\/h1>/);
    assert.match(html, /Identity/);
    assert.match(html, /Conversation/);
    assert.match(html, /Runtime/);
    assert.match(html, /Surfaces/);
    assert.match(html, /にーあ/);
    assert.match(html, /ニーア/);
    assert.match(html, /ニア/);
    assert.match(css, /niia-v2-hero\.webp/);
    assert.match(css, /niia-v2-forms\.webp/);
});

test("RELMUA v2 retires the public brightness toggle", async () => {
    const theme = await read("apps/web/js/theme.js");

    assert.match(theme, /dataset\.theme\s*=\s*"light"/);
    assert.doesNotMatch(theme, /theme-toggle|createElement\("button"\)|matchMedia/);
});

test("RELMUA v2 image slots and Work handoff stay synchronized", async () => {
    const homeCss = await read("apps/web/css/home.css");
    const projectsCss = await read("apps/web/projects/css/projects-v2.css");
    const niiaCss = await read("apps/web/projects/niia/niia.css");
    const brief = await read("docs/relmua-v2-image-brief.md");

    const files = [
        "relmua-v2-hero.webp",
        "relmua-v2-element.webp",
        "relmua-v2-niia.webp",
        "relmua-v2-tools.webp",
        "relmua-v2-notes.webp",
        "relmua-v2-chikage.webp",
        "niia-v2-hero.webp",
        "niia-v2-forms.webp"
    ];

    files.forEach(file => assert.match(brief, new RegExp(file.replace(".", "\\.")), file));
    assert.match(homeCss, /relmua-v2-hero\.webp/);
    assert.match(homeCss, /relmua-v2-element\.webp/);
    assert.match(homeCss, /relmua-v2-niia\.webp/);
    assert.match(projectsCss, /relmua-v2-niia\.webp/);
    assert.match(niiaCss, /niia-v2-hero\.webp/);
});
