import test from "node:test";
import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

test("About Brand refresh is prose-led and keeps public areas brand-scoped", async () => {
    const html = await read("apps/web/about/index.html");
    const css = await read("apps/web/about/css/about.css");

    assert.match(html, /RELMUAとは/);
    assert.match(html, /Why/);
    assert.match(html, /Public Areas/);
    assert.match(html, /Creator Relationship/);
    assert.match(html, /Projects/);
    assert.match(html, /Tools/);
    assert.match(html, /Notes/);
    assert.match(html, /Creators/);
    assert.doesNotMatch(extractMain(html), /Workspace|Registry|Export/);
    assert.doesNotMatch(extractMain(html), /TRPG|House Rules|Scenario Library/);
    assert.match(css, /\.about-prose/);
    assert.match(css, /\.about-area-list/);
    assert.doesNotMatch(css, /backdrop-filter:\s*blur|!important|nth-child/i);
});

test("Contact Brand refresh separates brand and creator contact responsibilities", async () => {
    const html = await read("apps/web/contact/index.html");
    const css = await read("apps/web/contact/css/contact.css");

    assert.match(html, /Contact Policy/);
    assert.match(html, /Official Contact/);
    assert.match(html, /Creator Contact/);
    assert.match(html, /Notice/);
    assert.match(html, /href="\.\.\/creators\/"/);
    assert.match(html, /Creator Site/);
    assert.doesNotMatch(extractSection(html, "officialContactTitle"), /mailto:|SNS|Twitter|X\.com|https?:\/\/|example\./i);
    assert.doesNotMatch(extractMain(html), /TRPG|House Rules|Scenario Library/);
    assert.match(css, /\.contact-panel/);
    assert.match(css, /@media \(max-width: 760px\)/);
    assert.doesNotMatch(css, /backdrop-filter:\s*blur|!important|nth-child/i);
});

test("Creators Brand refresh uses public creators JSON and keeps module details out of list UI", async () => {
    const html = await read("apps/web/creators/index.html");
    const css = await read("apps/web/creators/css/creators.css");
    const js = await read("apps/web/creators/js/creators.js");
    const payload = JSON.parse(await read("apps/web/data/public-creators.json"));

    assert.match(html, /data-creators-data-url="\.\.\/data\/public-creators\.json"/);
    assert.match(html, /Creators Intro/);
    assert.match(html, /Creator List/);
    assert.match(html, /creator-empty-state/);
    assert.ok(Array.isArray(payload.creators));
    assert.match(js, /normalizeCreators/);
    assert.match(js, /createCreatorCard/);
    assert.match(js, /HIDDEN_LIST_ACTIVITIES/);
    assert.match(js, /function isVisibleListActivity/);
    assert.match(js, /Visit Creator/);
    assert.doesNotMatch(extractMain(html), /TRPG|House Rules|Scenario Library/);
    assert.doesNotMatch(html, /<img[^>]+creator|avatar/i);
    assert.doesNotMatch(js, /createElement\("img"\)/);
    assert.match(css, /\.creators-index-page/);
    assert.match(css, /\.creator-card__avatar/);
    assert.match(css, /\.creator-empty-state/);
    assert.doesNotMatch(css, /backdrop-filter:\s*blur|!important|nth-child/i);
});

test("Brand information refresh stays scoped away from Home, content pages, Creator Site, and TRPG", async () => {
    const home = await read("apps/web/index.html");
    const projects = await read("apps/web/projects/index.html");
    const tools = await read("apps/web/tools/index.html");
    const notes = await read("apps/web/notes/index.html");
    const creatorDetail = await read("apps/web/creators/chikage/index.html");
    const trpg = await read("apps/web/trpg/index.html");
    const rules = await read("apps/web/trpg/rules/index.html");

    [home, projects, tools, notes, creatorDetail, trpg, rules].forEach(source => {
        assert.doesNotMatch(source, /about\/css\/about\.css|contact\/css\/contact\.css/);
        assert.doesNotMatch(source, /about-brand-page|contact-page|creators-index-page/);
    });

    assert.match(creatorDetail, /href="\.\.\/\.\.\/trpg\/"/);
    assert.match(creatorDetail, /href="\.\.\/\.\.\/trpg\/rules\/"/);
});

test("Brand information pages keep responsive and accessibility basics", async () => {
    const sources = await Promise.all([
        read("apps/web/about/css/about.css"),
        read("apps/web/contact/css/contact.css"),
        read("apps/web/creators/css/creators.css")
    ]);
    const pages = await Promise.all([
        read("apps/web/about/index.html"),
        read("apps/web/contact/index.html"),
        read("apps/web/creators/index.html")
    ]);

    sources.forEach(css => {
        assert.match(css, /@media \(max-width: 760px\)/);
        assert.match(css, /@media \(max-width: 640px\)/);
    });

    pages.forEach(html => {
        assert.match(html, /<main class="page brand-main/);
        assert.match(html, /aria-labelledby="brandPageTitle"/);
        assert.match(html, /<h1 id="brandPageTitle"/);
    });
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

function extractMain(html){
    return html.match(/<main[\s\S]*?<\/main>/)?.[0] || "";
}

function extractSection(html, headingId){
    const heading = html.indexOf(`id="${headingId}"`);

    if(heading === -1){
        return "";
    }

    const start = html.lastIndexOf("<section", heading);
    const end = html.indexOf("</section>", heading);
    return start === -1 || end === -1
        ? ""
        : html.slice(start, end);
}
