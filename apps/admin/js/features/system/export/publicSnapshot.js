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

import {
    PUBLIC_SNAPSHOT_EXPORT_TYPE,
    PUBLIC_SNAPSHOT_SCHEMA_VERSION,
    PUBLIC_SNAPSHOT_TARGETS,
    PUBLIC_SNAPSHOT_VERSION,
    assertPublicPayloadSafe,
    validatePublicSnapshotPackage
} from "./publicSnapshotContract.js";

const SNAPSHOT_FILENAME_PREFIX = "relmua-public-snapshot";

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
        throw new Error("公開用データを作るにはDiscordでログインしてください。");
    }

    if(access.configured && !access.isAdmin){
        throw new Error("公開用データの作成にはRELMUA Admin権限が必要です。");
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
        summary: `公開用データセットを作成: ${filename}`,
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
    const files = PUBLIC_SNAPSHOT_TARGETS.map(target => {
        const build = BUILDERS[target.id];

        if(typeof build !== "function"){
            throw new Error(`公開用データの変換処理がありません: ${target.id}`);
        }

        const payload = build();
        assertPublicPayloadSafe(payload, target.id);

        return {
            ...target,
            payload
        };
    });

    const packageValue = {
        app: APP_NAME,
        exportType: PUBLIC_SNAPSHOT_EXPORT_TYPE,
        snapshotVersion: PUBLIC_SNAPSHOT_VERSION,
        schemaVersion: PUBLIC_SNAPSHOT_SCHEMA_VERSION,
        source,
        generatedAt,
        files
    };

    validatePublicSnapshotPackage(packageValue);
    return packageValue;
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
