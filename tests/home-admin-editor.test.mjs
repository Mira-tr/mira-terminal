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

test("Home Admin Editor is connected from Brand Workspace and Admin Dashboard", async () => {
    const homeSection = getBrandSections().find(section => section.id === "brand-home");
    const dashboard = await read("apps/admin/js/features/common/adminDashboard.js");
    const html = await read("apps/admin/home/index.html");

    assert.equal(homeSection.status, "active");
    assert.equal(homeSection.adminPath, "../home/");
    assert.equal("plannedAdminPath" in homeSection, false);
    await access(new URL("apps/admin/home/index.html", ROOT));

    assert.match(dashboard, /id:\s*"home"/);
    assert.match(dashboard, /href:\s*"\.\/home\/index\.html"/);
    assert.doesNotMatch(dashboard, /HOME_CONFIG_KEY|normalizeHomeConfig|validateHomeConfig|saveHomeConfig|loadHomeConfig/);
    assert.match(html, /homePage\.js/);
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
    assert.match(page, /Exported \$\{contract\.filename\}/);
    assert.doesNotMatch(page, /localStorage|getItem|setItem|Backup|Import/);
    assert.doesNotMatch(form, /localStorage|getItem|setItem|exportPublic|Backup|Import|public-home\.json/);
    assert.match(html, /homePublicExportBtn/);
    assert.match(html, /public-home\.json/);
    assert.match(html, /apps\/web\/data\/public-home\.json/);
    assert.doesNotMatch(html, /Backup Export|Backup Import|Import/);
});

test("Home Form keeps section id and type fixed and hides Hero-only irrelevant fields", async () => {
    const form = await read("apps/admin/js/features/home/homeForm.js");

    assert.match(form, /panel\.dataset\.homeSectionId\s*=\s*section\.id/);
    assert.match(form, /panel\.dataset\.homeSectionType\s*=\s*section\.type/);
    assert.match(form, /createMeta\("Section ID",\s*section\.id\)/);
    assert.match(form, /createMeta\("Type",\s*section\.type\)/);
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
