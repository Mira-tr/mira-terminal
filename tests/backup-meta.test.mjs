import test from "node:test";
import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";

import {
    LAST_BACKUP_EXPORT_KEY
} from "../apps/admin/js/store.js";

import {
    getLastBackupExportAt,
    recordBackupExport
} from "../apps/admin/js/features/common/backupMeta.js";

import {
    getAdminDashboardBackupText
} from "../apps/admin/js/features/common/adminDashboard.js";

import {
    exportData
} from "../apps/admin/js/features/common/backup.js";

import {
    exportBackupProfile
} from "../apps/admin/js/features/profile/profileBackup.js";

import {
    exportBackupGames
} from "../apps/admin/js/features/game/gameBackup.js";

import {
    exportBackupRules
} from "../apps/admin/js/features/trpg/rules/rulesBackup.js";

import {
    exportBackupTools
} from "../apps/admin/js/features/tools/toolBackup.js";

import {
    exportBackupNotes
} from "../apps/admin/js/features/notes/noteBackup.js";

import {
    exportPublicScenarios
} from "../apps/admin/js/features/trpg/scenarios/scenarioPublicExport.js";

import {
    exportPublicRules
} from "../apps/admin/js/features/trpg/rules/rulesPublicExport.js";

import {
    exportPublicProfile
} from "../apps/admin/js/features/profile/profilePublicExport.js";

import {
    exportPublicGames
} from "../apps/admin/js/features/game/gamePublicExport.js";

import {
    exportPublicTools
} from "../apps/admin/js/features/tools/toolPublicExport.js";

import {
    exportPublicNotes
} from "../apps/admin/js/features/notes/notePublicExport.js";

const ROOT = new URL("../", import.meta.url);

test("Backup timestamp helper stores ISO 8601 and ignores invalid values", () => {
    const storage = createStorage();
    const date = new Date("2026-07-10T13:45:00.000Z");

    assert.equal(
        recordBackupExport(storage, date),
        "2026-07-10T13:45:00.000Z"
    );
    assert.equal(
        getLastBackupExportAt(storage),
        "2026-07-10T13:45:00.000Z"
    );
    assert.equal(
        getAdminDashboardBackupText(storage),
        "Last Backup: 2026/07/10 22:45"
    );

    storage.setItem(LAST_BACKUP_EXPORT_KEY, "invalid-date");
    assert.equal(getLastBackupExportAt(storage), "");
    assert.equal(
        getAdminDashboardBackupText(storage),
        "Backup not recorded"
    );
});

test("Backup Export records the shared timestamp only after success", () => {
    const environment = installExportEnvironment();

    try{
        const operations = [
            () => exportData({
                scenarios: [],
                tags: [],
                authors: []
            }),
            exportBackupRules,
            exportBackupProfile,
            exportBackupGames,
            exportBackupTools,
            exportBackupNotes
        ];

        operations.forEach(operation => {
            localStorage.removeItem(LAST_BACKUP_EXPORT_KEY);
            operation();

            const value = localStorage.getItem(LAST_BACKUP_EXPORT_KEY);
            assert.ok(value, operation.name || "TRPG Scenario");
            assert.equal(new Date(value).toISOString(), value);
        });
    }finally{
        environment.restore();
    }
});

test("Public Export and failed Backup Export do not update backup timestamp", () => {
    const environment = installExportEnvironment();

    try{
        const publicOperations = [
            () => exportPublicScenarios([]),
            exportPublicRules,
            exportPublicProfile,
            exportPublicGames,
            exportPublicTools,
            exportPublicNotes
        ];

        publicOperations.forEach(operation => {
            localStorage.removeItem(LAST_BACKUP_EXPORT_KEY);
            operation();
            assert.equal(localStorage.getItem(LAST_BACKUP_EXPORT_KEY), null);
        });

        URL.createObjectURL = () => {
            throw new Error("export failed");
        };
        assert.throws(exportBackupProfile, /export failed/);
        assert.equal(localStorage.getItem(LAST_BACKUP_EXPORT_KEY), null);
    }finally{
        environment.restore();
    }
});

test("Backup Import does not record backup timestamp", async () => {
    const contracts = [
        ["apps/admin/js/features/common/backup.js", "export function importData"],
        ["apps/admin/js/features/trpg/rules/rulesBackup.js", "export function importBackupRules"],
        ["apps/admin/js/features/profile/profileBackup.js", "export function importBackupProfile"],
        ["apps/admin/js/features/game/gameBackup.js", "export function importBackupGames"],
        ["apps/admin/js/features/tools/toolBackup.js", "export async function importBackupTools"],
        ["apps/admin/js/features/notes/noteBackup.js", "export async function importBackupNotes"]
    ];

    for(const [path, marker] of contracts){
        const source = await read(path);
        const importSource = source.slice(source.indexOf(marker));

        assert.ok(importSource, path);
        assert.doesNotMatch(importSource, /recordBackupExport\s*\(/, path);
    }
});

function installExportEnvironment(){
    const originalDocument = globalThis.document;
    const originalStorage = globalThis.localStorage;
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    const storage = createStorage();

    globalThis.localStorage = storage;
    globalThis.document = {
        body: {
            appendChild(){}
        },
        createElement(){
            return {
                href: "",
                download: "",
                click(){},
                remove(){}
            };
        }
    };
    URL.createObjectURL = () => "blob:test";
    URL.revokeObjectURL = () => {};

    return {
        restore(){
            globalThis.document = originalDocument;
            globalThis.localStorage = originalStorage;
            URL.createObjectURL = originalCreateObjectUrl;
            URL.revokeObjectURL = originalRevokeObjectUrl;
        }
    };
}

function createStorage(){
    const values = new Map();

    return {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: key => values.delete(key)
    };
}

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
