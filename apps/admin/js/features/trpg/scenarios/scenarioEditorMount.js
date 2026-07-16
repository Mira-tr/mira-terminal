import {
    TAG_KEY,
    load
} from "../../../store.js";

import {
    initAuthorSuggest,
    saveAuthor
} from "../authors.js";

import {
    initTags
} from "../tags.js";

import {
    createDefaultScenarioEditorController
} from "./scenarioDraftAdapter.js";

import {
    collectScenarioEditorData,
    mountScenarioEditorView,
    resetScenarioEditorFields
} from "./scenarioEditorView.js";

import {
    initScenarioStorage
} from "./scenarioStorage.js";

const DEFAULT_MODE = "standard";

export function mountScenarioEditor({
    rootElement,
    context = {},
    controller = createDefaultScenarioEditorController(context),
    mode = DEFAULT_MODE,
    onStateChange = () => {},
    onNavigate = () => {}
} = {}){
    if(!rootElement){
        throw new TypeError("mountScenarioEditor requires rootElement.");
    }

    const state = {
        draftId: createDraftId(),
        unsaved: false,
        saved: false,
        preview: controller.previewDraft(),
        publicExported: false,
        error: "",
        mode
    };

    const editorRoot = document.createElement("div");
    const status = document.createElement("p");
    status.className = "studio-native-editor-status";
    status.setAttribute("aria-live", "polite");

    const actions = createStudioActions();
    const previewPanel = createPreviewPanel();
    const cleanup = [];

    rootElement.replaceChildren(editorRoot, status, actions.element, previewPanel.element);

    const editorView = mountScenarioEditorView({
        rootElement: editorRoot,
        surface: "studio",
        mode
    });

    initEditorDependencies();

    const notify = nextState => {
        Object.assign(state, nextState);
        renderStatus(status, state);
        renderPreview(previewPanel, state.preview);
        onStateChange({
            ...state,
            source: "scenario-editor"
        });
    };

    const createCurrentDraft = () => {
        const existing = state.saved
            ? controller.loadDrafts().find(item=>item.id === state.draftId)
            : null;

        return collectScenarioEditorData({
            editingId: state.draftId,
            existingScenario: existing,
            ownerCreatorId: context.ownerCreatorId
        });
    };

    const markUnsaved = () => {
        const draft = createCurrentDraft();
        notify({
            unsaved: true,
            saved: false,
            error: "",
            preview: controller.previewDraft(draft)
        });
    };

    editorView.form.addEventListener("input", markUnsaved);
    editorView.form.addEventListener("change", markUnsaved);
    cleanup.push(() => {
        editorView.form.removeEventListener("input", markUnsaved);
        editorView.form.removeEventListener("change", markUnsaved);
    });

    const save = () => {
        const draft = createCurrentDraft();
        const result = controller.saveDraft(draft, {
            editingId: state.saved ? state.draftId : ""
        });

        if(!result.ok){
            notify({
                unsaved: true,
                saved: false,
                error: result.errors?.[0]?.message || "保存できませんでした。",
                preview: controller.previewDraft(draft)
            });
            return false;
        }

        saveAuthor(draft.author);

        notify({
            unsaved: false,
            saved: true,
            error: "",
            preview: result.preview,
            publicExported: false
        });
        return true;
    };

    const saveAndClear = () => {
        const saved = save();

        if(saved){
            state.draftId = createDraftId();
            resetScenarioEditorFields();
        }
    };

    const exportPublic = () => {
        try{
            controller.exportPublicData();
            notify({
                publicExported: true,
                error: ""
            });
        }catch(error){
            notify({
                error: error?.message || "公開用データを作れませんでした。"
            });
        }
    };

    const openPreview = () => {
        const preview = state.preview?.ok
            ? state.preview
            : controller.previewDraft(createCurrentDraft());
        notify({
            preview
        });
        onNavigate({
            type: "preview",
            preview
        });
    };

    const saveButton = editorView.form.querySelector("#saveBtn");
    const copyButton = editorView.form.querySelector("#copyBtn");

    saveButton.addEventListener("click", save);
    copyButton.addEventListener("click", saveAndClear);
    actions.previewButton.addEventListener("click", openPreview);
    actions.exportButton.addEventListener("click", exportPublic);

    cleanup.push(() => {
        saveButton.removeEventListener("click", save);
        copyButton.removeEventListener("click", saveAndClear);
        actions.previewButton.removeEventListener("click", openPreview);
        actions.exportButton.removeEventListener("click", exportPublic);
    });

    notify({
        error: "",
        preview: state.preview
    });

    return {
        kind: "ScenarioEditorMount",
        controller,
        editorView,
        getState(){
            return { ...state };
        },
        unmount(){
            cleanup.forEach(dispose => dispose());
            editorView.unmount();
            rootElement.replaceChildren();
        }
    };
}

function initEditorDependencies(){
    initTags(
        load(
            TAG_KEY,
            []
        )
    );
    initAuthorSuggest(
        "author",
        "authorSuggest"
    );
    initScenarioStorage(
        "storageLocationOptions"
    );
}

function createStudioActions(){
    const element = document.createElement("div");
    element.className = "studio-native-editor-actions";

    const previewButton = createButton("表示を確認する", "secondary");
    const exportButton = createButton("公開用データを作る", "secondary");

    element.append(previewButton, exportButton);

    return {
        element,
        previewButton,
        exportButton
    };
}

function createPreviewPanel(){
    const element = document.createElement("section");
    element.className = "studio-native-preview-panel";
    element.setAttribute("aria-labelledby", "studioNativePreviewTitle");

    const title = document.createElement("h3");
    title.id = "studioNativePreviewTitle";
    title.textContent = "下書きの表示確認";

    const body = document.createElement("div");
    body.className = "studio-native-preview-body";

    element.append(title, body);

    return {
        element,
        body
    };
}

function renderStatus(element, state){
    const messages = [];

    if(state.error){
        messages.push(`確認してください: ${state.error}`);
    }else if(state.saved){
        messages.push("保存しました。次はPreviewで公開時の見え方を確認してください。");
    }else if(state.unsaved){
        messages.push("未保存の入力があります。保存するとPreviewで確認できます。");
    }else{
        messages.push("内容を入力して保存してください。保存先はStudioが自動で扱います。");
    }

    messages.push("状態: 保存済み / Public未反映 / Preview可能 / 公開用データ作成が必要");

    if(state.publicExported){
        messages.push("公開用データを作りました。次は公開サイトを組み立ててください。");
    }

    element.textContent = messages.join(" ");
}

function renderPreview(panel, preview){
    const body = panel.body;

    if(!preview){
        body.replaceChildren(createText("保存すると下書きの確認ができます。"));
        return;
    }

    if(!preview.ok){
        const message = preview.errors?.[0]?.message || "表示を確認できません。";
        body.replaceChildren(createText(message));
        return;
    }

    const fragment = document.createDocumentFragment();

    fragment.appendChild(
        createText(preview.source || "これは下書きデータのPreviewです。公開サイトへ反映するには公開用データを作る必要があります。")
    );

    if(preview.title){
        const title = document.createElement("strong");
        title.textContent = preview.title || "無題のシナリオ";
        fragment.appendChild(title);
    }

    if(preview.previewUrl){
        const url = document.createElement("p");
        url.textContent = `確認先: ${preview.previewUrl}`;
        fragment.appendChild(url);
    }

    body.replaceChildren(fragment);
}

function createText(text){
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    return paragraph;
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

function createDraftId(){
    return crypto.randomUUID();
}
