import {
    CREATORS_KEY
} from "../../store.js";

import {
    normalizeCreatorsCollection
} from "../creators/creatorStore.js";

import {
    getPublicExportHistory
} from "../common/operationMeta.js";

import {
    getPublicExportTargets
} from "../system/systemInventory.js";

import {
    getPublicAdminSurface
} from "./publicAdminRegistry.js";

export function evaluatePublicSurface(surfaceOrId, {
    storage = globalThis.localStorage,
    creator = null
} = {}){
    const surface = typeof surfaceOrId === "string"
        ? getPublicAdminSurface(surfaceOrId)
        : surfaceOrId;
    const issues = [];

    if(!surface){
        return createResult(null, [createIssue(
            "critical",
            "編集先と公開ページの対応が見つかりません",
            "Public ↔ Admin registryを確認してください。"
        )]);
    }

    validateExportTargets(surface, storage, issues);

    if(surface.scope === "creator"){
        validateCreatorSurface(surface, creator || readCreator(surface.ownerId, storage), issues);
    }

    return createResult(surface, issues);
}

export function evaluatePublicSurfaces(surfaces, options = {}){
    return (Array.isArray(surfaces) ? surfaces : [])
        .map(surface => evaluatePublicSurface(surface, options));
}

export function getSurfaceReadinessLabel(result){
    if(result?.status === "blocked") return "公開前に修正が必要";
    if(result?.status === "attention") return "確認してから公開";
    return "公開準備OK";
}

function validateExportTargets(surface, storage, issues){
    const targets = new Map(getPublicExportTargets().map(target => [target.id, target]));
    const history = getPublicExportHistory(storage);

    surface.exportTargetIds.forEach(targetId => {
        const target = targets.get(targetId);
        if(!target){
            issues.push(createIssue(
                "critical",
                "公開データの出力先が未登録です",
                `${surface.editorLabel} が ${targetId} を参照しています。`
            ));
            return;
        }

        if(target.filename === "static-html") return;

        const lastExportedAt = latestExport(target.historyKeys, history);
        if(!lastExportedAt){
            issues.push(createIssue(
                "warning",
                `${target.title} の公開データが未確認です`,
                "保存後に公開用データを作り、公開前チェックをもう一度実行してください。",
                target.id
            ));
        }
    });
}

function validateCreatorSurface(surface, creator, issues){
    if(!creator){
        issues.push(createIssue(
            "warning",
            "Creatorデータをまだ確認できません",
            "CMS同期後にもう一度確認してください。"
        ));
        return;
    }

    if(creator.id !== surface.ownerId){
        issues.push(createIssue(
            "critical",
            "Creatorの所有者が一致しません",
            `${surface.editorLabel} は ${surface.ownerId} の領域です。`
        ));
        return;
    }

    if(creator.status !== "public"){
        issues.push(createIssue(
            "high",
            "Creatorが公開状態ではありません",
            `${creator.displayName || surface.ownerId} は現在 ${creator.status || "draft"} です。`
        ));
    }

    requireText(creator.displayName, "表示名", issues);

    const pageId = surface.id.replace("creator-chikage-", "");
    const page = creator.site?.[pageId] || {};
    if(pageId === "home"){
        requireText(page.role, "HomeのRole", issues);
        requireText(page.lead, "HomeのLead", issues);
    }else{
        requireText(page.title, `${surface.label}の見出し`, issues);
        requireText(page.lead, `${surface.label}のLead`, issues);
    }

    if(pageId === "works" && !creator.works?.some(item => item.status === "public")){
        issues.push(createIssue(
            "warning",
            "公開中の作品がまだありません",
            "Worksページ自体は公開できますが、作品一覧は空になります。"
        ));
    }

    if(pageId === "contact" && !creator.links?.some(item => item.status === "public")){
        issues.push(createIssue(
            "warning",
            "公開中の連絡先がまだありません",
            "Contactページ自体は公開できますが、公開リンク一覧は空になります。"
        ));
    }
}

function readCreator(ownerId, storage){
    if(!storage?.getItem) return null;
    const raw = storage.getItem(CREATORS_KEY);
    if(!raw) return null;

    try{
        const collection = normalizeCreatorsCollection(JSON.parse(raw));
        return collection.creators.find(item => item.id === ownerId) || null;
    }catch{
        return null;
    }
}

function requireText(value, label, issues){
    if(String(value || "").trim()) return;
    issues.push(createIssue(
        "high",
        `${label}が空です`,
        "公開ページに必要な文章を入力してください。"
    ));
}

function latestExport(keys, history){
    return (Array.isArray(keys) ? keys : [])
        .map(key => history[key])
        .filter(value => Number.isFinite(Date.parse(value)))
        .sort((a, b) => Date.parse(b) - Date.parse(a))[0] || "";
}

function createResult(surface, issues){
    const status = issues.some(issue => ["critical", "high"].includes(issue.severity))
        ? "blocked"
        : issues.length
            ? "attention"
            : "ready";
    return {
        surface,
        status,
        ready: status === "ready",
        issues
    };
}

function createIssue(severity, title, summary, targetId = ""){
    return {
        id: `${severity}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-") || severity,
        severity,
        title,
        summary,
        targetId
    };
}
