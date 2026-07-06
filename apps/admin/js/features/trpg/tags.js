import {
    TAG_KEY,
    save
} from "../../store.js";

import {
    getElement
} from "../../utils.js";

let masterTags = [];
let selectedTags = [];

export function initTags(tags){
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
    }

    save(
        TAG_KEY,
        masterTags
    );

    syncTagsInput();
    renderTagButtons();
}

export function getSelectedTags(){
    return [...selectedTags];
}

export function setSelectedTags(tags){
    selectedTags = normalizeTags(tags)
    .filter(
        tag=>masterTags.includes(tag)
    );

    syncTagsInput();
    renderTagButtons();
}

export function renderTagButtons(){
    const area = getElement("tagButtons");
    const fragment = document.createDocumentFragment();

    masterTags.forEach(tag=>{
        fragment.appendChild(
            createTagButton(tag)
        );
    });

    area.replaceChildren(fragment);
}

export function addMasterTag(){
    const input = getElement("newTagInput");
    const tag = normalizeTag(input.value);

    if(!tag){
        return;
    }

    if(!masterTags.includes(tag)){
        masterTags = [
            ...masterTags,
            tag
        ];

        save(
            TAG_KEY,
            masterTags
        );
    }

    if(!selectedTags.includes(tag)){
        selectedTags = [
            ...selectedTags,
            tag
        ];
    }

    input.value = "";

    syncTagsInput();
    renderTagButtons();
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
}

function syncTagsInput(){
    getElement("tags").value = selectedTags.join(",");
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