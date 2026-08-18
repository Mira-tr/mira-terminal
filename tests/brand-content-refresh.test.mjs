import test from "node:test";
import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

test("Projects presents the current concept as an honest dossier instead of an inflated gallery", async () => {
    const html = await read("apps/web/projects/index.html");
    const css = await read("apps/web/projects/css/projects.css");
    const js = await read("apps/web/projects/js/projects.js");

    assert.match(html, /id="featuredProject"/);
    assert.match(html, /Project count/);
    assert.match(html, /企画概要・設計思想/);
    assert.match(html, /体験版・映像・配布物/);
    assert.match(html, /class="projects-grid-section" hidden/);
    assert.match(html, /id="projectsSummary"/);
    assert.doesNotMatch(html, /代表作品|展示室|Featured指定/);
    assert.match(css, /\/\* Current Project \/ Project Dossier \*\//);
    assert.match(css, /\.project-feature-block/);
    assert.match(css, /\.project-feature-detail/);
    assert.match(css, /\.project-statement/);
    assert.match(css, /\.project-current-state/);
    assert.match(css, /\.project-feature-visual__caption/);
    assert.match(css, /\.project-grid/);
    assert.match(css, /\.project-facts/);
    assert.match(css, /\.projects-empty-state/);
    assert.equal(css.match(/relmua-project-element\.webp/g)?.length, 1);
    assert.match(js, /createFeaturedProject/);
    assert.match(js, /createProjectStatement/);
    assert.match(js, /createProjectCurrentState/);
    assert.match(js, /splitDescription/);
    assert.match(js, /createProjectCard/);
    assert.match(js, /createProjectFacts/);
    assert.match(js, /updateProjectsSummary/);
    assert.match(js, /createProjectEmptyState/);
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
    assert.match(html, /aria-current="page">道具/);
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
    assert.match(js, /safePath/);
    assert.match(js, /ハウスルール/);
    assert.match(js, /createBrandTextLink\("連絡する", "\.\.\/contact\/"\)/);
    assert.doesNotMatch(extractElementBlock(html, "toolsCategoryRail"), /<button|<a\s/i);
    assert.doesNotMatch(css, /backdrop-filter:\s*blur|!important|nth-child/i);
});

test("Image Toolkit is a browser-only internal Brand tool", async () => {
    const html = await read("apps/web/tools/image-toolkit/index.html");
    const css = await read("apps/web/tools/image-toolkit/css/image-toolkit.css");
    const js = await read("apps/web/tools/image-toolkit/js/image-toolkit.js");
    const catalog = JSON.parse(await read("apps/web/tools/data/public-tools.json"));
    const tool = catalog.tools.find(item => item.id === "image-toolkit");

    assert.equal(tool.path, "./image-toolkit/");
    assert.match(html, /id="imageInput"/);
    assert.match(html, /id="processButton"/);
    assert.match(html, /id="resultList"/);
    assert.match(html, /ブラウザ内で処理/);
    assert.match(js, /document\.createElement\("canvas"\)/);
    assert.match(js, /canvas\.toBlob/);
    assert.match(js, /URL\.createObjectURL/);
    assert.doesNotMatch(js, /fetch\(|XMLHttpRequest|sendBeacon|innerHTML/);
    assert.match(css, /\.drop-zone/);
    assert.match(css, /\.result-item/);
    assert.match(css, /@media \(max-width: 900px\)/);
    assert.match(css, /@media \(max-width: 640px\)/);
});

test("Chikage Schedule v2.1 separates dashboard, direct answer, and actions", async () => {
    const html = await read("apps/web/creators/chikage/trpg/scheduler/index.html");
    const css = await read("apps/web/creators/chikage/trpg/scheduler/css/scheduler.css");
    const app = await read("apps/web/creators/chikage/trpg/scheduler/js/app.js");
    const math = await read("apps/web/creators/chikage/trpg/scheduler/js/schedulerMath.js");
    const storage = await read("apps/web/creators/chikage/trpg/scheduler/js/storage.js");
    const docs = await read("docs/spec/schedule/table-scheduler.md");

    assert.match(html, /RELMUA Schedule/);
    assert.match(html, /id="dashboardView"/);
    assert.match(html, /id="createView"/);
    assert.match(html, /id="detailView"/);
    assert.match(html, /data-dashboard-filter="all"/);
    assert.match(html, /data-action="new-schedule"/);
    assert.match(html, /data-action="toggle-share"/);
    assert.match(html, /id="guestNameInput"/);
    assert.match(html, /id="answerList"/);
    assert.match(html, /id="quickBulk"/);
    assert.match(html, /id="unansweredOnly"/);
    assert.match(html, /id="saveState"/);
    assert.match(html, /id="answerCompleteState"/);
    assert.match(html, /id="participantList"/);
    assert.match(html, /id="recommendedList"/);
    assert.match(html, /id="detailsTable"/);
    assert.match(html, /id="planList"/);
    assert.match(html, /app\.js/);
    assert.doesNotMatch(html, /class="schedule-tabs"/);
    assert.match(app, /__relmuaScheduleMetrics/);
    assert.match(app, /function renderDashboard/);
    assert.match(app, /function renderAnswerView/);
    assert.match(app, /function renderResultsView/);
    assert.match(app, /function openSchedule/);
    assert.match(app, /function createScheduleFromForm/);
    assert.doesNotMatch(app, /function renderAll|renderAll\(/);
    assert.doesNotMatch(app, /fetch\(|XMLHttpRequest|sendBeacon|innerHTML/);
    assert.match(math, /export function deriveScheduleSummary/);
    assert.match(math, /export function summarizeResponses/);
    assert.match(math, /export function buildCompletionPlans/);
    assert.match(storage, /createLocalStorageAdapter/);
    assert.match(storage, /relmua_schedule_v3/);
    assert.match(css, /\.schedule-row/);
    assert.match(css, /\.dashboard-filters/);
    assert.match(css, /\.answer-row/);
    assert.match(css, /\.answer-buttons/);
    assert.match(css, /\.recommend-row/);
    assert.match(css, /@media \(max-width: 430px\)/);
    assert.match(docs, /Adjustment Window/);
    assert.match(docs, /availability_blocks/);
    assert.match(docs, /session_plans/);
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
    const trpg = await read("apps/web/creators/chikage/trpg/index.html");
    const rules = await read("apps/web/creators/chikage/trpg/rules/index.html");

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
