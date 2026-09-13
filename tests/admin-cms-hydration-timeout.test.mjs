import test from "node:test";
import assert from "node:assert/strict";

import {
    hydrateGlobalCmsSnapshot
} from "../apps/admin/js/features/cms/cmsCanonicalStore.js";
import {
    hydrateOwnerCmsSnapshot
} from "../apps/admin/js/features/cms/cmsOwnerSnapshotStore.js";

function never(){
    return new Promise(() => {});
}

function createContract(ownerCreatorId = ""){
    return {
        collection: "render-audit",
        recordKey: "snapshot",
        ownerCreatorId,
        status: "private",
        readLocal: () => ({ value: "local" }),
        normalize: value => ({ value: String(value?.value || "") }),
        validate: value => {
            if(typeof value?.value !== "string") throw new Error("invalid");
            return true;
        },
        writeCache: () => {}
    };
}

test("global CMS hydrate times out to local cache instead of blocking initial render", async () => {
    const result = await hydrateGlobalCmsSnapshot(createContract(), {
        hydrateTimeoutMs: 15,
        getAccessState: never,
        getRecord: never,
        upsertRecord: never
    });

    assert.equal(result.source, "local-offline");
    assert.deepEqual(result.value, { value: "local" });
    assert.equal(result.authoritative, false);
});

test("owner CMS hydrate times out to local cache instead of blocking House Rules and Creator screens", async () => {
    const result = await hydrateOwnerCmsSnapshot(createContract("creator-chikage"), {
        hydrateTimeoutMs: 15,
        getAccessState: never,
        resolveOwnerId: never,
        getRecord: never,
        upsertRecord: never
    });

    assert.equal(result.source, "local-offline");
    assert.deepEqual(result.value, { value: "local" });
    assert.equal(result.authoritative, false);
});
