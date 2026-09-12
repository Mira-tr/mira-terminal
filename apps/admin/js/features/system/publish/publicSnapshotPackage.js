import { loadHomeConfig } from "../../home/homeStore.js";
import { createPublicHomePayload } from "../../home/homePublicExport.js";
import { getGames } from "../../game/gameStore.js";
import { createPublicGamesPayload } from "../../game/gamePublicExport.js";
import { getTools } from "../../tools/toolStore.js";
import { createPublicToolsPayload } from "../../tools/toolPublicExport.js";
import { getNotes } from "../../notes/noteStore.js";
import { createPublicNotesPayload } from "../../notes/notePublicExport.js";
import { getCreators } from "../../creators/creatorStore.js";
import { createPublicCreatorsPayload } from "../../creators/creatorPublicExport.js";
import { getProfile } from "../../profile/profileStore.js";
import { createPublicProfilePayload } from "../../profile/profilePublicExport.js";
import { getScenarios } from "../../trpg/scenarios/scenarioStore.js";
import { createPublicScenariosPayload } from "../../trpg/scenarios/scenarioPublicExport.js";
import { getRules } from "../../trpg/rules/rulesStore.js";
import { createPublicRulesPayload } from "../../trpg/rules/rulesPublicExport.js";
import { recordPublicExport } from "../../common/operationMeta.js";
import { getPublicExportTargets } from "../systemInventory.js";

const PACKAGE_SCHEMA_VERSION = 1;
const PACKAGE_MODULE = "public-snapshot-package";
const ADMIN_ONLY_FIELDS = new Set(["memo", "status", "createdAt", "updatedAt"]);
const SAFE_EXTERNAL_PROTOCOLS = new Set(["http:", "https:"]);

export function createPublicSnapshotPackage({ generatedAt = new Date() } = {}){
    const payloads = new Map([
        ["home", createPublicHomePayload(loadHomeConfig())],
        ["projects", createPublicGamesPayload(getGames())],
        ["tools", createPublicToolsPayload(getTools())],
        ["notes", createPublicNotesPayload(getNotes())],
        ["creators", createPublicCreatorsPayload(getCreators())],
        ["profile", createPublicProfilePayload(getProfile())],
        ["trpg-scenarios", createPublicScenariosPayload(getScenarios())],
        ["house-rules", createPublicRulesPayload(getRules())]
    ]);
    const dynamicTargets = getDynamicTargets();
    const files = dynamicTargets.map(target => {
        const payload = payloads.get(target.id);
        if(!payload) throw new Error(`Public payload builder is missing: ${target.id}`);
        assertPublicSafe(payload, target.id);
        return {
            targetId: target.id,
            filename: target.filename,
            destination: target.destination,
            payload
        };
    });

    const pack = {
        schemaVersion: PACKAGE_SCHEMA_VERSION,
        module: PACKAGE_MODULE,
        generatedAt: new Date(generatedAt).toISOString(),
        files
    };
    validatePublicSnapshotPackage(pack);
    return pack;
}

export function validatePublicSnapshotPackage(pack){
    if(!pack || typeof pack !== "object") throw new Error("公開パッケージが不正です。");
    if(pack.schemaVersion !== PACKAGE_SCHEMA_VERSION) throw new Error("公開パッケージのschemaVersionが未対応です。");
    if(pack.module !== PACKAGE_MODULE) throw new Error("公開パッケージのmoduleが不正です。");

    const dynamicTargets = getDynamicTargets();
    if(!Array.isArray(pack.files) || pack.files.length !== dynamicTargets.length){
        throw new Error(`公開パッケージには${dynamicTargets.length}件の公開ターゲットが必要です。`);
    }

    const allowed = new Map(dynamicTargets.map(target => [target.id, target]));
    const seen = new Set();
    pack.files.forEach(file => {
        const target = allowed.get(file?.targetId);
        if(!target) throw new Error(`未登録の公開ターゲットです: ${file?.targetId || "unknown"}`);
        if(seen.has(file.targetId)) throw new Error(`公開ターゲットが重複しています: ${file.targetId}`);
        seen.add(file.targetId);
        if(file.filename !== target.filename || file.destination !== target.destination){
            throw new Error(`公開先契約が一致しません: ${file.targetId}`);
        }
        assertPublicSafe(file.payload, file.targetId);
    });
    dynamicTargets.forEach(target => {
        if(!seen.has(target.id)) throw new Error(`公開ターゲットが不足しています: ${target.id}`);
    });

    return true;
}

export async function computePublicSnapshotFingerprint(pack){
    validatePublicSnapshotPackage(pack);
    const canonical = canonicalStringify({
        schemaVersion: PACKAGE_SCHEMA_VERSION,
        module: PACKAGE_MODULE,
        files: pack.files
            .map(file => ({
                targetId: file.targetId,
                filename: file.filename,
                destination: file.destination,
                payload: file.payload
            }))
            .sort((left, right) => String(left.targetId).localeCompare(String(right.targetId)))
    });
    const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(canonical)
    );
    return [...new Uint8Array(digest)]
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}

export function downloadPublicSnapshotPackage({ storage = localStorage } = {}){
    const pack = createPublicSnapshotPackage();
    const stamp = pack.generatedAt.replace(/[:.]/g, "-");
    const filename = `relmua-public-snapshots-${stamp}.json`;
    const url = URL.createObjectURL(new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    pack.files.forEach(file => recordPublicExport(file.targetId, storage));
    return { filename, pack };
}

export function getApplyPublicPackageCommand(filename = "<downloaded-package.json>"){
    return `node scripts/apply-public-package.mjs "${String(filename).replaceAll('"', '')}"`;
}

function getDynamicTargets(){
    return getPublicExportTargets().filter(target => target.filename !== "static-html");
}

function assertPublicSafe(value, label, path = label){
    if(Array.isArray(value)){
        value.forEach((item, index) => assertPublicSafe(item, label, `${path}[${index}]`));
        return;
    }
    if(!value || typeof value !== "object") return;
    Object.entries(value).forEach(([key, item]) => {
        if(ADMIN_ONLY_FIELDS.has(key)){
            throw new Error(`${path}.${key} is an Admin-only field.`);
        }
        if(key === "url" && String(item || "").trim()){
            assertSafeExternalUrl(item, `${path}.${key}`);
        }
        assertPublicSafe(item, label, `${path}.${key}`);
    });
}

function assertSafeExternalUrl(value, path){
    let url;
    try{
        url = new URL(String(value));
    }catch{
        throw new Error(`${path} must be an absolute http/https URL.`);
    }
    if(!SAFE_EXTERNAL_PROTOCOLS.has(url.protocol)){
        throw new Error(`${path} must use http or https.`);
    }
}

function canonicalStringify(value){
    if(value === null) return "null";
    if(Array.isArray(value)){
        return `[${value.map(canonicalStringify).join(",")}]`;
    }
    if(typeof value === "object"){
        return `{${Object.keys(value)
            .sort()
            .map(key => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`)
            .join(",")}}`;
    }
    const encoded = JSON.stringify(value);
    return encoded === undefined ? "null" : encoded;
}
