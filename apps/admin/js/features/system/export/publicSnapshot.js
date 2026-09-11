import {
    APP_NAME
} from "../../../appIdentity.js";

import {
    getCmsAccessState
} from "../../cms/cmsClient.js";

import {
    hydrateCanonicalAdminState
} from "../canonicalAdminState.js";

import {
    getPublicExportTargets
} from "../systemInventory.js";

import {
    recordActivity
} from "../activityLog.js";

import {
    recordPublicExport
} from "../../common/operationMeta.js";

import {
    createPublicHomePayload
} from "../../home/homePublicExport.js";

import {
    createPublicGamesPayload
} from "../../game/gamePublicExport.js";

import {
    createPublicToolsPayload
} from "../../tools/toolPublicExport.js";

import {
    createPublicNotesPayload
} from "../../notes/notePublicExport.js";

import {
    createPublicCreatorsPayload
} from "../../creators/creatorPublicExport.js";

import {
    createPublicProfilePayload
} from "../../profile/profilePublicExport.js";

import {
    getScenarios
} from "../../trpg/scenarios/scenarioStore.js";

import {
    createPublicScenariosPayload
} from "../../trpg/scenarios/scenarioPublicExport.js";

import {
    getRules
} from "../../trpg/rules/rulesStore.js";

import {
    createPublicRulesPayload
} from "../../trpg/rules/rulesPublicExport.js";

const SNAPSHOT_SCHEMA_VERSION = 1;
const SNAPSHOT_VERSION = "1.0.0";
const SNAPSHOT_EXPORT_TYPE = "public-snapshot-package";
const SNAPSHOT_FILENAME_PREFIX = "relmua-public-snapshot";
const ADMIN_ONLY_FIELDS = new Set([
    "memo",
    "status",
    "createdAt",
    "updatedAt",
    "created_at",
    "updated_at",
    "owner_user_id"
]);

const BUILDERS = Object.freeze({
    home: () => createPublicHomePayload(),
    projects: () => createPublicGamesPayload(),
    tools: () => createPublicToolsPayload(),
    notes: () => createPublicNotesPayload(),
    creators: () => createPublicCreatorsPayload(),
    profile: () => createPublicProfilePayload(),
    "trpg-scenarios": () => createPublicScenariosPayload(getScenarios()),
    "house-rules": () => createPublicRulesPayload(getRules())
});

export async function exportPublicSnapshotPackageCanonical(){
    const access = await getCmsAccessState();

    if(access.configured && !access.authenticated){
        throw new Error("Production Public Snapshotを作成するにはDiscordでログインしてください。");
    }

    if(access.configured && !access.isAdmin){
        throw new Error("Public Snapshotの作成にはRELMUA Admin権限が必要です。");
    }

    await hydrateCanonicalAdminState();

    const source = access.configured
        ? "supabase-canonical"
        : "compatibility-cache";
    const snapshot = createPublicSnapshotPackage({ source });
    const filename = `${SNAPSHOT_FILENAME_PREFIX}-${dateStamp(new Date())}.json`;

    downloadJson(snapshot, filename);

    snapshot.files.forEach(file => recordPublicExport(file.id));
    recordActivity({
        action: "public-snapshot-export",
        workspace: "system",
        module: "export",
        summary: `Public Snapshot Package exported: ${filename}`,
        result: "success",
        severity: "info"
    });

    return {
        filename,
        snapshot
    };
}

export function createPublicSnapshotPackage({
    source = "compatibility-cache",
    generatedAt = new Date().toISOString()
} = {}){
    const targets = getPublicExportTargets()
        .filter(target => target.filename !== "static-html");
    const files = targets.map(target => {
        const build = BUILDERS[target.id];

        if(typeof build !== "function"){
            throw new Error(`Public Snapshot builder is missing: ${target.id}`);
        }

        const payload = build();
        assertPublicPayloadSafe(payload, target.id);

        return {
            id: target.id,
            filename: target.filename,
            destination: target.destination,
            payload
        };
    });

    const packageValue = {
        app: APP_NAME,
        exportType: SNAPSHOT_EXPORT_TYPE,
        snapshotVersion: SNAPSHOT_VERSION,
        schemaVersion: SNAPSHOT_SCHEMA_VERSION,
        source,
        generatedAt,
        files
    };

    validatePublicSnapshotPackage(packageValue);
    return packageValue;
}

export function validatePublicSnapshotPackage(value){
    if(!value || typeof value !== "object" || Array.isArray(value)){
        throw new Error("Public Snapshot Package must be an object.");
    }

    if(value.exportType !== SNAPSHOT_EXPORT_TYPE){
        throw new Error(`Unexpected Public Snapshot exportType: ${value.exportType || "(empty)"}`);
    }

    if(value.schemaVersion !== SNAPSHOT_SCHEMA_VERSION){
        throw new Error(`Unsupported Public Snapshot schemaVersion: ${value.schemaVersion}`);
    }

    if(!Array.isArray(value.files)){
        throw new Error("Public Snapshot files must be an array.");
    }

    const expected = getPublicExportTargets()
        .filter(target => target.filename !== "static-html");
    const expectedIds = new Set(expected.map(target => target.id));
    const seen = new Set();

    value.files.forEach(file => {
        if(!file || typeof file !== "object" || Array.isArray(file)){
            throw new Error("Public Snapshot contains an invalid file entry.");
        }

        const target = expected.find(item => item.id === file.id);
        if(!target){
            throw new Error(`Unexpected Public Snapshot target: ${file.id || "(empty)"}`);
        }
        if(seen.has(file.id)){
            throw new Error(`Duplicate Public Snapshot target: ${file.id}`);
        }
        if(file.filename !== target.filename || file.destination !== target.destination){
            throw new Error(`Public Snapshot destination mismatch: ${file.id}`);
        }

        assertPublicPayloadSafe(file.payload, file.id);
        seen.add(file.id);
    });

    if(seen.size !== expectedIds.size || [...expectedIds].some(id => !seen.has(id))){
        throw new Error("Public Snapshot is incomplete.");
    }

    return true;
}

export function assertPublicPayloadSafe(value, targetId = "public"){
    visit(value, targetId);
    return true;
}

function visit(value, path){
    if(Array.isArray(value)){
        value.forEach((item, index) => visit(item, `${path}[${index}]`));
        return;
    }

    if(!value || typeof value !== "object"){
        return;
    }

    Object.entries(value).forEach(([key, child]) => {
        if(ADMIN_ONLY_FIELDS.has(key)){
            throw new Error(`Admin-only field leaked into Public Snapshot: ${path}.${key}`);
        }
        visit(child, `${path}.${key}`);
    });
}

function downloadJson(data, filename){
    const url = URL.createObjectURL(new Blob(
        [JSON.stringify(data, null, 2)],
        { type: "application/json" }
    ));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

function dateStamp(date){
    return date.toISOString()
        .replace(/[:.]/g, "-")
        .replace("T", "_")
        .replace("Z", "");
}
