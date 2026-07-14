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
    assert.match(html, /公開領域/);
    assert.match(html, /活動者との関係/);
    assert.match(html, /作品/);
    assert.match(html, /道具/);
    assert.match(html, /記録/);
    assert.match(html, /活動者/);
    assert.doesNotMatch(extractMain(html), /Workspace|Registry|Export/);
    assert.doesNotMatch(extractMain(html), /TRPG|House Rules|Scenario Library/);
    assert.match(css, /\.about-prose/);
    assert.match(css, /\.about-area-list/);
    assert.doesNotMatch(css, /backdrop-filter:\s*blur|!important|nth-child/i);
});

test("Contact Brand refresh separates brand and creator contact responsibilities", async () => {
    const html = await read("apps/web/contact/index.html");
    const css = await read("apps/web/contact/css/contact.css");

    assert.match(html, /連絡方針/);
    assert.match(html, /公式窓口/);
    assert.match(html, /活動者への連絡/);
    assert.match(html, /注意/);
    assert.match(html, /href="\.\.\/creators\/"/);
    assert.match(html, /個人サイト/);
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
    assert.match(html, /人物紹介/);
    assert.match(html, /公開中の活動者/);
    assert.match(html, /creator-empty-state/);
    assert.ok(Array.isArray(payload.creators));
    assert.match(js, /normalizeCreators/);
    assert.match(js, /createCreatorCard/);
    assert.match(js, /usedIds\.has\(creator\.id\)/);
    assert.match(js, /HIDDEN_LIST_ACTIVITIES/);
    assert.match(js, /CREATOR_RELATED_LIMIT = 3/);
    assert.match(js, /function isVisibleListActivity/);
    assert.doesNotMatch(js, /normalize(?:Projects|Tools|Notes)/);
    assert.match(js, /creatorTrpg/);
    assert.match(js, /creator\.displayName.*サイトへ/s);
    assert.doesNotMatch(extractMain(html), /TRPG|House Rules|Scenario Library/);
    assert.doesNotMatch(html, /<img[^>]+creator|avatar/i);
    assert.doesNotMatch(js, /createElement\("img"\)/);
    assert.doesNotMatch(js, /getCreatorInitial|avatar\.textContent/);
    assert.match(css, /\.creators-index-page/);
    assert.match(css, /\.creator-card__avatar/);
    assert.match(css, /\.creator-card__avatar::before/);
    assert.match(css, /\.creator-card__avatar--asagiri::before/);
    assert.match(css, /\.creator-empty-state/);
    assert.doesNotMatch(css, /backdrop-filter:\s*blur|!important|nth-child/i);
});

test("Brand information refresh stays scoped away from Home, content pages, Creator Site, and TRPG", async () => {
    const home = await read("apps/web/index.html");
    const projects = await read("apps/web/projects/index.html");
    const tools = await read("apps/web/tools/index.html");
    const notes = await read("apps/web/notes/index.html");
    const creatorDetail = await read("apps/web/creators/chikage/index.html");
    const chikageCss = await read("apps/web/creators/chikage/chikage.css");
    const chikageWorks = await read("apps/web/creators/chikage/works/index.html");
    const asagiriWorks = await read("apps/web/creators/asagiri/works/index.html");
    const trpg = await read("apps/web/creators/chikage/trpg/index.html");
    const rules = await read("apps/web/creators/chikage/trpg/rules/index.html");

    [home, projects, tools, notes, creatorDetail, trpg, rules].forEach(source => {
        assert.doesNotMatch(source, /about\/css\/about\.css|contact\/css\/contact\.css/);
        assert.doesNotMatch(source, /about-brand-page|contact-page|creators-index-page/);
    });

    assert.match(creatorDetail, /href="\.\/trpg\/"/);
    assert.match(creatorDetail, /href="\.\/trpg\/rules\/"/);
    assert.match(creatorDetail, /aria-label="千景サイト内"/);
    assert.match(creatorDetail, /RELMUAへ戻る/);
    assert.doesNotMatch(creatorDetail, /href="\.\.\/\.\.\/(?:projects|tools|notes)\/"/);
    assert.doesNotMatch(creatorDetail, /data-(?:projects|tools|notes|trpg)-data-url/);
    assert.doesNotMatch(creatorDetail, /id="creator(?:Projects|Tools|Notes|Trpg)"/);
    assert.doesNotMatch(chikageWorks, /href="\.\.\/\.\.\/\.\.\/(?:projects|tools|notes)\/"/);
    assert.doesNotMatch(chikageWorks, /relmua-project-element|relmua-notes-desk/);
    assert.doesNotMatch(chikageCss, /relmua-project-element|relmua-notes-desk/);
    assert.match(chikageCss, /chikage-works\.svg/);
    assert.match(chikageCss, /chikage-contact\.svg/);
    assert.doesNotMatch(asagiriWorks, /href="\.\.\/\.\.\/\.\.\/(?:projects|tools|notes)\/"/);
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
