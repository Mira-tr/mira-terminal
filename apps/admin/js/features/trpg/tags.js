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
let tagEditorEventCleanups = [];

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

    const saved = save(
        TAG_KEY,
        masterTags
    );

    syncTagsInput();
    renderTagButtons();
    emitTagsChanged();
    return saved;
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
            createTagMessage("タグ候補はまだありません")
        );
        updateTagCandidateControls(model);
        return;
    }

    if(model.visibleCandidateTags.length === 0){
        const message = model.isSearchActive
            ? "一致するタグ候補はありません"
            : "選択できるタグ候補はありません";

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
    tagEditorEventCleanups.forEach(cleanup=>cleanup());
    tagEditorEventCleanups = [];

    const searchInput = getOptionalElement("tagCandidateSearchInput");
    const toggleButton = getOptionalElement("toggleTagCandidatesBtn");
    const newTagInput = getOptionalElement("newTagInput");

    const handleSearchInput = ()=>{
        tagCandidateExpanded = false;
        renderTagButtons();
    };

    const handleToggleClick = ()=>{
        tagCandidateExpanded = !tagCandidateExpanded;
        renderTagButtons();
    };

    const handleNewTagKeydown = event=>{
        if(event.key !== "Enter"){
            return;
        }

        event.preventDefault();
        addMasterTag();
    };

    if(searchInput){
        searchInput.addEventListener("input", handleSearchInput);
        tagEditorEventCleanups.push(()=>{
            searchInput.removeEventListener("input", handleSearchInput);
        });
    }

    if(toggleButton){
        toggleButton.addEventListener("click", handleToggleClick);
        tagEditorEventCleanups.push(()=>{
            toggleButton.removeEventListener("click", handleToggleClick);
        });
    }

    if(newTagInput){
        newTagInput.addEventListener("keydown", handleNewTagKeydown);
        tagEditorEventCleanups.push(()=>{
            newTagInput.removeEventListener("keydown", handleNewTagKeydown);
        });
    }
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

function createTagButton(tag){
    const button = document.createElement("button");
    button.type = "button";
    button.className = selectedTags.includes(tag)
        ? "tag-button active"
        : "tag-button";
    button.textContent = `#${tag}`;
    button.setAttribute(
        "aria-pressed",
        String(selectedTags.includes(tag))
    );

    button.addEventListener("click", ()=>{
        toggleSelectedTag(tag);
    });

    return button;
}

function toggleSelectedTag(tag){
    selectedTags = selectedTags.includes(tag)
        ? selectedTags.filter(item=>item !== tag)
        : [...selectedTags, tag];

    syncTagsInput();
    renderTagButtons();
}

function parseTagInput(value){
    return normalizeTags(
        String(value || "")
        .split(",")
    );
}

function normalizeTags(tags){
    return [
        ...new Set(
            (Array.isArray(tags) ? tags : [])
            .map(tag=>String(tag || "").trim())
            .filter(Boolean)
        )
    ];
}

function syncTagsInput(){
    const input = getOptionalElement("tags");

    if(input){
        input.value = selectedTags.join(",");
    }
}

function resetTagCandidateSearch(){
    const input = getOptionalElement("tagCandidateSearchInput");
    tagCandidateExpanded = false;

    if(input){
        input.value = "";
    }
}

function emitTagsChanged(){
    window.dispatchEvent(
        new CustomEvent("mira:tags-changed")
    );
}

function getOptionalElement(id){
    return document.getElementById(id);
}
