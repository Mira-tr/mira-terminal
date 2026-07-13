import {
    getBrandSections,
    getBrandSectionStatusLabel
} from "../brand/brandSectionRegistry.js";

import {
    getCreatorSites,
    getCreatorSiteStatusLabel
} from "../creators/creatorSiteRegistry.js";

import {
    getModules,
    getModuleStatusLabel
} from "../modules/moduleRegistry.js";

import {
    getWorkspaces,
    getWorkspaceStatusLabel,
    getWorkspaceTypeLabel
} from "../workspaces/workspaceRegistry.js";

const OVERVIEW_TYPES = ["brand", "creator", "publish"];

export function renderTerminalShell({
    breadcrumbContainer,
    workspaceOverviewContainer,
    workspaceDetailContainer,
    statusElement
}){
    const workspaces = getWorkspaces();
    const modules = getModules();
    const brandSections = getBrandSections();
    const creatorSites = getCreatorSites();
    const visibleWorkspaces = workspaces.filter(workspace => (
        OVERVIEW_TYPES.includes(workspace.type)
    ));

    if(breadcrumbContainer){
        breadcrumbContainer.replaceChildren(
            createBreadcrumb(["Terminal", "Creator Navigation"])
        );
    }

    if(workspaceOverviewContainer){
        workspaceOverviewContainer.replaceChildren(
            ...OVERVIEW_TYPES.map(type => createWorkspaceGroup(
                type,
                visibleWorkspaces.filter(workspace => workspace.type === type),
                creatorSites,
                modules
            ))
        );
    }

    if(workspaceDetailContainer){
        workspaceDetailContainer.replaceChildren(
            createBrandWorkspaceContent(
                workspaces.find(workspace => workspace.type === "brand"),
                brandSections
            ),
            ...creatorSites.map(site => createCreatorSiteContent(site, modules)),
            createPublishCenterContent(
                workspaces.find(workspace => workspace.type === "publish")
            )
        );
    }

    if(statusElement){
        const activeSites = creatorSites.filter(site => site.status === "active").length;
        const activeFeatures = modules
            .flatMap(module => module.features)
            .filter(feature => feature.status === "active")
            .length;

        statusElement.textContent = `Active Creator Sites: ${activeSites} / Active Features: ${activeFeatures}`;
    }
}

function createBreadcrumb(items){
    const nav = document.createElement("nav");
    nav.className = "terminal-breadcrumb";
    nav.setAttribute("aria-label", "Current location");

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

function createWorkspaceGroup(type, workspaces, creatorSites, modules){
    const section = document.createElement("section");
    section.className = `terminal-workspace-group is-${type}`;

    const heading = document.createElement("div");
    heading.className = "terminal-group-head";

    const title = document.createElement("h3");
    title.textContent = type === "creator"
        ? "Creators"
        : getWorkspaceTypeLabel(type);

    const count = document.createElement("span");
    count.className = "terminal-group-count";
    count.textContent = type === "creator"
        ? `${creatorSites.length} Site`
        : `${workspaces.length} Area`;

    heading.append(title, count);
    section.appendChild(heading);

    if(type === "creator"){
        const list = document.createElement("div");
        list.className = "terminal-workspace-node-list";
        list.replaceChildren(
            ...creatorSites.map(site => createCreatorSiteNode(site, modules))
        );
        section.appendChild(list);
        return section;
    }

    if(workspaces.length === 0){
        section.appendChild(createEmptyMessage("No area is registered."));
        return section;
    }

    const list = document.createElement("div");
    list.className = "terminal-workspace-node-list";
    list.replaceChildren(...workspaces.map(createWorkspaceNode));
    section.appendChild(list);
    return section;
}

function createWorkspaceNode(workspace){
    const card = document.createElement("article");
    card.className = "terminal-workspace-node";
    card.append(
        createCardHeader(
            workspace.title,
            getWorkspaceStatusLabel(workspace.status),
            workspace.status
        ),
        createDescription(workspace.description),
        createAction(`#${workspace.id}`, workspace.status, "Details")
    );
    return card;
}

function createCreatorSiteNode(site, modules){
    const card = document.createElement("article");
    card.className = "terminal-workspace-node";
    card.append(
        createCardHeader(
            site.title,
            getCreatorSiteStatusLabel(site.status),
            site.status
        ),
        createDescription(site.description),
        createCreatorFeatureSummary(site, modules),
        createAction(`#creator-site-${site.creatorId}`, site.status, "Creator Site")
    );
    return card;
}

function createBrandWorkspaceContent(workspace, sections){
    const detail = createDetailCard(
        workspace?.id || "workspace-brand",
        workspace?.title || "Brand",
        getWorkspaceStatusLabel(workspace?.status),
        workspace?.status || "active",
        workspace?.description || "RELMUA brand-wide management area."
    );

    const container = document.createElement("section");
    container.className = "terminal-nested-section";

    const title = document.createElement("h4");
    title.textContent = "Brand";
    container.appendChild(title);

    const brandOnlySections = sections.filter(section => (
        !["profile", "trpg", "rules"].some(token => section.id.includes(token))
    ));
    const activeSections = brandOnlySections.filter(section => section.status === "active");
    const plannedSections = brandOnlySections.filter(section => section.status !== "active");

    container.append(
        createBrandSectionGroup("Available", activeSections),
        createBrandSectionGroup("Planned", plannedSections)
    );
    detail.appendChild(container);
    return detail;
}

function createBrandSectionGroup(titleText, sections){
    const group = document.createElement("section");
    group.className = "terminal-brand-section-group";

    const title = document.createElement("h5");
    title.textContent = titleText;
    group.appendChild(title);

    if(sections.length === 0){
        group.appendChild(createEmptyMessage("No items."));
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
        createAction(section.adminPath, section.status, "Admin")
    );
    return card;
}

function createCreatorSiteContent(site, modules){
    const detail = createDetailCard(
        `creator-site-${site.creatorId}`,
        site.title,
        getCreatorSiteStatusLabel(site.status),
        site.status,
        site.description
    );

    detail.append(
        createCreatorSiteSections(site),
        ...findCreatorFeatureGroups(site, modules).map(createCreatorFeatureGroup)
    );

    return detail;
}

function createCreatorSiteSections(site){
    const section = document.createElement("section");
    section.className = "terminal-nested-section";

    const title = document.createElement("h4");
    title.textContent = "Site";
    section.appendChild(title);

    const list = document.createElement("div");
    list.className = "terminal-brand-section-list";
    list.replaceChildren(...site.sections.map(createCreatorSectionCard));
    section.appendChild(list);
    return section;
}

function createCreatorSectionCard(section){
    const card = document.createElement("article");
    card.className = "terminal-brand-section";
    card.append(
        createCardHeader(
            section.title,
            getCreatorSiteStatusLabel(section.status),
            section.status
        ),
        createDescription(section.description),
        createAction(section.adminPath, section.status, "Admin")
    );
    return card;
}

function createCreatorFeatureGroup(module){
    const section = document.createElement("section");
    section.className = "terminal-nested-section";

    const title = document.createElement("h4");
    title.textContent = module.title;
    section.appendChild(title);

    const list = document.createElement("div");
    list.className = "terminal-feature-list";
    list.replaceChildren(...module.features.map(createFeatureCard));
    section.appendChild(list);
    return section;
}

function createFeatureCard(feature){
    const card = document.createElement("article");
    card.className = "terminal-feature";
    card.append(
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
        createAction(feature.publicPath, feature.status, "Public URL")
    );
    card.appendChild(actions);
    return card;
}

function createPublishCenterContent(workspace){
    return createDetailCard(
        workspace?.id || "workspace-publish-center",
        workspace?.title || "Publish Center",
        getWorkspaceStatusLabel(workspace?.status),
        workspace?.status || "planned",
        workspace?.description || "Future publishing and delivery management area."
    );
}

function createDetailCard(id, titleText, statusText, status, description){
    const detail = document.createElement("article");
    detail.id = id;
    detail.className = "terminal-card terminal-detail-card";
    detail.append(
        createCardHeader(titleText, statusText, status),
        createDescription(description),
        createOverviewBackLink()
    );
    return detail;
}

function createCreatorFeatureSummary(site, modules){
    const summary = document.createElement("div");
    summary.className = "terminal-module-summary";

    const label = document.createElement("span");
    label.textContent = "Features";
    summary.appendChild(label);

    findCreatorFeatureGroups(site, modules).forEach(module => {
        const link = document.createElement("a");
        link.href = `#creator-site-${site.creatorId}`;
        link.textContent = module.title;
        summary.appendChild(link);
    });

    return summary;
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

function createOverviewBackLink(){
    const actions = document.createElement("div");
    actions.className = "terminal-actions terminal-overview-actions";
    actions.appendChild(createAction("#terminalOverviewTitle", "active", "Terminal Overview"));
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

function findCreatorFeatureGroups(site, modules){
    return modules.filter(module => module.ownerCreatorId === site.creatorId);
}

function isSafeLink(path){
    const value = String(path || "").trim().toLowerCase();

    return Boolean(value) &&
        !value.startsWith("javascript:") &&
        !value.startsWith("data:") &&
        !value.startsWith("vbscript:");
}
