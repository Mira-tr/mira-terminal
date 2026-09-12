import {
    getPublicAdminSurfaceForAdminLocation,
    resolveSurfaceUrls
} from "./publicAdminRegistry.js";

import {
    evaluatePublicSurface,
    getSurfaceReadinessLabel
} from "./surfaceReadiness.js";

const PREVIEW_MESSAGE_TYPE = "relmua-admin-preview";

export function initAdminSurfaceConsole({ adminRootUrl }){
    const rootUrl = adminRootUrl instanceof URL
        ? adminRootUrl
        : new URL(String(adminRootUrl));
    const main = document.querySelector(".admin-main");
    const breadcrumb = main?.querySelector(".admin-breadcrumb");
    if(!main || !breadcrumb) return null;

    const host = document.createElement("section");
    host.className = "admin-surface-console";
    host.setAttribute("aria-label", "公開ページとの接続");

    const preview = createPreviewDialog();
    document.body.appendChild(preview.dialog);
    breadcrumb.after(host);

    let currentSurface = null;

    const refresh = () => {
        currentSurface = getPublicAdminSurfaceForAdminLocation(rootUrl, window.location);
        if(!currentSurface){
            host.hidden = true;
            return;
        }
        host.hidden = false;
        renderConsole(host, currentSurface, rootUrl, preview, refresh);
    };

    window.addEventListener("hashchange", refresh);
    window.addEventListener("relmua-admin-preview-dirty", refresh);
    window.addEventListener("relmua-admin-saved", refresh);
    refresh();

    window.RELMUA_ADMIN_SURFACE_CONSOLE = {
        refresh,
        getSurface: () => currentSurface
    };

    return { refresh, host, dialog: preview.dialog };
}

function renderConsole(host, surface, adminRootUrl, preview, refresh){
    const urls = resolveSurfaceUrls(surface, adminRootUrl);
    const provider = window.RELMUA_ADMIN_PREVIEW_PROVIDER;
    const creator = safeProviderCall(provider, "getCreator", surface.id);
    const readiness = evaluatePublicSurface(surface, { creator });

    const copy = document.createElement("div");
    copy.className = "admin-surface-console__copy";

    const eyebrow = document.createElement("span");
    eyebrow.className = "admin-surface-console__eyebrow";
    eyebrow.textContent = surface.scope === "creator" ? "CREATOR PUBLIC ↔ EDITOR" : "PUBLIC ↔ EDITOR";

    const titleRow = document.createElement("div");
    titleRow.className = "admin-surface-console__title-row";
    const title = document.createElement("strong");
    title.textContent = surface.editorLabel;
    const state = document.createElement("span");
    state.className = `admin-surface-state is-${readiness.status}`;
    state.textContent = getSurfaceReadinessLabel(readiness);
    titleRow.append(title, state);

    const description = document.createElement("p");
    description.textContent = `${surface.description} 公開先: /${surface.publicPath}`;
    copy.append(eyebrow, titleRow, description);

    const actions = document.createElement("div");
    actions.className = "admin-surface-console__actions";

    const previewButton = document.createElement("button");
    previewButton.type = "button";
    previewButton.className = "button button-secondary";
    previewButton.textContent = provider?.getPayload ? "未保存をプレビュー" : "公開ページをプレビュー";
    previewButton.addEventListener("click", () => openPreview(preview, surface, urls, provider));

    const checkButton = document.createElement("button");
    checkButton.type = "button";
    checkButton.className = "button button-secondary";
    checkButton.textContent = "このページをチェック";

    const publishLink = document.createElement("a");
    publishLink.className = "button button-primary";
    const publishUrl = new URL("system/publish/", adminRootUrl);
    publishUrl.searchParams.set("surface", surface.id);
    publishLink.href = publishUrl.href;
    publishLink.textContent = "公開する";

    actions.append(previewButton, checkButton, publishLink);

    const details = document.createElement("div");
    details.className = "admin-surface-console__details";
    details.hidden = true;
    renderIssues(details, readiness);

    checkButton.addEventListener("click", () => {
        details.hidden = !details.hidden;
        checkButton.setAttribute("aria-expanded", String(!details.hidden));
        if(!details.hidden){
            renderIssues(details, evaluatePublicSurface(surface, {
                creator: safeProviderCall(window.RELMUA_ADMIN_PREVIEW_PROVIDER, "getCreator", surface.id)
            }));
        }
    });
    checkButton.setAttribute("aria-expanded", "false");

    host.replaceChildren(copy, actions, details);

    if(provider?.getPayload){
        requestAnimationFrame(refreshProviderState);
    }

    function refreshProviderState(){
        if(window.RELMUA_ADMIN_PREVIEW_PROVIDER !== provider){
            refresh();
        }
    }
}

function renderIssues(container, readiness){
    const heading = document.createElement("strong");
    heading.textContent = readiness.ready ? "このページは公開準備OKです。" : getSurfaceReadinessLabel(readiness);
    const list = document.createElement("div");
    list.className = "admin-surface-console__issue-list";

    if(readiness.issues.length === 0){
        const item = document.createElement("p");
        item.className = "admin-surface-console__empty";
        item.textContent = "必要な公開設定とスナップショット契約を確認できました。";
        list.appendChild(item);
    }else{
        readiness.issues.forEach(issue => {
            const item = document.createElement("article");
            item.className = `admin-surface-issue is-${issue.severity}`;
            const title = document.createElement("strong");
            title.textContent = issue.title;
            const summary = document.createElement("p");
            summary.textContent = issue.summary;
            item.append(title, summary);
            list.appendChild(item);
        });
    }

    container.replaceChildren(heading, list);
}

function createPreviewDialog(){
    const dialog = document.createElement("dialog");
    dialog.className = "admin-surface-preview-dialog";

    const shell = document.createElement("div");
    shell.className = "admin-surface-preview-dialog__shell";
    const header = document.createElement("header");
    const heading = document.createElement("div");
    const eyebrow = document.createElement("span");
    eyebrow.textContent = "PUBLIC PREVIEW";
    const title = document.createElement("strong");
    title.textContent = "公開ページプレビュー";
    heading.append(eyebrow, title);

    const controls = document.createElement("div");
    const openLink = document.createElement("a");
    openLink.className = "button button-secondary";
    openLink.target = "_blank";
    openLink.rel = "noopener";
    openLink.textContent = "別タブで開く";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "button button-secondary";
    close.textContent = "閉じる";
    close.addEventListener("click", () => dialog.close());
    controls.append(openLink, close);
    header.append(heading, controls);

    const note = document.createElement("p");
    note.className = "admin-surface-preview-dialog__note";
    note.textContent = "Admin内だけの確認表示です。未保存ドラフト対応ページでは、Publicへ保存せず現在の入力内容を重ねて確認します。";

    const frame = document.createElement("iframe");
    frame.className = "admin-surface-preview-frame";
    frame.title = "公開ページプレビュー";
    frame.setAttribute("loading", "eager");

    shell.append(header, note, frame);
    dialog.appendChild(shell);
    dialog.addEventListener("click", event => {
        if(event.target === dialog) dialog.close();
    });

    return { dialog, title, openLink, frame };
}

async function openPreview(preview, surface, urls, provider){
    const url = new URL(urls.publicHref);
    url.searchParams.set("adminPreview", surface.id);
    preview.title.textContent = `${surface.editorLabel} / Public Preview`;
    preview.openLink.href = urls.publicHref;

    const payload = await Promise.resolve(safeProviderCall(provider, "getPayload", surface.id));
    const postDraft = () => {
        if(!payload || !preview.frame.contentWindow) return;
        preview.frame.contentWindow.postMessage({
            type: PREVIEW_MESSAGE_TYPE,
            surfaceId: surface.id,
            payload
        }, url.origin);
    };
    preview.frame.addEventListener("load", postDraft, { once: true });
    preview.frame.src = url.href;

    if(typeof preview.dialog.showModal === "function"){
        preview.dialog.showModal();
    }else{
        preview.dialog.setAttribute("open", "");
    }
}

function safeProviderCall(provider, method, surfaceId){
    try{
        return typeof provider?.[method] === "function"
            ? provider[method](surfaceId)
            : null;
    }catch(error){
        console.warn(`[admin-preview] ${method} failed`, error);
        return null;
    }
}
