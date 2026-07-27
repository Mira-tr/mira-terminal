import {
    addBlockToPage,
    createPageModel,
    createStarterPageModel,
    moveBlock,
    normalizePageModel,
    pageModelToComponentModel
} from "../engine/block/index.js";

import {
    COMPONENT_DISPLAY_MODES,
    COMPONENT_REGISTRY,
    createBlockFromRegistry,
    getComponentDefinition
} from "../engine/componentRegistry.js";

import {
    addAssetRecord,
    createAssetRecord,
    createEmptyAssetLibrary,
    createUrlAssetRecord,
    normalizeAssetLibrary
} from "../engine/asset/index.js";

import {
    attachHistoryShortcuts,
    createHistoryEngine
} from "../engine/history/index.js";

import {
    createCommand
} from "../engine/core/commandManager.js";

import {
    createDefaultStudioPlugins
} from "../engine/core/defaultPlugins.js";

import {
    createRelmuaEngine
} from "../engine/core/engine.js";

import {
    STUDIO_EVENTS
} from "../engine/core/eventBus.js";

import {
    THEME_GROUPS,
    createDefaultTheme,
    normalizeTheme,
    themeToPreviewTokens
} from "../engine/theme/index.js";

import {
    generateHomeArtifacts,
    validateGeneratedHomeArtifacts
} from "../engine/generator/home.js";

import {
    publicHomeConfigToComponentModel,
    renderComponentModelPreview
} from "../engine/renderer/index.js";

const COMPONENT_DRAFT_KEY_PREFIX = "relmua_studio_v3_component_draft:";
const HISTORY_KEY_PREFIX = "relmua_studio_v3_history:";
const PREVIEW_SIZES = Object.freeze(["Desktop", "Tablet", "Mobile"]);
const BLOCK_LIBRARY_TYPES = Object.freeze([
    "hero",
    "card-grid",
    "gallery",
    "image",
    "audio",
    "button",
    "quote",
    "divider",
    "timeline",
    "markdown",
    "video",
    "map",
    "accordion"
]);
const ASSET_TYPE_LABELS = Object.freeze({
    image: "画像",
    svg: "SVG",
    audio: "音声/BGM",
    video: "動画",
    pdf: "PDF",
    url: "URL"
});
const DISPLAY_MODE_LABELS = Object.freeze({
    Button: "ボタン",
    Link: "リンク",
    Text: "文字だけ",
    Hidden: "非表示"
});
const TREE_LABELS = Object.freeze({
    Title: "タイトル",
    Description: "説明",
    Button: "ボタン",
    Background: "背景",
    Image: "画像",
    Card: "カード"
});
const QUICK_ADD_TYPES = Object.freeze([
    ["image", "画像"],
    ["button", "ボタン"],
    ["card-grid", "カード一覧"],
    ["gallery", "ギャラリー"],
    ["markdown", "文章"],
    ["divider", "区切り"]
]);
const DEFAULT_NAV_ITEMS = Object.freeze(["Home", "Projects", "Tools", "Notes", "Creators", "About", "Contact"].map((label, index) => ({
    id: `nav-${label.toLowerCase()}`,
    label,
    visible: true,
    order: (index + 1) * 10
})));
const DEFAULT_FOOTER_ITEMS = Object.freeze(["GitHub", "X", "YouTube", "Contact", "Copyright"].map((label, index) => ({
    id: `footer-${label.toLowerCase()}`,
    label,
    visible: true,
    order: (index + 1) * 10
})));
const THEME_PRESETS = Object.freeze([
    createThemePreset("simple", "シンプル", {
        primary: "#19584d",
        secondary: "#d8b35a",
        surface: "#f6f1e7",
        fontFamily: "system-ui",
        radius: "8",
        shadow: "2",
        spacing: "16",
        motion: "1"
    }),
    createThemePreset("wa-modern", "和モダン", {
        primary: "#2f4b3f",
        secondary: "#b99a52",
        surface: "#f4efe6",
        fontFamily: "serif",
        radius: "6",
        shadow: "1",
        spacing: "18",
        motion: "1"
    }),
    createThemePreset("dark", "ダーク", {
        primary: "#8fc8b7",
        secondary: "#d8b35a",
        surface: "#151b18",
        fontFamily: "system-ui",
        radius: "10",
        shadow: "4",
        spacing: "16",
        motion: "1"
    }),
    createThemePreset("pop", "ポップ", {
        primary: "#e35d7f",
        secondary: "#35a6c8",
        surface: "#fff8f2",
        fontFamily: "system-ui",
        radius: "16",
        shadow: "3",
        spacing: "14",
        motion: "2"
    })
]);

const PAGE_TITLES = Object.freeze({
    home: "Home",
    projects: "Projects",
    tools: "Tools",
    notes: "Notes",
    creators: "Creators",
    about: "About",
    contact: "Contact",
    design: "Design"
});

export function mountHomeEditor(options = {}){
    return mountBlockEditor({
        ...options,
        pageId: "home",
        source: "home-editor"
    });
}

export function mountProjectEditor(options = {}){
    return mountBlockEditor({
        ...options,
        pageId: "projects",
        source: "project-editor"
    });
}

export function mountToolEditor(options = {}){
    return mountBlockEditor({
        ...options,
        pageId: "tools",
        source: "tool-editor"
    });
}

export function mountNoteEditor(options = {}){
    return mountBlockEditor({
        ...options,
        pageId: "notes",
        source: "note-editor"
    });
}

export function mountCreatorEditor(options = {}){
    return mountBlockEditor({
        ...options,
        pageId: "creators",
        source: "creator-editor"
    });
}

export function mountAboutEditor(options = {}){
    return mountBlockEditor({
        ...options,
        pageId: "about",
        source: "about-editor"
    });
}

export function mountContactEditor(options = {}){
    return mountBlockEditor({
        ...options,
        pageId: "contact",
        source: "contact-editor"
    });
}

export function mountDesignEditor(options = {}){
    return mountBlockEditor({
        ...options,
        pageId: "design",
        source: "design-editor"
    });
}

function mountBlockEditor({
    rootElement,
    pageId,
    source,
    onStateChange = () => {},
    onNavigate = () => {}
} = {}){
    requireRoot(rootElement, `mount${PAGE_TITLES[pageId] || "Page"}Editor`);

    return createVisualEditorMount({
        rootElement,
        title: `${PAGE_TITLES[pageId] || pageId}を作る`,
        pageId,
        source,
        storageKey: `${COMPONENT_DRAFT_KEY_PREFIX}${pageId}`,
        onStateChange,
        onNavigate
    });
}

function createVisualEditorMount({
    rootElement,
    title,
    pageId,
    source,
    storageKey,
    onStateChange,
    onNavigate
}){
    const state = createEditorState({
        source,
        previewLabel: title
    });
    const savedDraft = loadDraft(storageKey);
    let pageModel = createInitialPageModel({
        pageId,
        title,
        source,
        savedDraft
    });
    let assetLibrary = normalizeAssetLibrary(savedDraft?.assetLibrary || createEmptyAssetLibrary());
    let navigationItems = normalizeBuilderItems(savedDraft?.navigationItems, DEFAULT_NAV_ITEMS);
    let footerItems = normalizeBuilderItems(savedDraft?.footerItems, DEFAULT_FOOTER_ITEMS);
    let selectedBlockId = pageModel.blocks[0]?.id || "";
    let selectedComponentId = pageModel.blocks[0]?.components[0]?.id || "";
    let selectedPropertyId = "";
    let activeInspectorTab = "property";
    let previewSize = "Desktop";
    let beginnerProgress = {
        titleEdited: false,
        imageAdded: false,
        previewOpened: false,
        saved: false,
        loadedExisting: Boolean(savedDraft?.pageModel)
    };

    const history = createHistoryEngine({
        storage: localStorage,
        key: `${HISTORY_KEY_PREFIX}${source}`
    });
    const studioEngine = createRelmuaEngine({
        history,
        plugins: createDefaultStudioPlugins()
    });
    const inspectorTabs = studioEngine.pluginManager
    .listPlugins()
    .filter(plugin => plugin.kind === "inspector-tab" && plugin.enabled)
    .map(plugin => plugin.tab)
    .filter(Boolean);

    const shell = createEditorShell(title);
    const editor = document.createElement("div");
    editor.className = "studio-visual-editor";
    editor.tabIndex = -1;

    const beginnerGuide = createBeginnerGuidePanel();
    const quickAdd = createQuickAddPanel();
    const tree = createVisualTree();
    const preview = createVisualPreview();
    const inspector = createVisualInspector();
    const guide = createCreatorGuidePanel();
    const assets = createAssetManagerPanel();
    const pageSettings = createPageSettingsPanel();
    const navigationPanel = createNavigationEditorPanel();
    const footerPanel = createFooterEditorPanel();
    const themePresets = createThemePresetPanel();
    const publishChecklist = createPublishChecklistPanel();
    const historyPanel = createHistoryPanel();
    const diagnosticsPanel = createDiagnosticsPanel();
    const actions = createActionRow();
    const importHomeButton = createButton("既存Homeを読み込む", "secondary");
    const saveButton = createButton("保存", "primary");
    const previewButton = createButton("確認", "secondary");
    const undoButton = createButton("戻す", "secondary");
    const redoButton = createButton("やり直す", "secondary");
    const status = createStatusMessage();

    if(source === "home-editor"){
        actions.appendChild(importHomeButton);
    }
    actions.append(saveButton, previewButton, undoButton, redoButton);
    editor.append(
        beginnerGuide.element,
        quickAdd.element,
        tree.element,
        preview.element,
        guide.element,
        inspector.element,
        themePresets.element,
        pageSettings.element,
        assets.element,
        navigationPanel.element,
        footerPanel.element,
        publishChecklist.element,
        historyPanel.element,
        diagnosticsPanel.element
    );
    shell.body.append(editor, actions, status);
    rootElement.replaceChildren(shell.element);

    [
        STUDIO_EVENTS.COMPONENT_UPDATED,
        STUDIO_EVENTS.COMPONENT_ADDED,
        STUDIO_EVENTS.COMPONENT_REMOVED,
        STUDIO_EVENTS.THEME_UPDATED,
        STUDIO_EVENTS.ASSET_ADDED,
        STUDIO_EVENTS.COMMAND_UNDONE,
        STUDIO_EVENTS.COMMAND_REDONE
    ].forEach(eventType => {
        studioEngine.eventBus.subscribe(eventType, () => {
            renderAll();
        });
    });

    attachHistoryShortcuts(editor, {
        onUndo: () => handleHistoryNavigation("undo"),
        onRedo: () => handleHistoryNavigation("redo")
    });

    function createCurrentModel(){
        return createPageModel({
            ...pageModel,
            assets: assetLibrary.assets
        });
    }

    function renderAll(){
        pageModel = createCurrentModel();
        tree.render(pageModel, {
            selectedBlockId,
            selectedComponentId,
            selectedPropertyId
        });
        preview.render(pageModel, {
            source,
            size: previewSize,
            selectedBlockId
        });
        studioEngine.eventBus.publish(STUDIO_EVENTS.PREVIEW_UPDATED, {
            source,
            size: previewSize
        });
        inspector.render({
            pageModel,
            selectedBlockId,
            selectedComponentId,
            selectedPropertyId,
            activeTab: activeInspectorTab,
            tabs: inspectorTabs,
            source,
            onTabChange: tab => {
                activeInspectorTab = tab;
                renderAll();
            },
            onInput: handleInspectorInput,
            onThemeInput: handleThemeInput,
            assets: assetLibrary.assets
        });
        beginnerGuide.render(pageModel, {
            selectedBlockId,
            assetLibrary,
            progress: beginnerProgress
        });
        quickAdd.render(pageModel);
        guide.render(pageModel, {
            selectedBlockId,
            assetLibrary
        });
        assets.render(assetLibrary, getSelectedBlock(pageModel, selectedBlockId));
        pageSettings.render(pageModel, assetLibrary);
        navigationPanel.render(navigationItems);
        footerPanel.render(footerItems);
        themePresets.render(pageModel.theme || createDefaultTheme());
        publishChecklist.render(pageModel);
        historyPanel.render(history.list());
        diagnosticsPanel.render(studioEngine.diagnostics.list());
    }

    function publishState(nextState){
        notify(state, onStateChange, nextState);
        status.textContent = state.error || (
            state.unsaved
                ? "未保存の変更があります。"
                : state.saved
                    ? "保存しました。"
                    : "左の置いたものを選んで編集できます。"
        );
    }

    function handleInspectorInput(fieldId, value){
        updateBeginnerProgress(fieldId, value);
        const before = pageModel;
        const next = updateSelectedBlockProp(pageModel, selectedBlockId, selectedComponentId, fieldId, value);
        executeModelCommand({
            id: "component.updated",
            label: `${getSelectedBlock(pageModel, selectedBlockId)?.label || "置いたもの"} changed`,
            before,
            next,
            eventType: STUDIO_EVENTS.COMPONENT_UPDATED,
            payload: {
                blockId: selectedBlockId,
                componentId: selectedComponentId,
                propertyId: fieldId
            }
        });
    }

    function handleThemeInput(fieldId, value){
        const theme = normalizeTheme(pageModel.theme || createDefaultTheme());
        const before = pageModel;
        const next = createPageModel({
            ...pageModel,
            theme: {
                ...theme,
                tokens: {
                    ...theme.tokens,
                    [fieldId]: value
                }
            }
        });
        executeModelCommand({
            id: "theme.updated",
            label: "Theme changed",
            before,
            next,
            eventType: STUDIO_EVENTS.THEME_UPDATED,
            payload: {
                token: fieldId
            }
        });
    }

    function handlePageSettingsInput(fieldId, value){
        const before = pageModel;
        const currentSettings = pageModel.settings || {};
        const next = createPageModel({
            ...pageModel,
            settings: {
                ...currentSettings,
                bgm: {
                    ...(currentSettings.bgm || {}),
                    [fieldId]: value
                }
            }
        });
        executeModelCommand({
            id: "page.settings.updated",
            label: "Page settings changed",
            before,
            next,
            eventType: STUDIO_EVENTS.COMPONENT_UPDATED,
            payload: {
                area: "page-settings",
                fieldId
            }
        });
    }

    function addAssetRecords(files){
        const records = Array.from(files)
        .map(file => createAssetRecord(file))
        .filter(Boolean);
        if(records.some(record => ["image", "svg"].includes(record.type))){
            beginnerProgress.imageAdded = true;
            beginnerProgress.saved = false;
        }

        records.forEach(record => {
            const before = assetLibrary;
            const next = addAssetRecord(assetLibrary, record);
            studioEngine.commandManager.execute(createCommand({
                id: "asset.added",
                label: "Asset added",
                payload: {
                    assetId: record.id
                },
                execute(){
                    assetLibrary = next;
                    studioEngine.eventBus.publish(STUDIO_EVENTS.ASSET_ADDED, {
                        assetId: record.id
                    });
                    return assetLibrary;
                },
                undo(){
                    assetLibrary = before;
                    return assetLibrary;
                },
                redo(){
                    assetLibrary = next;
                    studioEngine.eventBus.publish(STUDIO_EVENTS.ASSET_ADDED, {
                        assetId: record.id
                    });
                    return assetLibrary;
                }
            }));
        });

        publishState({
            unsaved: true,
            saved: false,
            error: records.length ? "" : "画像、音声、動画、SVG、PDFをドラッグしてください。"
        });

        return records;
    }

    function executeModelCommand({
        id,
        label,
        before,
        next,
        eventType,
        payload
    }){
        beginnerProgress.saved = false;
        studioEngine.commandManager.execute(createCommand({
            id,
            label,
            payload,
            execute(){
                pageModel = next;
                studioEngine.eventBus.publish(eventType, payload);
                return pageModel;
            },
            undo(){
                pageModel = before;
                return pageModel;
            },
            redo(){
                pageModel = next;
                studioEngine.eventBus.publish(eventType, payload);
                return pageModel;
            }
        }));
        publishState({
            unsaved: true,
            saved: false,
            publicExported: false,
            error: "",
            preview: createPreview(title, "Live Preview")
        });
    }

    function handleHistoryNavigation(action){
        const entry = action === "redo"
            ? studioEngine.commandManager.redo()
            : studioEngine.commandManager.undo();
        publishState({
            unsaved: true,
            saved: false,
            error: entry ? `${action === "redo" ? "やり直し" : "戻しました"}: ${entry.label}` : "戻せる操作はありません。"
        });
    }

    tree.element.addEventListener("click", event => {
        const button = event.target.closest("button[data-block-id]");
        if(!button){
            return;
        }

        selectedBlockId = button.dataset.blockId;
        selectedComponentId = button.dataset.componentId || `${selectedBlockId}:main`;
        selectedPropertyId = button.dataset.propertyId || "";
        renderAll();
    });

    tree.element.addEventListener("dragstart", event => {
        const node = event.target.closest("[data-draggable-block-id]");
        if(node){
            event.dataTransfer.setData("text/plain", node.dataset.draggableBlockId);
        }
    });

    tree.element.addEventListener("dragover", event => {
        if(event.target.closest("[data-draggable-block-id]")){
            event.preventDefault();
        }
    });

    tree.element.addEventListener("drop", event => {
        const target = event.target.closest("[data-draggable-block-id]");
        const sourceBlockId = event.dataTransfer.getData("text/plain");
        if(!target || !sourceBlockId || target.dataset.draggableBlockId === sourceBlockId){
            return;
        }

        event.preventDefault();
        const before = pageModel;
        const next = moveBlockToTarget(pageModel, sourceBlockId, target.dataset.draggableBlockId);
        selectedBlockId = sourceBlockId;
        executeModelCommand({
            id: "component.reordered",
            label: "Block reordered",
            before,
            next,
            eventType: STUDIO_EVENTS.COMPONENT_UPDATED,
            payload: {
                blockId: sourceBlockId
            }
        });
    });

    preview.onSizeChange(size => {
        previewSize = size;
        renderAll();
    });

    guide.onSelectBlock(blockType => {
        const block = pageModel.blocks.find(candidate => candidate.type === blockType) || null;
        if(block){
            selectedBlockId = block.id;
            selectedComponentId = `${selectedBlockId}:main`;
            selectedPropertyId = "";
            activeInspectorTab = "property";
            renderAll();
        }
    });

    beginnerGuide.onEditTitle(() => {
        const block = pageModel.blocks.find(candidate => candidate.type === "hero") || pageModel.blocks[0];
        if(block){
            selectedBlockId = block.id;
            selectedComponentId = `${selectedBlockId}:main`;
            selectedPropertyId = "title";
            activeInspectorTab = "property";
            renderAll();
            focusEditorField("title");
        }
    });

    beginnerGuide.onAddImage(() => {
        const block = pageModel.blocks.find(candidate => candidate.type === "hero") || pageModel.blocks[0];
        if(block){
            selectedBlockId = block.id;
            selectedComponentId = `${selectedBlockId}:main`;
            selectedPropertyId = "imageAssetId";
            activeInspectorTab = "property";
            renderAll();
            focusEditorField("imageAssetId");
        }
        assets.element.scrollIntoView({
            block: "nearest",
            behavior: "smooth"
        });
    });

    beginnerGuide.onPreview(() => {
        beginnerProgress.previewOpened = true;
        renderAll();
        preview.element.scrollIntoView({
            block: "nearest",
            behavior: "smooth"
        });
    });

    beginnerGuide.onSave(() => {
        saveButton.click();
    });

    guide.onOpenAssets(() => {
        const block = pageModel.blocks.find(candidate => candidate.type === "hero") || pageModel.blocks[0];
        if(block){
            selectedBlockId = block.id;
            selectedComponentId = `${selectedBlockId}:main`;
            selectedPropertyId = "";
        }
        activeInspectorTab = "property";
        assets.element.scrollIntoView({
            block: "nearest",
            behavior: "smooth"
        });
    });

    guide.onOpenBgm(() => {
        pageSettings.element.scrollIntoView({
            block: "nearest",
            behavior: "smooth"
        });
    });

    guide.onOpenPublish(() => {
        publishChecklist.element.scrollIntoView({
            block: "nearest",
            behavior: "smooth"
        });
    });

    function addBlockFromLibrary(type){
        const before = pageModel;
        const next = addBlockToPage(pageModel, type);
        selectedBlockId = next.blocks[next.blocks.length - 1]?.id || selectedBlockId;
        selectedComponentId = `${selectedBlockId}:main`;
        executeModelCommand({
            id: "component.added",
            label: `${getComponentDefinition(type)?.label || "Block"} added`,
            before,
            next,
            eventType: STUDIO_EVENTS.COMPONENT_ADDED,
            payload: {
                blockId: selectedBlockId,
                type
            }
        });
    }

    tree.onAddBlock(addBlockFromLibrary);
    quickAdd.onAddBlock(addBlockFromLibrary);

    tree.onMoveBlock(direction => {
        const before = pageModel;
        const next = moveBlock(pageModel, selectedBlockId, direction);
        executeModelCommand({
            id: "component.reordered",
            label: "Block reordered",
            before,
            next,
            eventType: STUDIO_EVENTS.COMPONENT_UPDATED,
            payload: {
                blockId: selectedBlockId,
                direction
            }
        });
    });

    assets.onDrop(files => {
        addAssetRecords(files);
    });

    assets.onAddUrl((url, label) => {
        const record = createUrlAssetRecord(url, label);

        if(!record){
            publishState({
                unsaved: true,
                saved: false,
                error: "URLは http / https / mailto の形式で入力してください。"
            });
            return;
        }

        const before = assetLibrary;
        const next = addAssetRecord(assetLibrary, record);
        studioEngine.commandManager.execute(createCommand({
            id: "asset.url.added",
            label: "URL asset added",
            payload: {
                assetId: record.id
            },
            execute(){
                assetLibrary = next;
                studioEngine.eventBus.publish(STUDIO_EVENTS.ASSET_ADDED, {
                    assetId: record.id
                });
                return assetLibrary;
            },
            undo(){
                assetLibrary = before;
                return assetLibrary;
            },
            redo(){
                assetLibrary = next;
                studioEngine.eventBus.publish(STUDIO_EVENTS.ASSET_ADDED, {
                    assetId: record.id
                });
                return assetLibrary;
            }
        }));
        publishState({
            unsaved: true,
            saved: false,
            error: ""
        });
    });

    assets.onAssign(asset => {
        const targetField = getAssetTargetField(asset, getSelectedBlock(pageModel, selectedBlockId));
        if(!targetField){
            publishState({
                unsaved: true,
                saved: false,
                error: "この素材を設定できる場所を左で選んでください。"
            });
            return;
        }
        handleInspectorInput(targetField, asset.type === "url" ? asset.href : asset.id);
    });

    pageSettings.onChange(handlePageSettingsInput);

    navigationPanel.onChange(nextItems => {
        navigationItems = nextItems;
        studioEngine.eventBus.publish(STUDIO_EVENTS.COMPONENT_UPDATED, {
            area: "navigation"
        });
        publishState({
            unsaved: true,
            saved: false,
            error: ""
        });
    });

    footerPanel.onChange(nextItems => {
        footerItems = nextItems;
        studioEngine.eventBus.publish(STUDIO_EVENTS.COMPONENT_UPDATED, {
            area: "footer"
        });
        publishState({
            unsaved: true,
            saved: false,
            error: ""
        });
    });

    themePresets.onSelect(preset => {
        const before = pageModel;
        const theme = normalizeTheme(pageModel.theme || createDefaultTheme());
        const next = createPageModel({
            ...pageModel,
            theme: {
                ...theme,
                tokens: {
                    ...theme.tokens,
                    ...preset.tokens
                }
            }
        });
        executeModelCommand({
            id: "theme.preset",
            label: `${preset.label} theme selected`,
            before,
            next,
            eventType: STUDIO_EVENTS.THEME_UPDATED,
            payload: {
                preset: preset.id
            }
        });
    });

    async function loadExistingHome({
        automatic = false
    } = {}){
        if(source !== "home-editor"){
            return;
        }

        try{
            const before = pageModel;
            const response = await fetch("../web/data/public-home.json", {
                cache: "no-store"
            });
            if(!response.ok){
                throw new Error("Home data could not be loaded.");
            }
            const publicHome = await response.json();
            const next = publicHomeConfigToPageModel(publicHome, {
                title,
                source,
                previousModel: pageModel
            });
            selectedBlockId = next.blocks[0]?.id || "";
            selectedComponentId = selectedBlockId ? `${selectedBlockId}:main` : "";
            beginnerProgress.loadedExisting = true;
            if(automatic){
                pageModel = next;
                studioEngine.eventBus.publish(STUDIO_EVENTS.COMPONENT_UPDATED, {
                    source,
                    imported: "public-home",
                    automatic: true
                });
                publishState({
                    unsaved: false,
                    saved: false,
                    error: ""
                });
                renderAll();
                return;
            }
            executeModelCommand({
                id: "page.imported",
                label: "Existing Home imported",
                before,
                next,
                eventType: STUDIO_EVENTS.COMPONENT_UPDATED,
                payload: {
                    source,
                    imported: "public-home"
                }
            });
        }catch(error){
            publishState({
                unsaved: true,
                saved: false,
                error: `既存Homeを読み込めませんでした: ${error.message}`
            });
        }
    }

    importHomeButton.addEventListener("click", () => {
        loadExistingHome();
    });

    saveButton.addEventListener("click", () => {
        const model = createCurrentModel();
        const artifacts = generateArtifactsForModel(source, model);
        studioEngine.eventBus.publish(STUDIO_EVENTS.GENERATOR_FINISHED, {
            source,
            outputs: Object.keys(artifacts.outputs || {})
        });
        const errors = validateArtifactsForModel(source, artifacts);

        if(errors.length > 0){
            publishState({
                unsaved: true,
                saved: false,
                error: errors.join(" / "),
                preview: createPreview(title, "Live Preview")
            });
            return;
        }

        const saved = saveDraft(storageKey, {
            schemaVersion: 2,
            source,
            pageModel: model,
            assetLibrary,
            navigationItems,
            footerItems,
            artifacts,
            history: history.snapshot(),
            updatedAt: new Date().toISOString()
        });
        beginnerProgress.saved = Boolean(saved);
        if(saved){
            studioEngine.eventBus.publish(STUDIO_EVENTS.PAGE_SAVED, {
                source,
                storageKey
            });
        }

        publishState({
            unsaved: false,
            saved: Boolean(saved),
            error: saved ? "" : "保存できませんでした。",
            preview: createPreview(title, getPreviewLabelForArtifacts(artifacts))
        });
        diagnosticsPanel.render(studioEngine.diagnostics.list());
    });

    previewButton.addEventListener("click", () => {
        beginnerProgress.previewOpened = true;
        renderAll();
        const nextPreview = createPreview(title, "Live Preview");
        publishState({
            preview: nextPreview
        });
        onNavigate({
            type: "preview",
            preview: nextPreview
        });
    });

    undoButton.addEventListener("click", () => handleHistoryNavigation("undo"));
    redoButton.addEventListener("click", () => handleHistoryNavigation("redo"));

    function updateBeginnerProgress(fieldId, value){
        if(fieldId === "title" && String(value || "").trim()){
            beginnerProgress.titleEdited = true;
            beginnerProgress.saved = false;
        }
        if(fieldId === "imageAssetId" && String(value || "").trim()){
            beginnerProgress.imageAdded = true;
            beginnerProgress.saved = false;
        }
    }

    function focusEditorField(fieldId){
        requestAnimationFrame(() => {
            const target = inspector.element.querySelector(
                `[data-studio-field-id="${fieldId}"] input, ` +
                `[data-studio-field-id="${fieldId}"] select, ` +
                `[data-studio-field-id="${fieldId}"] textarea`
            );
            target?.focus();
            target?.select?.();
        });
    }

    renderAll();
    publishState({});
    if(source === "home-editor" && !savedDraft?.pageModel){
        loadExistingHome({
            automatic: true
        });
    }

    return createMountHandle(rootElement, state, "VisualEditorMount");
}

function createInitialPageModel({
    pageId,
    title,
    source,
    savedDraft
}){
    if(savedDraft?.pageModel){
        return normalizePageModel(savedDraft.pageModel);
    }

    return createStarterPageModel({
        id: pageId === "home" ? "home" : source,
        title,
        source,
        pageId
    });
}

function publicHomeConfigToPageModel(publicHome, {
    title,
    source,
    previousModel
}){
    const sections = Array.isArray(publicHome?.sections)
        ? publicHome.sections
        : [];
    const previous = normalizePageModel(previousModel);
    const blocks = sections
    .map((section, index) => publicHomeSectionToBlock(section, index))
    .filter(Boolean);

    return createPageModel({
        id: "home",
        title,
        source,
        blocks: blocks.length ? blocks : previous.blocks,
        theme: previous.theme,
        assets: previous.assets,
        settings: previous.settings
    });
}

function publicHomeSectionToBlock(section, index){
    const type = toBlockTypeForPublicHomeSection(section);

    if(!type){
        return null;
    }

    const block = createBlockFromRegistry(type, index, {
        id: section.id || `${type}-${index + 1}`,
        order: Number(section.order || (index + 1) * 10),
        props: {
            title: section.title || "",
            description: section.description || "",
            hidden: section.enabled === false,
            displayMode: section.enabled === false ? "Hidden" : section.id === "hero" ? "Button" : "Text",
            layout: section.layout || ""
        }
    });

    return block;
}

function toBlockTypeForPublicHomeSection(section){
    if(!section || typeof section !== "object"){
        return "";
    }

    if(section.id === "hero" || section.type === "hero"){
        return "hero";
    }

    if(["projects", "tools", "notes", "creators"].includes(section.type)){
        return "card-grid";
    }

    return "";
}

function createBeginnerGuidePanel(){
    const element = document.createElement("section");
    element.className = "studio-beginner-guide";

    const copy = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = "はじめてなら、この順番でOK";
    const lead = document.createElement("p");
    lead.textContent = "まずタイトルを書きます。次に画像を入れます。右の見え方を見て、よければ保存します。";
    copy.append(title, lead);

    const steps = document.createElement("div");
    steps.className = "studio-beginner-steps";
    const titleButton = createBeginnerStepButton("1", "タイトルを書く", "Heroのタイトル欄を開きます。");
    const imageButton = createBeginnerStepButton("2", "画像を入れる", "素材に画像をドラッグします。");
    const previewButton = createBeginnerStepButton("3", "見え方を見る", "右側の表示を確認します。");
    const saveButton = createBeginnerStepButton("4", "保存する", "今の編集内容を保存します。");
    steps.append(titleButton, imageButton, previewButton, saveButton);

    const status = document.createElement("p");
    status.className = "studio-beginner-guide-status";
    element.append(copy, steps, status);

    let editTitleHandler = () => {};
    let addImageHandler = () => {};
    let previewHandler = () => {};
    let saveHandler = () => {};

    titleButton.addEventListener("click", () => editTitleHandler());
    imageButton.addEventListener("click", () => addImageHandler());
    previewButton.addEventListener("click", () => previewHandler());
    saveButton.addEventListener("click", () => saveHandler());

    return {
        element,
        render(pageModel, {
            assetLibrary,
            progress = {}
        } = {}){
            const hero = getBlockByType(pageModel, "hero");
            const props = getMainProps(hero);
            const hasTitle = progress.titleEdited || Boolean(progress.loadedExisting && props.title);
            const hasImage = progress.imageAdded || Boolean(progress.loadedExisting && props.imageAssetId);
            titleButton.dataset.done = progress.titleEdited ? "true" : "false";
            imageButton.dataset.done = progress.imageAdded ? "true" : "false";
            previewButton.dataset.done = progress.previewOpened ? "true" : "false";
            saveButton.dataset.done = progress.saved ? "true" : "false";
            status.textContent = progress.saved
                ? "保存できました。次は公開前チェックへ進めます。"
                : progress.previewOpened
                    ? "見え方を確認しました。よければ保存してください。"
                    : hasTitle && hasImage
                        ? "タイトルと画像は入っています。次は見え方を確認してください。"
                        : hasTitle
                            ? "次は画像を入れると、Homeらしくなります。"
                            : "まず「タイトルを書く」を押してください。";
        },
        onEditTitle(handler){
            editTitleHandler = handler;
        },
        onAddImage(handler){
            addImageHandler = handler;
        },
        onPreview(handler){
            previewHandler = handler;
        },
        onSave(handler){
            saveHandler = handler;
        }
    };
}

function createBeginnerStepButton(number, title, note){
    const button = document.createElement("button");
    button.type = "button";
    button.className = "studio-beginner-step";
    const badge = document.createElement("span");
    badge.textContent = number;
    const strong = document.createElement("strong");
    strong.textContent = title;
    const small = document.createElement("small");
    small.textContent = note;
    button.append(badge, strong, small);
    return button;
}

function createQuickAddPanel(){
    const element = document.createElement("section");
    element.className = "studio-quick-add-panel";
    const head = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = "追加する";
    const lead = document.createElement("p");
    lead.textContent = "置きたいものを押すだけで、下に追加されます。あとから並び替えできます。";
    head.append(title, lead);

    const list = document.createElement("div");
    list.className = "studio-quick-add-list";
    const buttons = QUICK_ADD_TYPES.map(([type, label]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.quickAddType = type;
        button.textContent = `＋ ${label}`;
        list.appendChild(button);
        return button;
    });
    const count = document.createElement("p");
    count.className = "studio-quick-add-count";
    element.append(head, list, count);

    let addHandler = () => {};

    buttons.forEach(button => {
        button.addEventListener("click", () => addHandler(button.dataset.quickAddType));
    });

    return {
        element,
        render(pageModel){
            count.textContent = `今あるもの: ${pageModel.blocks.length}個`;
        },
        onAddBlock(handler){
            addHandler = handler;
        }
    };
}

function createCreatorGuidePanel(){
    const element = document.createElement("section");
    element.className = "studio-creator-guide";
    const title = document.createElement("h3");
    title.textContent = "最短ルート";
    const summary = document.createElement("p");
    const actions = document.createElement("div");
    actions.className = "studio-creator-guide-actions";
    const heroButton = createButton("Heroを編集", "primary");
    const assetButton = createButton("画像を入れる", "secondary");
    const bgmButton = createButton("BGMを設定", "secondary");
    const publishButton = createButton("公開前チェック", "secondary");
    actions.append(heroButton, assetButton, bgmButton, publishButton);
    const checklist = document.createElement("div");
    checklist.className = "studio-creator-guide-checks";
    element.append(title, summary, actions, checklist);

    let selectBlockHandler = () => {};
    let openAssetsHandler = () => {};
    let openBgmHandler = () => {};
    let openPublishHandler = () => {};

    heroButton.addEventListener("click", () => selectBlockHandler("hero"));
    assetButton.addEventListener("click", () => openAssetsHandler());
    bgmButton.addEventListener("click", () => openBgmHandler());
    publishButton.addEventListener("click", () => openPublishHandler());

    return {
        element,
        render(pageModel, {
            selectedBlockId,
            assetLibrary
        } = {}){
            const hero = getBlockByType(pageModel, "hero");
            const heroProps = getMainProps(hero);
            const bgm = pageModel.settings?.bgm || {};
            const assets = assetLibrary?.assets || [];
            const checks = [
                {
                    label: "タイトル",
                    done: Boolean(heroProps.title)
                },
                {
                    label: "画像",
                    done: Boolean(heroProps.imageAssetId || heroProps.background || assets.some(asset => ["image", "svg"].includes(asset.type)))
                },
                {
                    label: "リンク",
                    done: Boolean(heroProps.link)
                },
                {
                    label: "BGM",
                    done: !bgm.enabled || Boolean(bgm.assetId)
                }
            ];
            const doneCount = checks.filter(check => check.done).length;
            summary.textContent = `Homeを作る流れ: Hero、画像、リンク、BGM、確認。${doneCount}/${checks.length} 完了`;
            heroButton.setAttribute("aria-current", selectedBlockId === hero?.id ? "true" : "false");
            checklist.replaceChildren(...checks.map(createCreatorGuideCheck));
        },
        onSelectBlock(handler){
            selectBlockHandler = handler;
        },
        onOpenAssets(handler){
            openAssetsHandler = handler;
        },
        onOpenBgm(handler){
            openBgmHandler = handler;
        },
        onOpenPublish(handler){
            openPublishHandler = handler;
        }
    };
}

function createCreatorGuideCheck(check){
    const item = document.createElement("p");
    item.dataset.done = check.done ? "true" : "false";
    item.textContent = `${check.done ? "✓" : "□"} ${check.label}`;
    return item;
}

function createVisualTree(){
    const element = document.createElement("section");
    element.className = "studio-visual-tree";
    element.setAttribute("aria-label", "置いたもの");

    const title = document.createElement("h3");
    title.textContent = "置いたもの";
    const addBar = document.createElement("div");
    addBar.className = "studio-block-add";
    const libraryTitle = document.createElement("p");
    libraryTitle.textContent = "＋ 追加する";
    const library = document.createElement("div");
    library.className = "studio-block-library";
    const libraryButtons = BLOCK_LIBRARY_TYPES
    .map(type => getComponentDefinition(type))
    .filter(Boolean)
    .map(definition => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.blockType = definition.type;
        button.textContent = definition.label;
        library.appendChild(button);
        return button;
    });
    const upButton = createButton("上へ", "secondary");
    const downButton = createButton("下へ", "secondary");
    addBar.append(libraryTitle, library, upButton, downButton);

    const list = document.createElement("div");
    list.className = "studio-visual-tree-list";
    element.append(title, addBar, list);

    return {
        element,
        render(pageModel, selection){
            const root = document.createElement("p");
            root.className = "studio-visual-tree-root";
            root.textContent = pageModel.title.replace("を作る", "") || "ページ";
            list.replaceChildren(root, ...pageModel.blocks.flatMap(block => createBlockTreeNodes(block, selection)));
        },
        onAddBlock(handler){
            libraryButtons.forEach(button => {
                button.addEventListener("click", () => handler(button.dataset.blockType));
            });
        },
        onMoveBlock(handler){
            upButton.addEventListener("click", () => handler("up"));
            downButton.addEventListener("click", () => handler("down"));
        }
    };
}

function createBlockTreeNodes(block, selection){
    const blockButton = createTreeButton({
        block,
        label: block.label,
        depth: 1,
        current: selection.selectedBlockId === block.id && !selection.selectedPropertyId,
        draggable: true
    });

    const componentButtons = block.components.map(component => createTreeButton({
        block,
        component,
        label: TREE_LABELS[component.type] || component.type,
        depth: 2,
        current: selection.selectedComponentId === component.id && !selection.selectedPropertyId
    }));

    const propertyButtons = block.components.flatMap(component => (
        (component.properties || []).map(property => createTreeButton({
            block,
            component,
            property,
            label: property.label,
            depth: 3,
            current: selection.selectedPropertyId === property.id &&
                selection.selectedComponentId === component.id
        }))
    ));

    return [blockButton, ...componentButtons, ...propertyButtons];
}

function createTreeButton({
    block,
    component = null,
    property = null,
    label,
    depth,
    current,
    draggable = false
}){
    const button = document.createElement("button");
    button.type = "button";
    button.className = `studio-visual-tree-node is-depth-${depth}`;
    button.dataset.blockId = block.id;
    if(component){
        button.dataset.componentId = component.id;
    }
    if(property){
        button.dataset.propertyId = property.id;
    }
    if(draggable){
        button.draggable = true;
        button.dataset.draggableBlockId = block.id;
    }
    button.setAttribute("aria-current", current ? "true" : "false");
    button.textContent = label;
    return button;
}

function createVisualPreview(){
    const element = document.createElement("section");
    element.className = "studio-visual-preview";
    element.setAttribute("aria-label", "見え方");

    const header = document.createElement("div");
    header.className = "studio-preview-header";
    const title = document.createElement("h3");
    title.textContent = "見え方";
    const sizeControls = document.createElement("div");
    sizeControls.className = "studio-preview-size-controls";
    const buttons = PREVIEW_SIZES.map(size => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.previewSize = size;
        button.textContent = size;
        sizeControls.appendChild(button);
        return button;
    });
    header.append(title, sizeControls);

    const body = document.createElement("div");
    body.className = "studio-visual-preview-body is-desktop";
    const viewport = document.createElement("div");
    viewport.className = "studio-preview-viewport";
    body.appendChild(viewport);
    element.append(header, body);

    return {
        element,
        render(pageModel, {
            source,
            size,
            selectedBlockId
        }){
            buttons.forEach(button => {
                button.setAttribute("aria-current", button.dataset.previewSize === size ? "true" : "false");
            });
            body.className = `studio-visual-preview-body is-${size.toLowerCase()}`;
            renderEnginePreview({
                documentRef: element.ownerDocument || document,
                container: viewport,
                model: pageModel,
                source,
                selectedBlockId
            });
        },
        onSizeChange(handler){
            buttons.forEach(button => {
                button.addEventListener("click", () => handler(button.dataset.previewSize));
            });
        }
    };
}

function createVisualInspector(){
    const element = document.createElement("section");
    element.className = "studio-visual-inspector";
    element.setAttribute("aria-label", "Inspector");

    const title = document.createElement("h3");
    title.textContent = "編集";
    const body = document.createElement("div");
    body.className = "studio-visual-inspector-body";
    element.append(title, body);

    return {
        element,
        render(options){
            renderVisualInspector({
                container: body,
                ...options
            });
        }
    };
}

function renderVisualInspector({
    container,
    pageModel,
    selectedBlockId,
    selectedComponentId,
    selectedPropertyId,
    activeTab,
    tabs,
    source,
    onTabChange,
    onInput,
    onThemeInput,
    assets = []
}){
    const block = getSelectedBlock(pageModel, selectedBlockId);
    const component = getSelectedComponent(block, selectedComponentId);
    const definition = getComponentDefinition(block?.type);
    const heading = document.createElement("h4");
    heading.textContent = block?.label || "置いたもの";
    const tabList = createInspectorTabs(tabs, activeTab, onTabChange);
    const quickPanel = createInspectorQuickPanel(block, pageModel, onTabChange);
    const heroComposer = block?.type === "hero"
        ? createHeroComposer({
            definition,
            component,
            pageModel,
            assets,
            onInput,
            onAssetDrop(files){
                const records = addAssetRecords(files);
                const image = records.find(record => ["image", "svg"].includes(record.type));
                const audio = records.find(record => record.type === "audio");
                if(image){
                    handleInspectorInput("imageAssetId", image.id);
                }
                if(audio){
                    handleInspectorInput("audioAssetId", audio.id);
                }
            },
            onTabChange
        })
        : null;
    const binding = createBindingPanel(component, selectedPropertyId);
    const fields = (definition?.fields || [])
    .filter(() => !heroComposer)
    .filter(field => field.group === activeTab)
    .map(field => createInspectorField({
        field,
        value: component?.props?.[field.id],
        onInput,
        assets
    }));

    const nodes = [heading, quickPanel, heroComposer, tabList, binding, ...fields].filter(Boolean);
    if(source === "design-editor" || activeTab === "style"){
        nodes.push(createThemePanel(pageModel.theme || createDefaultTheme(), onThemeInput));
    }

    container.replaceChildren(...nodes);
}

function createInspectorTabs(tabDefinitions, activeTab, onTabChange){
    const tabs = document.createElement("div");
    tabs.className = "studio-inspector-tabs";

    tabDefinitions.forEach(tabDefinition => {
        const tab = tabDefinition.id;
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = tabDefinition.label;
        button.setAttribute("aria-current", tab === activeTab ? "true" : "false");
        button.addEventListener("click", () => onTabChange(tab));
        tabs.appendChild(button);
    });

    return tabs;
}

function createInspectorQuickPanel(block, pageModel, onTabChange){
    if(!block){
        return null;
    }

    const props = getMainProps(block);
    const panel = document.createElement("section");
    panel.className = "studio-inspector-quick";
    const text = document.createElement("p");
    const actions = document.createElement("div");
    const property = createButton(block.type === "hero" ? "タイトルを書く" : "内容を書く", "secondary");
    const style = createButton("見た目", "secondary");
    const behavior = createButton(block.type === "hero" ? "リンク/BGM" : "動き/リンク", "secondary");
    property.addEventListener("click", () => onTabChange("property"));
    style.addEventListener("click", () => onTabChange("style"));
    behavior.addEventListener("click", () => onTabChange("behavior"));
    actions.append(property, style, behavior);
    text.textContent = toInspectorQuickText(block, pageModel, props);
    panel.append(text, actions);
    return panel;
}

function toInspectorQuickText(block, pageModel, props){
    if(block.type === "hero"){
        const hasImage = Boolean(props.imageAssetId || props.background);
        const hasLink = Boolean(props.link);
        const bgm = pageModel.settings?.bgm || {};
        return `Hero: ${props.title ? "タイトルOK" : "タイトル未入力"} / ${hasImage ? "画像OK" : "画像なし"} / ${hasLink ? "リンクOK" : "リンク未設定"} / ${bgm.enabled ? "BGMあり" : "BGMなし"}`;
    }

    if(block.type === "image"){
        return props.imageAssetId ? "画像素材が設定されています。" : "素材から画像を選ぶと右の見え方に出ます。";
    }

    if(block.type === "audio"){
        return props.audioAssetId ? "音声素材が設定されています。" : "素材から音声を選ぶとBGMとして使えます。";
    }

    return "内容、見た目、リンクをここで整えます。";
}

function createHeroComposer({
    definition,
    component,
    pageModel,
    assets,
    onInput,
    onAssetDrop,
    onTabChange
}){
    const panel = document.createElement("section");
    panel.className = "studio-hero-composer";
    const title = document.createElement("h5");
    title.textContent = "Heroを作る";
    const lead = document.createElement("p");
    lead.textContent = "トップで最初に見せる言葉、画像、ボタン、BGMをまとめて整えます。";
    const grid = document.createElement("div");
    grid.className = "studio-hero-composer-grid";
    const drop = document.createElement("div");
    drop.className = "studio-hero-composer-drop";
    drop.textContent = "Hero画像やBGMをここへドラッグ";
    drop.addEventListener("dragover", event => {
        event.preventDefault();
    });
    drop.addEventListener("drop", event => {
        event.preventDefault();
        onAssetDrop(event.dataTransfer.files || []);
    });
    const props = component?.props || {};

    [
        "title",
        "description",
        "imageAssetId",
        "label",
        "displayMode",
        "linkType",
        "link",
        "newTab",
        "audioAssetId",
        "hidden"
    ].map(fieldId => definition?.fields?.find(field => field.id === fieldId))
    .filter(Boolean)
    .forEach(field => {
        grid.appendChild(createInspectorField({
            field,
            value: props[field.id],
            onInput,
            assets
        }));
    });

    const bgm = pageModel.settings?.bgm || {};
    const status = document.createElement("p");
    status.className = "studio-hero-composer-status";
    status.textContent = `ページBGM: ${bgm.enabled ? "使う" : "使わない"} / ${bgm.assetId ? "素材あり" : "素材未設定"}`;
    const actions = document.createElement("div");
    actions.className = "studio-hero-composer-actions";
    const style = createButton("背景と余白を調整", "secondary");
    const behavior = createButton("ボタンとリンクを調整", "secondary");
    style.addEventListener("click", () => onTabChange("style"));
    behavior.addEventListener("click", () => onTabChange("behavior"));
    actions.append(style, behavior);
    panel.append(title, lead, drop, grid, status, actions);
    return panel;
}

function createInspectorField({
    field,
    value,
    onInput,
    assets = []
}){
    if(field.id === "imageAssetId"){
        return createAssetSelectField({
            field,
            value,
            assets,
            types: ["image", "svg"],
            onInput
        });
    }

    if(field.id === "audioAssetId"){
        return createAssetSelectField({
            field,
            value,
            assets,
            types: ["audio"],
            onInput
        });
    }

    if(field.id === "displayMode" && field.type === "select"){
        return createDisplayModeField({
            field,
            value,
            onInput
        });
    }

    const label = document.createElement("label");
    label.className = field.type === "checkbox"
        ? "studio-editor-checkbox"
        : "studio-editor-field";
    label.dataset.studioFieldId = field.id;
    const text = document.createElement("span");
    text.textContent = field.label;
    const input = createInputElement(field, value);

    input.dataset.field = field.id;
    input.addEventListener("input", () => onInput(field.id, readInputValue(input)));
    input.addEventListener("change", () => onInput(field.id, readInputValue(input)));

    if(field.type === "checkbox"){
        label.append(input, text);
    }else{
        label.append(text, input);
    }

    return label;
}

function createAssetSelectField({
    field,
    value,
    assets,
    types,
    onInput
}){
    const label = document.createElement("label");
    label.className = "studio-editor-field";
    label.dataset.studioFieldId = field.id;
    const text = document.createElement("span");
    text.textContent = field.label;
    const select = document.createElement("select");
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "素材を選ぶ";
    select.appendChild(empty);

    assets
    .filter(asset => types.includes(asset.type))
    .forEach(asset => {
        const option = document.createElement("option");
        option.value = asset.id;
        option.textContent = `${asset.name} / ${ASSET_TYPE_LABELS[asset.type] || asset.type}`;
        select.appendChild(option);
    });

    select.value = String(value ?? "");
    select.addEventListener("change", () => onInput(field.id, select.value));
    label.append(text, select);
    return label;
}

function createDisplayModeField({
    field,
    value,
    onInput
}){
    const fieldset = document.createElement("fieldset");
    fieldset.className = "studio-display-mode-field";
    fieldset.dataset.studioFieldId = field.id;
    const legend = document.createElement("legend");
    legend.textContent = field.label;
    const options = document.createElement("div");
    options.className = "studio-display-mode-options";

    field.options.forEach(optionValue => {
        const label = document.createElement("label");
        const input = document.createElement("input");
        const text = document.createElement("span");

        input.type = "radio";
        input.name = `display-mode-${field.label}`;
        input.value = optionValue;
        input.checked = optionValue === value;
        input.addEventListener("change", () => {
            if(input.checked){
                onInput(field.id, optionValue);
            }
        });
        text.textContent = DISPLAY_MODE_LABELS[optionValue] || optionValue;
        label.append(input, text);
        options.appendChild(label);
    });

    fieldset.append(legend, options);
    return fieldset;
}

function createBindingPanel(component, selectedPropertyId){
    const property = component?.properties?.find(item => item.id === selectedPropertyId) ||
        component?.properties?.[0] ||
        null;
    const panel = document.createElement("section");
    panel.className = "studio-binding-panel";

    const title = document.createElement("h5");
    const beginner = document.createElement("p");
    const advanced = document.createElement("details");
    const summary = document.createElement("summary");
    const advancedText = document.createElement("p");

    beginner.textContent = property?.binding?.beginner || "選んだ場所の設定";
    title.textContent = "つながり";
    summary.textContent = "詳しい情報";
    advancedText.textContent = property?.binding?.advanced || "Page -> Block -> Component -> Property";
    advanced.append(summary, advancedText);
    panel.append(title, beginner, advanced);

    return panel;
}

function createThemePanel(theme, onThemeInput){
    const panel = document.createElement("section");
    panel.className = "studio-theme-engine-panel";
    const heading = document.createElement("h5");
    heading.textContent = "微調整";
    panel.appendChild(heading);
    const normalized = normalizeTheme(theme);

    THEME_GROUPS.forEach(group => {
        const groupElement = document.createElement("section");
        const title = document.createElement("h6");
        title.textContent = group.label;
        groupElement.appendChild(title);
        group.fields.forEach(field => {
            groupElement.appendChild(createInspectorField({
                field,
                value: normalized.tokens[field.id],
                onInput: onThemeInput
            }));
        });
        panel.appendChild(groupElement);
    });

    return panel;
}

function createAssetManagerPanel(){
    const element = document.createElement("section");
    element.className = "studio-asset-manager";
    element.setAttribute("aria-label", "素材");

    const title = document.createElement("h3");
    title.textContent = "素材";
    const drop = document.createElement("div");
    drop.className = "studio-asset-dropzone";
    drop.textContent = "画像・音声・動画・PDFをここへドラッグ";
    const helper = document.createElement("p");
    helper.className = "studio-asset-helper";
    const urlRow = document.createElement("div");
    urlRow.className = "studio-asset-url-row";
    const urlInput = document.createElement("input");
    urlInput.type = "url";
    urlInput.placeholder = "https://example.com";
    const urlLabelInput = document.createElement("input");
    urlLabelInput.type = "text";
    urlLabelInput.placeholder = "表示名";
    const urlButton = createButton("URLを追加", "secondary");
    urlRow.append(urlInput, urlLabelInput, urlButton);
    const list = document.createElement("div");
    list.className = "studio-asset-list";
    element.append(title, drop, helper, urlRow, list);
    let assignHandler = () => {};
    let addUrlHandler = () => {};

    return {
        element,
        render(library, selectedBlock){
            helper.textContent = selectedBlock
                ? `${selectedBlock.label}に設定できます。画像は画像へ、音声はBGMへ、URLはリンクへ入ります。`
                : "左で置いたものを選ぶと、素材を入れる場所が分かります。";
            const nodes = library.assets.map(asset => {
                const item = document.createElement("article");
                item.className = "studio-asset-item";
                const text = document.createElement("p");
                text.textContent = `${asset.name} / ${ASSET_TYPE_LABELS[asset.type] || asset.type} / ${asset.type === "url" ? asset.href : formatBytes(asset.size)}`;
                const button = createButton(toAssetAssignLabel(asset, selectedBlock), "secondary");
                button.addEventListener("click", () => assignHandler(asset));
                item.append(text, button);
                return item;
            });
            list.replaceChildren(...nodes);
        },
        onDrop(handler){
            drop.addEventListener("dragover", event => {
                event.preventDefault();
            });
            drop.addEventListener("drop", event => {
                event.preventDefault();
                handler(event.dataTransfer.files || []);
            });
        },
        onAddUrl(handler){
            addUrlHandler = handler;
            urlButton.addEventListener("click", () => {
                const href = urlInput.value.trim();
                const label = urlLabelInput.value.trim();
                addUrlHandler(href, label);
                urlInput.value = "";
                urlLabelInput.value = "";
            });
        },
        onAssign(handler){
            assignHandler = handler;
        }
    };
}

function createPageSettingsPanel(){
    const element = document.createElement("section");
    element.className = "studio-page-settings";
    const title = document.createElement("h3");
    title.textContent = "ページ設定";
    const body = document.createElement("div");
    body.className = "studio-page-settings-body";
    element.append(title, body);
    let changeHandler = () => {};

    return {
        element,
        render(pageModel, library){
            const settings = pageModel.settings?.bgm || {};
            const audioAssets = (library.assets || []).filter(asset => asset.type === "audio");
            const enabled = createCheckboxControl("BGMを使う", Boolean(settings.enabled), value => changeHandler("enabled", value));
            const select = createSimpleSelect({
                label: "BGM素材",
                value: settings.assetId || "",
                options: [
                    ["", "音声素材を選ぶ"],
                    ...audioAssets.map(asset => [asset.id, asset.name])
                ],
                onChange: value => changeHandler("assetId", value)
            });
            const volume = createRangeControl("音量", Number(settings.volume ?? 0.6), 0, 1, 0.05, value => changeHandler("volume", value));
            const loop = createCheckboxControl("ループ", settings.loop !== false, value => changeHandler("loop", value));
            const control = createCheckboxControl("再生ボタンを表示", settings.showControl !== false, value => changeHandler("showControl", value));
            body.replaceChildren(enabled, select, volume, loop, control);
        },
        onChange(handler){
            changeHandler = handler;
        }
    };
}

function createCheckboxControl(labelText, checked, onChange){
    const label = document.createElement("label");
    label.className = "studio-editor-checkbox";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(checked);
    const text = document.createElement("span");
    text.textContent = labelText;
    input.addEventListener("change", () => onChange(input.checked));
    label.append(input, text);
    return label;
}

function createSimpleSelect({
    label,
    value,
    options,
    onChange
}){
    const field = document.createElement("label");
    field.className = "studio-editor-field";
    const text = document.createElement("span");
    text.textContent = label;
    const select = document.createElement("select");
    options.forEach(([optionValue, optionLabel]) => {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionLabel;
        select.appendChild(option);
    });
    select.value = String(value ?? "");
    select.addEventListener("change", () => onChange(select.value));
    field.append(text, select);
    return field;
}

function createRangeControl(labelText, value, min, max, step, onChange){
    const field = document.createElement("label");
    field.className = "studio-editor-field";
    const text = document.createElement("span");
    text.textContent = `${labelText}: ${Math.round(Number(value || 0) * 100)}%`;
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    input.addEventListener("input", () => {
        text.textContent = `${labelText}: ${Math.round(Number(input.value || 0) * 100)}%`;
        onChange(Number(input.value));
    });
    field.append(text, input);
    return field;
}

function getAssetTargetField(asset, block){
    if(!asset || !block){
        return "";
    }

    if(asset.type === "audio"){
        return "audioAssetId";
    }

    if(asset.type === "url"){
        return "link";
    }

    if(["image", "svg"].includes(asset.type)){
        return "imageAssetId";
    }

    if(["video", "pdf"].includes(asset.type)){
        return "link";
    }

    return "";
}

function toAssetAssignLabel(asset, selectedBlock){
    const field = getAssetTargetField(asset, selectedBlock);

    if(field === "audioAssetId"){
        return "BGMへ設定";
    }

    if(field === "imageAssetId"){
        return "画像へ設定";
    }

    if(field === "link"){
        return "リンクへ設定";
    }

    return "選んだ場所へ設定";
}

function createNavigationEditorPanel(){
    return createBuilderItemPanel({
        className: "studio-navigation-editor",
        title: "ナビゲーション",
        addLabel: "",
        canAdd: false
    });
}

function createFooterEditorPanel(){
    return createBuilderItemPanel({
        className: "studio-footer-editor",
        title: "フッター",
        addLabel: "項目を追加",
        canAdd: true
    });
}

function createBuilderItemPanel({
    className,
    title,
    addLabel,
    canAdd
}){
    const element = document.createElement("section");
    element.className = className;
    const heading = document.createElement("h3");
    heading.textContent = title;
    const list = document.createElement("div");
    list.className = "studio-builder-item-list";
    const addRow = document.createElement("div");
    addRow.className = "studio-builder-add-row";
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "表示名";
    const addButton = createButton(addLabel || "追加", "secondary");
    if(canAdd){
        addRow.append(input, addButton);
        element.append(heading, list, addRow);
    }else{
        element.append(heading, list);
    }

    let currentItems = [];
    let changeHandler = () => {};

    function emit(nextItems){
        currentItems = normalizeBuilderItems(nextItems, currentItems);
        changeHandler(currentItems);
    }

    addButton.addEventListener("click", () => {
        const label = input.value.trim();
        if(!label){
            return;
        }
        input.value = "";
        emit([...currentItems, {
            id: `${className}-${Date.now()}`,
            label,
            visible: true,
            order: (currentItems.length + 1) * 10
        }]);
    });
    list.addEventListener("dragstart", event => {
        const row = event.target.closest("[data-item-id]");
        if(row){
            event.dataTransfer.setData("text/plain", row.dataset.itemId);
        }
    });
    list.addEventListener("dragover", event => {
        if(event.target.closest("[data-item-id]")){
            event.preventDefault();
        }
    });
    list.addEventListener("drop", event => {
        const target = event.target.closest("[data-item-id]");
        const sourceId = event.dataTransfer.getData("text/plain");
        if(!target || !sourceId || sourceId === target.dataset.itemId){
            return;
        }
        event.preventDefault();
        emit(moveBuilderItemToTarget(currentItems, sourceId, target.dataset.itemId));
    });

    return {
        element,
        render(items){
            currentItems = normalizeBuilderItems(items, currentItems);
            list.replaceChildren(...currentItems.map(item => createBuilderItemRow(item, currentItems, emit, canAdd)));
        },
        onChange(handler){
            changeHandler = handler;
        }
    };
}

function createBuilderItemRow(item, items, emit, canRemove){
    const row = document.createElement("article");
    row.className = "studio-builder-item";
    row.draggable = true;
    row.dataset.itemId = item.id;
    const label = document.createElement("strong");
    label.textContent = item.label;
    const controls = document.createElement("div");
    const up = createButton("↑", "secondary");
    const down = createButton("↓", "secondary");
    const visible = createButton(item.visible ? "表示" : "非表示", "secondary");
    controls.append(up, down, visible);
    if(canRemove){
        const remove = createButton("削除", "secondary");
        remove.addEventListener("click", () => emit(items.filter(candidate => candidate.id !== item.id)));
        controls.appendChild(remove);
    }
    up.addEventListener("click", () => emit(moveBuilderItem(items, item.id, -1)));
    down.addEventListener("click", () => emit(moveBuilderItem(items, item.id, 1)));
    visible.addEventListener("click", () => emit(items.map(candidate => (
        candidate.id === item.id
            ? {
                ...candidate,
                visible: !candidate.visible
            }
            : candidate
    ))));
    row.append(label, controls);
    return row;
}

function createThemePresetPanel(){
    const element = document.createElement("section");
    element.className = "studio-theme-preset-panel";
    const title = document.createElement("h3");
    title.textContent = "テーマ";
    const list = document.createElement("div");
    list.className = "studio-theme-preset-list";
    const buttons = THEME_PRESETS.map(preset => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.presetId = preset.id;
        button.textContent = preset.label;
        list.appendChild(button);
        return button;
    });
    element.append(title, list);
    let selectHandler = () => {};

    return {
        element,
        render(theme){
            const tokens = normalizeTheme(theme).tokens;
            buttons.forEach(button => {
                const preset = THEME_PRESETS.find(item => item.id === button.dataset.presetId);
                const current = preset && preset.tokens.primary === tokens.primary && preset.tokens.surface === tokens.surface;
                button.setAttribute("aria-current", current ? "true" : "false");
            });
        },
        onSelect(handler){
            selectHandler = handler;
            buttons.forEach(button => {
                button.addEventListener("click", () => {
                    const preset = THEME_PRESETS.find(item => item.id === button.dataset.presetId);
                    if(preset){
                        selectHandler(preset);
                    }
                });
            });
        }
    };
}

function createPublishChecklistPanel(){
    const element = document.createElement("section");
    element.className = "studio-publish-checklist";
    const title = document.createElement("h3");
    title.textContent = "公開前チェック";
    const list = document.createElement("div");
    element.append(title, list);

    return {
        element,
        render(pageModel){
            const components = pageModelToComponentModel(pageModel).components;
            const hero = components.find(component => component.type === "Hero");
            const footer = components.find(component => component.type === "Footer");
            const bgm = pageModel.settings?.bgm || {};
            const checks = [
                ["タイトル", Boolean(hero?.props?.title)],
                ["Hero", Boolean(hero)],
                ["Hero画像", !hero || Boolean(hero.props?.imageAssetId || hero.props?.background)],
                ["リンク", components.every(component => !["Button", "Link"].includes(component.props?.displayMode) || Boolean(component.props?.link))],
                ["Footer", Boolean(footer)],
                ["Contact", components.some(component => /contact|cta/i.test(component.type))],
                ["BGM", !bgm.enabled || Boolean(bgm.assetId)],
                ["Theme", Boolean(pageModel.theme)]
            ];
            list.replaceChildren(...checks.map(([label, done]) => {
                const row = document.createElement("label");
                const input = document.createElement("input");
                input.type = "checkbox";
                input.checked = done;
                input.disabled = true;
                const text = document.createElement("span");
                text.textContent = label;
                row.append(input, text);
                return row;
            }), createButton("公開する", "primary"));
        }
    };
}

function createHistoryPanel(){
    const element = document.createElement("section");
    element.className = "studio-history-panel";
    const title = document.createElement("h3");
    title.textContent = "履歴";
    const list = document.createElement("div");
    list.className = "studio-history-list";
    element.append(title, list);

    return {
        element,
        render(entries){
            const nodes = entries.slice(0, 6).map(entry => {
                const item = document.createElement("p");
                const time = new Date(entry.time);
                const label = Number.isNaN(time.getTime())
                    ? "--:--"
                    : `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`;
                item.textContent = `${label} ${entry.label}`;
                return item;
            });
            list.replaceChildren(...nodes);
        }
    };
}

function createDiagnosticsPanel(){
    const element = document.createElement("section");
    element.className = "studio-diagnostics-panel";
    const title = document.createElement("h3");
    title.textContent = "状態";
    const list = document.createElement("div");
    list.className = "studio-diagnostics-list";
    element.append(title, list);

    return {
        element,
        render(items){
            const nodes = items.map(item => {
                const row = document.createElement("p");
                row.dataset.tone = item.tone;
                row.textContent = `${toDiagnosticMark(item.tone)} ${item.label}`;
                return row;
            });
            list.replaceChildren(...nodes);
        }
    };
}

function createInputElement(field, value){
    if(field.type === "textarea"){
        const textarea = document.createElement("textarea");
        textarea.value = String(value ?? "");
        return textarea;
    }

    if(field.type === "select"){
        const select = document.createElement("select");
        (field.options || []).forEach(optionValue => {
            const option = document.createElement("option");
            option.value = optionValue;
            option.textContent = optionValue;
            select.appendChild(option);
        });
        select.value = String(value ?? field.defaultValue ?? field.options?.[0] ?? "");
        return select;
    }

    const input = document.createElement("input");
    input.type = field.type;

    if(field.type === "checkbox"){
        input.checked = Boolean(value);
        return input;
    }

    if(field.type === "range"){
        input.min = "0";
        input.max = field.id === "volume" ? "1" : "32";
        input.step = field.id === "volume" ? "0.05" : "1";
    }

    input.value = String(value ?? field.defaultValue ?? "");
    return input;
}

function renderEnginePreview({
    documentRef,
    container,
    model,
    source,
    selectedBlockId = ""
}){
    const selectedBlock = model.blocks?.find(block => block.id === selectedBlockId) || null;
    const previewSelectedBlockId = source === "home-editor"
        ? toHomePreviewSectionId(selectedBlock, selectedBlockId)
        : selectedBlockId;
    const componentModel = {
        ...pageModelToComponentModel(model),
        theme: themeToPreviewTokens(model.theme || createDefaultTheme()),
        selectedBlockId: previewSelectedBlockId
    };
    const renderModel = source === "home-editor"
        ? {
            ...publicHomeConfigToComponentModel(generateHomeArtifacts(model).publicHome),
            theme: componentModel.theme,
            settings: componentModel.settings,
            assets: componentModel.assets,
            selectedBlockId: previewSelectedBlockId
        }
        : componentModel;

    renderComponentModelPreview(documentRef, container, renderModel);
}

function toHomePreviewSectionId(block, fallbackId){
    if(!block){
        return fallbackId;
    }

    if(["hero", "featured-projects", "featured-tools", "notes", "creators"].includes(block.id)){
        return block.id;
    }

    if(block.type === "hero"){
        return "hero";
    }

    if(block.type === "card-grid" || block.type === "featured"){
        return "featured-projects";
    }

    return fallbackId;
}

function generateArtifactsForModel(source, model){
    if(source === "home-editor"){
        return generateHomeArtifacts(model);
    }

    return {
        schemaVersion: 1,
        generator: "relmua-block-generator",
        generatorVersion: 1,
        outputs: {},
        pageModel: model,
        componentModel: pageModelToComponentModel(model)
    };
}

function validateArtifactsForModel(source, artifacts){
    if(source === "home-editor"){
        return validateGeneratedHomeArtifacts(artifacts);
    }

    return [];
}

function getPreviewLabelForArtifacts(artifacts){
    return artifacts?.publicHome
        ? "Generated public-home.json"
        : "Live Preview";
}

function updateSelectedBlockProp(pageModel, blockId, componentId, fieldId, value){
    return createPageModel({
        ...pageModel,
        blocks: pageModel.blocks.map(block => {
            if(block.id !== blockId){
                return block;
            }

            return {
                ...block,
                components: block.components.map(component => {
                    if(component.id !== componentId){
                        return component;
                    }

                    return {
                        ...component,
                        props: {
                            ...component.props,
                            [fieldId]: value
                        }
                    };
                })
            };
        })
    });
}

function moveBlockToTarget(pageModel, sourceBlockId, targetBlockId){
    const model = normalizePageModel(pageModel);
    const sourceIndex = model.blocks.findIndex(block => block.id === sourceBlockId);
    const targetIndex = model.blocks.findIndex(block => block.id === targetBlockId);

    if(sourceIndex < 0 || targetIndex < 0){
        return model;
    }

    const blocks = [...model.blocks];
    const [block] = blocks.splice(sourceIndex, 1);
    blocks.splice(targetIndex, 0, block);

    return createPageModel({
        ...model,
        blocks: blocks.map((item, index) => ({
            ...item,
            order: (index + 1) * 10
        }))
    });
}

function getSelectedBlock(pageModel, blockId){
    return pageModel.blocks.find(block => block.id === blockId) || pageModel.blocks[0] || null;
}

function getBlockByType(pageModel, type){
    return pageModel.blocks.find(block => block.type === type) || null;
}

function getSelectedComponent(block, componentId){
    return block?.components?.find(component => component.id === componentId) || block?.components?.[0] || null;
}

function getMainProps(block){
    const component = block?.components?.find(item => item.id.endsWith(":main")) || block?.components?.[0] || null;
    return component?.props || {};
}

function readInputValue(input){
    return input.type === "checkbox"
        ? input.checked
        : input.value;
}

function loadDraft(key){
    try{
        return JSON.parse(localStorage.getItem(key) || "null");
    }catch{
        return null;
    }
}

function createEditorShell(title){
    const element = document.createElement("div");
    element.className = "studio-hosted-editor";

    const heading = document.createElement("h3");
    heading.textContent = title;

    const body = document.createElement("div");
    body.className = "studio-hosted-editor-body";

    element.append(heading, body);

    return {
        element,
        body
    };
}

function createActionRow(){
    const actions = document.createElement("div");
    actions.className = "studio-native-editor-actions";
    return actions;
}

function createStatusMessage(){
    const message = document.createElement("p");
    message.className = "studio-editor-inline-status";
    message.setAttribute("aria-live", "polite");
    return message;
}

function createButton(text, tone){
    const button = document.createElement("button");
    button.type = "button";
    button.className = tone === "primary"
        ? "studio-button-primary"
        : "studio-button-secondary";
    button.textContent = text;
    return button;
}

function createPreview(title, previewUrl){
    return {
        ok: true,
        title,
        previewUrl
    };
}

function createEditorState({
    source,
    previewLabel
}){
    return {
        source,
        unsaved: false,
        saved: false,
        publicExported: false,
        error: "",
        preview: createPreview(previewLabel, previewLabel)
    };
}

function notify(state, onStateChange, nextState){
    Object.assign(state, nextState);
    onStateChange({
        ...state
    });
}

function createMountHandle(rootElement, state, kind){
    return {
        kind,
        getState(){
            return {
                ...state
            };
        },
        unmount(){
            rootElement.replaceChildren();
        }
    };
}

function saveDraft(key, value){
    try{
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    }catch{
        return false;
    }
}

function toTitle(value){
    return `${String(value).charAt(0).toUpperCase()}${String(value).slice(1)}`;
}

function toDiagnosticMark(tone){
    if(tone === "success"){
        return "OK";
    }

    if(tone === "warning"){
        return "!";
    }

    return "-";
}

function formatBytes(size){
    const value = Number(size || 0);
    if(value < 1024){
        return `${value} B`;
    }

    return `${Math.round(value / 1024)} KB`;
}

function normalizeBuilderItems(value, fallback){
    const source = Array.isArray(value) && value.length ? value : fallback;

    return source.map((item, index) => ({
        id: String(item.id || `item-${index}`),
        label: String(item.label || ""),
        visible: item.visible !== false,
        order: Number.isFinite(Number(item.order)) ? Number(item.order) : (index + 1) * 10
    })).sort((a, b) => a.order - b.order);
}

function moveBuilderItem(items, id, direction){
    const next = [...items];
    const index = next.findIndex(item => item.id === id);
    const target = index + direction;

    if(index < 0 || target < 0 || target >= next.length){
        return next;
    }

    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    return next.map((candidate, nextIndex) => ({
        ...candidate,
        order: (nextIndex + 1) * 10
    }));
}

function moveBuilderItemToTarget(items, sourceId, targetId){
    const next = [...items];
    const sourceIndex = next.findIndex(item => item.id === sourceId);
    const targetIndex = next.findIndex(item => item.id === targetId);

    if(sourceIndex < 0 || targetIndex < 0){
        return next;
    }

    const [item] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, item);
    return next.map((candidate, index) => ({
        ...candidate,
        order: (index + 1) * 10
    }));
}

function createThemePreset(id, label, tokens){
    return Object.freeze({
        id,
        label,
        tokens: Object.freeze(tokens)
    });
}

function requireRoot(rootElement, caller){
    if(!rootElement){
        throw new TypeError(`${caller} requires rootElement.`);
    }
}
