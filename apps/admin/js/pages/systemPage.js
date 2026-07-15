import {
    initToastService,
    showToast
} from "../features/common/toastService.js";

import {
    clearActivityLog,
    exportActivityLogPayload,
    getActivityLog,
    recordActivity
} from "../features/system/activityLog.js";

import {
    createSystemBackup,
    exportSystemBackup,
    getBackupSummaries
} from "../features/system/backup/systemBackup.js";

import {
    getExportOverview,
    markSystemExportReview
} from "../features/system/export/systemExport.js";

import {
    applySystemImport,
    previewSystemImport,
    readJsonFile
} from "../features/system/import/systemImport.js";

import {
    runPublishPreflight
} from "../features/system/publish/publishPreflight.js";

import {
    getRegistrySummary,
    getSystemSettings
} from "../features/system/settings/systemSettings.js";

import {
    runSystemValidation
} from "../features/system/validation/validationCenter.js";

initToastService();
initSystemPage();

function initSystemPage(){
    const page = document.body.dataset.systemPage;

    if(page === "backup") initBackupPage();
    if(page === "import") initImportPage();
    if(page === "export") initExportPage();
    if(page === "settings") initSettingsPage();
    if(page === "publish") initPublishPage();
    if(page === "logs") initLogsPage();
    if(page === "validation") initValidationPage();
    if(page === "guide") initGuidePage();
}

function initBackupPage(){
    renderBackupSummary();
    const button = document.getElementById("systemBackupExport");
    button?.addEventListener("click", () => {
        const { filename } = exportSystemBackup();
        renderBackupSummary();
        setStatus(`Backup exported: ${filename}`, "success");
    });
}

function initImportPage(){
    const input = document.getElementById("systemImportFile");
    const previewButton = document.getElementById("systemImportPreview");
    const applyButton = document.getElementById("systemImportApply");
    const cancelButton = document.getElementById("systemImportCancel");
    const rollbackButton = document.getElementById("systemImportRollbackDownload");
    const dialog = document.getElementById("systemImportDialog");
    const confirmButton = document.getElementById("systemImportConfirm");
    const dialogCancelButton = document.getElementById("systemImportDialogCancel");
    let pendingPayload = null;
    let pendingRollback = null;
    let focusBeforeDialog = null;

    previewButton?.addEventListener("click", async () => {
        const file = input?.files?.[0];
        if(!file){
            setStatus("Select a backup JSON file first.", "warning");
            return;
        }

        const read = await readJsonFile(file);
        if(!read.ok){
            renderImportPreview({
                ok: false,
                errors: read.errors,
                changes: []
            });
            pendingPayload = null;
            pendingRollback = null;
            applyButton.disabled = true;
            rollbackButton.disabled = true;
            return;
        }

        const preview = previewSystemImport(read.payload);
        pendingPayload = preview.ok ? read.payload : null;
        pendingRollback = preview.ok ? preview.rollback : null;
        applyButton.disabled = !preview.ok;
        rollbackButton.disabled = !preview.ok;
        renderImportPreview(preview);
    });

    applyButton?.addEventListener("click", () => {
        if(!pendingPayload){
            setStatus("Preview a valid backup before import.", "warning");
            return;
        }

        focusBeforeDialog = document.activeElement;
        openImportDialog(dialog, confirmButton, () => {
            const result = applySystemImport(pendingPayload);
            renderImportPreview(result);
            applyButton.disabled = true;
            rollbackButton.disabled = true;
            pendingPayload = null;
            pendingRollback = null;
            setStatus(`Imported ${result.changes.length} storage targets.`, "success");
        }, focusBeforeDialog || applyButton);
    });

    cancelButton?.addEventListener("click", () => {
        pendingPayload = null;
        pendingRollback = null;
        if(input) input.value = "";
        applyButton.disabled = true;
        rollbackButton.disabled = true;
        renderImportPreview({
            ok: true,
            changes: [],
            warnings: ["Import preview canceled. No local data was changed."],
            rollback: null
        });
        setStatus("Import canceled. No local data was changed.", "warning");
    });

    rollbackButton?.addEventListener("click", () => {
        if(!pendingRollback){
            setStatus("Preview a valid backup before downloading rollback.", "warning");
            return;
        }

        const filename = `relmua-terminal-rollback-before-import-${dateStamp(new Date())}.json`;
        downloadJson(pendingRollback, filename);
        recordActivity({
            action: "rollback-backup",
            workspace: "system",
            module: "import",
            summary: `Rollback backup downloaded: ${filename}`,
            result: "success",
            severity: "high"
        });
        setStatus("Rollback backup downloaded.", "success");
    });

    dialogCancelButton?.addEventListener("click", () => closeImportDialog(dialog, applyButton));
    dialog?.addEventListener("cancel", event => {
        event.preventDefault();
        closeImportDialog(dialog, applyButton);
    });
    dialog?.addEventListener("keydown", event => {
        if(event.key === "Tab") trapDialogFocus(event, dialog);
        if(event.key === "Escape"){
            event.preventDefault();
            closeImportDialog(dialog, applyButton);
        }
    });
}

function initExportPage(){
    renderExportOverview();
    document.getElementById("systemExportReview")?.addEventListener("click", () => {
        markSystemExportReview();
        renderExportOverview();
        setStatus("Export targets reviewed. Run each module export before build.", "success");
    });
}

function initSettingsPage(){
    renderSettings();
    renderRegistrySummary();
}

async function initPublishPage(){
    await renderPublishPreflight();
    document.getElementById("systemPublishPreflight")?.addEventListener("click", renderPublishPreflight);
    document.getElementById("copyBuildCommand")?.addEventListener("click", async () => {
        await navigator.clipboard?.writeText("node scripts/build-public.mjs");
        recordActivity({
            action: "copy-build-command",
            workspace: "system",
            module: "publish",
            summary: "Copied build command.",
            result: "success"
        });
        setStatus("Build command copied.", "success");
    });
}

function initLogsPage(){
    let activeFilter = "all";
    renderActivityLog(activeFilter);
    const filter = document.getElementById("systemLogFilter");
    filter?.addEventListener("change", () => {
        activeFilter = filter.value || "all";
        renderActivityLog(activeFilter);
    });

    document.getElementById("systemLogExport")?.addEventListener("click", () => {
        const filename = `relmua-terminal-activity-log-${dateStamp(new Date())}.json`;
        downloadJson(exportActivityLogPayload(), filename);
        recordActivity({
            action: "activity-log-export",
            workspace: "system",
            module: "activity-log",
            summary: `Activity Log exported: ${filename}`,
            result: "success",
            severity: "info"
        });
        renderActivityLog(activeFilter);
        setStatus("Activity log exported.", "success");
    });

    document.getElementById("systemLogClear")?.addEventListener("click", () => {
        const confirmed = confirm("Clear the local Activity Log? This does not delete content data.");
        if(!confirmed){
            return;
        }
        clearActivityLog();
        renderActivityLog(activeFilter);
        setStatus("Activity log cleared.", "success");
    });
}

function initValidationPage(){
    renderValidationCenter();
    document.getElementById("systemValidationRun")?.addEventListener("click", () => {
        renderValidationCenter();
        setStatus("Validation completed.", "success");
    });
}

function initGuidePage(){
    const validation = runSystemValidation();
    const list = document.getElementById("systemGuideValidation");
    list?.replaceChildren(...validation.issues.map(createIssueNode));
    if(list && validation.issues.length === 0){
        list.replaceChildren(createEmpty("No blocking validation issues in local Admin data."));
    }
}

function renderBackupSummary(){
    const list = document.getElementById("systemBackupTargets");
    const estimate = document.getElementById("systemBackupEstimate");
    const targets = getBackupSummaries();
    const payload = createSystemBackup();
    const bytes = new Blob([JSON.stringify(payload)]).size;

    list?.replaceChildren(...targets.map(target => createMetricCard(
        target.title,
        target.validJson ? `${target.count} records` : "Invalid JSON",
        target.exists ? `${target.bytes} bytes` : "not stored"
    )));

    if(estimate){
        estimate.textContent = `Backup type ${payload.backupType}, schemaVersion ${payload.schemaVersion}, estimated ${bytes} bytes.`;
    }
}

function renderImportPreview(preview){
    const list = document.getElementById("systemImportPreviewList");
    if(!list) return;

    if(!preview.ok){
        list.replaceChildren(...preview.errors.map(error => createIssueNode({
            severity: "critical",
            title: "Import blocked",
            summary: error,
            href: "#systemImportFile"
        })));
        return;
    }

    const nodes = preview.changes.map(change => createMetricCard(
        change.key,
        change.action,
        change.exists ? "will overwrite existing data" : "will create new data"
    ));

    if(preview.rollback){
        nodes.unshift(createMetricCard(
            "Rollback Backup",
            "prepared",
            "Download before confirming import if you need a manual restore point."
        ));
    }

    if(preview.warnings?.length){
        nodes.push(...preview.warnings.map(warning => createIssueNode({
            severity: "warning",
            title: "Import warning",
            summary: warning,
            href: "#systemImportFile"
        })));
    }

    list.replaceChildren(...nodes);
}

function renderExportOverview(){
    const overview = getExportOverview();
    const list = document.getElementById("systemExportTargets");
    const summary = document.getElementById("systemExportSummary");

    list?.replaceChildren(...overview.targets.map(target => createMetricCard(
        target.title,
        target.filename,
        `${target.destination} / ${target.state}`
    )));

    if(summary){
        summary.textContent = `${overview.exportedCount} exported, ${overview.pendingCount} need confirmation. Last export: ${overview.last?.[0] || "none"}`;
    }
}

function renderSettings(){
    const list = document.getElementById("systemSettingsList");
    list?.replaceChildren(...getSystemSettings().map(setting => createMetricCard(
        setting.label,
        setting.value,
        setting.description
    )));
}

function renderRegistrySummary(){
    const registry = getRegistrySummary();
    const list = document.getElementById("systemRegistrySummary");
    const items = [
        ["Brand sections", registry.brandSections.length],
        ["Creator sites", registry.creatorSites.length],
        ["Modules", registry.modules.length],
        ["System sections", registry.systemSections.length]
    ];
    list?.replaceChildren(...items.map(([label, value]) => createMetricCard(label, String(value), "Registry-driven")));
}

async function renderPublishPreflight(){
    const result = await runPublishPreflight();
    const list = document.getElementById("systemPublishIssues");
    const status = document.getElementById("systemPublishStatus");
    const manifest = document.getElementById("systemBuildManifest");

    if(status){
        status.textContent = result.ready ? "Publish ready" : "Publish is not ready";
        status.dataset.state = result.status;
    }

    if(manifest){
        const value = result.buildManifest.manifest;
        manifest.replaceChildren(
            createMetricCard("Build manifest", result.buildManifest.ok ? "loaded" : "missing", result.buildManifest.error || "dist/build-manifest.json"),
            value ? createMetricCard("Build", value.status || "unknown", `files ${value.publicFileCount}, JSON ${value.publicJsonCount}, assets ${value.assetCount}`) : createEmpty("Run node scripts/build-public.mjs.")
        );
    }

    list?.replaceChildren(...result.issues.map(createIssueNode));
    if(list && result.issues.length === 0){
        list.replaceChildren(createEmpty("No Critical or High publish issues."));
    }

    recordActivity({
        action: "publish-preflight",
        workspace: "system",
        module: "publish",
        summary: result.ready ? "Publish preflight ready." : `Publish preflight found ${result.issues.length} issues.`,
        result: result.ready ? "success" : "warning",
        severity: result.ready ? "info" : "high"
    });
}

function renderValidationCenter(){
    const validation = runSystemValidation();
    const list = document.getElementById("systemValidationIssues");
    const status = document.getElementById("systemValidationStatus");

    if(status){
        status.textContent = validation.status === "ok"
            ? "No Critical or High validation issues."
            : `Validation status: ${validation.status}`;
        status.dataset.state = validation.status;
    }

    list?.replaceChildren(...validation.issues.map(createIssueNode));
    if(list && validation.issues.length === 0){
        list.replaceChildren(createEmpty("No blocking registry, local data, or export target issues."));
    }

    recordActivity({
        action: "validation",
        workspace: "system",
        module: "validation",
        summary: validation.status === "ok"
            ? "Validation completed without blocking issues."
            : `Validation completed with ${validation.issues.length} issues.`,
        result: validation.status === "ok" ? "success" : "warning",
        severity: validation.status === "ok" ? "info" : "high"
    });
}

function renderActivityLog(filter = "all"){
    const list = document.getElementById("systemActivityLog");
    const entries = getActivityLog().filter(entry => (
        filter === "all" || entry.result === filter || entry.action === filter
    ));

    list?.replaceChildren(...entries.map(entry => createMetricCard(
        `${entry.action} / ${entry.result}`,
        formatDate(entry.timestamp),
        `${entry.workspace || "system"} ${entry.module || ""} ${entry.summary}`
    )));

    if(list && entries.length === 0){
        list.replaceChildren(createEmpty(filter === "all"
            ? "No local activity has been recorded yet."
            : "No activity matches the selected filter."));
    }
}

function createMetricCard(title, value, description){
    const article = document.createElement("article");
    article.className = "system-card";
    const heading = document.createElement("h3");
    const strong = document.createElement("strong");
    const text = document.createElement("p");
    heading.textContent = title;
    strong.textContent = value;
    text.textContent = description;
    article.append(heading, strong, text);
    return article;
}

function createIssueNode(issue){
    const article = document.createElement("article");
    article.className = `system-issue is-${issue.severity}`;
    const heading = document.createElement("h3");
    const summary = document.createElement("p");
    const link = document.createElement("a");
    heading.textContent = issue.title;
    summary.textContent = issue.summary;
    link.href = issue.href || "#";
    link.textContent = "Open target";
    article.append(heading, summary, link);
    return article;
}

function createEmpty(message){
    const paragraph = document.createElement("p");
    paragraph.className = "system-empty";
    paragraph.textContent = message;
    return paragraph;
}

function setStatus(message, tone){
    const element = document.getElementById("systemPageStatus");
    if(element){
        element.textContent = message;
        element.dataset.tone = tone;
    }
    showToast(message, tone === "success" ? "success" : "info");
}

function downloadJson(payload, filename){
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json"
    }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

function openImportDialog(dialog, confirmAction, onConfirm, returnTarget){
    if(!dialog){
        const confirmed = confirm("Import will replace selected local data. A rollback backup is available from preview. Continue?");
        if(confirmed) onConfirm();
        return;
    }

    const cleanup = () => {
        confirmAction?.removeEventListener("click", handleConfirm);
        dialog.removeEventListener("close", handleClose);
    };
    const handleConfirm = () => {
        onConfirm();
        closeImportDialog(dialog, returnTarget);
        cleanup();
    };
    const handleClose = () => cleanup();

    confirmAction?.addEventListener("click", handleConfirm, {
        once: true
    });
    dialog.addEventListener("close", handleClose, {
        once: true
    });
    dialog.showModal();
    confirmAction?.focus();
}

function closeImportDialog(dialog, returnTarget){
    if(dialog?.open){
        dialog.close();
    }
    returnTarget?.focus?.();
}

function trapDialogFocus(event, dialog){
    const focusable = [...dialog.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
    )];

    if(focusable.length === 0){
        event.preventDefault();
        return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if(event.shiftKey && document.activeElement === first){
        event.preventDefault();
        last.focus();
    }else if(!event.shiftKey && document.activeElement === last){
        event.preventDefault();
        first.focus();
    }
}

function dateStamp(date){
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("");
}

function formatDate(value){
    const date = new Date(value);
    if(Number.isNaN(date.getTime())){
        return "Unknown time";
    }
    return new Intl.DateTimeFormat("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).format(date);
}
