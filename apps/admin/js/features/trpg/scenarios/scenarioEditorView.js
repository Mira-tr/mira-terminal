import {
    value,
    setValue
} from "../../../utils.js";

import {
    DEFAULT_PRIMARY_CREATOR_ID
} from "../../creators/creatorStore.js";

import {
    getSelectedTags,
    setSelectedTags
} from "../tags.js";

import {
    getSelectedStorageLocations,
    setSelectedStorageLocations
} from "./scenarioStorage.js";

export const SCENARIO_EDITOR_FIELD_IDS = Object.freeze([
    "title",
    "kana",
    "author",
    "system",
    "playersRaw",
    "playersMin",
    "playersMax",
    "timeRaw",
    "timeMin",
    "timeMax",
    "loss",
    "rating",
    "scenarioType",
    "series",
    "summary",
    "notes",
    "url",
    "storageNote",
    "status",
    "memo"
]);

const STORAGE_LOCATION_OPTIONS_ID = "storageLocationOptions";

export function mountScenarioEditorView({
    rootElement,
    surface = "browser-admin",
    mode = "standard"
} = {}){
    if(!rootElement){
        throw new TypeError("mountScenarioEditorView requires rootElement.");
    }

    const form = document.createElement("form");
    form.id = "scenarioForm";
    form.className = "scenario-editor-form";
    form.dataset.surface = surface;
    form.dataset.mode = mode;
    form.autocomplete = "off";

    form.append(
        createBasicGrid(),
        createPlayerRow(),
        createTimeRow(),
        createRiskGrid(),
        createDetailGrid(),
        createTextField({
            id: "summary",
            label: "短い紹介",
            placeholder: "公開ページに表示する短い紹介です。迷ったら一文だけで大丈夫です。",
            textarea: true,
            className: "textarea-compact"
        }),
        createTextField({
            id: "notes",
            label: "注意すること",
            placeholder: "秘匿HOあり / PvP可能性あり / 継続不可 など",
            textarea: true,
            className: "textarea-compact"
        }),
        createTagEditor(),
        createTextField({
            id: "url",
            label: "配布ページURL",
            placeholder: "https://...",
            type: "url"
        }),
        createStorageEditor(),
        createTextField({
            id: "storageNote",
            label: "保存場所メモ",
            placeholder: "例: TRPG/CoC6、書棚A",
            maxLength: 240
        }),
        createStatusField(),
        createTextField({
            id: "memo",
            label: "管理メモ",
            placeholder: "公開されない管理用メモです。",
            textarea: true
        }),
        createButtonArea(),
        createMessage()
    );

    rootElement.replaceChildren(form);

    return {
        kind: "ScenarioEditorView",
        rootElement,
        form,
        surface,
        mode,
        getField(id){
            return form.querySelector(`#${CSS.escape(id)}`);
        },
        unmount(){
            rootElement.replaceChildren();
        }
    };
}

export function collectScenarioEditorData({
    editingId = "",
    existingScenario = null,
    ownerCreatorId = DEFAULT_PRIMARY_CREATOR_ID
} = {}){
    const now = Date.now();

    return {
        id: editingId || crypto.randomUUID(),
        title: value("title"),
        kana: value("kana"),
        author: value("author"),
        system: value("system"),
        playersRaw: value("playersRaw"),
        playersMin: value("playersMin"),
        playersMax: value("playersMax"),
        timeRaw: value("timeRaw"),
        timeMin: value("timeMin"),
        timeMax: value("timeMax"),
        loss: value("loss"),
        rating: value("rating"),
        scenarioType: value("scenarioType"),
        series: value("series"),
        summary: value("summary"),
        notes: value("notes"),
        tags: getSelectedTags(),
        ownerCreatorId: existingScenario?.ownerCreatorId || ownerCreatorId,
        url: value("url"),
        storageLocations: getSelectedStorageLocations(STORAGE_LOCATION_OPTIONS_ID),
        storageNote: value("storageNote"),
        status: value("status"),
        memo: value("memo"),
        createdAt: existingScenario?.createdAt || now,
        updatedAt: now
    };
}

export function collectScenarioCopyData(){
    return {
        author: value("author"),
        system: value("system"),
        playersRaw: value("playersRaw"),
        playersMin: value("playersMin"),
        playersMax: value("playersMax"),
        timeRaw: value("timeRaw"),
        timeMin: value("timeMin"),
        timeMax: value("timeMax"),
        loss: value("loss"),
        rating: value("rating"),
        scenarioType: value("scenarioType"),
        series: value("series"),
        tags: getSelectedTags(),
        storageLocations: getSelectedStorageLocations(STORAGE_LOCATION_OPTIONS_ID),
        status: value("status")
    };
}

export function restoreScenarioCopyData(data = {}){
    [
        "author",
        "system",
        "playersRaw",
        "playersMin",
        "playersMax",
        "timeRaw",
        "timeMin",
        "timeMax",
        "loss",
        "rating",
        "scenarioType",
        "series",
        "status"
    ].forEach(fieldId=>{
        setValue(fieldId, data[fieldId] || "");
    });

    setSelectedTags(data.tags || []);
    setSelectedStorageLocations(
        STORAGE_LOCATION_OPTIONS_ID,
        data.storageLocations || []
    );
}

export function applyScenarioEditorData(scenario = {}){
    SCENARIO_EDITOR_FIELD_IDS.forEach(fieldId=>{
        setValue(
            fieldId,
            scenario[fieldId] || ""
        );
    });

    setValue("rating", scenario.rating || "all");
    setValue("status", scenario.status || "draft");
    setSelectedTags(scenario.tags || []);
    setSelectedStorageLocations(
        STORAGE_LOCATION_OPTIONS_ID,
        scenario.storageLocations
    );
}

export function resetScenarioEditorFields(){
    SCENARIO_EDITOR_FIELD_IDS.forEach(fieldId=>{
        setValue(fieldId, "");
    });

    setValue("system", "CoC6");
    setValue("loss", "未設定");
    setValue("rating", "all");
    setValue("status", "draft");
    setSelectedTags([]);
    setSelectedStorageLocations(
        STORAGE_LOCATION_OPTIONS_ID,
        []
    );
}

function createBasicGrid(){
    const grid = createDiv("form-grid");

    grid.append(
        createTextField({
            id: "title",
            label: "タイトル",
            placeholder: "例: Project : Sm;ley",
            required: true
        }),
        createTextField({
            id: "kana",
            label: "読み仮名",
            placeholder: "例: ぷろじぇくとすまいりー"
        }),
        createAuthorField(),
        createSelectField({
            id: "system",
            label: "システム",
            options: [
                ["CoC6", "CoC6"],
                ["CoC7", "CoC7"],
                ["エモクロア", "エモクロア"],
                ["その他", "その他"]
            ]
        })
    );

    return grid;
}

function createPlayerRow(){
    const row = createDiv("row");

    row.append(
        createTextField({
            id: "playersRaw",
            label: "人数表記",
            placeholder: "例: 2から4人"
        }),
        createSelectField({
            id: "playersMin",
            label: "最少人数",
            options: createNumberOptions(1, 10, "未設定", String)
        }),
        createSelectField({
            id: "playersMax",
            label: "最大人数",
            options: createNumberOptions(1, 10, "未設定", String)
        })
    );

    return row;
}

function createTimeRow(){
    const row = createDiv("row");

    row.append(
        createTextField({
            id: "timeRaw",
            label: "時間表記",
            placeholder: "例: 4から6時間"
        }),
        createSelectField({
            id: "timeMin",
            label: "最短時間",
            options: createNumberOptions(1, 30, "未設定", value=>`${value}h`)
        }),
        createSelectField({
            id: "timeMax",
            label: "最長時間",
            options: createNumberOptions(1, 80, "未設定", value=>`${value}h`)
        })
    );

    return row;
}

function createRiskGrid(){
    const grid = createDiv("form-grid");

    grid.append(
        createSelectField({
            id: "loss",
            label: "ロスト傾向",
            options: [
                ["未設定", "未設定"],
                ["なし", "なし"],
                ["低", "低"],
                ["中", "中"],
                ["高", "高"],
                ["特殊", "特殊"]
            ]
        }),
        createSelectField({
            id: "rating",
            label: "対象年齢",
            options: [
                ["all", "全年齢"],
                ["r18", "R18"]
            ]
        })
    );

    return grid;
}

function createDetailGrid(){
    const grid = createDiv("form-grid detail-field-grid");

    grid.append(
        createTextField({
            id: "scenarioType",
            label: "形式",
            placeholder: "例: シティ / クローズド / 半テキ"
        }),
        createTextField({
            id: "series",
            label: "シリーズ",
            placeholder: "例: 季節巡りシリーズ"
        })
    );

    return grid;
}

function createAuthorField(){
    const field = createDiv("form-field author-box");
    const label = createLabel("author", "作者");
    const input = createInput({
        id: "author",
        placeholder: "作者名"
    });
    const suggest = createDiv("suggest-list");
    suggest.id = "authorSuggest";
    suggest.setAttribute("aria-label", "作者候補");
    field.append(label, input, suggest);
    return field;
}

function createTagEditor(){
    const section = createDiv("tag-editor");
    const header = createDiv("tag-editor-header");
    const label = createLabel("newTagInput", "タグ");
    const note = document.createElement("p");
    note.className = "tag-editor-note";
    note.textContent = "新しいタグは入力欄から追加し、既存タグは候補検索から選べます。";
    header.append(label, note);

    const addRow = createDiv("tag-add-row");
    const input = createInput({
        id: "newTagInput",
        placeholder: "新しいタグ（カンマ区切り可）"
    });
    const addButton = createButton("addTagBtn", "追加", "button button-secondary");
    addRow.append(input, addButton);

    const selected = createDiv("selected-tags-field");
    selected.setAttribute("aria-labelledby", "selectedTagsLabel");
    const selectedLabel = createDiv("tag-section-label");
    selectedLabel.id = "selectedTagsLabel";
    selectedLabel.textContent = "選択済みタグ";
    const selectedTags = createDiv("selected-tags");
    selectedTags.id = "selectedTags";
    selectedTags.setAttribute("aria-label", "選択済みタグ");
    selected.append(selectedLabel, selectedTags);

    const searchLabel = document.createElement("label");
    searchLabel.className = "tag-candidate-search";
    searchLabel.setAttribute("for", "tagCandidateSearchInput");
    const searchText = document.createElement("span");
    searchText.textContent = "タグ候補検索";
    const searchInput = createInput({
        id: "tagCandidateSearchInput",
        type: "search",
        placeholder: "候補タグ名で検索"
    });
    searchLabel.append(searchText, searchInput);

    const panel = createDiv("tag-candidate-panel");
    const panelHead = createDiv("tag-candidate-head");
    const panelLabel = createDiv("tag-section-label");
    panelLabel.textContent = "よく使うタグ候補";
    const toggle = createButton("toggleTagCandidatesBtn", "もっと表示", "tag-candidate-toggle");
    toggle.setAttribute("aria-controls", "tagButtons");
    toggle.setAttribute("aria-expanded", "false");
    toggle.hidden = true;
    panelHead.append(panelLabel, toggle);
    const buttons = createDiv("tag-buttons");
    buttons.id = "tagButtons";
    buttons.setAttribute("aria-label", "タグ候補");
    const status = document.createElement("p");
    status.id = "tagCandidateStatus";
    status.className = "tag-candidate-status";
    status.setAttribute("aria-live", "polite");
    panel.append(panelHead, buttons, status);

    const hidden = createInput({
        id: "tags",
        type: "hidden"
    });

    section.append(header, addRow, selected, searchLabel, panel, hidden);
    return section;
}

function createStorageEditor(){
    const fieldset = document.createElement("fieldset");
    fieldset.className = "storage-editor";
    const legend = document.createElement("legend");
    legend.textContent = "保存場所";
    const options = createDiv("storage-location-options");
    options.id = STORAGE_LOCATION_OPTIONS_ID;
    fieldset.append(legend, options);
    return fieldset;
}

function createStatusField(){
    return createSelectField({
        id: "status",
        label: "状態",
        options: [
            ["draft", "未整理"],
            ["ready", "整理済み"],
            ["public", "公開"],
            ["private", "非公開"]
        ]
    });
}

function createButtonArea(){
    const area = createDiv("button-area");
    area.append(
        createButton("saveBtn", "保存して次へ", "button button-primary"),
        createButton("copyBtn", "保存して複製", "button button-secondary")
    );
    return area;
}

function createMessage(){
    const message = document.createElement("p");
    message.id = "message";
    message.className = "form-message";
    message.setAttribute("aria-live", "polite");
    return message;
}

function createTextField({
    id,
    label,
    placeholder = "",
    type = "text",
    textarea = false,
    className = "",
    maxLength,
    required = false
}){
    const field = createDiv("form-field");
    const labelElement = createLabel(id, label);
    const input = textarea
        ? document.createElement("textarea")
        : createInput({ id, type, placeholder });

    input.id = id;
    input.placeholder = placeholder;

    if(className){
        input.className = className;
    }

    if(maxLength){
        input.maxLength = maxLength;
    }

    if(required){
        input.required = true;
    }

    field.append(labelElement, input);
    return field;
}

function createSelectField({ id, label, options }){
    const field = createDiv("form-field");
    const labelElement = createLabel(id, label);
    const select = document.createElement("select");
    select.id = id;

    options.forEach(([optionValue, optionLabel])=>{
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionLabel;
        select.appendChild(option);
    });

    field.append(labelElement, select);
    return field;
}

function createNumberOptions(min, max, emptyLabel, labelFactory){
    const options = [["", emptyLabel]];

    for(let value = min; value <= max; value += 1){
        options.push([
            String(value),
            labelFactory(value)
        ]);
    }

    return options;
}

function createInput({ id, type = "text", placeholder = "" }){
    const input = document.createElement("input");
    input.id = id;
    input.type = type;
    input.placeholder = placeholder;
    return input;
}

function createButton(id, text, className){
    const button = document.createElement("button");
    button.id = id;
    button.className = className;
    button.type = "button";
    button.textContent = text;
    return button;
}

function createLabel(forId, text){
    const label = document.createElement("label");
    label.setAttribute("for", forId);
    label.textContent = text;
    return label;
}

function createDiv(className){
    const div = document.createElement("div");
    div.className = className;
    return div;
}
