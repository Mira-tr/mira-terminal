import {
    getStudioPublicJsonModules,
    validatePublicJsonRegistry
} from "../shared/studioPublicJsonRegistry.js";

import {
    getStudioCopyAreas
} from "../shared/studioPageCopyRegistry.js";

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
    term
} from "../../../shared/ui/language/ja.js";

import {
    createCollectionEditorRoute,
    getActiveCollectionTypes,
    getAvailableCollectionOwners,
    getCollectionStorageMapping,
    resolveCollectionOwner,
    resolveCollectionType
} from "../../../admin/js/features/collections/collectionRegistry.js";

import {
    getCreatorSites
} from "../../../admin/js/features/creators/creatorSiteRegistry.js";

import {
    mountScenarioEditor
} from "../../../admin/js/features/trpg/scenarios/scenarioEditorMount.js";

import {
    mountAboutEditor,
    mountContactEditor,
    mountCreatorEditor,
    mountDesignEditor,
    mountHomeEditor,
    mountNoteEditor,
    mountProjectEditor,
    mountToolEditor
} from "./studioEditorMounts.js";

import {
    renderStudioV3Foundation
} from "./studioV3Foundation.js";

const QUICK_ACTIONS = Object.freeze([
    {
        id: "add",
        title: "＋ 新しく追加",
        description: "TRPGシナリオや活動者など、追加したいものを選びます。",
        action: "wizard",
        primary: true
    },
    {
        id: "preview",
        title: term("preview"),
        description: "公開前の見え方を確認します。",
        href: "../web/"
    },
    {
        id: "export",
        title: "公開前チェック",
        description: "公開できる状態かをStudio内で確認します。",
        href: "#publish"
    },
    {
        id: "build",
        title: "公開する",
        description: "確認が終わったら公開へ進みます。",
        href: "#publish"
    },
    {
        id: "backup",
        title: term("backup"),
        description: "作業前に戻せる状態を残します。",
        href: "#settings"
    },
    {
        id: "public",
        title: "公開サイトを見る",
        description: "いま公開されているRELMUAを開きます。",
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
        title: "道具",
        description: "公開する道具を追加します。",
        enabled: false
    },
    {
        id: "creator",
        title: "活動者",
        description: "活動者を追加します。",
        enabled: true
    },
    {
        id: "page",
        title: "ページ",
        description: "ブランドや活動者のページを追加します。",
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

const COLLECTION_STEP_ORDER = ["content", "collection-type", "owner", "review"];
const CREATOR_STEP_ORDER = ["content", "creator-review"];

const HOSTED_EDITORS = Object.freeze({
    home: Object.freeze({
        title: "Homeを編集",
        help: "トップに置く内容を組み立てます。",
        breadcrumb: Object.freeze(["RELMUA Studio", "コンテンツ", "Home"]),
        mount: mountHomeEditor
    }),
    project: Object.freeze({
        title: "Projectsを編集",
        help: "作品の見せ方を整えます。",
        breadcrumb: Object.freeze(["RELMUA Studio", "コンテンツ", "Projects"]),
        mount: mountProjectEditor
    }),
    projects: Object.freeze({
        title: "Projectsを編集",
        help: "作品ページを組み立てます。",
        breadcrumb: Object.freeze(["RELMUA Studio", "コンテンツ", "Projects"]),
        mount: mountProjectEditor
    }),
    tool: Object.freeze({
        title: "Toolsを編集",
        help: "公開する道具を整えます。",
        breadcrumb: Object.freeze(["RELMUA Studio", "コンテンツ", "Tools"]),
        mount: mountToolEditor
    }),
    tools: Object.freeze({
        title: "Toolsを編集",
        help: "道具ページを組み立てます。",
        breadcrumb: Object.freeze(["RELMUA Studio", "コンテンツ", "Tools"]),
        mount: mountToolEditor
    }),
    note: Object.freeze({
        title: "Notesを編集",
        help: "制作記録を整えます。",
        breadcrumb: Object.freeze(["RELMUA Studio", "コンテンツ", "Notes"]),
        mount: mountNoteEditor
    }),
    notes: Object.freeze({
        title: "Notesを編集",
        help: "記録ページを組み立てます。",
        breadcrumb: Object.freeze(["RELMUA Studio", "コンテンツ", "Notes"]),
        mount: mountNoteEditor
    }),
    creator: Object.freeze({
        title: "Creatorsを編集",
        help: "活動者、プロフィール、作品、リンクを整えます。",
        breadcrumb: Object.freeze(["RELMUA Studio", "コンテンツ", "Creators"]),
        mount: mountCreatorEditor
    }),
    creators: Object.freeze({
        title: "Creatorsを編集",
        help: "活動者ページを組み立てます。",
        breadcrumb: Object.freeze(["RELMUA Studio", "コンテンツ", "Creators"]),
        mount: mountCreatorEditor
    }),
    about: Object.freeze({
        title: "Aboutを編集",
        help: "ブランド紹介を整えます。",
        breadcrumb: Object.freeze(["RELMUA Studio", "コンテンツ", "About"]),
        mount: mountAboutEditor
    }),
    contact: Object.freeze({
        title: "Contactを編集",
        help: "連絡先と案内を整えます。",
        breadcrumb: Object.freeze(["RELMUA Studio", "コンテンツ", "Contact"]),
        mount: mountContactEditor
    }),
    design: Object.freeze({
        title: "デザインを編集",
        help: "ブランドカラー、フォント、余白、ボタン、カードを整えます。",
        breadcrumb: Object.freeze(["RELMUA Studio", "デザイン"]),
        mount: mountDesignEditor
    })
});

let studioMode = "beginner";
let mountedStudioEditor = null;

renderStudio();

function renderStudio(){
    renderDashboard();
    renderProductLayer();
    renderProjectStatus();
    renderJsonModules();
    initDirectEditorButtons();
    initAddWizard();
    initModeSwitch();
}

function renderDashboard(){
    const summary = loadDashboardSummary();
    const activity = loadDashboardActivity();
    renderHero(summary);
    renderToday(summary);
    renderRecentWork(summary);
    renderCopyMap();
    renderV3Foundation();
    renderWorkspaces();
    renderQuickActions();
    renderProjectHealth(summary);
    renderActivity(activity);
}

function renderProductLayer(){
    renderProductDashboard();
    renderProductWorkflow();
    renderProductRecentWork();
    renderProductRecommendations();
    renderProductPublish();
    renderProductSettings();
}

function renderProductDashboard(){
    const title = document.getElementById("dashboardTitle");
    if(title){
        title.textContent = "こんにちは、千景。";
    }

    const stats = document.getElementById("studioHeroStats");
    if(stats){
        stats.replaceChildren(
            createStatPill("公開中", "OK", "公開サイトを確認できます"),
            createStatPill("下書き", "あり", "続きから編集できます"),
            createStatPill("更新待ち", "確認", "公開前に表示を確認してください")
        );
    }
}

function renderProductWorkflow(){
    const container = document.getElementById("studioTodayList");
    if(!container){
        return;
    }

    const steps = [
        createProductStep("1", "作る", "Home、作品、Collectionsから作りたいものを選びます。", "#content"),
        createProductStep("2", "編集する", "文章、見た目、並びをStudio内で整えます。", "#content"),
        createProductStep("3", "確認する", "Desktop、Tablet、Mobileで表示を確認します。", "#preview"),
        createProductStep("4", "公開する", "確認してから公開へ進みます。", "#publish")
    ];

    container.replaceChildren(...steps);
}

function renderProductRecentWork(){
    const container = document.getElementById("studioRecentWork");
    if(!container){
        return;
    }

    container.replaceChildren(
        createTimelineItem({
            label: "Home",
            title: "Hero変更",
            description: "トップの見せ方を調整しました。",
            href: "#content"
        }),
        createTimelineItem({
            label: "Design",
            title: "Theme変更",
            description: "ブランドカラーと余白を確認しました。",
            href: "#design"
        }),
        createTimelineItem({
            label: "Collections",
            title: "TRPG追加",
            description: "一覧から編集を続けられます。",
            href: "#content"
        })
    );
}

function renderProductRecommendations(){
    const container = document.getElementById("studioQuickActions");
    if(!container){
        return;
    }

    const actions = [
        createProductAction("Homeを編集する", "まずタイトルを変えて、右の見え方で確認します。", "editor:home", true),
        createProductAction("新しい作品を作る", "作品やCollectionsを追加します。", "wizard", false),
        createProductAction("公開サイトを見る", "今見えているRELMUAを確認します。", "../web/", false)
    ];

    container.replaceChildren(...actions);
}

function renderProductPublish(){
    const container = document.getElementById("studioHealthList");
    if(!container){
        return;
    }

    container.replaceChildren(
        createHealthCard("入力内容", "確認できます", "公開前に内容を見直します。", "success"),
        createHealthCard("公開用データ", "作成できます", "Studioが公開用の形にまとめます。", "neutral"),
        createHealthCard("表示確認", "必要", "公開前に見え方を確認してください。", "warning"),
        createHealthCard("公開", "準備中", "確認後に公開へ進みます。", "neutral")
    );
}

function renderProductSettings(){
    const advanced = document.getElementById("studioAdvancedDetails");
    if(advanced && studioMode !== "advanced"){
        advanced.hidden = true;
    }
}

function createProductStep(number, title, description, href){
    const item = document.createElement("a");
    item.className = "studio-product-step";
    item.href = href;
    const badge = document.createElement("span");
    badge.textContent = number;
    const strong = document.createElement("strong");
    strong.textContent = title;
    const text = document.createElement("small");
    text.textContent = description;
    item.append(badge, strong, text);
    return item;
}

function createProductAction(title, description, href, primary){
    const element = href === "wizard" || href.startsWith("editor:")
        ? document.createElement("button")
        : document.createElement("a");
    element.className = primary ? "studio-action is-primary" : "studio-action";

    if(href === "wizard"){
        element.type = "button";
        element.dataset.openAddWizard = "";
    }else if(href.startsWith("editor:")){
        element.type = "button";
        element.dataset.studioOpenEditor = href.slice("editor:".length);
    }else{
        element.href = href;
    }

    const strong = document.createElement("strong");
    strong.textContent = title;
    const span = document.createElement("span");
    span.textContent = description;
    element.append(strong, span);
    return element;
}

function initDirectEditorButtons(){
    const buttons = [...document.querySelectorAll("[data-studio-open-editor]")];
    buttons.forEach(button => {
        if(button.dataset.directEditorInitialized === "true"){
            return;
        }
        button.dataset.directEditorInitialized = "true";
        button.addEventListener("click", () => {
            openStudioEditor(button.dataset.studioOpenEditor || "home");
        });
    });
}

function loadDashboardSummary(){
    try{
        return loadAdminTodaySummary(localStorage);
    }catch{
        return {
            metrics: [],
            recent: [],
            lastBackupText: "バックアップ状態を読み込めません",
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

function createWorkspaces(){
    const creatorSites = getCreatorSites();
    const creatorItems = creatorSites.flatMap(site => {
        const items = [
            createWorkspaceItem(`${site.title}のサイト`, "#content", "active"),
            createWorkspaceItem(`${site.title}のプロフィール`, "#content", "active")
        ];

        if(site.creatorId === "creator-chikage"){
            items.push(
                createWorkspaceItem("千景のTRPGシナリオ", "#content", "active"),
                createWorkspaceItem("千景のHouse Rules", "#content", "active")
            );
        }

        return items;
    });

    creatorItems.push(createWorkspaceItem("新しい活動者を追加", "#content", "active"));

    return Object.freeze([
        {
            id: "brand",
            title: "ブランド",
            label: "RELMUA全体",
            description: "ホーム、作品、道具、記録、活動者一覧、ブランド情報を管理します。",
            href: "#content",
            items: Object.freeze([
                createWorkspaceItem("ホーム", "#content", "active"),
                createWorkspaceItem("作品", "#content", "active"),
                createWorkspaceItem("道具", "#content", "active"),
                createWorkspaceItem("記録", "#content", "active"),
                createWorkspaceItem("活動者一覧", "#content", "active"),
                createWorkspaceItem("公開準備", "#publish", "active")
            ])
        },
        {
            id: "creators",
            title: "活動者",
            label: `${creatorSites.length}人のCreator`,
            description: "千景のプロフィール、作品、TRPG、リンクを管理します。",
            href: "#content",
            items: Object.freeze(creatorItems)
        },
        {
            id: "system",
            title: "システム",
            label: "安全と公開",
            description: "バックアップ、取り込み、書き出し、入力確認、操作履歴を確認します。",
            href: "#publish",
            items: Object.freeze([
                createWorkspaceItem("バックアップ", "#settings", "active"),
                createWorkspaceItem("取り込み", "#settings", "active"),
                createWorkspaceItem("書き出し", "#settings", "active"),
                createWorkspaceItem("入力確認", "#publish", "active"),
                createWorkspaceItem("操作履歴", "#settings", "active")
            ])
        }
    ]);
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
        createStatPill("公開用データ", exportMetric?.tone === "success" ? "作成済み" : "未確認", toExportHealthNote(exportMetric))
    );
}

function renderToday(summary){
    const container = document.getElementById("studioTodayList");
    const modeLabel = document.getElementById("studioModeLabel");
    if(modeLabel){
        modeLabel.textContent = studioMode === "advanced" ? "詳しい表示" : "かんたん表示";
    }
    if(!container) return;

    const metrics = Object.fromEntries(summary.metrics.map(metric => [metric.label, metric]));
    const attention = Number(metrics["Draft / Ready"]?.value || 0);
    const lastExportMissing = metrics["Last Public Export"]?.tone !== "success";
    const lastBackupMissing = metrics["Last Backup"]?.tone !== "success";
    const tasks = [
        createTask("下書きを確認する", attention > 0, attention ? `${attention}件の下書きや確認待ちがあります。保存後に表示を確認してください。` : "下書きや確認待ちはありません。", "#content"),
        createTask("公開用データを確認する", lastExportMissing, lastExportMissing ? "公開用データを作ると、公開サイトへ反映する準備ができます。" : "公開用データの記録があります。", "#publish"),
        createTask("バックアップを確認する", lastBackupMissing, lastBackupMissing ? "作業前にバックアップを作ると戻せます。" : summary.lastBackupText, "#settings"),
        createTask("公開前確認へ進む", true, "公開できるか、公開前確認の画面で確認します。", "#publish")
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

    const recent = summary.recent
    .filter(item => item.status !== "planned")
    .slice(0, 6);

    if(!recent.length){
        container.replaceChildren(createEmptyState("まだ最近編集したものはありません", "最初の作品、TRPG、活動者を追加すると、ここから続きに戻れます。", "＋ 新しく追加", "wizard"));
        return;
    }

    container.replaceChildren(...recent.map(item => createTimelineItem({
        label: toModuleLabel(item.module),
        title: item.title,
        description: item.updatedAt ? formatDate(item.updatedAt) : "更新日時なし",
        href: toAdminHref(item.href)
    })));
}

function renderCopyMap(){
    const container = document.getElementById("studioCopyMap");
    if(!container) return;

    container.replaceChildren(...getStudioCopyAreas().map(createCopyAreaCard));
}

function renderV3Foundation(){
    renderStudioV3Foundation({
        contentElement: document.getElementById("studioContentWorkspace"),
        designElement: document.getElementById("studioDesignWorkspace"),
        publicElement: document.getElementById("studioPublicEditingWorkspace"),
        migrationElement: document.getElementById("studioCollectionMigration"),
        openEditor: openStudioEditor
    });
}

function renderWorkspaces(){
    const container = document.getElementById("studioWorkspaces");
    if(!container) return;

    const workspaces = createWorkspaces();
    container.replaceChildren(...workspaces.map(workspace => {
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
        open.textContent = "開く";

        const list = document.createElement("div");
        list.className = "studio-workspace-items";
        workspace.items.forEach(item => list.appendChild(createWorkspaceAction(item)));

        section.append(head, description, open, list);
        return section;
    }));
}

function createCopyAreaCard(area){
    const article = document.createElement("article");
    article.className = area.status === "active"
        ? "studio-copy-card"
        : "studio-copy-card is-planned";

    const owner = document.createElement("p");
    owner.className = "studio-copy-owner";
    owner.textContent = area.owner;

    const title = document.createElement("h3");
    title.textContent = area.pageTitle;

    const summary = document.createElement("p");
    summary.textContent = area.summary;

    const list = document.createElement("ul");
    list.className = "studio-copy-list";
    area.visibleAreas.forEach(label => {
        const item = document.createElement("li");
        item.textContent = label;
        list.appendChild(item);
    });

    const actions = document.createElement("div");
    actions.className = "studio-copy-actions";

    const preview = document.createElement("a");
    preview.href = area.publicPath;
    preview.textContent = "公開ページを見る";
    actions.appendChild(preview);

    if(area.status === "active"){
        const edit = document.createElement("a");
        edit.href = area.editPath;
        edit.textContent = "編集する";
        actions.appendChild(edit);
    }else{
        const planned = document.createElement("span");
        planned.textContent = "Studio編集は準備中";
        actions.appendChild(planned);
    }

    article.append(owner, title, summary, list, actions);
    return article;
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
        createHealthCard("公開データ", registryErrors.length ? "確認が必要" : "正常", registryErrors.length ? registryErrors.join(" / ") : "公開データの対応表は読み込めています。", registryErrors.length ? "warning" : "success"),
        createHealthCard("公開サイト", "確認できます", "公開サイトを更新する前に、公開前確認で最終チェックします。", "neutral"),
        createHealthCard("公開用データ", exportMetric?.tone === "success" ? "記録あり" : "未確認", toExportHealthNote(exportMetric), exportMetric?.tone === "success" ? "success" : "warning"),
        createHealthCard("下書き", String(draftMetric?.value ?? 0), draftMetric?.value ? "下書きまたは確認待ちが残っています。" : "下書きや確認待ちはありません。", draftMetric?.value ? "warning" : "success"),
        createHealthCard("公開中", String(publicMetric?.value ?? 0), publicMetric?.note || "公開アイテム数", "neutral")
    );
}

function renderActivity(entries){
    const container = document.getElementById("studioActivityList");
    if(!container) return;

    if(!entries.length){
        container.replaceChildren(createEmptyState("まだ操作履歴はありません", "保存、書き出し、バックアップ、取り込みを行うとここに残ります。", "設定を見る", "#settings"));
        return;
    }

    container.replaceChildren(...entries.map(entry => createTimelineItem({
        label: toActionLabel(entry.action),
        title: entry.summary || "操作を記録しました",
        description: `${formatDate(entry.timestamp)} / ${toResultLabel(entry.result)}`,
        href: "#settings"
    })));
}

function openStudioEditor(editorId){
    if(editorId === "trpg"){
        openScenarioEditor({
            collectionTypeId: "trpg",
            ownerCreatorId: "creator-chikage"
        });
        return;
    }

    const editor = HOSTED_EDITORS[editorId];

    if(!editor){
        return;
    }

    openEditorHost({
        title: editor.title,
        help: editor.help,
        breadcrumb: editor.breadcrumb,
        mount: editor.mount
    });
}

function openScenarioEditor(options = {}){
    const collectionTypeId = options.collectionTypeId || wizardState.collectionTypeId || "trpg";
    const ownerCreatorId = options.ownerCreatorId || wizardState.ownerCreatorId || "creator-chikage";
    const panel = document.getElementById("studioEditorPanel");
    const root = document.getElementById("studioScenarioEditorRoot");
    const status = document.getElementById("studioEditorStatus");

    if(!panel || !root || !status){
        return;
    }

    setEditorChrome({
        title: "TRPGを編集",
        help: "既存のTRPG編集機能をStudio内で開きます。検索、絞り込み、お気に入り、書き出し、House Rules、公開URLはそのまま使えます。",
        breadcrumb: ["RELMUA Studio", "コンテンツ", "Collections", "TRPG"]
    });

    const owner = resolveCollectionOwner(collectionTypeId, ownerCreatorId);
    const context = {
        source: "studio",
        collectionTypeId,
        ownerCreatorId,
        ownerDisplayName: owner?.displayName || "千景",
        mode: studioMode
    };

    mountedStudioEditor?.unmount();
    mountedStudioEditor = mountScenarioEditor({
        rootElement: root,
        context,
        mode: studioMode,
        onStateChange(nextState){
            status.textContent = toShellStatusText(nextState);
            status.dataset.state = nextState.error
                ? "error"
                : nextState.unsaved
                    ? "unsaved"
                    : nextState.saved
                        ? "saved"
                        : "ready";
        },
        onNavigate(event){
            if(event.type === "preview"){
                status.textContent = "表示を確認できます。これは下書き保存をもとにした確認です。";
            }
        }
    });

    panel.hidden = false;
    panel.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
    panel.querySelector("input, select, textarea, button")?.focus();
}

function openEditorHost({
    title,
    help,
    breadcrumb,
    mount
}){
    const panel = document.getElementById("studioEditorPanel");
    const root = document.getElementById("studioScenarioEditorRoot");
    const status = document.getElementById("studioEditorStatus");

    if(!panel || !root || !status || typeof mount !== "function"){
        return;
    }

    setEditorChrome({
        title,
        help,
        breadcrumb
    });

    mountedStudioEditor?.unmount();
    mountedStudioEditor = mount({
        rootElement: root,
        onStateChange(nextState){
            status.textContent = toShellStatusText(nextState);
            status.dataset.state = nextState.error
                ? "error"
                : nextState.unsaved
                    ? "unsaved"
                    : nextState.saved
                        ? "saved"
                        : "ready";
        },
        onNavigate(event){
            if(event.type === "preview"){
                status.textContent = "見え方を確認できます。";
            }
        }
    });

    panel.hidden = false;
    panel.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
    panel.querySelector("input, select, textarea, button")?.focus();
}

function setEditorChrome({
    title,
    help,
    breadcrumb
}){
    const titleElement = document.getElementById("studioEditorTitle");
    const helpElement = document.getElementById("studioEditorHelp");
    const breadcrumbList = document.querySelector(".studio-editor-breadcrumb ol");

    if(titleElement){
        titleElement.textContent = title;
    }

    if(helpElement){
        helpElement.textContent = help;
    }

    if(breadcrumbList){
        breadcrumbList.replaceChildren(...breadcrumb.map((label, index) => {
            const item = document.createElement("li");
            item.textContent = label;
            if(index === breadcrumb.length - 1){
                item.setAttribute("aria-current", "page");
            }
            return item;
        }));
    }
}

function closeScenarioEditor(){
    const panel = document.getElementById("studioEditorPanel");
    if(!panel){
        return;
    }

    if(mountedStudioEditor?.getState().unsaved){
        const confirmed = window.confirm("未保存の入力があります。ホームへ戻りますか？");
        if(!confirmed){
            return;
        }
    }

    mountedStudioEditor?.unmount();
    mountedStudioEditor = null;
    panel.hidden = true;
    document.getElementById("openAddWizard")?.focus();
}

function toShellStatusText(state){
    if(state.error){
        return `入力内容に問題があります。${state.error}`;
    }

    if(state.publicExported){
        return "公開用データを作成しました。次は公開サイトを組み立てます。";
    }

    if(state.saved){
        return "保存済みです。次は表示を確認し、公開用データを作ります。";
    }

    if(state.unsaved){
        return "未保存の入力があります。保存してください。";
    }

    return "内容を入力してください。";
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
        createCard("Project Root / プロジェクトの場所", status.rootPath, status.ok ? "Root contract is valid." : status.errors.join(" / ")),
        createCard("Git / 変更履歴", status.branch || "read-only", "Phase 0 never commits, pushes, resets, or checks out."),
        createCard("Public JSON / 公開データ", String(status.publicJsonCount), "Read-only registry mapping.")
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
        cards.unshift(createCard("Registry Error / 対応表エラー", "Blocked", errors.join(" / ")));
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
    document.getElementById("closeStudioEditor")?.addEventListener("click", closeScenarioEditor);

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

    const steps = getStepOrder();
    clearWizardError();
    body.replaceChildren();
    stepLabel.textContent = `Step ${steps.indexOf(wizardState.step) + 1} / ${steps.length}`;
    back.hidden = wizardState.step === "content";
    next.textContent = wizardState.step === "review"
        ? "Studioで入力を始める"
        : wizardState.step === "creator-review"
            ? "活動者の編集をStudioで開く"
            : "次へ";

    if(wizardState.step === "content"){
        title.textContent = "何を追加しますか？";
        description.textContent = "ファイルや保存先を選ばず、追加したい内容だけ選びます。";
        body.appendChild(createChoiceGrid(ADD_CHOICES, wizardState.contentType, choice => {
            wizardState.contentType = choice.id;
            renderWizard();
        }));
    }

    if(wizardState.step === "collection-type"){
        title.textContent = "コレクションの種類を選びます";
        description.textContent = "追加できる種類から選びます。導入済みの種類はすぐに編集できます。";
        const types = getActiveCollectionTypes();
        body.appendChild(createChoiceGrid(types, wizardState.collectionTypeId, type => {
            wizardState.collectionTypeId = type.id;
            wizardState.ownerCreatorId = "";
            renderWizard();
        }));
    }

    if(wizardState.step === "owner"){
        title.textContent = "どの活動者に登録しますか？";
        description.textContent = "この種類を使える活動者だけを表示します。";
        const owners = getAvailableCollectionOwners(wizardState.collectionTypeId)
        .map(owner => ({
            id: owner.id,
            title: owner.displayName,
            description: "この活動者のコレクションへ登録します。",
            enabled: true
        }));
        body.appendChild(createChoiceGrid(owners, wizardState.ownerCreatorId, owner => {
            wizardState.ownerCreatorId = owner.id;
            renderWizard();
        }));
    }

    if(wizardState.step === "review"){
        title.textContent = "内容入力へ進みます";
        description.textContent = "Studio内で内容を入力します。保存先はStudioが自動で扱います。";
        body.appendChild(createReviewPanel());
    }

    if(wizardState.step === "creator-review"){
        title.textContent = "活動者を追加します";
        description.textContent = "活動者の名前、公開名、プロフィールなどを入力する画面を開きます。";
        body.appendChild(createCreatorReviewPanel());
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
            ? `${choice.description} この項目は後のPhaseで使えるようにします。`
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
        createReviewRow("保存後の次の行動", "表示を確認します。"),
        createReviewRow("状態", "下書き保存 / 公開用データ未作成 / 表示確認可能")
    );

    if(mapping){
        const preview = document.createElement("a");
        preview.className = "studio-preview-link";
        preview.href = mapping.previewPath;
        preview.textContent = "表示確認の仮画面を見る";
        panel.appendChild(preview);
    }

    return panel;
}

function createCreatorReviewPanel(){
    const panel = document.createElement("div");
    panel.className = "studio-review-panel";

    panel.append(
        createReviewRow("追加するもの", "活動者"),
        createReviewRow("できること", "名前、slug、プロフィール、活動内容、リンクを入力できます。"),
        createReviewRow("注意", "活動者の正本データをStudio内で編集します。Studio専用の別データは作りません。"),
        createReviewRow("保存後の次の行動", "Creators一覧で公開状態を確認します。")
    );

    const button = document.createElement("button");
    button.className = "studio-preview-link";
    button.type = "button";
    button.textContent = "活動者の編集をStudioで開く";
    button.addEventListener("click", () => {
        closeWizard();
        openStudioEditor("creator");
    });
    panel.appendChild(button);

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

    detail.replaceChildren();

    if(wizardState.contentType === "creator"){
        const text = document.createElement("p");
        text.textContent = "活動者のプロフィール、作品、TRPG、リンクをStudio内で整えます。内部IDや保存先は画面で選ばせません。";
        detail.appendChild(text);
        return;
    }

    const mapping = getCollectionStorageMapping(wizardState.collectionTypeId, wizardState.ownerCreatorId);

    if(!mapping){
        const text = document.createElement("p");
        text.textContent = "詳しい情報は、種類と活動者を選ぶと表示されます。";
        detail.appendChild(text);
        return;
    }

    [
        ["公開データ", mapping.publicScenariosJson],
        ["ルールデータ", mapping.houseRulesJson],
        ["公開URL", mapping.publicPath]
    ].forEach(([label, value]) => {
        detail.appendChild(createReviewRow(label, value));
    });
}

function goBack(){
    const steps = getStepOrder();
    const index = steps.indexOf(wizardState.step);
    wizardState.step = steps[Math.max(index - 1, 0)];
    renderWizard();
}

function goNext(){
    if(wizardState.step === "content"){
        if(wizardState.contentType === "collection"){
            wizardState.step = "collection-type";
            renderWizard();
            return;
        }

        if(wizardState.contentType === "creator"){
            wizardState.step = "creator-review";
            renderWizard();
            return;
        }

        showWizardError("今回はコレクションまたは活動者を追加できます。どちらかを選んでください。");
        return;
    }

    if(wizardState.step === "collection-type"){
        if(!wizardState.collectionTypeId){
            showWizardError("コレクションの種類を選んでください。");
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

    if(wizardState.step === "creator-review"){
        closeWizard();
        openStudioEditor("creator");
        return;
    }

    if(wizardState.step === "review"){
        const route = createCollectionEditorRoute({
            collectionTypeId: wizardState.collectionTypeId,
            ownerCreatorId: wizardState.ownerCreatorId,
            context: "studio"
        });

        if(!route){
            showWizardError("Studio内Editorを開けませんでした。選択内容を確認してください。");
            return;
        }

        closeWizard();
        openScenarioEditor();
    }
}

function getStepOrder(){
    return wizardState.contentType === "creator"
        ? CREATOR_STEP_ORDER
        : COLLECTION_STEP_ORDER;
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
        span.textContent = `${item.title} / 準備中`;
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

function toModuleLabel(module){
    return {
        Projects: "作品",
        Tools: "道具",
        Notes: "記録",
        Creators: "活動者",
        TRPG: "TRPG"
    }[module] || String(module || "作業");
}

function toActionLabel(action){
    return {
        backup: "バックアップ",
        export: "書き出し",
        import: "取り込み",
        save: "保存",
        "save-draft": "下書き保存",
        validation: "入力確認",
        theme: "テーマ変更",
        publish: "公開準備"
    }[action] || String(action || "操作");
}

function toResultLabel(result){
    return {
        success: "完了",
        error: "エラー",
        warning: "確認",
        info: "記録"
    }[result] || "記録";
}

function toAdminHref(href){
    const value = String(href || "#content");

    if(value.startsWith("../admin/")){
        return "#content";
    }

    if(value.startsWith("./")){
        return `#${value.slice(2).replace(/[^a-z0-9_-]/gi, "") || "content"}`;
    }

    return value;
}

function toExportHealthNote(metric){
    if(metric?.tone === "success"){
        return metric.note || "公開用データの作成記録があります。";
    }

    return "公開用データの作成記録はまだありません。";
}
