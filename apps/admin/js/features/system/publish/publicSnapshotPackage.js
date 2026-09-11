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
    const dynamicTargets = getPublicExportTargets().filter(target => target.filename !== "static-html");
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
    if(!Array.isArray(pack.files) || pack.files.length === 0) throw new Error("公開パッケージにファイルがありません。");

    const allowed = new Map(
        getPublicExportTargets()
            .filter(target => target.filename !== "static-html")
            .map(target => [target.id, target])
    );
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

    return true;
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
        assertPublicSafe(item, label, `${path}.${key}`);
    });
}
