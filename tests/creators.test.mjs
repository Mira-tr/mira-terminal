import test from "node:test";
import assert from "node:assert/strict";

import {
    DEFAULT_PRIMARY_CREATOR_ID,
    createCreatorsFromProfile,
    getCreators,
    normalizeCreatorsCollection,
    validateCreatorsCollection
} from "../apps/admin/js/features/creators/creatorStore.js";

import {
    createPublicCreatorsPayload
} from "../apps/admin/js/features/creators/creatorPublicExport.js";

import {
    createCreatorsBackup,
    validateBackupCreators
} from "../apps/admin/js/features/creators/creatorBackup.js";

test("旧ProfileからPrimary Creatorを安全に初期化する", ()=>{
    const migrated = createCreatorsFromProfile({
        displayName: "MIRA",
        bio: "legacy bio",
        activities: ["TRPG", "Tools"],
        links: [
            {
                id: "github",
                label: "GitHub",
                url: "https://github.com/example",
                status: "public",
                order: 1
            }
        ]
    });

    assert.equal(migrated.primaryCreatorId, DEFAULT_PRIMARY_CREATOR_ID);
    assert.equal(migrated.creators.length, 1);
    assert.equal(migrated.creators[0].displayName, "千景");
    assert.equal(migrated.creators[0].slug, "chikage");
    assert.equal(migrated.creators[0].bio, "legacy bio");
    assert.deepEqual(migrated.creators[0].activities, ["TRPG", "Tools"]);
    assert.equal(migrated.creators[0].links[0].status, "public");
});

test("Creatorsキーが存在して破損している場合は旧Profileから初期移行しない", ()=>{
    const storage = createStorage({
        mira_terminal_creators: "{broken-json",
        mira_terminal_profile: JSON.stringify({
            displayName: "MIRA",
            bio: "legacy bio"
        })
    });

    globalThis.localStorage = storage;

    assert.throws(
        () => getCreators(),
        /Creatorsデータが破損しています/
    );
    assert.equal(storage.getItem("mira_terminal_creators"), "{broken-json");
});

test("Creator slugは必須・形式・重複を保存前に検証する", ()=>{
    assert.throws(
        () => validateCreatorsCollection(normalizeCreatorsCollection({
            primaryCreatorId: "one",
            creators: [
                {
                    id: "one",
                    slug: "BadSlug",
                    displayName: "One",
                    status: "public"
                }
            ]
        })),
        /slugの形式が正しくありません/
    );

    assert.throws(
        () => validateCreatorsCollection(normalizeCreatorsCollection({
            primaryCreatorId: "one",
            creators: [
                {
                    id: "one",
                    slug: "same",
                    displayName: "One",
                    status: "public"
                },
                {
                    id: "two",
                    slug: "same",
                    displayName: "Two",
                    status: "public"
                }
            ]
        })),
        /slugが重複しています/
    );
});

test("Public Creators ExportはPrimaryと公開Creatorを必須にし、link statusを出さない", ()=>{
    const payload = createPublicCreatorsPayload({
        primaryCreatorId: "creator-chikage",
        creators: [
            {
                id: "creator-chikage",
                slug: "chikage",
                displayName: "千景",
                bio: "bio",
                activities: ["TRPG"],
                status: "public",
                order: 1,
                links: [
                    {
                        id: "x",
                        label: "X",
                        url: "https://example.com",
                        status: "public",
                        order: 1
                    },
                    {
                        id: "private",
                        label: "Private",
                        url: "https://example.com/private",
                        status: "private",
                        order: 2
                    }
                ]
            }
        ]
    });

    assert.equal(payload.app, "RELMUA Terminal");
    assert.equal(payload.brand, "RELMUA");
    assert.equal(payload.exportType, "public-creators");
    assert.equal(payload.primaryCreatorId, "creator-chikage");
    assert.equal(payload.creators.length, 1);
    assert.deepEqual(payload.creators[0].links, [
        {
            id: "x",
            label: "X",
            url: "https://example.com",
            order: 1
        }
    ]);
    assert.equal("status" in payload.creators[0].links[0], false);
});

test("Public Creators ExportはPrimary非公開をerrorにする", ()=>{
    assert.throws(
        () => createPublicCreatorsPayload({
            primaryCreatorId: "creator-chikage",
            creators: [
                {
                    id: "creator-chikage",
                    slug: "chikage",
                    displayName: "千景",
                    status: "private"
                },
                {
                    id: "creator-public",
                    slug: "public",
                    displayName: "Public",
                    status: "public"
                }
            ]
        }),
        /Primary Creatorがpublicではありません/
    );
});

test("Public Creators ExportはPrimary未設定とpublic 0件を専用errorにする", ()=>{
    assert.throws(
        () => createPublicCreatorsPayload({
            primaryCreatorId: "",
            creators: [
                {
                    id: "creator-chikage",
                    slug: "chikage",
                    displayName: "千景",
                    status: "public"
                }
            ]
        }),
        /Primary Creatorが設定されていません/
    );

    assert.throws(
        () => createPublicCreatorsPayload({
            primaryCreatorId: "creator-chikage",
            creators: [
                {
                    id: "creator-chikage",
                    slug: "chikage",
                    displayName: "千景",
                    status: "private"
                }
            ]
        }),
        /public Creatorが0件です/
    );
});

test("Creators Backupは専用形式で検証できる", ()=>{
    const backup = createCreatorsBackup({
        primaryCreatorId: "creator-chikage",
        creators: [
            {
                id: "creator-chikage",
                slug: "chikage",
                displayName: "千景",
                status: "public"
            }
        ]
    });

    assert.equal(backup.app, "RELMUA Terminal");
    assert.equal(backup.module, "creators");
    assert.equal(backup.backupType, "creators-backup");
    assert.equal(backup.data.primaryCreatorId, "creator-chikage");
    assert.equal(validateBackupCreators(backup).creators.length, 1);
});

function createStorage(values = {}){
    const data = new Map(Object.entries(values));

    return {
        getItem: key => data.get(key) ?? null,
        setItem: (key, value) => data.set(key, String(value))
    };
}
