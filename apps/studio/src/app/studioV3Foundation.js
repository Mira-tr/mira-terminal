const CONTENT_AREAS = Object.freeze([
    createArea("home", "Home", "はじめてならここ。タイトル、画像、ボタンを変えます。", "home", "最初に押す"),
    createArea("projects", "Projects", "作品の見せ方を整えます。", "project"),
    createArea("tools", "Tools", "公開する道具を管理します。", "tool"),
    createArea("notes", "Notes", "制作記録を追加、編集します。", "note"),
    createArea("creators", "Creators", "活動者のプロフィールとリンクを整えます。", "creator")
]);

const COLLECTION_AREAS = Object.freeze([
    createArea("trpg", "TRPG", "一覧、追加、編集を同じ流れで行います。", "trpg", "導入済み"),
    createArea("game", "Game", "追加できるCollectionです。", "project", "追加"),
    createArea("tool", "Tool", "追加できるCollectionです。", "tool", "追加"),
    createArea("gallery", "Gallery", "追加できるCollectionです。", "project", "追加"),
    createArea("music", "Music", "追加できるCollectionです。", "note", "追加"),
    createArea("video", "Video", "追加できるCollectionです。", "note", "追加"),
    createArea("custom", "Custom", "自由なCollectionを追加できます。", "note", "追加")
]);

const DESIGN_AREAS = Object.freeze([
    ["ブランドカラー", "色の印象を決めます。"],
    ["フォント", "文字の雰囲気を整えます。"],
    ["角丸", "やわらかさを調整します。"],
    ["余白", "読みやすさを整えます。"],
    ["アニメーション", "動きの強さを調整します。"],
    ["ボタン", "押せる場所の見た目を整えます。"],
    ["カード", "一覧の見せ方を整えます。"],
    ["ヘッダー", "サイト上部を整えます。"],
    ["フッター", "サイト下部を整えます。"]
]);

export function renderStudioV3Foundation({
    contentElement,
    designElement,
    publicElement,
    migrationElement,
    openEditor
} = {}){
    if(contentElement){
        renderContentWorkspace(contentElement, openEditor);
    }

    if(designElement){
        renderDesignWorkspace(designElement, openEditor);
    }

    if(publicElement){
        renderPreviewWorkspace(publicElement);
    }

    if(migrationElement){
        renderCollectionWorkspace(migrationElement, openEditor);
    }
}

function renderContentWorkspace(container, openEditor){
    const firstGuide = document.createElement("article");
    firstGuide.className = "studio-v3-card is-wide studio-first-guide";
    const firstTitle = document.createElement("h3");
    firstTitle.textContent = "まずはHomeを変えてみる";
    const firstText = document.createElement("p");
    firstText.textContent = "1. Homeを開く、2. Heroのタイトルを書く、3. 見え方を見る。この順番だけで最初の編集ができます。";
    const firstButton = createOpenButton("home", "Homeを編集する", openEditor);
    firstGuide.append(firstTitle, firstText, firstButton);

    const collections = document.createElement("article");
    collections.className = "studio-v3-card is-wide";
    const title = document.createElement("h3");
    title.textContent = "Collections";
    const description = document.createElement("p");
    description.textContent = "TRPG、Game、Tool、Gallery、Music、Videoを同じ流れで管理します。";
    const list = document.createElement("div");
    list.className = "studio-collection-list";
    list.append(...COLLECTION_AREAS.map(item => createCollectionItem(item, openEditor)));
    collections.append(title, description, list);

    const creator = document.createElement("article");
    creator.className = "studio-v3-card is-wide";
    const creatorTitle = document.createElement("h3");
    creatorTitle.textContent = "活動者";
    const creatorText = document.createElement("p");
    creatorText.textContent = "千景のプロフィール、作品、TRPG、リンクをここから整えます。将来は活動者を追加できます。";
    const creatorButton = createOpenButton("creator", "千景を編集する", openEditor);
    creator.append(creatorTitle, creatorText, creatorButton);

    container.replaceChildren(
        firstGuide,
        ...CONTENT_AREAS.map(item => createEditorCard(item, openEditor)),
        collections,
        creator
    );
}

function renderDesignWorkspace(container, openEditor){
    const intro = document.createElement("article");
    intro.className = "studio-v3-card is-wide";

    const heading = document.createElement("h3");
    heading.textContent = "デザインを編集";
    const text = document.createElement("p");
    text.textContent = "専門用語を使わず、見た目をGUIだけで調整します。";
    const button = createOpenButton("design", "デザインを開く", openEditor);
    intro.append(heading, text, button);

    const tokenList = document.createElement("div");
    tokenList.className = "studio-design-token-list";
    tokenList.append(...DESIGN_AREAS.map(([label, note]) => {
        const item = document.createElement("span");
        item.className = "studio-design-token";
        item.textContent = `${label} / ${note}`;
        return item;
    }));

    container.replaceChildren(intro, tokenList);
}

function renderPreviewWorkspace(container){
    container.replaceChildren();
}

function renderCollectionWorkspace(container, openEditor){
    const list = document.createElement("div");
    list.className = "studio-collection-list";
    list.append(...COLLECTION_AREAS.map(item => createCollectionItem(item, openEditor)));
    container.replaceChildren(list);
}

function createEditorCard(item, openEditor){
    const card = document.createElement("article");
    card.className = item.status ? "studio-v3-card has-status" : "studio-v3-card";

    const title = document.createElement("h3");
    title.textContent = item.title;
    const description = document.createElement("p");
    description.textContent = item.description;
    const actions = document.createElement("div");
    actions.className = "studio-card-actions";
    const editButton = createOpenButton(item.editor, item.id === "home" ? "Homeを編集する" : "編集する", openEditor);
    const addButton = createOpenButton(item.editor, "＋追加する", openEditor);

    if(item.status){
        const status = document.createElement("span");
        status.className = "studio-collection-status";
        status.textContent = item.status;
        card.appendChild(status);
    }

    actions.append(editButton, addButton);
    card.append(title, description, actions);
    return card;
}

function createCollectionItem(item, openEditor){
    const card = document.createElement("article");
    card.className = "studio-v3-card";
    const title = document.createElement("h3");
    title.textContent = item.title;
    const description = document.createElement("p");
    description.textContent = item.description;
    const status = document.createElement("span");
    status.className = "studio-collection-status";
    status.textContent = item.status;
    const actions = document.createElement("div");
    actions.className = "studio-card-actions";
    const listButton = createOpenButton(item.editor, item.status === "導入済み" ? "一覧を開く" : "準備を見る", openEditor);
    const addButton = createOpenButton(item.editor, "＋追加する", openEditor);
    actions.append(listButton, addButton);
    card.append(status, title, description, actions);
    return card;
}

function createOpenButton(editor, label, openEditor){
    const button = document.createElement("button");
    button.type = "button";
    button.className = "studio-button-secondary";
    button.dataset.studioEditor = editor;
    button.textContent = label;
    button.addEventListener("click", () => openEditor?.(editor));
    return button;
}

function createArea(id, title, description, editor, status = ""){
    return Object.freeze({
        id,
        title,
        description,
        editor,
        status
    });
}
