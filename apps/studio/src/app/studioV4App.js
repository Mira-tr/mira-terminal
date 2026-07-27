import {
    createStarterPageModel,
    addBlockToPage,
    moveBlock,
    normalizePageModel,
    pageModelToComponentModel
} from "../engine/blockEngine.js";

import {
    COMPONENT_REGISTRY
} from "../engine/componentRegistry.js";

import {
    createDefaultTheme,
    normalizeTheme,
    themeToPreviewTokens
} from "../engine/themeEngine.js";

import {
    addAssetRecord,
    createAssetRecord,
    createEmptyAssetLibrary,
    createUrlAssetRecord,
    normalizeAssetLibrary
} from "../engine/assetManager.js";

import {
    generateHomeArtifacts,
    validateGeneratedHomeArtifacts
} from "../engine/homeGenerator.js";

import {
    renderComponentModelPreview
} from "../../../web/js/componentRenderer.js";

import {
    mountScenarioEditor
} from "../../../admin/js/features/trpg/scenarios/scenarioEditorMount.js";

const STORAGE_KEYS = Object.freeze({
    page: "relmua_studio_v4_home_page",
    assets: "relmua_studio_v4_assets",
    theme: "relmua_studio_v4_theme",
    history: "relmua_studio_v4_history",
    generatedHome: "relmua_studio_v4_generated_public_home"
});

const BLOCK_LIBRARY_TYPES = Object.freeze([
    "hero",
    "card-grid",
    "gallery",
    "image",
    "button",
    "quote",
    "divider",
    "timeline",
    "markdown",
    "video",
    "map",
    "accordion",
    "cta",
    "footer"
]);

const BLOCK_LABELS = Object.freeze({
    hero: "Hero",
    featured: "Featured",
    "card-grid": "Card Grid",
    gallery: "Gallery",
    image: "Image",
    button: "Button",
    quote: "Quote",
    divider: "Divider",
    timeline: "Timeline",
    markdown: "Markdown",
    video: "Video",
    map: "Map",
    accordion: "Accordion",
    cta: "CTA",
    footer: "Footer"
});

const FIELD_LABELS = Object.freeze({
    title: "タイトル",
    description: "説明",
    label: "ボタン名",
    imageAssetId: "画像",
    audioAssetId: "BGM",
    displayMode: "表示形式",
    linkType: "リンクの種類",
    link: "リンク先",
    newTab: "新しいタブで開く",
    hidden: "非表示",
    background: "背景",
    layout: "並べ方",
    radius: "角丸",
    shadow: "影",
    spacing: "余白",
    variant: "種類",
    loop: "ループ",
    volume: "音量",
    showControl: "再生ボタン",
    motion: "動き"
});

const DISPLAY_MODE_LABELS = Object.freeze({
    Button: "ボタン",
    Link: "リンク",
    Text: "テキスト",
    Hidden: "非表示"
});

const THEME_PRESETS = Object.freeze([
    {
        id: "simple",
        label: "シンプル",
        tokens: {
            primary: "#19584d",
            secondary: "#d8b35a",
            surface: "#f6f1e7",
            fontFamily: "system-ui, sans-serif",
            radius: "8",
            shadow: "2",
            spacing: "16",
            motion: "1"
        }
    },
    {
        id: "wa-modern",
        label: "和モダン",
        tokens: {
            primary: "#1f4b43",
            secondary: "#b88942",
            surface: "#f5efe2",
            fontFamily: "Yu Gothic, system-ui, sans-serif",
            radius: "6",
            shadow: "2",
            spacing: "18",
            motion: "1"
        }
    },
    {
        id: "dark",
        label: "ダーク",
        tokens: {
            primary: "#8fc8b7",
            secondary: "#d4b15f",
            surface: "#151b18",
            fontFamily: "system-ui, sans-serif",
            radius: "8",
            shadow: "4",
            spacing: "16",
            motion: "1"
        }
    },
    {
        id: "pop",
        label: "ポップ",
        tokens: {
            primary: "#ef476f",
            secondary: "#06d6a0",
            surface: "#fff8ec",
            fontFamily: "system-ui, sans-serif",
            radius: "14",
            shadow: "3",
            spacing: "18",
            motion: "2"
        }
    }
]);

const ADMIN_EDITOR_ROUTES = Object.freeze({
    home: "../admin/home/",
    projects: "../admin/game/",
    tools: "../admin/tools/",
    notes: "../admin/notes/",
    creators: "../admin/creators/",
    profile: "../admin/profile/",
    trpg: "../admin/trpg/?source=studio&collection=trpg&owner=chikage&mode=beginner#scenarioFormTitle",
    houseRules: "../admin/trpg/rules/",
    publish: "../admin/system/publish/",
    backup: "../admin/system/backup/"
});

const state = {
    activeView: "dashboard",
    selectedBlockId: "",
    draggedBlockId: "",
    previewSize: "desktop",
    dirty: false,
    scenarioMount: null,
    pageModel: loadPageModel(),
    assetLibrary: loadAssetLibrary(),
    theme: loadTheme(),
    history: loadHistory(),
    generated: loadGeneratedHome()
};

state.selectedBlockId = state.pageModel.blocks[0]?.id || "";
syncRuntimeModel();
boot();

function boot(){
    bindGlobalActions();
    renderAll();
    openSection("dashboard");
}

function bindGlobalActions(){
    document.querySelectorAll("[data-v4-nav]").forEach(link => {
        link.addEventListener("click", event => {
            event.preventDefault();
            openSection(link.dataset.v4Nav || "dashboard");
        });
    });

    document.querySelectorAll("[data-studio-open-editor='home']").forEach(button => {
        button.addEventListener("click", () => openHomeEditor());
    });

    document.getElementById("openAddWizard")?.addEventListener("click", openAddWizard);
    document.getElementById("wizardCancel")?.addEventListener("click", closeAddWizard);
    document.getElementById("wizardBack")?.addEventListener("click", closeAddWizard);
    document.getElementById("wizardNext")?.addEventListener("click", () => {
        closeAddWizard();
        openScenarioEditor();
    });
    document.getElementById("closeStudioEditor")?.addEventListener("click", closeEditor);

    document.querySelectorAll("[data-v4-preview-size]").forEach(button => {
        button.addEventListener("click", () => {
            state.previewSize = button.dataset.v4PreviewSize || "desktop";
            renderPreviewControls();
            renderPreview();
        });
    });

    document.querySelectorAll("[data-studio-mode]").forEach(button => {
        button.addEventListener("click", () => {
            const advanced = button.dataset.studioMode === "advanced";
            document.querySelectorAll("[data-studio-mode]").forEach(item => {
                item.setAttribute("aria-current", String(item === button));
            });
            const details = document.getElementById("studioAdvancedDetails");
            if(details){
                details.hidden = !advanced;
            }
        });
    });
}

function renderAll(){
    renderDashboard();
    renderContent();
    renderDesign();
    renderPublish();
    renderSettingsStatus();
    renderWorkbench();
    renderPreviewControls();
    renderPreview();
}

function openSection(id){
    state.activeView = id;
    document.querySelectorAll(".studio-v4-section").forEach(section => {
        const isEditor = section.id === "studioEditorPanel";
        section.hidden = isEditor || section.id !== id;
    });
    document.querySelectorAll("[data-v4-nav]").forEach(link => {
        link.setAttribute("aria-current", String(link.dataset.v4Nav === id));
    });
    if(id === "preview"){
        renderStandalonePreview();
    }
}

function openHomeEditor(){
    if(state.scenarioMount){
        state.scenarioMount.unmount();
        state.scenarioMount = null;
    }
    setEditorText({
        title: "Homeを編集する",
        help: "Blockを置いて、右のPreviewを見ながら内容を整えます。",
        crumbs: ["RELMUA Studio", "コンテンツ", "Home"]
    });
    document.querySelectorAll(".studio-v4-section").forEach(section => {
        section.hidden = section.id !== "studioEditorPanel";
    });
    const workbench = document.getElementById("studioHomeWorkbench");
    const scenario = document.getElementById("studioScenarioEditorRoot");
    if(workbench){
        workbench.hidden = false;
    }
    if(scenario){
        scenario.hidden = true;
        scenario.replaceChildren();
    }
    setStatus("Homeを編集中です。変更するとPreviewへすぐ反映されます。", "unsaved");
    renderWorkbench();
    renderPreview();
}

function openScenarioEditor(){
    setEditorText({
        title: "TRPGシナリオを追加する",
        help: "TRPGシナリオ追加は、使いやすい既存EditorをStudio内で開きます。",
        crumbs: ["RELMUA Studio", "コンテンツ", "Collections", "TRPG"]
    });
    document.querySelectorAll(".studio-v4-section").forEach(section => {
        section.hidden = section.id !== "studioEditorPanel";
    });
    const workbench = document.getElementById("studioHomeWorkbench");
    const scenario = document.getElementById("studioScenarioEditorRoot");
    if(workbench){
        workbench.hidden = true;
    }
    if(scenario){
        scenario.hidden = false;
        state.scenarioMount?.unmount();
        state.scenarioMount = mountScenarioEditor({
            rootElement: scenario,
            context: {
                collectionTypeId: "trpg",
                ownerCreatorId: "creator-chikage",
                source: "studio"
            },
            mode: "beginner",
            onStateChange(editorState){
                setStatus(editorState.saved ? "TRPGシナリオを保存しました。" : "TRPGシナリオを編集中です。", editorState.saved ? "saved" : "unsaved");
            }
        });
    }
}

function closeEditor(){
    state.scenarioMount?.unmount();
    state.scenarioMount = null;
    openSection("dashboard");
}

function setEditorText({ title, help, crumbs }){
    setText("studioEditorTitle", title);
    setText("studioEditorHelp", help);
    const list = document.getElementById("studioEditorBreadcrumb");
    if(list){
        list.replaceChildren(...crumbs.map((crumb, index) => {
            const item = document.createElement("li");
            item.textContent = crumb;
            if(index === crumbs.length - 1){
                item.setAttribute("aria-current", "page");
            }
            return item;
        }));
    }
}

function renderDashboard(){
    const stats = document.getElementById("studioHeroStats");
    if(stats){
        stats.replaceChildren(
            createStat("Block", String(state.pageModel.blocks.length)),
            createStat("素材", String(state.assetLibrary.assets.length)),
            createStat("状態", state.dirty ? "下書きあり" : "保存済み")
        );
    }

    const today = document.getElementById("studioTodayList");
    if(today){
        today.replaceChildren(
            createNextCard("Homeを編集", "Studio Builderで編集、またはadminのHome編集へ移動できます", openHomeEditor),
            createNextCard("TRPGを追加", "既存adminのシナリオ追加画面へ移動します", () => openAdminEditor("trpg")),
            createNextCard("素材を入れる", "画像、音声、URLをドラッグや入力で追加", () => openHomeEditor()),
            createNextCard("公開前チェック", "足りない内容を確認して公開用データを作る", () => openSection("publish"))
        );
    }

    const recent = document.getElementById("studioRecentWork");
    if(recent){
        const entries = state.history.slice(0, 5);
        recent.replaceChildren(...(entries.length ? entries : [{ label: "まだ作業履歴はありません", time: "" }]).map(entry => {
            const item = document.createElement("article");
            item.className = "studio-task";
            const marker = document.createElement("span");
            marker.className = "studio-task-marker";
            marker.textContent = entry.time || "Now";
            const body = document.createElement("div");
            const title = document.createElement("h3");
            title.textContent = entry.label;
            body.append(title);
            item.append(marker, body);
            return item;
        }));
    }

    const quick = document.getElementById("studioQuickActions");
    if(quick){
        quick.replaceChildren(
            createSmallAction("続きを編集する", "Home Builderを開く", openHomeEditor),
            createSmallAction("新しい作品を作る", "追加メニューを開く", openAddWizard),
            createSmallAction("公開サイトを見る", "Publicを確認する", () => {
                window.location.href = "../web/";
            })
        );
    }
}

function renderContent(){
    const root = document.getElementById("studioContentWorkspace");
    if(!root){
        return;
    }

    root.replaceChildren(
        createContentCard("Home", "トップページをBlockで組み立てます。", [
            ["Studioで編集", openHomeEditor],
            ["adminで編集", () => openAdminEditor("home")]
        ]),
        createContentCard("Projects", "作品一覧を既存adminで編集します。", [
            ["adminで編集", () => openAdminEditor("projects")]
        ]),
        createContentCard("Tools", "便利ツールを既存adminで編集します。", [
            ["adminで編集", () => openAdminEditor("tools")]
        ]),
        createContentCard("Notes", "記録と記事を既存adminで編集します。", [
            ["adminで編集", () => openAdminEditor("notes")]
        ]),
        createContentCard("Creators", "活動者、プロフィール、リンクを既存adminで整理します。", [
            ["活動者を編集", () => openAdminEditor("creators")],
            ["千景Profile", () => openAdminEditor("profile")]
        ]),
        createCollectionsCard()
    );
}

function renderDesign(){
    const root = document.getElementById("studioDesignWorkspace");
    if(!root){
        return;
    }

    const presetPanel = document.createElement("section");
    presetPanel.className = "studio-v4-card is-wide";
    const presetTitle = document.createElement("h3");
    presetTitle.textContent = "Theme Presets";
    const presetText = document.createElement("p");
    presetText.textContent = "まず雰囲気を選び、その後で細かく調整します。";
    const presetList = document.createElement("div");
    presetList.className = "studio-v4-theme-presets";
    THEME_PRESETS.forEach(preset => {
        const button = document.createElement("button");
        button.className = "studio-v4-theme-preset";
        button.type = "button";
        button.textContent = preset.label;
        button.setAttribute("aria-current", String(isPresetCurrent(preset)));
        button.addEventListener("click", () => applyThemePreset(preset));
        presetList.append(button);
    });
    presetPanel.append(presetTitle, presetText, presetList);

    const fields = document.createElement("section");
    fields.className = "studio-v4-card is-wide";
    const fieldsTitle = document.createElement("h3");
    fieldsTitle.textContent = "微調整";
    const fieldGrid = document.createElement("div");
    fieldGrid.className = "studio-v4-theme-fields";
    [
        ["primary", "ブランドカラー", "color"],
        ["secondary", "差し色", "color"],
        ["fontFamily", "フォント", "text"],
        ["radius", "角丸", "range"],
        ["shadow", "影", "range"],
        ["spacing", "余白", "range"],
        ["motion", "動き", "range"]
    ].forEach(([id, label, type]) => {
        fieldGrid.append(createThemeField(id, label, type));
    });
    fields.append(fieldsTitle, fieldGrid);

    root.replaceChildren(presetPanel, fields);
}

function renderPublish(){
    const root = document.getElementById("studioPublishChecklist");
    if(!root){
        return;
    }

    const checks = getPublishChecks();
    root.replaceChildren(...checks.map(check => {
        const row = document.createElement("div");
        row.className = "studio-v4-check-row";
        row.dataset.ok = String(check.ok);
        const mark = document.createElement("strong");
        mark.textContent = check.ok ? "OK" : "確認";
        const text = document.createElement("span");
        text.textContent = check.label;
        row.append(mark, text);
        return row;
    }));

    const actions = document.createElement("div");
    actions.className = "studio-v4-inline-actions";
    const generate = document.createElement("button");
    generate.className = "studio-primary-action";
    generate.type = "button";
    generate.textContent = "公開用データを作る";
    generate.addEventListener("click", generatePublicHome);
    const adminPublish = document.createElement("button");
    adminPublish.className = "studio-button-secondary";
    adminPublish.type = "button";
    adminPublish.textContent = "adminの公開画面を開く";
    adminPublish.addEventListener("click", () => openAdminEditor("publish"));
    actions.append(generate, adminPublish);

    const output = document.createElement("div");
    output.className = "studio-v4-output";
    output.hidden = !state.generated;
    const title = document.createElement("strong");
    title.textContent = state.generated ? "公開用データを作成済み" : "";
    const path = document.createElement("code");
    path.textContent = "apps/web/data/public-home.json";
    const detail = document.createElement("p");
    detail.textContent = state.generated ? "StudioのComponent ModelからGenerator経由で作った成果物です。" : "";
    output.append(title, path, detail);

    root.append(actions, output);
}

function renderSettingsStatus(){
    const root = document.getElementById("studioStatus");
    if(root){
        root.replaceChildren(
            createStatusCard("保存状態", state.dirty ? "下書きあり" : "保存済み"),
            createStatusCard("Preview", "共通Renderer"),
            createStatusCard("TRPG", "既存Editor互換")
        );
    }
    const modules = document.getElementById("studioJsonModules");
    if(modules){
        modules.replaceChildren(
            createStatusCard("Home", "Generator成果物"),
            createStatusCard("Collections", "TRPG導入済み")
        );
    }
}

function renderWorkbench(){
    const root = document.getElementById("studioHomeWorkbench");
    if(!root){
        return;
    }

    const builder = document.createElement("div");
    builder.className = "studio-v4-builder-column";
    builder.append(createGuidePanel(), createBlockLibraryPanel(), createTreePanel());

    const inspector = document.createElement("div");
    inspector.className = "studio-v4-inspector";
    inspector.append(createInspectorPanel(), createAssetsPanel());

    const preview = document.createElement("div");
    preview.className = "studio-v4-preview-column";
    preview.append(createPreviewPanel(), createPublishMiniPanel());

    root.replaceChildren(builder, inspector, preview);
}

function createGuidePanel(){
    const panel = document.createElement("section");
    panel.className = "studio-v4-toolbox";
    const title = document.createElement("h3");
    title.textContent = "まずここだけ";
    const text = document.createElement("p");
    text.textContent = "1. Blockを選ぶ  2. 右で文章や画像を入れる  3. Previewを見る  4. 保存する";
    const actions = document.createElement("div");
    actions.className = "studio-v4-inline-actions";
    actions.append(
        createActionButton("保存する", saveStudioDraft),
        createActionButton("公開チェック", () => openSection("publish"))
    );
    panel.append(title, text, actions);
    return panel;
}

function createBlockLibraryPanel(){
    const panel = document.createElement("section");
    panel.className = "studio-v4-toolbox";
    const title = document.createElement("h3");
    title.textContent = "＋ Component";
    const text = document.createElement("p");
    text.textContent = "置きたいものを押すだけで追加できます。";
    const list = document.createElement("div");
    list.className = "studio-v4-block-library";
    BLOCK_LIBRARY_TYPES.forEach(type => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = BLOCK_LABELS[type] || type;
        button.addEventListener("click", () => addBlock(type));
        list.append(button);
    });
    panel.append(title, text, list);
    return panel;
}

function createTreePanel(){
    const panel = document.createElement("section");
    panel.className = "studio-v4-tree";
    const title = document.createElement("h3");
    title.textContent = "Home Tree";
    const text = document.createElement("p");
    text.textContent = "ドラッグ、または上下ボタンで並び替えできます。";
    const list = document.createElement("ol");
    list.className = "studio-v4-tree-list";

    state.pageModel.blocks.forEach(block => {
        const item = document.createElement("li");
        item.className = "studio-v4-tree-item";
        item.draggable = true;
        item.dataset.blockId = block.id;
        item.classList.toggle("is-selected", block.id === state.selectedBlockId);
        item.addEventListener("dragstart", () => {
            state.draggedBlockId = block.id;
        });
        item.addEventListener("dragover", event => {
            event.preventDefault();
        });
        item.addEventListener("drop", event => {
            event.preventDefault();
            reorderBlockTo(state.draggedBlockId, block.id);
        });

        const main = document.createElement("div");
        main.className = "studio-v4-tree-main";
        const select = document.createElement("button");
        select.type = "button";
        select.textContent = block.label;
        select.addEventListener("click", () => selectBlock(block.id));
        const actions = document.createElement("div");
        actions.className = "studio-v4-inline-actions";
        actions.append(
            createActionButton("上", () => moveSelectedBlock(block.id, "up")),
            createActionButton("下", () => moveSelectedBlock(block.id, "down"))
        );
        main.append(select, actions);

        const children = document.createElement("div");
        children.className = "studio-v4-tree-children";
        getVisibleProperties(block).slice(0, 6).forEach(property => {
            const chip = document.createElement("span");
            chip.textContent = FIELD_LABELS[property.id] || property.label || property.id;
            children.append(chip);
        });
        item.append(main, children);
        list.append(item);
    });

    panel.append(title, text, list);
    return panel;
}

function createInspectorPanel(){
    const panel = document.createElement("section");
    panel.className = "studio-v4-inspector-panel";
    const block = getSelectedBlock();
    const title = document.createElement("h3");
    title.textContent = block ? `${block.label}を編集` : "Blockを選んでください";
    const help = document.createElement("p");
    help.textContent = "HTMLやCSSは書かず、必要な項目だけ入力します。";
    panel.append(title, help);

    if(!block){
        return panel;
    }

    const main = getMainComponent(block);
    const groups = groupProperties(block);
    ["property", "style", "behavior"].forEach(groupId => {
        const fields = groups[groupId] || [];
        if(fields.length === 0){
            return;
        }
        const fieldset = document.createElement("fieldset");
        fieldset.className = "studio-v4-fieldset";
        const legend = document.createElement("legend");
        legend.textContent = groupId === "property" ? "内容" : groupId === "style" ? "見た目" : "動き";
        fieldset.append(legend);
        fields.forEach(property => {
            fieldset.append(createPropertyInput(main, property));
        });
        panel.append(fieldset);
    });

    return panel;
}

function createPropertyInput(component, property){
    const field = property.id;
    const value = component.props?.[field];

    if(field === "displayMode"){
        return createDisplayModeInput(value || "Text");
    }

    if(field === "imageAssetId" || field === "audioAssetId"){
        return createAssetSelect(field, value || "");
    }

    if(property.type === "checkbox"){
        const label = document.createElement("label");
        label.className = "studio-v4-checkbox";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = Boolean(value);
        input.addEventListener("change", () => updateSelectedProp(field, input.checked));
        const span = document.createElement("span");
        span.textContent = FIELD_LABELS[field] || property.label || field;
        label.append(input, span);
        return label;
    }

    const label = document.createElement("label");
    label.className = "studio-v4-field";
    const span = document.createElement("span");
    span.textContent = FIELD_LABELS[field] || property.label || field;
    const input = property.type === "textarea"
        ? document.createElement("textarea")
        : document.createElement(property.type === "select" ? "select" : "input");

    if(input.tagName === "SELECT"){
        (property.options || []).forEach(option => {
            const item = document.createElement("option");
            item.value = option;
            item.textContent = DISPLAY_MODE_LABELS[option] || option;
            input.append(item);
        });
    }else{
        input.type = property.type === "range" ? "range" : property.type === "url" ? "url" : "text";
        if(property.type === "range"){
            input.min = field === "volume" ? "0" : "0";
            input.max = field === "volume" ? "1" : field === "radius" ? "28" : "40";
            input.step = field === "volume" ? "0.05" : "1";
        }
    }
    input.value = String(value ?? "");
    input.addEventListener("input", () => updateSelectedProp(field, input.value));
    label.append(span, input);
    return label;
}

function createDisplayModeInput(value){
    const fieldset = document.createElement("fieldset");
    fieldset.className = "studio-v4-fieldset";
    const legend = document.createElement("legend");
    legend.textContent = "表示形式";
    const list = document.createElement("div");
    list.className = "studio-v4-display-modes";
    Object.entries(DISPLAY_MODE_LABELS).forEach(([mode, labelText]) => {
        const label = document.createElement("label");
        label.className = "studio-v4-radio-card";
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "displayMode";
        input.value = mode;
        input.checked = mode === value;
        input.addEventListener("change", () => updateSelectedProp("displayMode", mode));
        const span = document.createElement("span");
        span.textContent = labelText;
        label.append(input, span);
        list.append(label);
    });
    fieldset.append(legend, list);
    return fieldset;
}

function createAssetSelect(field, value){
    const label = document.createElement("label");
    label.className = "studio-v4-field";
    const span = document.createElement("span");
    span.textContent = field === "audioAssetId" ? "BGM" : "画像";
    const select = document.createElement("select");
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "未設定";
    select.append(empty);
    const acceptsAudio = field === "audioAssetId";
    state.assetLibrary.assets
    .filter(asset => acceptsAudio ? asset.type === "audio" : ["image", "svg"].includes(asset.type))
    .forEach(asset => {
        const option = document.createElement("option");
        option.value = asset.id;
        option.textContent = asset.name;
        select.append(option);
    });
    select.value = value;
    select.addEventListener("change", () => updateSelectedProp(field, select.value));
    label.append(span, select);
    return label;
}

function createAssetsPanel(){
    const panel = document.createElement("section");
    panel.className = "studio-v4-assets-panel";
    const title = document.createElement("h3");
    title.textContent = "素材";
    const text = document.createElement("p");
    text.textContent = "画像、音声、URLを追加できます。画像は選択中のBlockへ設定できます。";
    const dropzone = document.createElement("label");
    dropzone.className = "studio-v4-dropzone";
    dropzone.textContent = "ここへ画像やBGMをドラッグ、またはクリックして追加";
    const file = document.createElement("input");
    file.type = "file";
    file.accept = "image/*,audio/*,video/*,.svg,.pdf";
    file.multiple = true;
    file.hidden = true;
    file.addEventListener("change", () => addFiles(file.files));
    dropzone.append(file);
    dropzone.addEventListener("dragenter", event => {
        event.preventDefault();
        dropzone.classList.add("is-dragging");
    });
    dropzone.addEventListener("dragover", event => {
        event.preventDefault();
        dropzone.classList.add("is-dragging");
    });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-dragging"));
    dropzone.addEventListener("drop", event => {
        event.preventDefault();
        dropzone.classList.remove("is-dragging");
        addFiles(event.dataTransfer?.files);
    });

    const urlRow = document.createElement("div");
    urlRow.className = "studio-v4-url-row";
    const urlInput = document.createElement("input");
    urlInput.type = "url";
    urlInput.placeholder = "https://example.com/";
    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.placeholder = "名前";
    const addUrl = document.createElement("button");
    addUrl.type = "button";
    addUrl.textContent = "URL追加";
    addUrl.addEventListener("click", () => {
        const record = createUrlAssetRecord(urlInput.value, labelInput.value);
        if(record){
            state.assetLibrary = addAssetRecord(state.assetLibrary, record);
            urlInput.value = "";
            labelInput.value = "";
            afterChange("URL素材を追加しました");
        }
    });
    urlRow.append(urlInput, labelInput, addUrl);

    const list = document.createElement("div");
    list.className = "studio-v4-asset-list";
    if(state.assetLibrary.assets.length === 0){
        const empty = document.createElement("p");
        empty.textContent = "まだ素材はありません。";
        list.append(empty);
    }else{
        state.assetLibrary.assets.forEach(asset => list.append(createAssetRow(asset)));
    }

    panel.append(title, text, dropzone, urlRow, list);
    return panel;
}

function createPreviewPanel(){
    const panel = document.createElement("section");
    panel.className = "studio-v4-preview-panel";
    const head = document.createElement("div");
    head.className = "studio-preview-header";
    const title = document.createElement("h3");
    title.textContent = "Live Preview";
    const controls = document.createElement("div");
    controls.className = "studio-preview-size-controls";
    ["desktop", "tablet", "mobile"].forEach(size => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = size === "desktop" ? "Desktop" : size === "tablet" ? "Tablet" : "Mobile";
        button.setAttribute("aria-current", String(state.previewSize === size));
        button.addEventListener("click", () => {
            state.previewSize = size;
            renderWorkbench();
            renderPreview();
        });
        controls.append(button);
    });
    head.append(title, controls);
    const frame = document.createElement("div");
    frame.id = "studioLivePreview";
    frame.className = `studio-v4-preview-frame is-${state.previewSize}`;
    const viewport = document.createElement("div");
    viewport.className = "studio-preview-viewport";
    frame.append(viewport);
    panel.append(head, frame);
    return panel;
}

function createPublishMiniPanel(){
    const panel = document.createElement("section");
    panel.className = "studio-v4-publish-panel";
    const title = document.createElement("h3");
    title.textContent = "公開前チェック";
    const checks = document.createElement("div");
    checks.className = "studio-v4-checklist";
    getPublishChecks().forEach(check => {
        const row = document.createElement("div");
        row.className = "studio-v4-check-row";
        row.dataset.ok = String(check.ok);
        const mark = document.createElement("strong");
        mark.textContent = check.ok ? "OK" : "確認";
        const text = document.createElement("span");
        text.textContent = check.label;
        row.append(mark, text);
        checks.append(row);
    });
    const actions = document.createElement("div");
    actions.className = "studio-v4-inline-actions";
    actions.append(createActionButton("保存する", saveStudioDraft), createActionButton("公開用データ", generatePublicHome));
    panel.append(title, checks, actions);
    return panel;
}

function renderPreview(){
    syncRuntimeModel();
    const frame = document.getElementById("studioLivePreview");
    const viewport = frame?.querySelector(".studio-preview-viewport");
    if(!frame || !viewport){
        return;
    }
    frame.className = `studio-v4-preview-frame is-${state.previewSize}`;
    renderComponentModelPreview(document, viewport, pageModelToComponentModel(state.pageModel));
}

function renderStandalonePreview(){
    syncRuntimeModel();
    const root = document.getElementById("studioStandalonePreview");
    if(root){
        renderComponentModelPreview(document, root, pageModelToComponentModel(state.pageModel));
    }
}

function renderPreviewControls(){
    document.querySelectorAll("[data-v4-preview-size]").forEach(button => {
        button.setAttribute("aria-current", String(button.dataset.v4PreviewSize === state.previewSize));
    });
}

function addBlock(type){
    state.pageModel = addBlockToPage(state.pageModel, type);
    state.selectedBlockId = state.pageModel.blocks[state.pageModel.blocks.length - 1]?.id || state.selectedBlockId;
    afterChange(`${BLOCK_LABELS[type] || type}を追加しました`);
}

function selectBlock(blockId){
    state.selectedBlockId = blockId;
    renderWorkbench();
    renderPreview();
}

function moveSelectedBlock(blockId, direction){
    state.pageModel = moveBlock(state.pageModel, blockId, direction);
    state.selectedBlockId = blockId;
    afterChange("Blockを並び替えました");
}

function reorderBlockTo(sourceId, targetId){
    if(!sourceId || !targetId || sourceId === targetId){
        return;
    }
    const blocks = [...state.pageModel.blocks];
    const sourceIndex = blocks.findIndex(block => block.id === sourceId);
    const targetIndex = blocks.findIndex(block => block.id === targetId);
    if(sourceIndex < 0 || targetIndex < 0){
        return;
    }
    const [source] = blocks.splice(sourceIndex, 1);
    blocks.splice(targetIndex, 0, source);
    state.pageModel = normalizePageModel({
        ...state.pageModel,
        blocks: blocks.map((block, index) => ({
            ...block,
            order: (index + 1) * 10
        }))
    });
    state.selectedBlockId = sourceId;
    afterChange("Blockをドラッグで並び替えました");
}

function updateSelectedProp(field, value){
    const blockId = state.selectedBlockId;
    state.pageModel = normalizePageModel({
        ...state.pageModel,
        blocks: state.pageModel.blocks.map(block => {
            if(block.id !== blockId){
                return block;
            }
            return {
                ...block,
                components: block.components.map(component => {
                    if(!component.id.endsWith(":main")){
                        return component;
                    }
                    return {
                        ...component,
                        props: {
                            ...component.props,
                            [field]: value,
                            ...(field === "displayMode" && value === "Hidden" ? { hidden: true } : {}),
                            ...(field === "displayMode" && value !== "Hidden" ? { hidden: false } : {})
                        }
                    };
                })
            };
        })
    });
    afterChange(`${FIELD_LABELS[field] || field}を変更しました`, { light: true });
}

async function addFiles(fileList){
    const files = Array.from(fileList || []);
    if(files.length === 0){
        return;
    }
    for(const file of files){
        const record = createAssetRecord(file, new Date(Date.now() + state.assetLibrary.assets.length));
        if(!record){
            continue;
        }
        const src = await readFileAsDataUrl(file);
        state.assetLibrary = addAssetRecord(state.assetLibrary, {
            ...record,
            src
        });
    }
    afterChange("素材を追加しました");
}

function createAssetRow(asset){
    const row = document.createElement("div");
    row.className = "studio-v4-asset-row";
    const body = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = asset.name;
    const meta = document.createElement("small");
    meta.textContent = `${asset.type} / ${formatBytes(asset.size)}`;
    body.append(name, meta);
    const actions = document.createElement("div");
    actions.className = "studio-v4-inline-actions";
    if(["image", "svg"].includes(asset.type)){
        actions.append(createActionButton("画像に使う", () => {
            updateSelectedProp("imageAssetId", asset.id);
        }));
    }
    if(asset.type === "audio"){
        actions.append(createActionButton("BGMにする", () => {
            state.pageModel = normalizePageModel({
                ...state.pageModel,
                settings: {
                    ...state.pageModel.settings,
                    bgm: {
                        enabled: true,
                        assetId: asset.id,
                        volume: 0.6,
                        loop: true,
                        showControl: true
                    }
                }
            });
            afterChange("BGMを設定しました");
        }));
    }
    row.append(body, actions);
    return row;
}

function applyThemePreset(preset){
    state.theme = normalizeTheme({ tokens: preset.tokens });
    afterChange(`${preset.label}テーマに変更しました`);
    renderDesign();
}

function createThemeField(id, labelText, type){
    const label = document.createElement("label");
    label.className = "studio-v4-field";
    const span = document.createElement("span");
    span.textContent = labelText;
    const input = document.createElement("input");
    input.type = type;
    input.value = String(state.theme.tokens[id] ?? "");
    if(type === "range"){
        input.min = "0";
        input.max = id === "radius" ? "28" : "40";
        input.step = "1";
    }
    input.addEventListener("input", () => {
        state.theme = normalizeTheme({
            tokens: {
                ...state.theme.tokens,
                [id]: input.value
            }
        });
        afterChange(`${labelText}を変更しました`, { light: true });
        renderDesign();
    });
    label.append(span, input);
    return label;
}

function generatePublicHome(){
    syncRuntimeModel();
    const artifacts = generateHomeArtifacts(state.pageModel);
    const errors = validateGeneratedHomeArtifacts(artifacts);
    if(errors.length){
        setStatus(`公開用データを作れません: ${errors[0]}`, "error");
        return;
    }
    state.generated = artifacts.publicHome;
    localStorage.setItem(STORAGE_KEYS.generatedHome, JSON.stringify(artifacts.publicHome));
    pushHistory("公開用データを作成しました");
    setStatus("公開用データを作りました。Tauri版ではこの成果物を public-home.json に書き出します。", "saved");
    renderPublish();
    renderWorkbench();
}

function saveStudioDraft(){
    syncRuntimeModel();
    localStorage.setItem(STORAGE_KEYS.page, JSON.stringify(state.pageModel));
    localStorage.setItem(STORAGE_KEYS.assets, JSON.stringify(state.assetLibrary));
    localStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(state.theme));
    state.dirty = false;
    pushHistory("Studio作業データを保存しました");
    setStatus("保存しました。次はPreview確認か公開用データ作成へ進めます。", "saved");
    renderDashboard();
    renderWorkbench();
}

function afterChange(label, { light = false } = {}){
    syncRuntimeModel();
    state.dirty = true;
    if(!light){
        pushHistory(label);
    }
    setStatus("変更しました。Previewへ反映済みです。", "unsaved");
    persistVolatileState();
    if(light){
        renderPreview();
        renderStandalonePreview();
        renderPublish();
        return;
    }
    renderDashboard();
    renderWorkbench();
    renderPreview();
    renderStandalonePreview();
    renderPublish();
}

function syncRuntimeModel(){
    state.assetLibrary = normalizeAssetLibrary(state.assetLibrary);
    state.theme = normalizeTheme(state.theme);
    state.pageModel = normalizePageModel({
        ...state.pageModel,
        assets: state.assetLibrary.assets,
        theme: themeToPreviewTokens(state.theme)
    });
}

function persistVolatileState(){
    localStorage.setItem(STORAGE_KEYS.assets, JSON.stringify(state.assetLibrary));
    localStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(state.theme));
}

function pushHistory(label){
    const entry = {
        label,
        time: new Intl.DateTimeFormat("ja-JP", {
            hour: "2-digit",
            minute: "2-digit"
        }).format(new Date())
    };
    state.history = [entry, ...state.history].slice(0, 20);
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.history));
}

function openAddWizard(){
    const dialog = document.getElementById("addWizard");
    const body = document.getElementById("wizardBody");
    if(body){
        body.replaceChildren(
            createContentCard("TRPG", "シナリオを追加します。既存adminへ移動します。", [
                ["adminで追加", () => openAdminEditor("trpg")],
                ["Studio内で開く", openScenarioEditor]
            ]),
            createContentCard("Game", "今後追加できます。", [["準備中", null]]),
            createContentCard("Tool", "今後追加できます。", [["準備中", null]]),
            createContentCard("Gallery", "今後追加できます。", [["準備中", null]]),
            createContentCard("Music", "今後追加できます。", [["準備中", null]]),
            createContentCard("Video", "今後追加できます。", [["準備中", null]]),
            createContentCard("Custom", "今後追加できます。", [["準備中", null]])
        );
    }
    if(typeof dialog?.showModal === "function"){
        dialog.showModal();
    }
}

function closeAddWizard(){
    document.getElementById("addWizard")?.close();
}

function createCollectionsCard(){
    const card = document.createElement("article");
    card.className = "studio-v4-card";
    const title = document.createElement("h3");
    title.textContent = "Collections";
    const text = document.createElement("p");
    text.textContent = "TRPG、Game、Tool、Gallery、Music、Video、Customを同じ流れで扱います。";
    const grid = document.createElement("div");
    grid.className = "studio-v4-next-grid";
    grid.append(
        createSmallAction("TRPG", "シナリオをadminで編集", () => openAdminEditor("trpg")),
        createSmallAction("House Rules", "ハウスルールをadminで編集", () => openAdminEditor("houseRules")),
        createSmallAction("Game", "準備中", null),
        createSmallAction("Tool", "準備中", null),
        createSmallAction("Gallery", "準備中", null),
        createSmallAction("Music", "準備中", null),
        createSmallAction("Video", "準備中", null),
        createSmallAction("Custom", "準備中", null)
    );
    card.append(title, text, grid);
    return card;
}

function createContentCard(titleText, description, actions = []){
    const card = document.createElement("article");
    card.className = "studio-v4-card";
    const title = document.createElement("h3");
    title.textContent = titleText;
    const text = document.createElement("p");
    text.textContent = description;
    const actionArea = document.createElement("div");
    actionArea.className = "studio-v4-inline-actions";
    actions.forEach(([label, action]) => {
        const button = createActionButton(label, action || (() => {}));
        button.disabled = !action;
        actionArea.append(button);
    });
    card.append(title, text, actionArea);
    return card;
}

function openAdminEditor(routeId){
    const route = ADMIN_EDITOR_ROUTES[routeId];
    if(route){
        window.location.href = route;
    }
}

function createNextCard(titleText, description, action){
    const button = document.createElement("button");
    button.className = "studio-v4-next-card";
    button.type = "button";
    button.addEventListener("click", action);
    const title = document.createElement("strong");
    title.textContent = titleText;
    const text = document.createElement("span");
    text.textContent = description;
    button.append(title, text);
    return button;
}

function createSmallAction(titleText, description, action){
    const button = document.createElement("button");
    button.className = "studio-v4-small-card";
    button.type = "button";
    button.disabled = !action;
    if(action){
        button.addEventListener("click", action);
    }
    const title = document.createElement("strong");
    title.textContent = titleText;
    const text = document.createElement("span");
    text.textContent = description;
    button.append(title, text);
    return button;
}

function createActionButton(text, action){
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.addEventListener("click", action);
    return button;
}

function createStat(label, value){
    const pill = document.createElement("span");
    pill.className = "studio-stat-pill";
    const strong = document.createElement("strong");
    strong.textContent = value;
    const span = document.createElement("span");
    span.textContent = label;
    pill.append(strong, span);
    return pill;
}

function createStatusCard(titleText, value){
    const card = document.createElement("article");
    card.className = "studio-card is-neutral";
    const title = document.createElement("h3");
    title.textContent = titleText;
    const strong = document.createElement("strong");
    strong.textContent = value;
    card.append(title, strong);
    return card;
}

function getSelectedBlock(){
    return state.pageModel.blocks.find(block => block.id === state.selectedBlockId) || state.pageModel.blocks[0] || null;
}

function getMainComponent(block){
    return block?.components?.find(component => component.id.endsWith(":main")) || block?.components?.[0] || { props: {}, properties: [] };
}

function getVisibleProperties(block){
    const component = getMainComponent(block);
    return (component.properties || []).filter(property => property.id !== "hidden");
}

function groupProperties(block){
    const component = getMainComponent(block);
    const registry = COMPONENT_REGISTRY.find(definition => definition.type === block.type);
    const typeById = new Map((registry?.fields || []).map(field => [field.id, field.type]));
    const groups = {};
    (component.properties || []).forEach(property => {
        const next = {
            ...property,
            label: FIELD_LABELS[property.id] || property.label || property.id,
            type: typeById.get(property.id) || "text"
        };
        const group = next.group || "property";
        groups[group] = groups[group] || [];
        groups[group].push(next);
    });
    return groups;
}

function getPublishChecks(){
    const hero = state.pageModel.blocks.find(block => block.type === "hero");
    const heroMain = getMainComponent(hero);
    const footer = state.pageModel.blocks.find(block => block.type === "footer");
    const hasTitle = Boolean(String(heroMain?.props?.title || "").trim());
    return [
        { ok: hasTitle, label: "Homeタイトルが入っている" },
        { ok: Boolean(hero), label: "Heroが置かれている" },
        { ok: Boolean(footer), label: "Footerが置かれている" },
        { ok: state.pageModel.blocks.length >= 3, label: "3つ以上のBlockがある" },
        { ok: Boolean(state.theme.tokens.primary), label: "Themeが選ばれている" }
    ];
}

function isPresetCurrent(preset){
    return state.theme.tokens.primary === preset.tokens.primary &&
        state.theme.tokens.secondary === preset.tokens.secondary;
}

function loadPageModel(){
    const saved = readJson(STORAGE_KEYS.page);
    if(saved){
        return normalizePageModel(saved);
    }
    return createStarterPageModel({
        id: "home",
        title: "Home",
        source: "studio-v4",
        pageId: "home"
    });
}

function loadAssetLibrary(){
    return normalizeAssetLibrary(readJson(STORAGE_KEYS.assets) || createEmptyAssetLibrary());
}

function loadTheme(){
    return normalizeTheme(readJson(STORAGE_KEYS.theme) || createDefaultTheme());
}

function loadHistory(){
    const value = readJson(STORAGE_KEYS.history);
    return Array.isArray(value) ? value.slice(0, 20) : [];
}

function loadGeneratedHome(){
    return readJson(STORAGE_KEYS.generatedHome);
}

function readJson(key){
    try{
        const text = localStorage.getItem(key);
        return text ? JSON.parse(text) : null;
    }catch{
        return null;
    }
}

function readFileAsDataUrl(file){
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.addEventListener("load", () => resolve(String(reader.result || "")));
        reader.addEventListener("error", () => resolve(""));
        reader.readAsDataURL(file);
    });
}

function formatBytes(size){
    const number = Number(size);
    if(!Number.isFinite(number) || number <= 0){
        return "0 KB";
    }
    return `${Math.ceil(number / 1024)} KB`;
}

function setStatus(message, stateName = "saved"){
    const status = document.getElementById("studioEditorStatus");
    if(status){
        status.textContent = message;
        status.dataset.state = stateName;
    }
}

function setText(id, value){
    const element = document.getElementById(id);
    if(element){
        element.textContent = value;
    }
}
