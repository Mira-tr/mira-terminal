import test from "node:test";
import assert from "node:assert/strict";

import {
    mkdtemp,
    mkdir,
    readFile,
    rm,
    writeFile
} from "node:fs/promises";

import {
    tmpdir
} from "node:os";

import {
    join
} from "node:path";

import {
    getStudioPublicJsonModules,
    validatePublicJsonRegistry
} from "../apps/studio/src/shared/studioPublicJsonRegistry.js";

import {
    createProjectStatus,
    validateProjectRootSnapshot
} from "../apps/studio/src/shared/studioProjectRoot.js";

import {
    safeWriteJsonFile,
    validatePublicNotesPayload
} from "../apps/studio/src/shared/safeWritePoC.js";

test("Studio Phase 0 Public JSON registry has one canonical source per module", () => {
    const modules = getStudioPublicJsonModules();
    assert.equal(modules.length, 8);
    assert.deepEqual(validatePublicJsonRegistry(modules), []);
    assert.equal(new Set(modules.map(module => module.id)).size, modules.length);
    assert.equal(new Set(modules.map(module => module.sourceFile)).size, modules.length);
    assert.ok(modules.some(module => module.sourceFile === "apps/web/data/creators/chikage/trpg/public-scenarios.json"));
    assert.ok(modules.every(module => !module.sourceFile.includes("apps/web/trpg/data")));
});

test("Studio Phase 0 Project Root validation accepts only RELMUA repo shape", () => {
    const valid = {
        rootPath: "C:/repo",
        entries: {
            "apps/web": true,
            "apps/admin": true,
            "scripts/build-public.mjs": true,
            "apps/web/CNAME": true,
            ".git": true
        },
        packageJson: true,
        publicJsonCount: 8,
        git: {
            branch: "main",
            headSha: "abc",
            dirty: false
        }
    };

    assert.deepEqual(validateProjectRootSnapshot(valid), []);
    assert.equal(createProjectStatus(valid).ok, true);

    const invalid = {
        ...valid,
        entries: {
            "apps/web": true
        },
        packageJson: false,
        publicJsonCount: 3
    };
    assert.ok(validateProjectRootSnapshot(invalid).length > 0);
    assert.equal(createProjectStatus(invalid).ok, false);
});

test("Studio Phase 0 Safe Write PoC creates backup and atomically replaces valid JSON", async () => {
    const root = await createTempProject();
    const targetPath = "apps/web/notes/data/public-notes.json";
    const target = join(root, targetPath);
    const next = {
        schemaVersion: 1,
        exportType: "public-notes",
        module: "notes",
        notes: [
            {
                id: "note-a",
                title: "Note A"
            }
        ]
    };

    const result = await safeWriteJsonFile({
        projectRoot: root,
        targetPath,
        nextValue: next,
        validate: validatePublicNotesPayload,
        now: new Date("2026-07-16T01:02:03.000Z")
    });

    assert.equal(result.ok, true);
    assert.equal(result.changed, true);
    assert.equal(JSON.parse(await readFile(target, "utf8")).notes.length, 1);
    const manifest = JSON.parse(await readFile(join(result.backup, "manifest.json"), "utf8"));
    assert.equal(manifest.operation, "studio-safe-write-poc");
    assert.equal(manifest.files[0].target, targetPath);

    await rm(root, {
        recursive: true,
        force: true
    });
});

test("Studio Phase 0 Safe Write PoC rejects schema errors and root escape", async () => {
    const root = await createTempProject();
    const target = join(root, "apps/web/notes/data/public-notes.json");
    const before = await readFile(target, "utf8");

    const invalid = await safeWriteJsonFile({
        projectRoot: root,
        targetPath: "apps/web/notes/data/public-notes.json",
        nextValue: {
            exportType: "wrong",
            notes: []
        },
        validate: validatePublicNotesPayload
    });

    assert.equal(invalid.ok, false);
    assert.equal(await readFile(target, "utf8"), before);

    await assert.rejects(
        () => safeWriteJsonFile({
            projectRoot: root,
            targetPath: "../escape.json",
            nextValue: {
                exportType: "public-notes",
                module: "notes",
                notes: []
            },
            validate: validatePublicNotesPayload
        }),
        /inside the project root/
    );

    await rm(root, {
        recursive: true,
        force: true
    });
});

test("Studio Phase 0 docs and Tauri scaffold exist", async () => {
    const files = [
        "apps/studio/README.md",
        "apps/studio/index.html",
        "apps/studio/src-tauri/Cargo.toml",
        "apps/studio/src-tauri/tauri.conf.json",
        "apps/studio/src-tauri/capabilities/default.json",
        "docs/studio/architecture.md",
        "docs/studio/migration-plan.md",
        "docs/studio/security.md",
        "docs/studio/data-flow.md",
        "docs/studio/file-mapping.md",
        "docs/studio/development.md",
        "docs/studio/distribution.md",
        "docs/studio/rollback.md"
    ];

    for(const file of files){
        assert.ok((await readFile(file, "utf8")).length > 0, file);
    }
});

async function createTempProject(){
    const root = await mkdtemp(join(tmpdir(), "relmua-studio-"));
    await mkdir(join(root, "apps/web/notes/data"), {
        recursive: true
    });
    await writeFile(join(root, "apps/web/notes/data/public-notes.json"), `${JSON.stringify({
        schemaVersion: 1,
        exportType: "public-notes",
        module: "notes",
        notes: []
    }, null, 2)}\n`, "utf8");
    return root;
}
