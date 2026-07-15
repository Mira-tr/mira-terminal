import {
    HOME_CONFIG_SCHEMA_VERSION,
    HOME_SELECTION_MODES,
    DEFAULT_HOME_SECTIONS,
    normalizeHomeConfig
} from "./homeConfig.js";

const SECTION_LABELS = {
    hero: "Hero",
    "featured-projects": "Featured Projects",
    "featured-tools": "Featured Tools",
    notes: "Notes",
    creators: "Creators"
};

const LAYOUT_OPTIONS = {
    hero: ["hero"],
    projects: ["cards", "list", "compact"],
    tools: ["cards", "list", "compact"],
    notes: ["list", "cards", "compact"],
    creators: ["cards", "list", "compact"]
};

export function renderHomeForm(container, config, options = {}){
    const normalized = normalizeHomeConfig(config);

    container.replaceChildren(
        ...normalized.sections.map(section => createSectionPanel(section))
    );

    bindFormEvents(container, options.onChange);
    updateHomeFormControlState(container);
}

export function collectHomeForm(container){
    const sections = Array.from(
        container.querySelectorAll("[data-home-section-id]")
    ).map(panel => collectSection(panel));

    return normalizeHomeConfig({
        schemaVersion: HOME_CONFIG_SCHEMA_VERSION,
        sections
    });
}

export function updateHomeFormControlState(container){
    Array.from(container.querySelectorAll("[data-home-section-id]"))
        .forEach(updateSectionControlState);
}

function bindFormEvents(container, onChange){
    container.oninput = event => {
        if(event.target.closest("[data-home-section-id]")){
            onChange?.();
        }
    };

    container.onchange = event => {
        if(event.target.closest("[data-home-section-id]")){
            onChange?.();
        }
    };
}

function createSectionPanel(section){
    const panel = document.createElement("article");
    panel.className = "home-section-panel";
    panel.dataset.homeSectionId = section.id;
    panel.dataset.homeSectionType = section.type;

    panel.append(
        createSectionHeader(section),
        createCoreFields(section)
    );

    if(section.type !== "hero"){
        panel.appendChild(createSelectionFields(section));
    }

    return panel;
}

function createSectionHeader(section){
    const header = document.createElement("div");
    header.className = "home-section-panel-header";

    const titleGroup = document.createElement("div");

    const kicker = document.createElement("p");
    kicker.className = "home-section-kicker";
    kicker.textContent = section.type;

    const title = document.createElement("h3");
    title.textContent = sectionLabel(section.id);

    titleGroup.append(kicker, title);

    const fixedMeta = document.createElement("dl");
    fixedMeta.className = "home-section-fixed-meta";
    fixedMeta.append(
        createMeta("Section ID", section.id),
        createMeta("Type", section.type)
    );

    header.append(titleGroup, fixedMeta);
    return header;
}

function createCoreFields(section){
    const fields = document.createElement("div");
    fields.className = "home-section-fields";

    fields.append(
        createEnabledField(section),
        createTextInputField(section, "order", "Order", "number"),
        createTextInputField(section, "title", "Title", "text"),
        createTextareaField(section, "description", "Description"),
        createSelectField(
            section,
            "layout",
            "Layout",
            LAYOUT_OPTIONS[section.type] || ["cards", "list", "compact"]
        )
    );

    return fields;
}

function createSelectionFields(section){
    const fields = document.createElement("div");
    fields.className = "home-section-fields home-section-selection-fields";

    fields.append(
        createSelectField(section, "selectionMode", "Selection Mode", HOME_SELECTION_MODES),
        createTextInputField(section, "limit", "Limit", "number"),
        createItemIdsField(section)
    );

    return fields;
}

function createEnabledField(section){
    const label = document.createElement("label");
    label.className = "home-toggle-field";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = section.enabled;
    input.dataset.homeField = "enabled";

    const text = document.createElement("span");
    text.textContent = "Enabled";

    label.append(input, text);
    return label;
}

function createTextInputField(section, field, labelText, type){
    const inputId = `home-${section.id}-${field}`;
    const wrapper = createFieldWrapper(labelText, inputId);
    const input = document.createElement("input");

    input.id = inputId;
    input.type = type;
    input.dataset.homeField = field;
    input.value = String(section[field] ?? "");

    if(type === "number"){
        input.min = "1";
        input.step = "1";
    }

    wrapper.appendChild(input);
    return wrapper;
}

function createTextareaField(section, field, labelText){
    const inputId = `home-${section.id}-${field}`;
    const wrapper = createFieldWrapper(labelText, inputId);
    const textarea = document.createElement("textarea");

    textarea.id = inputId;
    textarea.dataset.homeField = field;
    textarea.value = String(section[field] ?? "");

    wrapper.appendChild(textarea);
    return wrapper;
}

function createSelectField(section, field, labelText, options){
    const inputId = `home-${section.id}-${field}`;
    const wrapper = createFieldWrapper(labelText, inputId);
    const select = document.createElement("select");

    select.id = inputId;
    select.dataset.homeField = field;
    options.forEach(optionValue => {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionValue;
        select.appendChild(option);
    });
    select.value = String(section[field] ?? "");

    wrapper.appendChild(select);
    return wrapper;
}

function createItemIdsField(section){
    const inputId = `home-${section.id}-itemIds`;
    const wrapper = createFieldWrapper("itemIds", inputId);
    const textarea = document.createElement("textarea");
    const note = document.createElement("p");

    textarea.id = inputId;
    textarea.dataset.homeField = "itemIds";
    textarea.value = section.itemIds.join("\n");
    textarea.placeholder = "project-id-1\nproject-id-2";

    note.className = "home-field-note";
    note.textContent = "1行1ID。参照先の存在確認はこのPhaseでは行いません。";

    wrapper.append(textarea, note);
    return wrapper;
}

function createFieldWrapper(labelText, inputId){
    const wrapper = document.createElement("div");
    wrapper.className = "form-field home-form-field";

    const label = document.createElement("label");
    label.textContent = labelText;
    label.htmlFor = inputId;

    wrapper.appendChild(label);
    return wrapper;
}

function createMeta(labelText, valueText){
    const group = document.createElement("div");
    const label = document.createElement("dt");
    const value = document.createElement("dd");

    label.textContent = labelText;
    value.textContent = valueText;
    group.append(label, value);
    return group;
}

function collectSection(panel){
    const defaultSection = DEFAULT_HOME_SECTIONS.find(
        section => section.id === panel.dataset.homeSectionId
    );

    return {
        id: panel.dataset.homeSectionId,
        type: panel.dataset.homeSectionType,
        enabled: getField(panel, "enabled").checked,
        order: getField(panel, "order").value,
        title: getField(panel, "title").value,
        description: getField(panel, "description").value,
        layout: getField(panel, "layout").value,
        selectionMode: defaultSection.type === "hero"
            ? defaultSection.selectionMode
            : getField(panel, "selectionMode").value,
        limit: defaultSection.type === "hero"
            ? defaultSection.limit
            : getField(panel, "limit").value,
        itemIds: defaultSection.type === "hero"
            ? []
            : parseItemIds(getField(panel, "itemIds").value)
    };
}

function updateSectionControlState(panel){
    const selection = panel.querySelector('[data-home-field="selectionMode"]');
    const itemIds = panel.querySelector('[data-home-field="itemIds"]');

    if(!selection || !itemIds){
        return;
    }

    const disabled = selection.value !== "manual";

    itemIds.disabled = disabled;
    itemIds.closest(".form-field")?.classList.toggle("is-disabled", disabled);
}

function getField(panel, field){
    const element = panel.querySelector(`[data-home-field="${field}"]`);

    if(!element){
        throw new Error(`Missing Home field: ${panel.dataset.homeSectionId}.${field}`);
    }

    return element;
}

function parseItemIds(value){
    // Home item IDs are split by newline or comma; individual IDs must not contain commas.
    return String(value || "")
        .split(/\r?\n|,/)
        .map(item => item.trim())
        .filter(Boolean);
}

function sectionLabel(id){
    return SECTION_LABELS[id] || id;
}
