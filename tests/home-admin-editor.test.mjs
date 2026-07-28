import test from "node:test";
import assert from "node:assert/strict";
import {
    access,
    readFile
} from "node:fs/promises";

import {
    getBrandSections
} from "../apps/admin/js/features/brand/brandSectionRegistry.js";

const ROOT = new URL("../", import.meta.url);

test("Home Admin Editor is connected from canonical Admin and Desktop navigation", async () => {
    const homeSection = getBrandSections().find(section => section.id === "brand-home");
    const dashboard = await read("apps/admin/js/features/common/adminDashboard.js");
    const studioApp = await read("apps/studio/src/app/studioApp.js");
    const html = await read("apps/admin/home/index.html");

    assert.equal(homeSection.status, "active");
    assert.equal(homeSection.adminPath, "../home/");
    assert.equal("plannedAdminPath" in homeSection, false);
    await access(new URL("apps/admin/home/index.html", ROOT));

    assert.match(dashboard, /id:\s*"brand"/);
    assert.match(dashboard, /getAdminRoute\("brand"\)/);
    assert.doesNotMatch(dashboard, /HOME_CONFIG_KEY|normalizeHomeConfig|validateHomeConfig|saveHomeConfig|loadHomeConfig/);
    assert.match(studioApp, /createWorkspaceItem\("ホーム", adminHref\("homeEditor"\), "active"\)/);
    assert.match(studioApp, /getAdminRoute/);
    assert.doesNotMatch(studioApp, /\.\.\/admin\/terminal\//);
    assert.match(html, /homePage\.js/);
    assert.match(html, /<li>Brand<\/li>/);
    assert.match(html, /<li aria-current="page">Home<\/li>/);
});

test("Home Admin Editor uses Home Store API and only adds Public Export", async () => {
    const page = await read("apps/admin/js/pages/homePage.js");
    const form = await read("apps/admin/js/features/home/homeForm.js");
    const html = await read("apps/admin/home/index.html");

    assert.match(page, /loadHomeConfig/);
    assert.match(page, /saveHomeConfig/);
    assert.match(page, /resetHomeConfig/);
    assert.match(page, /validateHomeConfig/);
    assert.match(page, /exportPublicHome/);
    assert.match(page, /state\.dirty/);
    assert.match(page, /\$\{contract\.filename\} を作りました/);
    assert.match(page, /未保存の変更があります。公開用データを作る前に保存してください。/);
    assert.doesNotMatch(page, /localStorage|getItem|setItem|Backup|Import/);
    assert.doesNotMatch(form, /localStorage|getItem|setItem|exportPublic|Backup|Import|public-home\.json/);
    assert.match(html, /homePublicExportBtn/);
    assert.match(html, /公開用データを作る/);
    assert.match(html, /通常は意識しなくて大丈夫です。/);
    assert.doesNotMatch(html, /apps\/web\/data\/public-home\.json/);
    assert.doesNotMatch(html, /Backup Export|Backup Import|Import/);
});

test("Home Form keeps section id and type fixed and hides Hero-only irrelevant fields", async () => {
    const form = await read("apps/admin/js/features/home/homeForm.js");

    assert.match(form, /panel\.dataset\.homeSectionId\s*=\s*section\.id/);
    assert.match(form, /panel\.dataset\.homeSectionType\s*=\s*section\.type/);
    assert.match(form, /createMeta\("場所",\s*section\.id\)/);
    assert.match(form, /createMeta\("種類",\s*TYPE_LABELS\[section\.type\] \|\| section\.type\)/);
    assert.match(form, /FIELD_LABELS/);
    assert.match(form, /表示する/);
    assert.doesNotMatch(form, /data-home-field="id"|data-home-field="type"/);
    assert.match(form, /if\(section\.type !== "hero"\)/);
    assert.match(form, /selection\.value !== "manual"/);
    assert.match(form, /split by newline or comma/);
    assert.match(form, /must not contain commas/);
});

test("Home Admin core keeps DOM out of Store and Validation", async () => {
    const store = await read("apps/admin/js/features/home/homeStore.js");
    const validation = await read("apps/admin/js/features/home/homeValidation.js");

    [store, validation].forEach(source => {
        assert.doesNotMatch(source, /\bdocument\b|\bcreateElement\b|\bquerySelector\b|\binnerHTML\b/);
    });
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
