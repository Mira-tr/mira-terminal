import test from "node:test";
import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

test("Projects Brand refresh uses featured project, grid, and dedicated empty states", async () => {
    const html = await read("apps/web/projects/index.html");
    const css = await read("apps/web/projects/css/projects.css");
    const js = await read("apps/web/projects/js/projects.js");

    assert.match(html, /id="featuredProject"/);
    assert.match(html, /id="projectsGrid"/);
    assert.match(html, /代表作品/);
    assert.match(html, /id="projectsSummary"/);
    assert.match(css, /\/\* Featured Project \/ Feature Block \*\//);
    assert.match(css, /\.project-feature-block/);
    assert.match(css, /\.project-grid/);
    assert.match(css, /\.project-facts/);
    assert.match(css, /\.projects-empty-state/);
    assert.match(js, /createFeaturedProject/);
    assert.match(js, /createProjectCard/);
    assert.match(js, /createProjectFacts/);
    assert.match(js, /updateProjectsSummary/);
    assert.match(js, /createProjectEmptyState/);
    assert.match(js, /featuredProjectId or featuredIds/);
    assert.match(js, /createBrandTextLink\("ホームへ戻る", "\.\.\/"\)/);
    assert.doesNotMatch(css, /backdrop-filter:\s*blur|!important|nth-child/i);
});

test("Tools Brand refresh uses category rail, compact tiles, and launch affordance", async () => {
    const html = await read("apps/web/tools/index.html");
    const css = await read("apps/web/tools/css/tools.css");
    const js = await read("apps/web/tools/js/tools.js");

    assert.match(html, /id="toolsCategoryRail"/);
    assert.match(html, /class="tools-category-label"/);
    assert.match(html, /class="tool-grid"/);
    assert.match(html, /id="toolsSummary"/);
    assert.match(html, /絞り込み機能は後続/);
    assert.match(css, /\/\* Category Labels \*\//);
    assert.match(css, /\.tool-tile/);
    assert.match(css, /\.tool-icon/);
    assert.match(css, /\.tool-tag-list/);
    assert.match(css, /\.tool-launch/);
    assert.match(css, /\.tools-empty-state/);
    assert.match(js, /createToolTile/);
    assert.match(js, /getToolIconLabel/);
    assert.match(js, /updateToolsSummary/);
    assert.match(js, /renderCategoryRail/);
    assert.match(js, /createToolsEmptyState/);
    assert.match(js, /isBrandVisibleTool/);
    assert.match(js, /ハウスルール/);
    assert.match(js, /createBrandTextLink\("連絡する", "\.\.\/contact\/"\)/);
    assert.doesNotMatch(extractElementBlock(html, "toolsCategoryRail"), /<button|<a\s/i);
    assert.doesNotMatch(css, /backdrop-filter:\s*blur|!important|nth-child/i);
});

test("Notes Brand refresh uses category rail and reading-oriented rows", async () => {
    const html = await read("apps/web/notes/index.html");
    const css = await read("apps/web/notes/css/notes.css");
    const js = await read("apps/web/notes/js/notes.js");

    assert.match(html, /id="notesCategoryRail"/);
    assert.match(html, /class="notes-category-label"/);
    assert.match(html, /class="note-list"/);
    assert.match(html, /id="notesSummary"/);
    assert.match(html, /表示順を使用/);
    assert.match(css, /\/\* Category Labels \*\//);
    assert.match(css, /\/\* Note Row \*\//);
    assert.match(css, /\.note-row/);
    assert.match(css, /\.note-row-main/);
    assert.match(css, /\.notes-empty-state/);
    assert.match(js, /createNoteRow/);
    assert.match(js, /updateNotesSummary/);
    assert.match(js, /renderCategoryRail/);
    assert.match(js, /createNotesEmptyState/);
    assert.match(js, /isBrandVisibleNote/);
    assert.match(js, /mira terminal/);
    assert.match(js, /publishedAt/);
    assert.match(js, /createBrandTextLink\("作品を見る", "\.\.\/projects\/"\)/);
    assert.doesNotMatch(extractElementBlock(html, "notesCategoryRail"), /<button|<a\s/i);
    assert.doesNotMatch(css, /@import|backdrop-filter:\s*blur|!important|nth-child/i);
});

test("Projects, Tools, and Notes refresh stays scoped away from Home, Creator, and TRPG", async () => {
    const home = await read("apps/web/index.html");
    const creator = await read("apps/web/creators/chikage/index.html");
    const trpg = await read("apps/web/trpg/index.html");
    const rules = await read("apps/web/trpg/rules/index.html");

    assert.doesNotMatch(home, /projects\/css\/projects\.css|tools\/css\/tools\.css|notes\/css\/notes\.css/);
    [creator, trpg, rules].forEach(source => {
        assert.doesNotMatch(source, /projects\/css\/projects\.css|tools\/css\/tools\.css|notes\/css\/notes\.css/);
        assert.doesNotMatch(source, /project-feature-block|tool-grid|note-list/);
    });
});

test("Brand content pages keep responsive safeguards", async () => {
    const sources = await Promise.all([
        read("apps/web/projects/css/projects.css"),
        read("apps/web/tools/css/tools.css"),
        read("apps/web/notes/css/notes.css")
    ]);

    sources.forEach(css => {
        assert.match(css, /@media \(max-width: 900px\)/);
        assert.match(css, /@media \(max-width: 640px\)/);
        assert.match(css, /minmax\(0,\s*1fr\)|min-width:\s*0/);
        assert.match(css, /overflow-wrap:\s*anywhere/);
    });
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

function extractElementBlock(source, id){
    const start = source.indexOf(`id="${id}"`);

    if(start === -1){
        return "";
    }

    const end = source.indexOf("</div>", start);
    return end === -1
        ? source.slice(start)
        : source.slice(start, end);
}
