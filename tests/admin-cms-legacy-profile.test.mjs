import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

test("legacy Profile hydrates and saves through the Creator CMS authority", async () => {
    const store = await read("apps/admin/js/features/profile/profileStore.js");
    const form = await read("apps/admin/js/features/profile/profileForm.js");
    const backup = await read("apps/admin/js/features/profile/profileBackup.js");
    const page = await read("apps/admin/js/pages/profilePage.js");

    assert.match(store, /hydrateCreatorsFromCms/);
    assert.match(store, /updateCreatorCanonical/);
    assert.match(store, /export async function saveProfileCanonical/);
    assert.match(form, /await saveProfileCanonical\(profile\)/);
    assert.match(backup, /await saveProfileCanonical\(data\.profile\)/);
    assert.match(page, /await hydrateProfileFromCms\(\)/);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
