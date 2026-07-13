import {
    getModules,
    getModuleStatusLabel
} from "../modules/moduleRegistry.js";

import {
    getWorkspaces,
    getWorkspaceStatusLabel,
    getWorkspaceTypeLabel
} from "../workspaces/workspaceRegistry.js";

export function renderTerminalShell({
    workspaceContainer,
    moduleContainer,
    statusElement
}){
    const workspaces = getWorkspaces();
    const modules = getModules();

    if(workspaceContainer){
        workspaceContainer.replaceChildren(
            ...workspaces.map(createWorkspaceCard)
        );
    }

    if(moduleContainer){
        moduleContainer.replaceChildren(
            ...modules.map(createModuleCard)
        );
    }

    if(statusElement){
        const activeWorkspaces = workspaces.filter(item => item.status === "active").length;
        const activeModules = modules.filter(item => item.status === "active").length;
        statusElement.textContent = `Active Workspace: ${activeWorkspaces} / Active Module: ${activeModules}`;
    }
}

function createWorkspaceCard(workspace){
    const article = document.createElement("article");
    article.className = "terminal-card";
    article.append(
        createCardHeader(
            workspace.title,
            getWorkspaceStatusLabel(workspace.status),
            workspace.status
        ),
        createMeta(getWorkspaceTypeLabel(workspace.type)),
        createDescription(workspace.description)
    );

    if(workspace.ownerCreatorId){
        article.appendChild(createMeta(`Owner: ${workspace.ownerCreatorId}`));
    }

    article.appendChild(createAction(workspace.adminPath, workspace.status, "Workspaceを開く"));
    return article;
}

function createModuleCard(module){
    const article = document.createElement("article");
    article.className = "terminal-card terminal-module-card";
    article.append(
        createCardHeader(
            module.title,
            getModuleStatusLabel(module.status),
            module.status
        ),
        createMeta(`Module: ${module.type} / Owner: ${module.ownerCreatorId}`),
        createDescription(module.description),
        createModuleActions(module),
        createFeatureList(module.features)
    );
    return article;
}

function createCardHeader(titleText, statusText, status){
    const header = document.createElement("div");
    header.className = "terminal-card-header";

    const title = document.createElement("h3");
    title.textContent = titleText;

    const badge = document.createElement("span");
    badge.className = `terminal-status is-${status}`;
    badge.textContent = statusText;

    header.append(title, badge);
    return header;
}

function createMeta(text){
    const meta = document.createElement("p");
    meta.className = "terminal-meta";
    meta.textContent = text;
    return meta;
}

function createDescription(text){
    const description = document.createElement("p");
    description.className = "terminal-description";
    description.textContent = text;
    return description;
}

function createModuleActions(module){
    const actions = document.createElement("div");
    actions.className = "terminal-actions";
    actions.append(
        createAction(module.adminPath, module.status, "Adminを開く"),
        createAction(module.publicPath, module.status, "Public URL")
    );
    return actions;
}

function createFeatureList(features){
    const list = document.createElement("div");
    list.className = "terminal-feature-list";

    features.forEach(feature => {
        const item = document.createElement("section");
        item.className = "terminal-feature";
        item.append(
            createCardHeader(
                feature.title,
                getModuleStatusLabel(feature.status),
                feature.status
            ),
            createDescription(feature.description)
        );

        const actions = document.createElement("div");
        actions.className = "terminal-actions";
        actions.append(
            createAction(feature.adminPath, feature.status, "Admin"),
            createAction(feature.publicPath, feature.status, "Public")
        );
        item.appendChild(actions);
        list.appendChild(item);
    });

    return list;
}

function createAction(path, status, label){
    if(status !== "active" || !path || !isSafeLink(path)){
        const text = document.createElement("span");
        text.className = "terminal-action is-disabled";
        text.textContent = status === "active" ? "Unavailable" : "Planned";
        return text;
    }

    const link = document.createElement("a");
    link.className = "terminal-action";
    link.href = path;
    link.textContent = label;
    return link;
}

function isSafeLink(path){
    const value = String(path || "").trim().toLowerCase();

    return Boolean(value) &&
        !value.startsWith("javascript:") &&
        !value.startsWith("data:") &&
        !value.startsWith("vbscript:");
}
