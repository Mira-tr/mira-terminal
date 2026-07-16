import {
    getStudioPublicJsonModules,
    validatePublicJsonRegistry
} from "../shared/studioPublicJsonRegistry.js";

import {
    createProjectStatus
} from "../shared/studioProjectRoot.js";

import {
    loadAdminTodaySummary
} from "../../../admin/js/features/common/adminTodaySummary.js";

import {
    getActivityLog
} from "../../../admin/js/features/system/activityLog.js";

import {
    createCollectionEditorRoute,
    getActiveCollectionTypes,
    getAvailableCollectionOwners,
    getCollectionStorageMapping,
    resolveCollectionOwner,
    resolveCollectionType
} from "../../../admin/js/features/collections/collectionRegistry.js";

const WORKSPACES = Object.freeze([
    {
        id: "brand",
        title: "Brand",
        label: "RELMUA全体",
        description: "Home、Projects、Tools、Notes、Creators、About、Contactを管理します。",
        href: "../admin/terminal/#workspace-brand",
        items: Object.freeze([
            createWorkspaceItem("Home", "../admin/home/", "active"),
            createWorkspaceItem("Projects", "../admin/game/", "active"),
            createWorkspaceItem("Tools", "../admin/tools/", "active"),
            createWorkspaceItem("Notes", "../admin/notes/", "active"),
            createWorkspaceItem("Creators", "../admin/creators/", "active"),
            createWorkspaceItem("Publish", "../admin/system/publish/", "active")
        ])
    },
    {
        id: "creators",
        title: "Creators",
        label: "活動者",
        description: "Creatorごとの作業場所です。TRPGは千景の中にあります。",
        href: "../admin/terminal/#workspace-creators",
        items: Object.freeze([
            createWorkspaceItem("千景", "../admin/terminal/#workspace-creator-chikage", "active"),
            createWorkspaceItem("Scenario Library", "../admin/trpg/", "active"),
            createWorkspaceItem("House Rules", "../admin/trpg/rules/", "active")
        ])
    },
    {
        id: "system",
        title: "System",
        label: "安全と公開",
        description: "Backup、Import、Export、Publish、Validation、Activityを確認します。",
        href: "../admin/terminal/#workspace-system",
        items: Object.freeze([
            createWorkspaceItem("Backup", "../admin/system/backup/", "active"),
            createWorkspaceItem("Import", "../admin/system/import/", "active"),
            createWorkspaceItem("Export", "../admin/system/export/", "active"),
            createWorkspaceItem("Validation", "../admin/system/validation/", "active"),
            createWorkspaceItem("Activity Log", "../admin/system/logs/", "active")
        ])
    },
    {
        id: "terminal",
        title: "Terminal",
        label: "全体入口",
        description: "Brand / Creators / System の関係を確認します。",
        href: "../admin/terminal/",
        current: true,
        items: Object.freeze([
            createWorkspaceItem("Terminal Overview", "../admin/terminal/", "active"),
            createWorkspaceItem("Operations Guide", "../admin/system/guide/", "active")
        ])
    }
]);

const QUICK_ACTIONS = Object.freeze([
    {
        id: "add",
        title: "＋追加",
        description: "作品やTRPGなど、追加したい内容から始めます。",
        action: "wizard",
        primary: true
    },
    {
        id: "preview",
        title: "Preview",
        description: "公開前の見え方を確認します。",
        href: "../web/"
    },
    {
        id: "export",
        title: "Public Export",
        description: "公開用データを作成します。",
        href: "../admin/system/export/"
    },
    {
        id: "build",
        title: "公開サイトを更新",
        description: "公開前確認とBuildへ進みます。",
        href: "../admin/system/publish/"
    },
    {
        id: "backup",
        title: "Backup",
        description: "作業前に戻せる状態を残します。",
        href: "../admin/system/backup/"
    },
    {
        id: "public",
        title: "公開サイトを見る",
        description: "今公開されているRELMUAを開きます。",
        href: "../web/"
    }
]);

const ADD_CHOICES = Object.freeze([
    {
        id: "project",
        title: "作品",
        description: "RELMUAの作品を追加します。",
        enabled: false
    },
    {
        id: "collection",
        title: "コレクション",
        description: "TRPGなど、まとまりのある記録を追加します。",
        enabled: true
    },
    {
        id: "note",
        title: "制作記録",
        description: "制作メモや更新記録を書きます。",
        enabled: false
    },
    {
        id: "tool",
        title: "ツール",
        description: "公開する道具を追加します。",
        enabled: false
    },
    {
        id: "creator",
        title: "活動者",
        description: "Creator Siteを追加します。",
        enabled: false
    },
    {
        id: "page",
        title: "ページ",
        description: "BrandやCreatorのページを追加します。",
        enabled: false
    }
]);

const wizardState = {
    step: "content",
    contentType: "",
    collectionTypeId: "",
    ownerCreatorId: "",
    opener: null
};

const STEP_ORDER = ["content", "collection-type", "owner", "review"];

let studioMode = "beginner";

renderStudio();

function renderStudio(){
    renderDashboard();
    renderProjectStatus();
    renderJsonModules();
    initAddWizard();
    initModeSwitch();
}

function renderDashboard(){
    const summary = loadDashboardSummary();
    const activity = loadDashboardActivity();
    renderHero(summary);
    renderToday(summary);
    renderRecentWork(summary);
    renderWorkspaces();
    renderQuickActions();
    renderProjectHealth(summary);
    renderActivity(activity);
}

function loadDashboardSummary(){
    try{
        return loadAdminTodaySummary(localStorage);
    }catch{
        return {
            metrics: [],
            recent: [],
            lastBackupText: "Backup状態を読み込めません",
            storageAvailable: false
        };
    }
}

function loadDashboardActivity(){
    try{
        return getActivityLog(localStorage).slice(0, 6);
    }catch{
        return [];
    }
}

function renderHero(summary){
    const container = document.getElementById("studioHeroStats");
    if(!container) return;

    const publicMetric = summary.metrics.find(metric => metric.label === "Public");
    const attentionMetric = summary.metrics.find(metric => metric.label === "Draft / Ready");
    const exportMetric = summary.metrics.find(metric => metric.label === "Last Public Export");

    container.replaceChildren(
        createStatPill("公開中", publicMetric?.value ?? 0, publicMetric?.note || "公開データ"),
        createStatPill("確認待ち", attentionMetric?.value ?? 0, attentionMetric?.value ? "見直しがあります" : "問題なし"),
        createStatPill("公開更新", exportMetric?.tone === "success" ? "可能" : "確認", toExportHealthNote(exportMetric))
    );
}

function renderToday(summary){
    const container = document.getElementById("studioTodayList");
    const modeLabel = document.getElementById("studioModeLabel");
    if(modeLabel){
        modeLabel.textContent = studioMode === "advanced" ? "Advanced Mode" : "Beginner Mode";
    }
    if(!container) return;

    const metrics = Object.fromEntries(summary.metrics.map(metric => [metric.label, metric]));
    const attention = Number(metrics["Draft / Ready"]?.value || 0);
    const lastExportMissing = metrics["Last Public Export"]?.tone !== "success";
    const lastBackupMissing = metrics["Last Backup"]?.tone !== "success";
    const tasks = [
        createTask("Draftがあります", attention > 0, attention ? `${attention}件の下書きや確認待ちがあります。保存後はPreviewを見てください。` : "下書きの確認待ちはありません。", "../admin/"),
        createTask("公開用データの確認", lastExportMissing, lastExportMissing ? "公開用データを作ると、Publicへ反映する準備ができます。" : "公開用データの記録があります。", "../admin/system/export/"),
        createTask("Backup確認", lastBackupMissing, lastBackupMissing ? "作業前にBackupを作ると戻せます。" : summary.lastBackupText, "../admin/system/backup/"),
        createTask("公開前確認へ進めます", true, "公開できるかはPublish画面のPreflightで確認します。", "../admin/system/publish/")
    ].filter(task => task.active);

    if(tasks.length === 0){
        container.replaceChildren(createEmptyState("今日は問題ありません", "編集を始めるか、公開サイトの見え方を確認できます。", "＋ 新しく追加", "wizard"));
        return;
    }

    container.replaceChildren(...tasks.map(createTaskElement));
}

function renderRecentWork(summary){
    const container = document.getElementById("studioRecentWork");
    if(!container) return;

    if(!summary.recent.length){
        container.replaceChildren(createEmptyState("まだ最近編集したものはありません", "最初の作品やTRPGを追加すると、ここから続きに戻れます。", "＋ 新しく追加", "wizard"));
        return;
    }

    const recent = summary.recent
    .filter(item => item.status !== "planned")
    .slice(0, 6);

    if(!recent.length){
        container.replaceChildren(createEmptyState("まだ最近編集したものはありません", "最初の作品やTRPGを追加すると、ここから続きに戻れます。", "＋ 新しく追加", "wizard"));
        return;
    }

    container.replaceChildren(...recent.map(item => createTimelineItem({
        label: item.module,
        title: item.title,
        description: item.updatedAt ? formatDate(item.updatedAt) : "更新日時なし",
        href: toAdminHref(item.href)
    })));
}

function renderWorkspaces(){
    const container = document.getElementById("studioWorkspaces");
    if(!container) return;

    container.replaceChildren(...WORKSPACES.map(workspace => {
        const section = document.createElement("section");
        section.className = workspace.current
            ? "studio-workspace is-current"
            : "studio-workspace";
        section.setAttribute("aria-labelledby", `workspace-${workspace.id}`);

        const head = document.createElement("div");
        head.className = "studio-workspace-head";
        const title = document.createElement("h3");
        title.id = `workspace-${workspace.id}`;
        title.textContent = workspace.title;
        const label = document.createElement("span");
        label.textContent = workspace.current ? `${workspace.label} / 現在` : workspace.label;
        head.append(title, label);

        const description = document.createElement("p");
        description.textContent = workspace.description;

        const open = document.createElement("a");
        open.className = "studio-workspace-link";
        open.href = workspace.href;
        open.textContent = "Workspaceを開く";

        const list = document.createElement("div");
        list.className = "studio-workspace-items";
        workspace.items.forEach(item => list.appendChild(createWorkspaceAction(item)));

        section.append(head, description, open, list);
        return section;
    }));
}

function renderQuickActions(){
    const container = document.getElementById("studioQuickActions");
    if(!container) return;

    container.replaceChildren(...QUICK_ACTIONS.map(action => {
        const element = action.action === "wizard"
            ? document.createElement("button")
            : document.createElement("a");
        element.className = action.primary ? "studio-action is-primary" : "studio-action";

        if(action.action === "wizard"){
            element.type = "button";
            element.dataset.openAddWizard = "";
        }else{
            element.href = action.href;
        }

        const strong = document.createElement("strong");
        strong.textContent = action.title;
        const span = document.createElement("span");
        span.textContent = action.description;
        element.append(strong, span);
        return element;
    }));
}

function renderProjectHealth(summary){
    const container = document.getElementById("studioHealthList");
    if(!container) return;

    const registryErrors = validatePublicJsonRegistry(getStudioPublicJsonModules());
    const publicMetric = summary.metrics.find(metric => metric.label === "Public");
    const draftMetric = summary.metrics.find(metric => metric.label === "Draft / Ready");
    const exportMetric = summary.metrics.find(metric => metric.label === "Last Public Export");

    container.replaceChildren(
        createHealthCard("Public", registryErrors.length ? "要確認" : "正常", registryErrors.length ? registryErrors.join(" / ") : "公開データの対応表は読み込めています。", registryErrors.length ? "warning" : "success"),
        createHealthCard("Build", "確認できます", "公開サイトを更新する前にPublish画面でPreflightを確認します。", "neutral"),
        createHealthCard("Export", exportMetric?.tone === "success" ? "記録あり" : "未記録", toExportHealthNote(exportMetric), exportMetric?.tone === "success" ? "success" : "warning"),
        createHealthCard("Draft", String(draftMetric?.value ?? 0), draftMetric?.value ? "下書きまたは確認待ちが残っています。" : "下書きの確認待ちはありません。", draftMetric?.value ? "warning" : "success"),
        createHealthCard("公開中", String(publicMetric?.value ?? 0), publicMetric?.note || "公開アイテム数", "neutral")
    );
}

function renderActivity(entries){
    const container = document.getElementById("studioActivityList");
    if(!container) return;

    if(!entries.length){
        container.replaceChildren(createEmptyState("まだ操作履歴はありません", "保存、Export、Backup、Importを行うとここに残ります。", "Activity Logを開く", "../admin/system/logs/"));
        return;
    }

    container.replaceChildren(...entries.map(entry => createTimelineItem({
        label: toActionLabel(entry.action),
        title: entry.summary || "操作を記録しました",
        description: `${formatDate(entry.timestamp)} / ${toResultLabel(entry.result)}`,
        href: "../admin/system/logs/"
    })));
}

function renderProjectStatus(){
    const container = document.getElementById("studioStatus");
    if(!container) return;

    const status = createProjectStatus({
        rootPath: "(select in Tauri app)",
        entries: {
            "apps/web": true,
            "apps/admin": true,
            "scripts/build-public.mjs": true,
            "apps/web/CNAME": true,
            ".git": true
        },
        packageJson: true,
        publicJsonCount: getStudioPublicJsonModules().length,
        git: {
            branch: "(read-only)",
            headSha: "",
            dirty: false
        },
        dist: {
            exists: false,
            cname: "",
            canonicalOrigin: "",
            builtAt: ""
        }
    });

    container.replaceChildren(
        createCard("Project Root", status.rootPath, status.ok ? "Root contract is valid." : status.errors.join(" / ")),
        createCard("Git", status.branch || "read-only", "Phase 0 never commits, pushes, resets, or checks out."),
        createCard("Public JSON", String(status.publicJsonCount), "Read-only registry mapping.")
    );
}

function renderJsonModules(){
    const container = document.getElementById("studioJsonModules");
    if(!container) return;

    const modules = getStudioPublicJsonModules();
    const errors = validatePublicJsonRegistry(modules);
    const cards = modules.map(module => createCard(
        module.title,
        module.sourceFile,
        `${module.publicUrl} -> ${module.buildOutput}`
    ));

    if(errors.length > 0){
        cards.unshift(createCard("Registry Error", "Blocked", errors.join(" / ")));
    }

    container.replaceChildren(...cards);
}

function initAddWizard(){
    const openButtons = [
        ...document.querySelectorAll("#openAddWizard, [data-open-add-wizard]")
    ];
    const dialog = document.getElementById("addWizard");

    if(!openButtons.length || !dialog || dialog.dataset.initialized === "true"){
        return;
    }

    dialog.dataset.initialized = "true";

    openButtons.forEach(openButton => openButton.addEventListener("click", () => {
        wizardState.step = "content";
        wizardState.contentType = "";
        wizardState.collectionTypeId = "";
        wizardState.ownerCreatorId = "";
        wizardState.opener = document.activeElement;
        renderWizard();
        openDialog(dialog);
    }));

    document.getElementById("wizardCancel")?.addEventListener("click", closeWizard);
    document.getElementById("wizardBack")?.addEventListener("click", goBack);
    document.getElementById("wizardNext")?.addEventListener("click", goNext);

    dialog.addEventListener("keydown", event => {
        if(event.key === "Escape"){
            event.preventDefault();
            closeWizard();
            return;
        }

        if(event.key === "Tab"){
            trapFocus(event, dialog);
        }
    });

    dialog.addEventListener("click", event => {
        if(event.target === dialog){
            closeWizard();
        }
    });
}

function initModeSwitch(){
    const buttons = [...document.querySelectorAll("[data-studio-mode]")];
    const advanced = document.getElementById("studioAdvancedDetails");
    if(!buttons.length || !advanced){
        return;
    }

    buttons.forEach(button => {
        button.addEventListener("click", () => {
            studioMode = button.dataset.studioMode === "advanced" ? "advanced" : "beginner";
            buttons.forEach(item => item.setAttribute(
                "aria-current",
                item.dataset.studioMode === studioMode ? "true" : "false"
            ));
            advanced.hidden = studioMode !== "advanced";
            renderToday(loadDashboardSummary());
        });
    });
}

function renderWizard(){
    const body = document.getElementById("wizardBody");
    const title = document.getElementById("addWizardTitle");
    const description = document.getElementById("wizardDescription");
    const stepLabel = document.getElementById("wizardStepLabel");
    const back = document.getElementById("wizardBack");
    const next = document.getElementById("wizardNext");

    if(!body || !title || !description || !stepLabel || !back || !next){
        return;
    }

    clearWizardError();
    body.replaceChildren();
    stepLabel.textContent = `Step ${STEP_ORDER.indexOf(wizardState.step) + 1} / ${STEP_ORDER.length}`;
    back.hidden = wizardState.step === "content";
    next.textContent = wizardState.step === "review"
        ? "既存TRPG Editorを開く"
        : "次へ";

    if(wizardState.step === "content"){
        title.textContent = "何を追加しますか？";
        description.textContent = "ファイルやJSONを選ばず、追加したい内容だけ選びます。";
        body.appendChild(createChoiceGrid(ADD_CHOICES, wizardState.contentType, choice => {
            wizardState.contentType = choice.id;
            renderWizard();
        }));
    }

    if(wizardState.step === "collection-type"){
        title.textContent = "コレクションの種類を選びます";
        description.textContent = "今回はTRPGだけを追加できます。";
        const types = getActiveCollectionTypes();
        body.appendChild(createChoiceGrid(types, wizardState.collectionTypeId, type => {
            wizardState.collectionTypeId = type.id;
            wizardState.ownerCreatorId = "";
            renderWizard();
        }));
    }

    if(wizardState.step === "owner"){
        title.textContent = "誰のTRPGとして登録しますか？";
        description.textContent = "TRPGを持っている活動者だけを表示します。";
        const owners = getAvailableCollectionOwners(wizardState.collectionTypeId)
        .map(owner => ({
            id: owner.id,
            title: owner.displayName,
            description: "この活動者のTRPG Collectionへ登録します。",
            enabled: true
        }));
        body.appendChild(createChoiceGrid(owners, wizardState.ownerCreatorId, owner => {
            wizardState.ownerCreatorId = owner.id;
            renderWizard();
        }));
    }

    if(wizardState.step === "review"){
        title.textContent = "内容入力へ進みます";
        description.textContent = "既存のTRPG Editorを開きます。保存先はStudioが自動で扱います。";
        body.appendChild(createReviewPanel());
    }

    renderWizardDetail();
}

function createChoiceGrid(choices, selectedId, onSelect){
    const grid = document.createElement("div");
    grid.className = "studio-choice-grid";

    choices.forEach(choice => {
        const button = choice.enabled === false
            ? document.createElement("div")
            : document.createElement("button");

        button.className = choice.id === selectedId
            ? "studio-choice is-selected"
            : "studio-choice";

        if(choice.enabled === false){
            button.classList.add("is-static");
            button.setAttribute("aria-disabled", "true");
        }else{
            button.type = "button";
            button.setAttribute("aria-current", choice.id === selectedId ? "true" : "false");
            button.addEventListener("click", () => onSelect(choice));
        }

        const title = document.createElement("strong");
        title.textContent = choice.title;
        const description = document.createElement("span");
        description.textContent = choice.enabled === false
            ? `${choice.description} この項目は後続Phaseで有効になります。`
            : choice.description;

        button.append(title, description);
        grid.appendChild(button);
    });

    return grid;
}

function createReviewPanel(){
    const panel = document.createElement("div");
    panel.className = "studio-review-panel";

    const type = resolveCollectionType(wizardState.collectionTypeId);
    const owner = resolveCollectionOwner(wizardState.collectionTypeId, wizardState.ownerCreatorId);
    const mapping = getCollectionStorageMapping(wizardState.collectionTypeId, wizardState.ownerCreatorId);

    panel.append(
        createReviewRow("追加するもの", "コレクション"),
        createReviewRow("種類", type?.title || ""),
        createReviewRow("活動者", owner?.displayName || ""),
        createReviewRow("保存後の次の行動", "Previewで公開時の見え方を確認します。"),
        createReviewRow("状態", "Draft保存 / Public未反映 / Preview可能 / 公開用データ作成が必要")
    );

    if(mapping){
        const preview = document.createElement("a");
        preview.className = "studio-preview-link";
        preview.href = mapping.previewPath;
        preview.textContent = "Preview候補を確認する";
        panel.appendChild(preview);
    }

    return panel;
}

function createReviewRow(label, value){
    const row = document.createElement("p");
    const strong = document.createElement("strong");
    const span = document.createElement("span");
    strong.textContent = label;
    span.textContent = value || "未選択";
    row.append(strong, span);
    return row;
}

function renderWizardDetail(){
    const detail = document.getElementById("wizardDetail");

    if(!detail){
        return;
    }

    const mapping = getCollectionStorageMapping(wizardState.collectionTypeId, wizardState.ownerCreatorId);
    detail.replaceChildren();

    if(!mapping){
        const text = document.createElement("p");
        text.textContent = "詳細情報は、種類と活動者を選ぶと表示されます。";
        detail.appendChild(text);
        return;
    }

    [
        ["Public JSON", mapping.publicScenariosJson],
        ["House Rules", mapping.houseRulesJson],
        ["Public URL", mapping.publicPath]
    ].forEach(([label, value]) => {
        detail.appendChild(createReviewRow(label, value));
    });
}

function goBack(){
    const index = STEP_ORDER.indexOf(wizardState.step);
    wizardState.step = STEP_ORDER[Math.max(index - 1, 0)];
    renderWizard();
}

function goNext(){
    if(wizardState.step === "content"){
        if(wizardState.contentType !== "collection"){
            showWizardError("今回はコレクションだけ追加できます。コレクションを選んでください。");
            return;
        }

        wizardState.step = "collection-type";
        renderWizard();
        return;
    }

    if(wizardState.step === "collection-type"){
        if(!wizardState.collectionTypeId){
            showWizardError("TRPGを選んでください。");
            return;
        }

        wizardState.step = "owner";
        renderWizard();
        return;
    }

    if(wizardState.step === "owner"){
        if(!wizardState.ownerCreatorId){
            showWizardError("活動者を選んでください。");
            return;
        }

        wizardState.step = "review";
        renderWizard();
        return;
    }

    if(wizardState.step === "review"){
        const route = createCollectionEditorRoute({
            collectionTypeId: wizardState.collectionTypeId,
            ownerCreatorId: wizardState.ownerCreatorId,
            context: "studio"
        });

        if(!route){
            showWizardError("既存TRPG Editorを開けませんでした。選択内容を確認してください。");
            return;
        }

        window.location.href = route;
    }
}

function showWizardError(message){
    const error = document.getElementById("wizardError");

    if(error){
        error.textContent = message;
    }
}

function clearWizardError(){
    showWizardError("");
}

function openDialog(dialog){
    if(typeof dialog.showModal === "function"){
        dialog.showModal();
    }else{
        dialog.setAttribute("open", "");
    }

    requestAnimationFrame(() => {
        dialog.querySelector("button:not([disabled])")?.focus();
    });
}

function closeWizard(){
    const dialog = document.getElementById("addWizard");

    if(!dialog){
        return;
    }

    if(typeof dialog.close === "function"){
        dialog.close();
    }else{
        dialog.removeAttribute("open");
    }

    if(wizardState.opener && typeof wizardState.opener.focus === "function"){
        wizardState.opener.focus();
    }
}

function trapFocus(event, dialog){
    const focusable = [...dialog.querySelectorAll(
        "a[href], button:not([disabled]), details, summary, textarea, input, select"
    )].filter(element => element.offsetParent !== null || element === document.activeElement);

    if(focusable.length === 0){
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

function createCard(title, value, detail){
    const article = document.createElement("article");
    article.className = "studio-card";
    const heading = document.createElement("h3");
    const strong = document.createElement("strong");
    const text = document.createElement("p");
    heading.textContent = title;
    strong.textContent = value;
    text.textContent = detail;
    article.append(heading, strong, text);
    return article;
}

function createWorkspaceItem(title, href, status){
    return Object.freeze({
        title,
        href,
        status
    });
}

function createTask(title, active, description, href){
    return {
        title,
        active,
        description,
        href
    };
}

function createTaskElement(task){
    const article = document.createElement("article");
    article.className = "studio-task";

    const marker = document.createElement("span");
    marker.className = "studio-task-marker";
    marker.setAttribute("aria-hidden", "true");
    marker.textContent = "□";

    const body = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = task.title;
    const description = document.createElement("p");
    description.textContent = task.description;
    const link = document.createElement("a");
    link.href = task.href;
    link.textContent = "確認する";
    body.append(title, description, link);
    article.append(marker, body);
    return article;
}

function createStatPill(label, value, note){
    const pill = document.createElement("span");
    pill.className = "studio-stat-pill";
    const strong = document.createElement("strong");
    strong.textContent = String(value);
    const text = document.createElement("span");
    text.textContent = `${label} / ${note}`;
    pill.append(strong, text);
    return pill;
}

function createWorkspaceAction(item){
    if(item.status !== "active"){
        const span = document.createElement("span");
        span.className = "studio-workspace-item is-planned";
        span.textContent = `${item.title} / Planned`;
        return span;
    }

    const link = document.createElement("a");
    link.className = "studio-workspace-item";
    link.href = item.href;
    link.textContent = item.title;
    return link;
}

function createHealthCard(title, value, detail, tone){
    const card = createCard(title, value, detail);
    card.classList.add(`is-${tone || "neutral"}`);
    return card;
}

function createTimelineItem({
    label,
    title,
    description,
    href
}){
    const article = document.createElement("article");
    article.className = "studio-timeline-item";
    const meta = document.createElement("span");
    meta.textContent = label;
    const heading = document.createElement("h3");
    heading.textContent = title;
    const text = document.createElement("p");
    text.textContent = description;
    const link = document.createElement("a");
    link.href = href;
    link.textContent = "開く";
    article.append(meta, heading, text, link);
    return article;
}

function createEmptyState(title, description, actionLabel, action){
    const section = document.createElement("section");
    section.className = "studio-empty-state";
    const heading = document.createElement("h3");
    heading.textContent = title;
    const text = document.createElement("p");
    text.textContent = description;
    section.append(heading, text);

    if(actionLabel && action){
        const element = action === "wizard"
            ? document.createElement("button")
            : document.createElement("a");
        element.className = "studio-button-secondary";
        if(action === "wizard"){
            element.type = "button";
            element.addEventListener("click", () => {
                document.getElementById("openAddWizard")?.click();
            });
        }else{
            element.href = action;
        }
        element.textContent = actionLabel;
        section.appendChild(element);
    }

    return section;
}

function formatDate(value){
    const date = new Date(value);
    if(Number.isNaN(date.getTime())){
        return "日時不明";
    }

    return new Intl.DateTimeFormat("ja-JP", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Tokyo"
    }).format(date);
}

function toActionLabel(action){
    return {
        backup: "Backup",
        export: "Export",
        import: "Import",
        save: "保存",
        validation: "確認",
        theme: "Theme",
        publish: "Publish"
    }[action] || String(action || "Activity");
}

function toResultLabel(result){
    return {
        success: "完了",
        error: "エラー",
        warning: "注意",
        info: "記録"
    }[result] || "記録";
}

function toAdminHref(href){
    const value = String(href || "../admin/");

    if(value.startsWith("./")){
        return `../admin/${value.slice(2)}`;
    }

    return value;
}

function toExportHealthNote(metric){
    if(metric?.tone === "success"){
        return metric.note || "公開用データの作成記録があります。";
    }

    return "公開用データの作成記録はまだありません。";
}
