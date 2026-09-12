import {
    runPublishPreflight
} from "../features/system/publish/publishPreflight.js";

import {
    computePublicSnapshotFingerprint,
    createPublicSnapshotPackage,
    downloadPublicSnapshotPackage,
    getApplyPublicPackageCommand
} from "../features/system/publish/publicSnapshotPackage.js";

import {
    getAutomaticPublishAccess,
    getPublicationHistory,
    requestAutomaticPublish,
    requestPublicationRollback
} from "../features/system/publish/publicationService.js";

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

const POLL_INTERVAL_MS = 15_000;

initToastService();
initPublishFlow();

async function initPublishFlow(){
    const publishButton = document.getElementById("systemPublishNow");
    const packageButton = document.getElementById("systemPublishPackage");
    const copyApplyButton = document.getElementById("copyApplyPackageCommand");
    const refreshButton = document.getElementById("systemPublishPreflight");
    const historyContainer = document.getElementById("systemPublicationHistory");
    let latestFilename = "";
    let pollTimer = null;

    try{
        await hydrateCanonicalAdminState();
    }catch(error){
        console.warn("[publish] Canonical hydrate fell back to compatibility cache", error);
    }

    await render().catch(reportError);

    refreshButton?.addEventListener("click", () => render().catch(reportError));

    publishButton?.addEventListener("click", async () => {
        publishButton.disabled = true;
        publishButton.setAttribute("aria-busy", "true");
        try{
            const preflight = await runCurrentPreflight();
            if(!preflight.ready){
                renderFlowStatus(preflight);
                showToast("公開前チェックに修正が必要です", "warning");
                return;
            }
            const snapshot = createPublicSnapshotPackage();
            const result = await requestAutomaticPublish({
                snapshot,
                surfaceId: currentSurfaceId()
            });
            recordActivity({
                action: "publish-queue",
                workspace: "system",
                module: "publish",
                summary: result?.alreadyPublished
                    ? "Public snapshot already matches production"
                    : `Queued Public snapshot for GitHub Pages: ${result?.request?.id || "unknown"}`,
                result: "success",
                severity: "high"
            });
            showToast(
                result?.alreadyPublished
                    ? "この内容はすでに公開済みです"
                    : result?.alreadyQueued
                        ? "この内容はすでに公開処理中です"
                        : "本番公開を受け付けました",
                "success"
            );
            await render();
        }catch(error){
            reportError(error);
        }finally{
            publishButton.removeAttribute("aria-busy");
        }
    });

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
                summary: `Created manual Public snapshot package: ${result.filename}`,
                result: "success",
                severity: "high"
            });
            showToast("手動復旧用の公開パッケージを保存しました", "success");
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

    historyContainer?.addEventListener("click", async event => {
        const button = event.target.closest("[data-rollback-request]");
        if(!button) return;
        const requestId = button.dataset.rollbackRequest || "";
        if(!requestId) return;
        if(!window.confirm("この公開版のPublicデータへ戻して、本番へ再公開しますか？")) return;
        button.disabled = true;
        try{
            const result = await requestPublicationRollback(requestId);
            recordActivity({
                action: "publish-rollback",
                workspace: "system",
                module: "publish",
                summary: `Queued Public snapshot rollback: ${requestId}`,
                result: "success",
                severity: "high"
            });
            showToast(
                result?.alreadyPublished ? "すでにこの公開版です" : "ロールバックを公開キューへ登録しました",
                "success"
            );
            await render();
        }catch(error){
            reportError(error);
        }finally{
            button.disabled = false;
        }
    });

    window.addEventListener("pagehide", () => clearPoll());

    async function render(){
        clearPoll();
        const result = await runCurrentPreflight();
        renderFlowStatus(result);
        if(packageButton) packageButton.disabled = !result.ready;

        let snapshot = null;
        let fingerprint = "";
        if(result.snapshotPackage?.ok){
            snapshot = createPublicSnapshotPackage();
            fingerprint = await computePublicSnapshotFingerprint(snapshot);
        }

        let access = { configured: false, authenticated: false, isAdmin: false, message: "" };
        let history = [];
        try{
            access = await getAutomaticPublishAccess();
            if(access.isAdmin){
                history = await getPublicationHistory();
            }
        }catch(error){
            access = { ...access, message: error?.message || "自動公開サービスへ接続できませんでした。" };
        }

        const state = derivePublicationState(fingerprint, history, access);
        renderPublicationState(state, access, fingerprint);
        renderPublicationHistory(history);
        configurePublishButton(publishButton, result, state, access);

        if(state.code === "publishing" || state.code === "other-publishing"){
            pollTimer = window.setTimeout(() => render().catch(reportError), POLL_INTERVAL_MS);
        }
        return { result, state, access, snapshot, fingerprint };
    }

    function clearPoll(){
        if(pollTimer !== null){
            window.clearTimeout(pollTimer);
            pollTimer = null;
        }
    }
}

async function runCurrentPreflight(){
    return runPublishPreflight({ surfaceId: currentSurfaceId() });
}

function currentSurfaceId(){
    return new URLSearchParams(window.location.search).get("surface") || "";
}

function derivePublicationState(fingerprint, history, access){
    if(!access.configured){
        return state("unavailable", "手動公開のみ", "Supabase CMSが未設定です。自動公開は利用できません。", null);
    }
    if(!access.authenticated){
        return state("signed-out", "ログインが必要", "Discordでログインすると自動公開を利用できます。", null);
    }
    if(!access.isAdmin){
        return state("forbidden", "Admin権限が必要", "RELMUA Admin権限を持つユーザーだけが本番公開できます。", null);
    }

    const active = history.find(item => ["queued", "processing"].includes(item.status));
    if(active){
        if(active.fingerprint === fingerprint){
            return state(
                "publishing",
                active.status === "processing" ? "公開中" : "公開待ち",
                active.status === "processing"
                    ? "GitHub ActionsがPublicデータを検証・commit・Pages deployしています。"
                    : "公開キューへ登録済みです。GitHub Actionsが5分間隔で新しい公開要求を取得します。",
                active
            );
        }
        return state(
            "other-publishing",
            "別の公開が進行中",
            "先に受け付けた公開が完了してから、現在の保存内容を公開できます。",
            active
        );
    }

    const latestPublished = history.find(item => item.status === "published") || null;
    if(fingerprint && latestPublished?.fingerprint === fingerprint){
        return state("published", "公開済み", "現在の保存内容と本番のPublic Snapshotは一致しています。", latestPublished);
    }

    const matchingFailure = history.find(item => item.status === "failed" && item.fingerprint === fingerprint) || null;
    if(matchingFailure){
        return state(
            "failed",
            "公開失敗",
            matchingFailure.errorMessage || "前回の公開処理に失敗しました。内容を確認して再公開できます。",
            matchingFailure
        );
    }

    return state(
        "unpublished",
        "保存済み・未公開",
        latestPublished
            ? "保存内容は本番より新しい状態です。公開前チェック後に本番へ反映できます。"
            : "まだ自動公開されたPublic Snapshotがありません。",
        latestPublished
    );
}

function state(code, label, description, request){
    return { code, label, description, request };
}

function renderPublicationState(publicationState, access, fingerprint){
    const container = document.getElementById("systemPublicationState");
    if(!container) return;
    const card = document.createElement("article");
    card.className = "system-card";
    card.dataset.state = publicationState.code;

    const heading = document.createElement("h3");
    heading.textContent = publicationState.label;
    const text = document.createElement("p");
    text.textContent = publicationState.description;
    card.append(heading, text);

    if(publicationState.request?.finishedAt || publicationState.request?.requestedAt){
        const time = document.createElement("small");
        time.textContent = `${publicationState.request.status === "published" ? "最終公開" : "受付"}: ${formatDateTime(publicationState.request.finishedAt || publicationState.request.requestedAt)}`;
        card.append(time);
    }
    if(publicationState.request?.deploymentUrl){
        const link = createSafeExternalLink("本番を確認 ↗", publicationState.request.deploymentUrl);
        if(link) card.append(link);
    }
    if(fingerprint){
        const hash = document.createElement("small");
        hash.textContent = `現在のSnapshot: ${fingerprint.slice(0, 12)}`;
        card.append(hash);
    }
    if(access.message && !access.isAdmin){
        const note = document.createElement("small");
        note.textContent = access.message;
        card.append(note);
    }
    container.replaceChildren(card);
}

function renderPublicationHistory(history){
    const container = document.getElementById("systemPublicationHistory");
    if(!container) return;
    if(!history.length){
        container.replaceChildren(createCard("公開履歴", "まだありません", "最初の自動公開が成功すると、ここから過去のPublic Snapshotへ戻せます。"));
        return;
    }

    const latestPublished = history.find(item => item.status === "published") || null;
    const cards = history.slice(0, 8).map(item => {
        const article = document.createElement("article");
        article.className = "system-card";
        article.dataset.state = item.status;
        const heading = document.createElement("h3");
        heading.textContent = publicationStatusLabel(item.status);
        const strong = document.createElement("strong");
        strong.textContent = formatDateTime(item.finishedAt || item.requestedAt);
        const detail = document.createElement("p");
        detail.textContent = publicationDetail(item);
        article.append(heading, strong, detail);

        if(item.deploymentUrl){
            const link = createSafeExternalLink("公開ページ ↗", item.deploymentUrl);
            if(link) article.append(link);
        }
        if(item.status === "published" && item.id !== latestPublished?.id){
            const rollback = document.createElement("button");
            rollback.type = "button";
            rollback.className = "button button-secondary";
            rollback.dataset.rollbackRequest = item.id;
            rollback.textContent = "この版へ戻す";
            article.append(rollback);
        }
        return article;
    });
    container.replaceChildren(...cards);
}

function configurePublishButton(button, preflight, publicationState, access){
    if(!button) return;
    const labels = {
        published: "公開済み",
        publishing: "公開中…",
        "other-publishing": "公開中…",
        failed: "もう一度公開",
        unpublished: "本番へ公開",
        "signed-out": "Discordログインが必要",
        forbidden: "Admin権限が必要",
        unavailable: "自動公開を利用できません"
    };
    button.textContent = labels[publicationState.code] || "本番へ公開";
    button.disabled = !preflight.ready
        || !access.isAdmin
        || ["published", "publishing", "other-publishing"].includes(publicationState.code);
}

function renderFlowStatus(result){
    renderSurfaceContext(result);
    renderPackageContext(result);

    const gate = document.getElementById("systemPublishGate");
    if(gate){
        gate.dataset.state = result.status;
        gate.textContent = result.ready
            ? "公開前チェックOK。保存済みのPublic-safeデータを本番へ公開できます。"
            : "Critical / High の項目を直すまで本番公開できません。";
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
            ? "Admin専用項目を除外した8つの公開データを、1回の公開要求として安全に扱います。"
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

function publicationStatusLabel(status){
    return ({
        queued: "公開待ち",
        processing: "公開中",
        published: "公開成功",
        failed: "公開失敗",
        superseded: "新しい公開で置換"
    })[status] || "公開履歴";
}

function publicationDetail(item){
    const parts = [];
    if(item.commitSha) parts.push(`commit ${String(item.commitSha).slice(0, 10)}`);
    if(item.rollbackOf) parts.push("ロールバック");
    if(item.errorMessage) parts.push(item.errorMessage);
    if(!parts.length) parts.push(`Snapshot ${String(item.fingerprint || "").slice(0, 12)}`);
    return parts.join(" / ");
}

function formatDateTime(value){
    const date = new Date(value || "");
    if(Number.isNaN(date.valueOf())) return "時刻不明";
    return new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).format(date);
}

function createSafeExternalLink(label, href){
    try{
        const url = new URL(String(href || ""));
        if(url.protocol !== "https:") return null;
        const link = document.createElement("a");
        link.href = url.href;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = label;
        return link;
    }catch{
        return null;
    }
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
