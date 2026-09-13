import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    getDefaultBrandSiteConfig,
    validateBrandSiteConfig
} from "../apps/admin/js/features/brand/brandSiteConfig.js";
import {
    createPublicBrandSitePayload,
    validatePublicBrandSitePayload
} from "../apps/admin/js/features/brand/brandSitePublicExport.js";
import {
    getPublicAdminSurface
} from "../apps/admin/js/features/site/publicAdminRegistry.js";
import {
    getPublicExportTargets
} from "../apps/admin/js/features/system/systemInventory.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relativePath => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

function hasAdminOnlyField(value){
    if(Array.isArray(value)) return value.some(hasAdminOnlyField);
    if(!value || typeof value !== "object") return false;
    return Object.entries(value).some(([key, item]) => (
        ["memo", "status", "createdAt", "updatedAt"].includes(key) || hasAdminOnlyField(item)
    ));
}

test("Brand Site defaults produce the checked-in public snapshot without Admin-only fields", () => {
    const config = getDefaultBrandSiteConfig();
    assert.equal(validateBrandSiteConfig(config), true);

    const payload = createPublicBrandSitePayload(config);
    assert.equal(validatePublicBrandSitePayload(payload), true);
    assert.equal(hasAdminOnlyField(payload), false);

    const checkedIn = JSON.parse(read("apps/web/data/public-brand.json"));
    assert.deepEqual(checkedIn, payload);
});

test("About Contact and Navigation share one canonical public-brand target", () => {
    const target = getPublicExportTargets().find(item => item.id === "brand-site");
    assert.deepEqual(target && {
        filename: target.filename,
        destination: target.destination,
        workspace: target.workspace
    }, {
        filename: "public-brand.json",
        destination: "apps/web/data/public-brand.json",
        workspace: "brand"
    });

    ["relmua-about", "relmua-contact", "relmua-navigation"].forEach(id => {
        assert.deepEqual(getPublicAdminSurface(id)?.exportTargetIds, ["brand-site"]);
    });
});

test("Admin Settings exposes real Brand editors and routes saved work to Publish", () => {
    const html = read("apps/admin/system/settings/index.html");
    const runtime = read("apps/admin/js/pages/brandSettingsPage.js");
    const canonical = read("apps/admin/js/features/system/canonicalAdminState.js");

    assert.match(html, /id="brand-navigation"/);
    assert.match(html, /id="brand-about"/);
    assert.match(html, /id="brand-contact"/);
    assert.match(html, /href="\.\.\/publish\/"/);
    assert.match(runtime, /saveBrandSiteCanonical/);
    assert.match(canonical, /hydrateBrandSiteFromCms\(\)/);
    assert.match(canonical, /saveBrandSiteCanonical/);
});

test("Public Brand pages hydrate only marked copy through safe DOM APIs", () => {
    const about = read("apps/web/about/index.html");
    const contact = read("apps/web/contact/index.html");
    const experience = read("apps/web/js/brandExperience.js");
    const runtime = read("apps/web/js/brandContent.js");

    assert.match(about, /data-brand-field="about\.heading\.title"/);
    assert.match(contact, /data-brand-field="contact\.heading\.title"/);
    assert.match(experience, /hydrateBrandPublicContent/);
    assert.match(runtime, /public-brand\.json/);
    assert.match(runtime, /replaceChildren/);
    assert.doesNotMatch(runtime, /innerHTML/);
});

test("Public Snapshot Package registers Brand Site as the ninth generated file", () => {
    const packageSource = read("apps/admin/js/features/system/publish/publicSnapshotPackage.js");
    const dynamicTargets = getPublicExportTargets().filter(target => target.filename !== "static-html");

    assert.equal(dynamicTargets.length, 9);
    assert.match(packageSource, /\["brand-site", createPublicBrandSitePayload\(loadBrandSiteConfig\(\)\)\]/);
});
