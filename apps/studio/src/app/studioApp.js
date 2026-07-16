import {
    getStudioPublicJsonModules,
    validatePublicJsonRegistry
} from "../shared/studioPublicJsonRegistry.js";

import {
    createProjectStatus
} from "../shared/studioProjectRoot.js";

import {
    createCollectionEditorRoute,
    getActiveCollectionTypes,
    getAvailableCollectionOwners,
    getCollectionStorageMapping,
    resolveCollectionOwner,
    resolveCollectionType
} from "../../../admin/js/features/collections/collectionRegistry.js";

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

renderStudio();

function renderStudio(){
    renderProjectStatus();
    renderJsonModules();
    initAddWizard();
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
    const openButton = document.getElementById("openAddWizard");
    const dialog = document.getElementById("addWizard");

    if(!openButton || !dialog || dialog.dataset.initialized === "true"){
        return;
    }

    dialog.dataset.initialized = "true";

    openButton.addEventListener("click", () => {
        wizardState.step = "content";
        wizardState.contentType = "";
        wizardState.collectionTypeId = "";
        wizardState.ownerCreatorId = "";
        wizardState.opener = document.activeElement;
        renderWizard();
        openDialog(dialog);
    });

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
