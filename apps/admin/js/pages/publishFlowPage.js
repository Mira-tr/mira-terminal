import {
    runPublishPreflight
} from "../features/system/publish/publishPreflight.js";

import {
    downloadPublicSnapshotPackage,
    getApplyPublicPackageCommand
} from "../features/system/publish/publicSnapshotPackage.js";

import {
    hydrateCanonicalAdminState
} from "../features/system/canonicalAdminState.js";

import {
    initToastService,
    showToast
} from "../features/common/toastService.js";

import {
    recordActivity
} from "../features/system/activityLog.js";

initToastService();
initPublishFlow();

async function initPublishFlow(){
    const packageButton = document.getElementById("systemPublishPackage");
    const copyApplyButton = document.getElementById("copyApplyPackageCommand");
    const refreshButton = document.getElementById("systemPublishPreflight");
    let latestFilename = "";

    try{
        await hydrateCanonicalAdminState();
    }catch(error){
        console.warn("[publish] Canonical hydrate fell back to compatibility cache", error);
    }

    render().catch(reportError);

    refreshButton?.addEventListener("click", () => render().catch(reportError));
    packageButton?.addEventListener("click", async () => {
        packageButton.disabled = true;
        try{
            const preflight = await runCurrentPreflight();
            if(!preflight.ready){
                renderFlowStatus(preflight);
                showToast("公開前チェックに修正が必要です", "warning");
                return;
            }
            const result = downloadPublicSnapshotPackage();
            latestFilename = result.filename;
            if(copyApplyButton) copyApplyButton.disabled = false;
            recordActivity({
                action: "publish-package",
                workspace: "system",
                module: "publish",
                summary: `Created unified Public snapshot package: ${result.filename}`,
                result: "success",
                severity: "high"
            });
            showToast("公開パッケージを作成しました", "success");
            await render();
        }catch(error){
            reportError(error);
        }finally{
            packageButton.disabled = false;
        }
    });

    copyApplyButton?.addEventListener("click", async () => {
        const command = getApplyPublicPackageCommand(latestFilename || "<downloaded-package.json>");
        await navigator.clipboard?.writeText(command);
        showToast("公開パッケージ適用コマンドをコピーしました", "success");
    });

    async function render(){
        const result = await runCurrentPreflight();
        renderFlowStatus(result);
        if(packageButton) packageButton.disabled = !result.ready;
        return result;
    }
}

async function runCurrentPreflight(){
    const surfaceId = new URLSearchParams(window.location.search).get("surface") || "";
    return runPublishPreflight({ surfaceId });
}

function renderFlowStatus(result){
    renderSurfaceContext(result);
    renderPackageContext(result);

    const gate = document.getElementById("systemPublishGate");
    if(gate){
        gate.dataset.state = result.status;
        gate.textContent = result.ready
            ? "公開データをまとめて作成できます。"
            : "Critical / High の項目を直すまで公開パッケージは作成できません。";
    }
}

function renderSurfaceContext(result){
    const container = document.getElementById("systemPublishSurface");
    if(!container) return;

    if(!result.surface){
        container.replaceChildren(createCard(
            "サイト全体",
            "全Publicターゲット",
            "特定ページから来た場合は、そのページの公開前チェックもここへ合流します。"
        ));
        return;
    }

    const readiness = result.surfaceReadiness;
    container.replaceChildren(createCard(
        result.surface.editorLabel,
        readiness?.status === "ready" ? "ページ準備OK" : readiness?.status === "blocked" ? "修正が必要" : "要確認",
        `${result.surface.description} / 公開先: /${result.surface.publicPath}`
    ));
}

function renderPackageContext(result){
    const container = document.getElementById("systemSnapshotPackage");
    if(!container) return;
    const pack = result.snapshotPackage;
    container.replaceChildren(createCard(
        "Public Snapshot Package",
        pack?.ok ? `${pack.fileCount} files ready` : "build failed",
        pack?.ok
            ? "Admin専用項目を除外した公開データを1ファイルへまとめられます。"
            : pack?.issues?.[0]?.summary || "公開用データを作成できません。"
    ));
}

function createCard(title, value, description){
    const article = document.createElement("article");
    article.className = "system-card";
    const heading = document.createElement("h3");
    heading.textContent = title;
    const strong = document.createElement("strong");
    strong.textContent = value;
    const text = document.createElement("p");
    text.textContent = description;
    article.append(heading, strong, text);
    return article;
}

function reportError(error){
    console.error(error);
    const gate = document.getElementById("systemPublishGate");
    if(gate){
        gate.dataset.state = "blocked";
        gate.textContent = error?.message || "公開フローの確認に失敗しました。";
    }
    showToast(error?.message || "公開フローの確認に失敗しました", "error");
}
