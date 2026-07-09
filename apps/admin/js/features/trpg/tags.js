import {
    TAG_KEY,
    save
} from "../../store.js";

import {
    getElement
} from "../../utils.js";

import {
    ADMIN_TAG_CANDIDATE_LIMIT,
    createAdminTagPickerModel
} from "./tagPickerView.js";

let masterTags = [];
let selectedTags = [];
let tagCandidateExpanded = false;
let tagEditorEventsBound = false;

export function initTags(tags){
    bindTagEditorEvents();
    setMasterTags(tags, {
        resetSelected: true
    });
}

export function getMasterTags(){
    return [...masterTags];
}

export function setMasterTags(tags, options = {}){
    masterTags = normalizeTags(tags);

    if(options.resetSelected){
        selectedTags = selectedTags.filter(
            tag=>masterTags.includes(tag)
        );
        resetTagCandidateSearch();
    }

    save(
        TAG_KEY,
        masterTags
    );

    syncTagsInput();
    renderTagButtons();
    emitTagsChanged();
}

export function getSelectedTags(){
    return [...selectedTags];
}

export function setSelectedTags(tags){
    selectedTags = normalizeTags(tags)
    .filter(
        tag=>masterTags.includes(tag)
    );

    resetTagCandidateSearch();
    syncTagsInput();
    renderTagButtons();
}

export function renderTagButtons(){
    const area = getElement("tagButtons");
    const model = createAdminTagPickerModel(masterTags, {
        selectedTags,
        searchQuery: getOptionalElement("tagCandidateSearchInput")?.value,
        expanded: tagCandidateExpanded,
        limit: ADMIN_TAG_CANDIDATE_LIMIT
    });

    renderSelectedTags(model.selectedTags);
    area.classList.toggle(
        "is-scrollable",
        model.expanded || model.isSearchActive
    );

    if(masterTags.length === 0){
        area.replaceChildren(
            createTagMessage("タグ候補がありません")
        );
        updateTagCandidateControls(model);
        return;
    }

    if(model.visibleCandidateTags.length === 0){
        const message = model.isSearchActive
            ? "一致するタグ候補がありません"
            : "選択中以外のタグ候補がありません";

        area.replaceChildren(
            createTagMessage(message)
        );
        updateTagCandidateControls(model);
        return;
    }

    const fragment = document.createDocumentFragment();

    model.visibleCandidateTags.forEach(tag=>{
        fragment.appendChild(
            createTagButton(tag)
        );
    });

    area.replaceChildren(fragment);
    updateTagCandidateControls(model);
}

export function addMasterTag(){
    const input = getElement("newTagInput");
    const tags = parseTagInput(input.value);

    if(tags.length === 0){
        return;
    }

    let changedMasterTags = false;

    tags.forEach(tag=>{
        if(!masterTags.includes(tag)){
            masterTags = [
                ...masterTags,
                tag
            ];
            changedMasterTags = true;
        }

        if(!selectedTags.includes(tag)){
            selectedTags = [
                ...selectedTags,
                tag
            ];
        }
    });

    if(changedMasterTags){
        save(
            TAG_KEY,
            masterTags
        );

        emitTagsChanged();
    }

    input.value = "";
    resetTagCandidateSearch();

    syncTagsInput();
    renderTagButtons();
}

function bindTagEditorEvents(){
    if(tagEditorEventsBound){
        return;
    }

    const searchInput = getOptionalElement("tagCandidateSearchInput");
    const toggleButton = getOptionalElement("toggleTagCandidatesBtn");
    const newTagInput = getOptionalElement("newTagInput");

    searchInput?.addEventListener("input", ()=>{
        tagCandidateExpanded = false;
        renderTagButtons();
    });

    toggleButton?.addEventListener("click", ()=>{
        tagCandidateExpanded = !tagCandidateExpanded;
        renderTagButtons();
    });

    newTagInput?.addEventListener("keydown", event=>{
        if(event.key !== "Enter"){
            return;
        }

        event.preventDefault();
        addMasterTag();
    });

    tagEditorEventsBound = true;
}

function renderSelectedTags(tags){
    const area = getOptionalElement("selectedTags");

    if(!area){
        return;
    }

    if(tags.length === 0){
        area.replaceChildren(
            createTagMessage("選択中のタグはありません")
        );
        return;
    }

    const fragment = document.createDocumentFragment();

    tags.forEach(tag=>{
        fragment.appendChild(
            createSelectedTagButton(tag)
        );
    });

    area.replaceChildren(fragment);
}

function createSelectedTagButton(tag){
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tag-button active selected-tag-button";
    button.textContent = `#${tag}`;
    button.setAttribute("aria-pressed", "true");
    button.setAttribute("aria-label", `#${tag} の選択を解除`);

    button.addEventListener("click", ()=>{
        toggleSelectedTag(tag);
    });

    return button;
}

function updateTagCandidateControls(model){
    const status = getOptionalElement("tagCandidateStatus");
    const toggleButton = getOptionalElement("toggleTagCandidatesBtn");

    if(status){
        if(model.isSearchActive){
            status.textContent = `${model.matchingTagCount}件のタグ候補が一致`;
        }else if(model.showToggle && !model.expanded){
            status.textContent = `未選択候補の上位${model.limit}件を表示`;
        }else{
            status.textContent = `${model.candidateTagCount}件の未選択候補`;
        }
    }

    if(toggleButton){
        toggleButton.hidden = !model.showToggle;
        toggleButton.textContent = model.expanded
            ? "折りたたむ"
            : "もっと表示";
        toggleButton.setAttribute(
            "aria-expanded",
            String(model.expanded)
        );
    }
}

function createTagMessage(text){
    const message = document.createElement("p");
    message.className = "tag-empty";
    message.textContent = text;
    return message;
}

function resetTagCandidateSearch(){
    const searchInput = getOptionalElement("tagCandidateSearchInput");

    if(searchInput){
        searchInput.value = "";
    }

    tagCandidateExpanded = false;
}

function createTagButton(tag){
    const wrapper = document.createElement("div");
    wrapper.className = "tag-wrapper";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = `#${tag}`;
    btn.className = selectedTags.includes(tag)
        ? "tag-button active"
        : "tag-button";
    btn.setAttribute("aria-pressed", String(selectedTags.includes(tag)));

    btn.addEventListener("click", ()=>{
        toggleSelectedTag(tag);
    });

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "×";
    del.className = "tag-delete";
    del.setAttribute("aria-label", `#${tag} を削除`);

    del.addEventListener("click", event=>{
        event.stopPropagation();
        deleteTag(tag);
    });

    wrapper.append(btn, del);
    return wrapper;
}

function toggleSelectedTag(tag){
    if(!masterTags.includes(tag)){
        return;
    }

    selectedTags = selectedTags.includes(tag)
        ? selectedTags.filter(item=>item !== tag)
        : [...selectedTags, tag];

    syncTagsInput();
    renderTagButtons();
}

function deleteTag(tag){
    if(!confirm(`#${tag} を削除しますか？`)){
        return;
    }

    masterTags = masterTags.filter(
        item=>item !== tag
    );

    selectedTags = selectedTags.filter(
        item=>item !== tag
    );

    save(
        TAG_KEY,
        masterTags
    );

    syncTagsInput();
    renderTagButtons();
    emitTagsChanged();
}

function syncTagsInput(){
    getElement("tags").value = selectedTags.join(",");
}

function emitTagsChanged(){
    window.dispatchEvent(
        new CustomEvent("mira:tags-changed", {
            detail: {
                tags: getMasterTags()
            }
        })
    );
}

function normalizeTags(tags){
    if(!Array.isArray(tags)){
        return [];
    }

    return [
        ...new Set(
            tags
            .map(normalizeTag)
            .filter(Boolean)
        )
    ];
}

function normalizeTag(tag){
    return String(tag ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function parseTagInput(value){
    return normalizeTags(
        String(value ?? "")
        .split(/[,\uFF0C、\n]+/)
    );
}

function getOptionalElement(id){
    return document.getElementById(id);
}
