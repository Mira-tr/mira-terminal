import {
    getRules,
    getSystem,
    updateSystem,
    addSection,
    updateSection,
    deleteSection,
    moveSection
} from "./rulesStore.js";

let currentSystemId = "coc6";

export function initRulesForm(){
    bindEvents();
    loadSystem(currentSystemId);
}

function bindEvents(){
    document.getElementById("systemSelect")
        .addEventListener("change", handleSystemChange);

    document.getElementById("systemLabel")
        .addEventListener("input", handleSystemLabelChange);

    document.getElementById("systemDescription")
        .addEventListener("input", handleSystemDescriptionChange);

    document.getElementById("systemStatus")
        .addEventListener("change", handleSystemStatusChange);

    document.getElementById("addSectionBtn")
        .addEventListener("click", handleAddSection);

    document.getElementById("saveSystemBtn")
        .addEventListener("click", handleSaveSystem);
}

function handleSystemChange(event){
    currentSystemId = event.target.value;
    loadSystem(currentSystemId);
}

function handleSystemLabelChange(event){
    updateSystem(currentSystemId, {
        label: event.target.value
    });
}

function handleSystemDescriptionChange(event){
    updateSystem(currentSystemId, {
        description: event.target.value
    });
}

function handleSystemStatusChange(event){
    updateSystem(currentSystemId, {
        status: event.target.value
    });
}

function handleAddSection(){
    const sectionId = `section-${Date.now()}`;

    addSection(currentSystemId, {
        id: sectionId,
        title: "新しいセクション",
        body: ""
    });

    loadSystem(currentSystemId);
}

function handleSaveSection(sectionId){
    const titleInput = document.getElementById(`section-title-${sectionId}`);
    const bodyInput = document.getElementById(`section-body-${sectionId}`);
    const statusSelect = document.getElementById(`section-status-${sectionId}`);

    updateSection(currentSystemId, sectionId, {
        title: titleInput.value,
        body: bodyInput.value,
        status: statusSelect.value
    });
}

function handleDeleteSection(sectionId){
    if(!confirm("このセクションを削除しますか？")){
        return;
    }

    deleteSection(currentSystemId, sectionId);
    loadSystem(currentSystemId);
}

function handleMoveSection(sectionId, direction){
    moveSection(currentSystemId, sectionId, direction);
    loadSystem(currentSystemId);
}

function handleSaveSystem(){
    alert("システム情報を保存しました");
}

function loadSystem(systemId){
    const system = getSystem(systemId);

    if(!system){
        return;
    }

    const systemSelect = document.getElementById("systemSelect");
    const systemLabel = document.getElementById("systemLabel");
    const systemDescription = document.getElementById("systemDescription");
    const systemStatus = document.getElementById("systemStatus");
    const sectionsList = document.getElementById("sectionsList");

    systemSelect.value = systemId;
    systemLabel.value = system.label;
    systemDescription.value = system.description;
    systemStatus.value = system.status;

    renderSections(system.sections, sectionsList);
}

function renderSections(sections, container){
    container.replaceChildren();

    sections.sort((a, b) => a.order - b.order);

    sections.forEach(section => {
        const sectionItem = createSectionItem(section);
        container.appendChild(sectionItem);
    });
}

function createSectionItem(section){
    const item = document.createElement("div");
    item.className = "rules-section-item";

    const header = document.createElement("div");
    header.className = "rules-section-header";

    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.id = `section-title-${section.id}`;
    titleInput.className = "rules-section-title-input";
    titleInput.value = section.title;
    titleInput.placeholder = "タイトル";
    titleInput.addEventListener("input", () => handleSaveSection(section.id));

    const statusSelect = document.createElement("select");
    statusSelect.id = `section-status-${section.id}`;
    statusSelect.className = "rules-section-status-select";

    const draftOption = document.createElement("option");
    draftOption.value = "draft";
    draftOption.textContent = "Draft";

    const publicOption = document.createElement("option");
    publicOption.value = "public";
    publicOption.textContent = "Public";

    statusSelect.replaceChildren(draftOption, publicOption);
    statusSelect.value = section.status === "public"
        ? "public"
        : "draft";
    statusSelect.addEventListener("change", () => handleSaveSection(section.id));

    const actions = document.createElement("div");
    actions.className = "rules-section-actions";

    const upButton = document.createElement("button");
    upButton.type = "button";
    upButton.className = "button button-secondary";
    upButton.textContent = "↑";
    upButton.addEventListener("click", () => handleMoveSection(section.id, "up"));

    const downButton = document.createElement("button");
    downButton.type = "button";
    downButton.className = "button button-secondary";
    downButton.textContent = "↓";
    downButton.addEventListener("click", () => handleMoveSection(section.id, "down"));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "button button-secondary";
    deleteButton.textContent = "削除";
    deleteButton.addEventListener("click", () => handleDeleteSection(section.id));

    actions.appendChild(upButton);
    actions.appendChild(downButton);
    actions.appendChild(deleteButton);

    header.appendChild(titleInput);
    header.appendChild(statusSelect);
    header.appendChild(actions);

    const bodyTextarea = document.createElement("textarea");
    bodyTextarea.id = `section-body-${section.id}`;
    bodyTextarea.className = "rules-section-body-textarea";
    bodyTextarea.value = section.body;
    bodyTextarea.placeholder = "本文";
    bodyTextarea.addEventListener("input", () => handleSaveSection(section.id));

    item.appendChild(header);
    item.appendChild(bodyTextarea);

    return item;
}
