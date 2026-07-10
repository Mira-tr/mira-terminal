import {
    RULE_CATEGORY_OPTIONS,
    RULE_STATUSES,
    addSection,
    deleteSection,
    duplicateSection,
    getRules,
    getSystem,
    moveSection,
    saveRules,
    updateSection,
    updateSystem
} from "./rulesStore.js";

import {
    showToast
} from "../../common/toastService.js";

let currentSystemId = "coc6";
const expandedSectionIds = new Set();

export function initRulesForm(){
    renderCategoryOptions();
    bindEvents();
    renderSystemOptions();
    loadSystem(currentSystemId);
}

export function refreshRulesForm(){
    renderSystemOptions();
    loadSystem(currentSystemId);
}

function bindEvents(){
    getElement("systemSelect")
    .addEventListener("change", handleSystemChange);

    getElement("systemId")
    .addEventListener("change", handleSystemIdChange);

    getElement("systemLabel")
    .addEventListener("input", event => handleSystemFieldChange(
        "label",
        event.target.value
    ));

    getElement("systemTitle")
    .addEventListener("input", event => handleSystemFieldChange(
        "title",
        event.target.value
    ));

    getElement("systemVersion")
    .addEventListener("input", event => handleSystemFieldChange(
        "version",
        event.target.value
    ));

    getElement("systemDescription")
    .addEventListener("input", event => handleSystemFieldChange(
        "description",
        event.target.value
    ));

    getElement("systemStatus")
    .addEventListener("change", event => handleSystemFieldChange(
        "status",
        event.target.value
    ));

    getElement("addSectionBtn")
    .addEventListener("click", handleAddSection);

    getElement("saveSystemBtn")
    .addEventListener("click", handleSaveSystem);
}

function handleSystemChange(event){
    currentSystemId = event.target.value;
    expandedSectionIds.clear();
    loadSystem(currentSystemId);
}

function handleSystemIdChange(event){
    const nextId = updateSystem(currentSystemId, {
        id: event.target.value
    });

    if(nextId){
        currentSystemId = nextId;
        renderSystemOptions();
        loadSystem(currentSystemId);
    }
}

function handleSystemFieldChange(field, value){
    const nextId = updateSystem(currentSystemId, {
        [field]: value
    });

    if(nextId){
        currentSystemId = nextId;
    }
}

function handleAddSection(){
    const sectionId = addSection(currentSystemId, {
        title: "新しいセクション"
    });

    if(sectionId){
        expandedSectionIds.add(sectionId);
        loadSystem(currentSystemId);
    }
}

function handleDuplicateSection(sectionId){
    const duplicatedId = duplicateSection(currentSystemId, sectionId);

    if(duplicatedId){
        expandedSectionIds.add(duplicatedId);
        loadSystem(currentSystemId);
    }
}

function handleSaveSection(sectionId, options = {}){
    const orderInput = getElement(`section-order-${sectionId}`);
    const categoryInput = getElement(`section-category-${sectionId}`);
    const titleInput = getElement(`section-title-${sectionId}`);
    const bodyInput = getElement(`section-body-${sectionId}`);
    const statusSelect = getElement(`section-status-${sectionId}`);

    updateSection(currentSystemId, sectionId, {
        order: orderInput.value,
        category: categoryInput.value,
        title: titleInput.value,
        body: bodyInput.value,
        status: statusSelect.value
    });

    if(options.reload){
        expandedSectionIds.add(sectionId);
        loadSystem(currentSystemId);
    }else{
        updateSectionSummary(sectionId);
    }
}

function handleDeleteSection(sectionId){
    if(!confirm("このセクションを削除しますか？")){
        return;
    }

    if(!deleteSection(currentSystemId, sectionId)){
        showToast("削除に失敗しました", "error");
        return;
    }

    expandedSectionIds.delete(sectionId);
    loadSystem(currentSystemId);
    showToast("削除しました", "success");
}

function handleMoveSection(sectionId, direction){
    moveSection(currentSystemId, sectionId, direction);
    expandedSectionIds.add(sectionId);
    loadSystem(currentSystemId);
}

function handleSaveSystem(){
    if(!saveRules(getRules())){
        showToast("保存に失敗しました", "error");
        return;
    }

    renderSystemOptions();
    loadSystem(currentSystemId);
    showToast("保存しました", "success");
}

function renderSystemOptions(){
    const rules = getRules();
    const systemSelect = getElement("systemSelect");
    const fragment = document.createDocumentFragment();

    rules.systems.forEach(system => {
        const option = document.createElement("option");
        option.value = system.id;
        option.textContent = system.label || system.id;
        fragment.appendChild(option);
    });

    systemSelect.replaceChildren(fragment);

    if(!rules.systems.some(system => system.id === currentSystemId)){
        currentSystemId = rules.systems[0]?.id || "";
    }

    systemSelect.value = currentSystemId;
}

function loadSystem(systemId){
    const system = getSystem(systemId);

    if(!system){
        return;
    }

    getElement("systemSelect").value = systemId;
    getElement("systemId").value = system.id;
    getElement("systemLabel").value = system.label;
    getElement("systemTitle").value = system.title;
    getElement("systemVersion").value = system.version;
    getElement("systemDescription").value = system.description;
    getElement("systemStatus").value = system.status;

    renderSections(system.sections, getElement("sectionsList"));
}

function renderSections(sections, container){
    container.replaceChildren();

    if(sections.length === 0){
        const empty = document.createElement("p");
        empty.className = "rules-empty-message";
        empty.textContent = "セクションがありません。必要なルールを追加してください。";
        container.appendChild(empty);
        return;
    }

    sections
    .slice()
    .sort((a, b) => a.order - b.order)
    .forEach(section => {
        container.appendChild(createSectionItem(section));
    });
}

function createSectionItem(section){
    const item = document.createElement("details");
    item.className = "rules-section-item";
    item.dataset.sectionId = section.id;
    item.open = expandedSectionIds.has(section.id) || section.order === 1;

    item.addEventListener("toggle", () => {
        if(item.open){
            expandedSectionIds.add(section.id);
        }else{
            expandedSectionIds.delete(section.id);
        }
    });

    const summary = document.createElement("summary");
    summary.className = "rules-section-summary";
    const marker = document.createElement("span");
    marker.className = "rule-section-marker";
    marker.setAttribute("aria-hidden", "true");
    marker.textContent = "▶";
    summary.append(
        marker,
        createSectionSummaryMain(section),
        createStatusBadge(section.status)
    );

    const body = document.createElement("div");
    body.className = "rules-section-editor";
    body.append(
        createSectionMetaGrid(section),
        createBodyField(section),
        createSectionActions(section)
    );

    item.append(summary, body);
    return item;
}

function createSectionSummaryMain(section){
    const main = document.createElement("div");
    main.className = "rules-section-summary-main";

    const meta = document.createElement("span");
    meta.className = "rules-section-summary-meta";
    meta.textContent = createSectionMetaText(section);

    const title = document.createElement("strong");
    title.className = "rules-section-summary-title";
    title.textContent = section.title || "タイトル未設定";

    main.append(meta, title);
    return main;
}

function createSectionMetaGrid(section){
    const grid = document.createElement("div");
    grid.className = "rules-section-meta-grid";

    grid.append(
        createNumberField({
            id: `section-order-${section.id}`,
            label: "表示順",
            value: section.order,
            onChange: () => handleSaveSection(section.id, {
                reload: true
            })
        }),
        createTextField({
            id: `section-category-${section.id}`,
            label: "カテゴリ",
            value: section.category,
            placeholder: "基本",
            list: "rulesCategoryOptions",
            onInput: () => handleSaveSection(section.id)
        }),
        createTextField({
            id: `section-title-${section.id}`,
            label: "タイトル",
            value: section.title,
            placeholder: "卓の基本方針",
            onInput: () => handleSaveSection(section.id)
        }),
        createStatusField(section)
    );

    return grid;
}

function createBodyField(section){
    const field = document.createElement("label");
    field.className = "form-field rules-section-body-field";
    field.setAttribute("for", `section-body-${section.id}`);

    const label = document.createElement("span");
    label.textContent = "本文";

    const bodyTextarea = document.createElement("textarea");
    bodyTextarea.id = `section-body-${section.id}`;
    bodyTextarea.className = "rules-section-body-textarea";
    bodyTextarea.value = section.body;
    bodyTextarea.placeholder = "本文";
    bodyTextarea.addEventListener("input", () => handleSaveSection(section.id));

    field.append(label, bodyTextarea);
    return field;
}

function createSectionActions(section){
    const actions = document.createElement("div");
    actions.className = "rules-section-actions";

    actions.append(
        createActionButton("上へ", () => handleMoveSection(section.id, "up")),
        createActionButton("下へ", () => handleMoveSection(section.id, "down")),
        createActionButton("複製", () => handleDuplicateSection(section.id)),
        createActionButton("削除", () => handleDeleteSection(section.id))
    );

    return actions;
}

function createStatusField(section){
    const field = document.createElement("label");
    field.className = "form-field";
    field.setAttribute("for", `section-status-${section.id}`);

    const label = document.createElement("span");
    label.textContent = "公開状態";

    const select = document.createElement("select");
    select.id = `section-status-${section.id}`;
    select.className = "rules-section-status-select";

    select.replaceChildren(
        ...RULE_STATUSES.map(status => {
            const option = document.createElement("option");
            option.value = status;
            option.textContent = formatStatus(status);
            return option;
        })
    );
    select.value = section.status;
    select.addEventListener("change", () => handleSaveSection(section.id));

    field.append(label, select);
    return field;
}

function createTextField(options){
    const field = document.createElement("label");
    field.className = "form-field";
    field.setAttribute("for", options.id);

    const label = document.createElement("span");
    label.textContent = options.label;

    const input = document.createElement("input");
    input.id = options.id;
    input.type = "text";
    input.value = options.value || "";
    input.placeholder = options.placeholder || "";

    if(options.list){
        input.setAttribute("list", options.list);
    }

    input.addEventListener("input", options.onInput);

    field.append(label, input);
    return field;
}

function createNumberField(options){
    const field = document.createElement("label");
    field.className = "form-field";
    field.setAttribute("for", options.id);

    const label = document.createElement("span");
    label.textContent = options.label;

    const input = document.createElement("input");
    input.id = options.id;
    input.type = "number";
    input.min = "1";
    input.step = "1";
    input.value = options.value;
    input.addEventListener("change", options.onChange);

    field.append(label, input);
    return field;
}

function createActionButton(label, onClick){
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button button-secondary";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
}

function createStatusBadge(status){
    const badge = document.createElement("span");
    badge.className = `rules-status-badge rules-status-${status}`;
    badge.textContent = formatStatus(status);
    return badge;
}

function updateSectionSummary(sectionId){
    const item = document.querySelector(`[data-section-id="${sectionId}"]`);

    if(!item){
        return;
    }

    const section = {
        order: getElement(`section-order-${sectionId}`).value,
        category: getElement(`section-category-${sectionId}`).value,
        title: getElement(`section-title-${sectionId}`).value,
        status: getElement(`section-status-${sectionId}`).value
    };

    const meta = item.querySelector(".rules-section-summary-meta");
    const title = item.querySelector(".rules-section-summary-title");
    const badge = item.querySelector(".rules-status-badge");

    if(meta){
        meta.textContent = createSectionMetaText(section);
    }

    if(title){
        title.textContent = section.title || "タイトル未設定";
    }

    if(badge){
        badge.className = `rules-status-badge rules-status-${section.status}`;
        badge.textContent = formatStatus(section.status);
    }
}

function createSectionMetaText(section){
    const order = String(section.order || "").padStart(2, "0");
    const category = section.category || "未分類";

    return `[${order}] ${category}`;
}

function renderCategoryOptions(){
    const datalist = getElement("rulesCategoryOptions");
    const fragment = document.createDocumentFragment();

    RULE_CATEGORY_OPTIONS.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        fragment.appendChild(option);
    });

    datalist.replaceChildren(fragment);
}

function formatStatus(status){
    const labels = {
        draft: "Draft",
        public: "Public",
        private: "Private"
    };

    return labels[status] || "Draft";
}

function getElement(id){
    const element = document.getElementById(id);

    if(!element){
        throw new Error(`Element not found: #${id}`);
    }

    return element;
}
