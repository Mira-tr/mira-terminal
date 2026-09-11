import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    hydrateOwnerCmsSnapshot,
    persistOwnerCmsSnapshot
} from "../apps/admin/js/features/cms/cmsOwnerSnapshotStore.js";

import {
    normalizeScenarioSnapshot
} from "../apps/admin/js/features/trpg/scenarios/scenarioCmsStore.js";

const ROOT = new URL("../", import.meta.url);
const OWNER_UUID = "11111111-1111-4111-8111-111111111111";

function contract(events = []){
    return {
        collection: "trpg-scenarios",
        recordKey: "collection",
        ownerCreatorId: "creator-chikage",
        status: "private",
        readLocal: () => ({ items: ["local"] }),
        normalize: value => ({ items: Array.isArray(value?.items) ? [...value.items] : [] }),
        validate: value => assert.ok(Array.isArray(value.items)),
        writeCache: value => events.push(["cache", value])
    };
}

function creatorAccess(){
    return {
        configured: true,
        authenticated: true,
        isAdmin: false,
        creatorIds: [OWNER_UUID]
    };
}

test("owner-scoped hydrate reads the resolved Creator UUID and lets the CMS win", async () => {
    const events = [];
    const result = await hydrateOwnerCmsSnapshot(
        contract(events),
        {
            getAccessState: async () => creatorAccess(),
            resolveOwnerId: async legacyId => {
                assert.equal(legacyId, "creator-chikage");
                return OWNER_UUID;
            },
            getRecord: async (collection, key, ownerId) => {
                assert.equal(collection, "trpg-scenarios");
                assert.equal(key, "collection");
                assert.equal(ownerId, OWNER_UUID);
                return { data: { items: ["cms"] }, updated_at: "2026-09-11T08:00:00Z" };
            },
            upsertRecord: async () => assert.fail("existing owner snapshot must not be seeded")
        }
    );

    assert.equal(result.authoritative, true);
    assert.equal(result.ownerCmsId, OWNER_UUID);
    assert.deepEqual(result.value, { items: ["cms"] });
    assert.deepEqual(events, [["cache", { items: ["cms"] }]]);
});

test("owner-scoped writes commit DB before updating the compatibility cache", async () => {
    const events = [];
    const result = await persistOwnerCmsSnapshot(
        contract(events),
        { items: ["new"] },
        {
            getAccessState: async () => creatorAccess(),
            resolveOwnerId: async () => OWNER_UUID,
            getRecord: async () => null,
            upsertRecord: async payload => {
                events.push(["db", payload.data]);
                assert.equal(payload.ownerCreatorId, OWNER_UUID);
                return { updated_at: "2026-09-11T08:01:00Z" };
            }
        }
    );

    assert.equal(result.authoritative, true);
    assert.deepEqual(events, [
        ["db", { items: ["new"] }],
        ["cache", { items: ["new"] }]
    ]);
});

test("a signed-in Creator cannot write another Creator's CMS area", async () => {
    await assert.rejects(
        persistOwnerCmsSnapshot(
            contract([]),
            { items: ["blocked"] },
            {
                getAccessState: async () => ({
                    configured: true,
                    authenticated: true,
                    isAdmin: false,
                    creatorIds: ["22222222-2222-4222-8222-222222222222"]
                }),
                resolveOwnerId: async () => OWNER_UUID,
                getRecord: async () => null,
                upsertRecord: async () => assert.fail("unauthorized owner write")
            }
        ),
        /編集する権限/
    );
});

test("Scenario snapshot assigns blank legacy ownership and keeps TRPG metadata with Chikage", () => {
    const snapshot = normalizeScenarioSnapshot({
        scenarios: [{ id: "s-1", title: "Scenario", ownerCreatorId: "" }],
        tags: ["秘匿HO", "秘匿HO", "RP重視"],
        authors: ["作者A", "作者A", "作者B"]
    }, "creator-chikage");

    assert.equal(snapshot.schemaVersion, 1);
    assert.equal(snapshot.scenarios[0].ownerCreatorId, "creator-chikage");
    assert.deepEqual(snapshot.tags, ["秘匿HO", "RP重視"]);
    assert.deepEqual(snapshot.authors, ["作者A", "作者B"]);

    assert.throws(
        () => normalizeScenarioSnapshot({
            scenarios: [{ id: "s-2", title: "Other", ownerCreatorId: "creator-other" }]
        }, "creator-chikage"),
        /別Creator/
    );
});

test("Scenario editor startup and Studio mount use the CMS repository with awaited saves", async () => {
    const adapter = await read("apps/admin/js/features/trpg/scenarios/scenarioDraftAdapter.js");
    const repository = await read("apps/admin/js/features/trpg/scenarios/browserCmsRepository.js");
    const controller = await read("apps/admin/js/features/trpg/scenarios/scenarioEditorController.js");
    const form = await read("apps/admin/js/features/trpg/scenarios/scenarioForm.js");
    const mount = await read("apps/admin/js/features/trpg/scenarios/scenarioEditorMount.js");

    assert.match(adapter, /createBrowserCmsRepository/);
    assert.match(adapter, /await startupRepository\.hydrate\(\)/);
    assert.match(repository, /hydrateScenariosFromCms/);
    assert.match(controller, /isPromiseLike\(result\)/);
    assert.match(form, /Promise\.resolve\(result\)/);
    assert.match(mount, /const save = async \(\)/);
    assert.match(mount, /await controller\.saveDraft/);
    assert.match(mount, /ready,/);
});

test("Scenario status changes commit the owner CMS snapshot before the compatibility handler", async () => {
    const list = await read("apps/admin/js/features/trpg/scenarios/scenarioList.js");
    const cmsCall = list.indexOf("await updateScenarioCanonical(");
    const compatibilityHandler = list.indexOf("handlers.onStatusChange?.(", cmsCall);

    assert.match(list, /updateScenarioCanonical/);
    assert.ok(cmsCall >= 0);
    assert.ok(compatibilityHandler > cmsCall);
    assert.match(list, /select\.disabled = true/);
    assert.match(list, /select\.value = previousStatus/);
});

test("Scenario Backup Import registers a complete CMS-first canonical committer", async () => {
    const backup = await read("apps/admin/js/features/common/backup.js");
    const adapter = await read("apps/admin/js/features/trpg/scenarios/scenarioDraftAdapter.js");
    const cmsStore = await read("apps/admin/js/features/trpg/scenarios/scenarioCmsStore.js");
    const commitIndex = backup.indexOf("await canonicalCommitter(");
    const compatibilityIndex = backup.indexOf("await callback(normalized)");

    assert.match(backup, /registerBackupImportCommitter/);
    assert.ok(commitIndex >= 0);
    assert.ok(compatibilityIndex > commitIndex);
    assert.match(adapter, /registerBackupImportCommitter\(TRPG_COLLECTION_TYPE/);
    assert.match(adapter, /await setScenarioBundleCanonical/);
    assert.match(cmsStore, /tags:/);
    assert.match(cmsStore, /authors:/);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
