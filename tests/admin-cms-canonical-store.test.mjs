import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    hydrateGlobalCmsSnapshot,
    persistGlobalCmsSnapshot
} from "../apps/admin/js/features/cms/cmsCanonicalStore.js";

const ROOT = new URL("../", import.meta.url);

function createContract(events = [], local = { items: ["local"] }){
    return {
        collection: "notes",
        recordKey: "collection",
        status: "private",
        readLocal: () => local,
        normalize: value => ({
            items: Array.isArray(value?.items) ? [...value.items] : []
        }),
        validate(value){
            assert.ok(Array.isArray(value.items));
        },
        writeCache(value){
            events.push(["cache", value]);
        }
    };
}

function adminAccess(){
    return {
        configured: true,
        authenticated: true,
        isAdmin: true
    };
}

test("CMS hydrate treats an existing Admin snapshot as authoritative", async () => {
    const events = [];
    const result = await hydrateGlobalCmsSnapshot(
        createContract(events),
        {
            getAccessState: async () => adminAccess(),
            getRecord: async (collection, recordKey, ownerCreatorId) => {
                assert.equal(collection, "notes");
                assert.equal(recordKey, "collection");
                assert.equal(ownerCreatorId, null);
                return {
                    data: { items: ["cms"] },
                    updated_at: "2026-09-11T08:00:00.000Z"
                };
            },
            upsertRecord: async () => assert.fail("existing snapshot must not be seeded")
        }
    );

    assert.deepEqual(result.value, { items: ["cms"] });
    assert.equal(result.source, "cms");
    assert.equal(result.authoritative, true);
    assert.deepEqual(events, [["cache", { items: ["cms"] }]]);
});

test("CMS hydrate seeds the first global snapshot from the compatibility cache", async () => {
    const events = [];
    let payload = null;
    const result = await hydrateGlobalCmsSnapshot(
        createContract(events),
        {
            getAccessState: async () => adminAccess(),
            getRecord: async () => null,
            upsertRecord: async value => {
                payload = value;
                return { updated_at: "2026-09-11T08:01:00.000Z" };
            }
        }
    );

    assert.equal(result.source, "cms-seeded");
    assert.equal(result.authoritative, true);
    assert.equal(payload.ownerCreatorId, null);
    assert.equal(payload.status, "private");
    assert.deepEqual(payload.data, { items: ["local"] });
    assert.deepEqual(events, [["cache", { items: ["local"] }]]);
});

test("canonical save commits DB before updating the local cache", async () => {
    const order = [];
    const contract = createContract([], { items: [] });
    contract.writeCache = value => order.push(["cache", value]);

    const result = await persistGlobalCmsSnapshot(
        contract,
        { items: ["new"] },
        {
            getAccessState: async () => adminAccess(),
            getRecord: async () => null,
            upsertRecord: async payload => {
                order.push(["db", payload.data]);
                return { updated_at: "2026-09-11T08:02:00.000Z" };
            }
        }
    );

    assert.equal(result.authoritative, true);
    assert.deepEqual(order, [
        ["db", { items: ["new"] }],
        ["cache", { items: ["new"] }]
    ]);
});

test("configured signed-out sessions cannot create browser-only canonical saves", async () => {
    const events = [];

    await assert.rejects(
        persistGlobalCmsSnapshot(
            createContract(events),
            { items: ["must-not-cache"] },
            {
                getAccessState: async () => ({
                    configured: true,
                    authenticated: false,
                    isAdmin: false
                }),
                getRecord: async () => assert.fail("signed-out save must not read remote data"),
                upsertRecord: async () => assert.fail("signed-out save must not write remote data")
            }
        ),
        /Discordでログイン/
    );

    assert.deepEqual(events, []);
});

test("authenticated users without Admin rights cannot overwrite global CMS data", async () => {
    const events = [];

    await assert.rejects(
        persistGlobalCmsSnapshot(
            createContract(events),
            { items: ["blocked"] },
            {
                getAccessState: async () => ({
                    configured: true,
                    authenticated: true,
                    isAdmin: false
                }),
                getRecord: async () => null,
                upsertRecord: async () => assert.fail("unauthorized write")
            }
        ),
        /Admin権限/
    );

    assert.deepEqual(events, []);
});

test("unconfigured compatibility mode preserves the existing synchronous cache", async () => {
    const events = [];
    const result = await persistGlobalCmsSnapshot(
        createContract(events),
        { items: ["offline"] },
        {
            getAccessState: async () => ({
                configured: false,
                authenticated: false,
                isAdmin: false
            }),
            getRecord: async () => assert.fail("no remote read in compatibility mode"),
            upsertRecord: async () => assert.fail("no remote write in compatibility mode")
        }
    );

    assert.equal(result.authoritative, false);
    assert.equal(result.source, "local-compatibility");
    assert.deepEqual(events, [["cache", { items: ["offline"] }]]);
});

test("Home, Projects, Notes, Tools and backup restore use the canonical CMS path", async () => {
    const homeStore = await read("apps/admin/js/features/home/homeStore.js");
    const homePage = await read("apps/admin/js/pages/homePage.js");
    const projectsStore = await read("apps/admin/js/features/game/gameStore.js");
    const projectsForm = await read("apps/admin/js/features/game/gameForm.js");
    const projectsPage = await read("apps/admin/js/pages/gamePage.js");
    const projectsBackup = await read("apps/admin/js/features/game/gameBackup.js");
    const notesStore = await read("apps/admin/js/features/notes/noteStore.js");
    const notesForm = await read("apps/admin/js/features/notes/noteForm.js");
    const notesBackup = await read("apps/admin/js/features/notes/noteBackup.js");
    const toolsStore = await read("apps/admin/js/features/tools/toolStore.js");
    const toolsForm = await read("apps/admin/js/features/tools/toolForm.js");
    const toolsBackup = await read("apps/admin/js/features/tools/toolBackup.js");
    const form = await read("apps/admin/js/features/common/simpleCollectionForm.js");

    assert.match(homeStore, /hydrateHomeConfigFromCms/);
    assert.match(homeStore, /saveHomeConfigCanonical/);
    assert.match(homePage, /await hydrateHomeConfigFromCms\(\)/);
    assert.match(homePage, /await saveHomeConfigCanonical\(draft\)/);

    assert.match(projectsStore, /hydrateGamesFromCms/);
    assert.match(projectsStore, /setGamesCanonical/);
    assert.match(projectsStore, /collection:\s*PROJECTS_CMS_COLLECTION/);
    assert.match(projectsForm, /await updateGameCanonical/);
    assert.match(projectsForm, /await addGameCanonical/);
    assert.match(projectsForm, /await deleteGameCanonical/);
    assert.match(projectsForm, /await moveGameCanonical/);
    assert.match(projectsPage, /await hydrateGamesFromCms\(\)/);
    assert.match(projectsBackup, /await setGamesCanonical\(data\.games\)/);

    assert.match(notesStore, /hydrateNotesFromCms/);
    assert.match(notesStore, /setNotesCanonical/);
    assert.match(notesForm, /hydrate:\s*hydrateNotesFromCms/);
    assert.match(notesForm, /add:\s*addNoteCanonical/);
    assert.match(notesBackup, /await setNotesCanonical\(data\.notes\)/);

    assert.match(toolsStore, /hydrateToolsFromCms/);
    assert.match(toolsStore, /setToolsCanonical/);
    assert.match(toolsForm, /hydrate:\s*hydrateToolsFromCms/);
    assert.match(toolsForm, /add:\s*addToolCanonical/);
    assert.match(toolsBackup, /await setToolsCanonical\(data\.tools\)/);

    assert.match(form, /await Promise\.resolve\(\)\.then\(operation\)/);
    assert.match(form, /ready/);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
