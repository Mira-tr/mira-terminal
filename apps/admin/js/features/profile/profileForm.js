import {
    getElement
} from "../../utils.js";

import {
    loadProfile,
    saveProfile
} from "./profileStore.js";

const LINK_TYPES = ["social", "code", "video", "shop", "contact", "other"];

let currentProfile = null;

export function initProfileForm(){
    loadProfileToForm();
    bindEvents();
}

function loadProfileToForm(){
    currentProfile = loadProfile();
    
    getElement("profileDisplayName").value = currentProfile.displayName || "";
    getElement("profileBio").value = currentProfile.bio || "";
    getElement("profileActivities").value = (currentProfile.activities || []).join("\n");
    
    renderLinks();
}

function bindEvents(){
    getElement("profileSaveBtn").addEventListener("click", handleSave);
    getElement("profileAddLinkBtn").addEventListener("click", handleAddLink);
}

function handleSave(){
    const displayName = getElement("profileDisplayName").value.trim();
    const bio = getElement("profileBio").value.trim();
    const activitiesText = getElement("profileActivities").value.trim();
    const activities = activitiesText.split("\n").map(a => a.trim()).filter(a => a);
    
    const profile = {
        displayName,
        bio,
        activities,
        links: currentProfile.links || []
    };
    
    if(saveProfile(profile)){
        alert("Profileを保存しました");
        loadProfileToForm();
    }else{
        alert("保存に失敗しました");
    }
}

function handleAddLink(){
    const label = getElement("profileLinkLabel").value.trim();
    const url = getElement("profileLinkUrl").value.trim();
    const type = getElement("profileLinkType").value;
    
    if(!label || !url){
        alert("ラベルとURLを入力してください");
        return;
    }
    
    if(!url.startsWith("http://") && !url.startsWith("https://")){
        alert("URLはhttp://またはhttps://で始めてください");
        return;
    }
    
    const newLink = {
        id: generateId(),
        label,
        url,
        type,
        order: (currentProfile.links || []).length,
        status: "public"
    };
    
    currentProfile.links = [...(currentProfile.links || []), newLink];
    
    renderLinks();
    
    getElement("profileLinkLabel").value = "";
    getElement("profileLinkUrl").value = "";
}

function handleDeleteLink(id){
    currentProfile.links = (currentProfile.links || []).filter(link => link.id !== id);
    renderLinks();
}

function handleToggleLinkStatus(id){
    const link = (currentProfile.links || []).find(l => l.id === id);
    if(link){
        link.status = link.status === "public" ? "private" : "public";
        renderLinks();
    }
}

function handleMoveLinkUp(id){
    const links = currentProfile.links || [];
    const index = links.findIndex(l => l.id === id);
    
    if(index > 0){
        const temp = links[index];
        links[index] = links[index - 1];
        links[index - 1] = temp;
        
        links.forEach((link, i) => {
            link.order = i;
        });
        
        currentProfile.links = links;
        renderLinks();
    }
}

function handleMoveLinkDown(id){
    const links = currentProfile.links || [];
    const index = links.findIndex(l => l.id === id);
    
    if(index < links.length - 1){
        const temp = links[index];
        links[index] = links[index + 1];
        links[index + 1] = temp;
        
        links.forEach((link, i) => {
            link.order = i;
        });
        
        currentProfile.links = links;
        renderLinks();
    }
}

function renderLinks(){
    const container = getElement("profileLinksList");
    container.replaceChildren();
    
    const links = currentProfile.links || [];
    
    if(links.length === 0){
        const empty = document.createElement("p");
        empty.textContent = "リンクがありません";
        empty.style.color = "var(--color-muted)";
        container.appendChild(empty);
        return;
    }
    
    links.forEach(link => {
        const item = document.createElement("div");
        item.className = "profile-link-item";
        
        const info = document.createElement("div");
        info.className = "profile-link-info";
        
        const label = document.createElement("span");
        label.textContent = link.label;
        label.className = "profile-link-label";
        
        const url = document.createElement("span");
        url.textContent = link.url;
        url.className = "profile-link-url";
        
        const type = document.createElement("span");
        type.textContent = link.type;
        type.className = "profile-link-type";
        
        const status = document.createElement("span");
        status.textContent = link.status === "public" ? "公開" : "非公開";
        status.className = "profile-link-status";
        status.style.color = link.status === "public" ? "var(--color-accent)" : "var(--color-muted)";
        
        info.appendChild(label);
        info.appendChild(document.createElement("br"));
        info.appendChild(url);
        info.appendChild(document.createElement("br"));
        info.appendChild(type);
        info.appendChild(document.createTextNode(" / "));
        info.appendChild(status);
        
        const actions = document.createElement("div");
        actions.className = "profile-link-actions";
        
        const upBtn = document.createElement("button");
        upBtn.textContent = "↑";
        upBtn.type = "button";
        upBtn.className = "button button-ghost";
        upBtn.addEventListener("click", () => handleMoveLinkUp(link.id));
        
        const downBtn = document.createElement("button");
        downBtn.textContent = "↓";
        downBtn.type = "button";
        downBtn.className = "button button-ghost";
        downBtn.addEventListener("click", () => handleMoveLinkDown(link.id));
        
        const toggleBtn = document.createElement("button");
        toggleBtn.textContent = link.status === "public" ? "非公開" : "公開";
        toggleBtn.type = "button";
        toggleBtn.className = "button button-ghost";
        toggleBtn.addEventListener("click", () => handleToggleLinkStatus(link.id));
        
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "削除";
        deleteBtn.type = "button";
        deleteBtn.className = "button button-ghost";
        deleteBtn.addEventListener("click", () => handleDeleteLink(link.id));
        
        actions.appendChild(upBtn);
        actions.appendChild(downBtn);
        actions.appendChild(toggleBtn);
        actions.appendChild(deleteBtn);
        
        item.appendChild(info);
        item.appendChild(actions);
        
        container.appendChild(item);
    });
}

function generateId(){
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
