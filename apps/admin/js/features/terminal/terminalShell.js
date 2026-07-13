import {
    getBrandSections,
    getBrandSectionStatusLabel
} from "../brand/brandSectionRegistry.js";

import {
    getModules,
    getModuleStatusLabel
} from "../modules/moduleRegistry.js";

import {
    getWorkspaces,
    getWorkspaceStatusLabel,
    getWorkspaceTypeLabel
} from "../workspaces/workspaceRegistry.js";

const WORKSPACE_TYPE_ORDER = ["brand", "creator", "module", "publish"];

export function renderTerminalShell({
    breadcrumbContainer,
    workspaceOverviewContainer,
    workspaceDetailContainer,
    moduleContainer,
    statusElement
}){
    const workspaces = getWorkspaces();
    const modules = getModules();
    const brandSections = getBrandSections();

    if(breadcrumbContainer){
        breadcrumbContainer.replaceChildren(
            createBreadcrumb(["Terminal", "Workspace Navigation"])
        );
    }

    if(workspaceOverviewContainer){
        workspaceOverviewContainer.replaceChildren(
            ...WORKSPACE_TYPE_ORDER.map(type => createWorkspaceGroup(
                type,
                workspaces.filter(workspace => workspace.type === type),
                modules,
                brandSections
            ))
        );
    }

    if(workspaceDetailContainer){
        workspaceDetailContainer.replaceChildren(
            ...workspaces.map(workspace => createWorkspaceDetail(
                workspace,
                modules,
                brandSections
            ))
        );
    }

    if(moduleContainer){
        moduleContainer.replaceChildren(
            ...modules.map(createModuleWorkspace)
        );
    }

    if(statusElement){
        const activeWorkspaces = workspaces.filter(item => item.status === "active").length;
        const activeModules = modules.filter(item => item.status === "active").length;
        statusElement.textContent = `Active Workspace: ${activeWorkspaces} / Active Module: ${activeModules}`;
    }
}

function createBreadcrumb(items){
    const nav = document.createElement("nav");
    nav.className = "terminal-breadcrumb";
    nav.setAttribute("aria-label", "現在位置");

    const list = document.createElement("ol");

    items.forEach((item, index) => {
        const entry = document.createElement("li");
        entry.textContent = item;

        if(index === items.length - 1){
            entry.setAttribute("aria-current", "page");
        }

        list.appendChild(entry);
    });

    nav.appendChild(list);
    return nav;
}

function createWorkspaceGroup(type, workspaces, modules, brandSections){
    const section = document.createElement("section");
    section.className = `terminal-workspace-group is-${type}`;

    const heading = document.createElement("div");
    heading.className = "terminal-group-head";

    const title = document.createElement("h3");
    title.textContent = getWorkspaceTypeLabel(type);

    const count = document.createElement("span");
    count.className = "terminal-group-count";
    count.textContent = `${workspaces.length} Workspace`;

    heading.append(title, count);
    section.appendChild(heading);

    if(workspaces.length === 0){
        section.appendChild(createEmptyMessage("Workspaceは未登録です"));
        return section;
    }

    const list = document.createElement("div");
    list.className = "terminal-workspace-node-list";
    list.replaceChildren(
        ...workspaces.map(workspace => createWorkspaceNode(workspace, modules))
    );
    section.appendChild(list);
    return section;
}

function createWorkspaceNode(workspace, modules){
    const card = document.createElement("article");
    card.className = "terminal-workspace-node";
    card.append(
        createCardHeader(
            workspace.title,
            getWorkspaceStatusLabel(workspace.status),
            workspace.status
        ),
        createDescription(workspace.description)
    );

    if(workspace.ownerCreatorId){
        card.appendChild(createMeta(`Owner ID: ${workspace.ownerCreatorId}`));
    }

    const ownedModules = findOwnedModules(workspace, modules);

    if(ownedModules.length > 0){
        card.appendChild(createOwnedModuleSummary(ownedModules));
    }

    card.appendChild(createAction(workspace.adminPath, workspace.status, "Workspace Admin"));
    return card;
}

function createWorkspaceDetail(workspace, modules, brandSections){
    const detail = document.createElement("article");
    detail.id = workspace.id;
    detail.className = "terminal-card terminal-detail-card";
    detail.append(
        createCardHeader(
            workspace.title,
            getWorkspaceStatusLabel(workspace.status),
            workspace.status
        ),
        createMeta(getWorkspaceTypeLabel(workspace.type)),
        createDescription(workspace.description)
    );

    if(workspace.ownerCreatorId){
        detail.appendChild(createMeta(`Owner ID: ${workspace.ownerCreatorId}`));
    }

    detail.appendChild(createOverviewBackLink());

    if(workspace.type === "brand"){
        detail.appendChild(createBrandWorkspaceContent(brandSections));
    }else if(workspace.type === "creator"){
        detail.appendChild(createCreatorWorkspaceContent(workspace, modules));
    }else if(workspace.type === "module"){
        detail.appendChild(createModuleWorkspaceLinks(workspace, modules));
    }

    detail.appendChild(createAction(workspace.adminPath, workspace.status, "Workspace Admin"));
    return detail;
}

function createBrandWorkspaceContent(sections){
    const container = document.createElement("section");
    container.className = "terminal-nested-section";

    const title = document.createElement("h4");
    title.textContent = "Brand Management";
    container.appendChild(title);

    const activeSections = sections.filter(section => section.status === "active");
    const plannedSections = sections.filter(section => section.status !== "active");

    container.append(
        createBrandSectionGroup("Available", activeSections),
        createBrandSectionGroup("Planned", plannedSections)
    );
    return container;
}

function createBrandSectionGroup(titleText, sections){
    const group = document.createElement("section");
    group.className = "terminal-brand-section-group";

    const title = document.createElement("h5");
    title.textContent = titleText;
    group.appendChild(title);

    if(sections.length === 0){
        group.appendChild(createEmptyMessage("該当項目はありません"));
        return group;
    }

    const list = document.createElement("div");
    list.className = "terminal-brand-section-list";
    list.replaceChildren(...sections.map(createBrandSectionCard));
    group.appendChild(list);
    return group;
}

function createBrandSectionCard(section){
    const card = document.createElement("article");
    card.className = "terminal-brand-section";
    card.append(
        createCardHeader(
            section.title,
            getBrandSectionStatusLabel(section.status),
            section.status
        ),
        createMeta(`Category: ${section.category}`),
        createDescription(section.description),
        createAction(section.adminPath, section.status, "Adminを開く")
    );
    return card;
}

function createCreatorWorkspaceContent(workspace, modules){
    const section = document.createElement("section");
    section.className = "terminal-nested-section";

    const title = document.createElement("h4");
    title.textContent = "Owned Modules";
    section.appendChild(title);

    const ownedModules = modules.filter(module => module.ownerCreatorId === workspace.ownerCreatorId);

    if(ownedModules.length === 0){
        section.appendChild(createEmptyMessage("所有Moduleは未登録です"));
        return section;
    }

    const list = document.createElement("div");
    list.className = "terminal-owned-module-list";
    list.replaceChildren(...ownedModules.map(createOwnedModuleCard));
    section.appendChild(list);
    return section;
}

function createModuleWorkspaceLinks(workspace, modules){
    const section = document.createElement("section");
    section.className = "terminal-nested-section";

    const title = document.createElement("h4");
    title.textContent = "Module";
    section.appendChild(title);

    const related = modules.filter(module => module.ownerCreatorId === workspace.ownerCreatorId);

    if(related.length === 0){
        section.appendChild(createEmptyMessage("接続Moduleは未登録です"));
        return section;
    }

    const list = document.createElement("div");
    list.className = "terminal-owned-module-list";
    list.replaceChildren(...related.map(createOwnedModuleCard));
    section.appendChild(list);
    return section;
}

function createOwnedModuleSummary(modules){
    const summary = document.createElement("div");
    summary.className = "terminal-module-summary";

    const label = document.createElement("span");
    label.textContent = "Modules";
    summary.appendChild(label);

    modules.forEach(module => {
        const link = document.createElement("a");
        link.href = `#${module.id}`;
        link.textContent = module.title;
        summary.appendChild(link);
    });

    return summary;
}

function createOwnedModuleCard(module){
    const card = document.createElement("article");
    card.className = "terminal-owned-module";
    card.append(
        createCardHeader(
            module.title,
            getModuleStatusLabel(module.status),
            module.status
        ),
        createDescription(module.description)
    );

    const actions = document.createElement("div");
    actions.className = "terminal-actions";
    actions.append(
        createAction(`#${module.id}`, module.status, "Module詳細"),
        createAction(module.adminPath, module.status, "Module Admin")
    );
    card.appendChild(actions);
    return card;
}

function createModuleWorkspace(module){
    const article = document.createElement("article");
    article.id = module.id;
    article.className = "terminal-card terminal-module-card";
    article.append(
        createCardHeader(
            module.title,
            getModuleStatusLabel(module.status),
            module.status
        ),
        createMeta(`Owner ID: ${module.ownerCreatorId}`),
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
        createAction(module.adminPath, module.status, "Module Admin"),
        createAction(module.publicPath, module.status, "Public URL")
    );
    return actions;
}

function createFeatureList(features){
    const section = document.createElement("section");
    section.className = "terminal-nested-section";

    const title = document.createElement("h4");
    title.textContent = "Features";
    section.appendChild(title);

    const list = document.createElement("div");
    list.className = "terminal-feature-list";

    features.forEach(feature => {
        const item = document.createElement("article");
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
            createAction(feature.adminPath, feature.status, "Feature Admin"),
            createAction(feature.publicPath, feature.status, "Public URL")
        );
        item.appendChild(actions);
        list.appendChild(item);
    });

    section.appendChild(list);
    return section;
}

function createOverviewBackLink(){
    const actions = document.createElement("div");
    actions.className = "terminal-actions terminal-overview-actions";
    actions.appendChild(createAction("#terminalOverviewTitle", "active", "Terminal Overviewへ戻る"));
    return actions;
}

function createAction(path, status, label){
    if(status !== "active" || !path || !isSafeLink(path)){
        const text = document.createElement("span");
        text.className = "terminal-action is-disabled";
        text.setAttribute("aria-disabled", "true");
        text.textContent = status === "active" ? "Unavailable" : "Planned";
        return text;
    }

    const link = document.createElement("a");
    link.className = "terminal-action";
    link.href = path;
    link.textContent = label;
    return link;
}

function createEmptyMessage(text){
    const message = document.createElement("p");
    message.className = "terminal-empty";
    message.textContent = text;
    return message;
}

function findOwnedModules(workspace, modules){
    if(!workspace.ownerCreatorId){
        return [];
    }

    return modules.filter(module => module.ownerCreatorId === workspace.ownerCreatorId);
}

function isSafeLink(path){
    const value = String(path || "").trim().toLowerCase();

    return Boolean(value) &&
        !value.startsWith("javascript:") &&
        !value.startsWith("data:") &&
        !value.startsWith("vbscript:");
}
