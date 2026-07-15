import {
    loadAdminTodaySummary
} from "../common/adminTodaySummary.js";

import {
    getActivityLog
} from "../system/activityLog.js";

import {
    runSystemValidation
} from "../system/validation/validationCenter.js";

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
    getSystemSections,
    getSystemSectionStatusLabel
} from "../system/systemSectionRegistry.js";

import {
    getWorkspaces,
    getWorkspaceStatusLabel,
    getWorkspaceTypeLabel
} from "../workspaces/workspaceRegistry.js";

const TOP_AREAS = Object.freeze([
    "today",
    "workspaces",
    "attention",
    "recent"
]);

export function renderTerminalShell({
    breadcrumbContainer,
    productionOverviewContainer,
    workspaceOverviewContainer,
    workspaceDetailContainer,
    statusElement
}){
    const workspaces = getWorkspaces();
    const modules = getModules();
    const brandSections = getBrandSections();
    const creatorSites = getCreatorSites();
    const systemSections = getSystemSections();

    breadcrumbContainer?.replaceChildren(
        createBreadcrumb(["RELMUA Terminal", "Production OS"])
    );

    productionOverviewContainer?.replaceChildren(
        ...TOP_AREAS.map(area => createTopArea(area, {
            workspaces,
            modules,
            brandSections,
            creatorSites,
            systemSections
        }))
    );

    workspaceOverviewContainer?.replaceChildren(
        createWorkspaceGroup("brand", workspaces.filter(workspace => workspace.type === "brand")),
        createCreatorWorkspaceGroup(creatorSites, modules),
        createSystemWorkspaceGroup(systemSections)
    );

    workspaceDetailContainer?.replaceChildren(
        createBrandWorkspaceContent(
            workspaces.find(workspace => workspace.id === "workspace-brand"),
            brandSections
        ),
        createCreatorsWorkspaceContent(
            workspaces.find(workspace => workspace.id === "workspace-creators"),
            creatorSites,
            modules
        ),
        createSystemWorkspaceContent(
            workspaces.find(workspace => workspace.id === "workspace-system"),
            systemSections
        )
    );

    if(statusElement){
        const activeCreators = creatorSites.filter(site => site.status === "active").length;
        const activeSystem = systemSections.filter(section => section.status === "active").length;
        statusElement.textContent =
            `Production OS ready: ${activeCreators} creators, ${activeSystem} system screens, ${modules.length} personal feature set.`;
    }
}

function createTopArea(area, context){
    if(area === "today"){
        const summary = safeTodaySummary();
        return createTopCard("今日の状況", "Save / Export / Backup / Build", [
            ["Public", `${valueOf(summary, "publicCount")} public items`],
            ["Draft", `${valueOf(summary, "draftCount")} waiting`],
            ["Recent", summary.recent?.[0]?.title || "No local edits yet"],
            ["Backup", summary.lastBackupText || "Confirmation required"]
        ], "../system/publish/");
    }

    if(area === "workspaces"){
        return createTopCard("Workspace", "Brand / Creators / System", [
            ["Brand", `${context.brandSections.filter(section => section.status === "active").length} active`],
            ["Creators", `${context.creatorSites.length} workspaces`],
            ["System", `${context.systemSections.length} screens`]
        ], "#workspace-brand");
    }

    if(area === "attention"){
        const validation = runSystemValidation();
        const critical = validation.issues.filter(issue => issue.severity === "critical").length;
        const high = validation.issues.filter(issue => issue.severity === "high").length;
        return createTopCard("注意", "Critical / High / Warning", [
            ["Critical", `${critical}`],
            ["High", `${high}`],
            ["Status", validation.status === "ok" ? "No blocking local issue" : "Review required"]
        ], "../system/publish/");
    }

    const recent = getActivityLog().slice(0, 3);
    return createTopCard("最近の操作", "Save / Export / Backup / Build", recent.length > 0
        ? recent.map(entry => [entry.action, entry.summary || entry.timestamp])
        : [["Activity Log", "No local activity has been recorded yet"]], "../system/logs/");
}

function createTopCard(titleText, subtitle, rows, href){
    const card = document.createElement("article");
    card.className = "terminal-top-card";
    const heading = document.createElement("h3");
    const lead = document.createElement("p");
    const list = document.createElement("dl");
    const action = document.createElement("a");

    heading.textContent = titleText;
    lead.textContent = subtitle;
    rows.forEach(([label, value]) => {
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        dt.textContent = label;
        dd.textContent = value;
        list.append(dt, dd);
    });
    action.href = href;
    action.textContent = "Open";
    action.className = "terminal-action";
    card.append(heading, lead, list, action);
    return card;
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

function createWorkspaceGroup(type, workspaces){
    const section = document.createElement("section");
    section.className = `terminal-workspace-group is-${type}`;
    section.id = `overview-${type}`;
    section.append(
        createGroupHead(`${getWorkspaceTypeLabel(type)} Workspace`, `${workspaces.length} workspace`),
        createNodeList(workspaces.map(createWorkspaceNode))
    );
    return section;
}

function createCreatorWorkspaceGroup(creatorSites, modules){
    const section = document.createElement("section");
    section.className = "terminal-workspace-group is-creator";
    section.id = "overview-creators";
    section.append(
        createGroupHead("Creator Workspaces", `${creatorSites.length} creators`),
        createNodeList(creatorSites.map(site => createCreatorSiteNode(site, modules)))
    );
    return section;
}

function createSystemWorkspaceGroup(systemSections){
    const section = document.createElement("section");
    section.className = "terminal-workspace-group is-system";
    section.id = "overview-system";
    section.append(
        createGroupHead("System Workspace", `${systemSections.length} screens`),
        createNodeList(systemSections.map(createSystemSectionNode))
    );
    return section;
}

function createGroupHead(titleText, countText){
    const heading = document.createElement("div");
    heading.className = "terminal-group-head";
    const title = document.createElement("h3");
    const count = document.createElement("span");
    title.textContent = titleText;
    count.className = "terminal-group-count";
    count.textContent = countText;
    heading.append(title, count);
    return heading;
}

function createNodeList(nodes){
    const list = document.createElement("div");
    list.className = "terminal-workspace-node-list";
    list.replaceChildren(...nodes);
    return list;
}

function createWorkspaceNode(workspace){
    const card = document.createElement("article");
    card.className = "terminal-workspace-node";
    card.append(
        createCardHeader(workspace.title, getWorkspaceStatusLabel(workspace.status), workspace.status),
        createDescription(workspace.description),
        createAction(workspace.adminPath, workspace.status, "Open")
    );
    return card;
}

function createSystemSectionNode(section){
    const card = document.createElement("article");
    card.className = "terminal-workspace-node";
    card.append(
        createCardHeader(section.title, getSystemSectionStatusLabel(section.status), section.status),
        createMeta(`Category: ${section.category}`),
        createDescription(section.description),
        createAction(section.adminPath, section.status, "Open")
    );
    return card;
}

function createCreatorSiteNode(site, modules){
    const card = document.createElement("article");
    const modulesForCreator = findCreatorModules(site, modules);
    card.className = "terminal-workspace-node";
    card.append(
        createCardHeader(site.title, getCreatorSiteStatusLabel(site.status), site.status),
        createDescription(site.description),
        createMeta(modulesForCreator.length ? `${modulesForCreator.length} personal feature set` : "No personal feature set"),
        createAction(`#creator-site-${site.creatorId}`, site.status, "Open")
    );
    return card;
}

function createBrandWorkspaceContent(workspace, sections){
    const detail = createDetailCard(
        workspace?.id || "workspace-brand",
        ["RELMUA Terminal", "Brand"],
        workspace?.title || "Brand",
        getWorkspaceStatusLabel(workspace?.status),
        workspace?.status || "active",
        workspace?.description || "Manage the public RELMUA brand site."
    );

    detail.append(
        createSectionGroup("Active Brand Areas", sections.filter(section => section.status === "active"), createBrandSectionCard),
        createSectionGroup("Planned Brand Areas", sections.filter(section => section.status !== "active"), createBrandSectionCard)
    );
    return detail;
}

function createCreatorsWorkspaceContent(workspace, creatorSites, modules){
    const detail = createDetailCard(
        workspace?.id || "workspace-creators",
        ["RELMUA Terminal", "Creators"],
        workspace?.title || "Creators",
        getWorkspaceStatusLabel(workspace?.status),
        workspace?.status || "active",
        workspace?.description || "Manage each creator site separately."
    );

    detail.append(...creatorSites.map(site => createCreatorSiteContent(site, modules)));
    return detail;
}

function createCreatorSiteContent(site, modules){
    const detail = document.createElement("section");
    detail.id = `creator-site-${site.creatorId}`;
    detail.className = "terminal-nested-section terminal-creator-workspace";

    detail.append(
        createInlineLocation(["RELMUA Terminal", "Creators", site.title]),
        createCardHeader(site.title, getCreatorSiteStatusLabel(site.status), site.status),
        createDescription(site.description),
        createSectionGroup("Creator Site", site.sections, createCreatorSectionCard)
    );

    const modulesForCreator = findCreatorModules(site, modules);
    if(modulesForCreator.length > 0){
        detail.append(...modulesForCreator.map(module => createCreatorModuleGroup(site, module)));
    }

    return detail;
}

function createCreatorModuleGroup(site, module){
    const section = document.createElement("section");
    section.className = "terminal-nested-section terminal-personal-module";

    section.append(
        createInlineLocation(["RELMUA Terminal", "Creators", site.title, module.title]),
        createCardHeader(module.title, getModuleStatusLabel(module.status), module.status),
        createDescription(module.description)
    );

    const actions = document.createElement("div");
    actions.className = "terminal-actions";
    actions.append(
        createAction(module.adminPath, module.status, "Scenario Admin"),
        createAction(module.publicPath, module.status, "Public")
    );

    const list = document.createElement("div");
    list.className = "terminal-feature-list";
    list.replaceChildren(...module.features.map(feature => createFeatureCard(site, module, feature)));

    section.append(actions, list);
    return section;
}

function createFeatureCard(site, module, feature){
    const card = document.createElement("article");
    card.className = "terminal-feature";
    card.append(
        createInlineLocation(["RELMUA Terminal", "Creators", site.title, module.title, feature.title]),
        createCardHeader(feature.title, getModuleStatusLabel(feature.status), feature.status),
        createDescription(feature.description)
    );

    const actions = document.createElement("div");
    actions.className = "terminal-actions";
    actions.append(
        createAction(feature.adminPath, feature.status, "Admin"),
        createAction(feature.publicPath, feature.status, "Public")
    );
    card.appendChild(actions);
    return card;
}

function createSystemWorkspaceContent(workspace, sections){
    const detail = createDetailCard(
        workspace?.id || "workspace-system",
        ["RELMUA Terminal", "System"],
        workspace?.title || "System",
        getWorkspaceStatusLabel(workspace?.status),
        workspace?.status || "active",
        workspace?.description || "Production OS safety, export, validation, build, and release checks."
    );

    const list = document.createElement("div");
    list.className = "terminal-operations-grid";
    list.replaceChildren(...sections.map(createSystemOperationCard));
    detail.append(list);
    return detail;
}

function createSectionGroup(titleText, sections, renderer){
    const group = document.createElement("section");
    group.className = "terminal-nested-section terminal-brand-section-group";
    const title = document.createElement("h4");
    title.textContent = titleText;
    group.appendChild(title);

    if(sections.length === 0){
        group.appendChild(createEmptyMessage("No entries."));
        return group;
    }

    const list = document.createElement("div");
    list.className = "terminal-brand-section-list";
    list.replaceChildren(...sections.map(renderer));
    group.appendChild(list);
    return group;
}

function createBrandSectionCard(section){
    const card = document.createElement("article");
    card.className = "terminal-brand-section";
    card.append(
        createCardHeader(section.title, getBrandSectionStatusLabel(section.status), section.status),
        createMeta(`Category: ${section.category}`),
        createDescription(section.description),
        createAction(section.adminPath, section.status, "Open")
    );
    return card;
}

function createCreatorSectionCard(section){
    const card = document.createElement("article");
    card.className = "terminal-brand-section";
    card.append(
        createCardHeader(section.title, getCreatorSiteStatusLabel(section.status), section.status),
        createDescription(section.description),
        createAction(section.adminPath, section.status, "Open")
    );
    return card;
}

function createSystemOperationCard(section){
    const card = document.createElement("article");
    card.className = `terminal-operation is-${section.status}`;
    card.append(
        createCardHeader(section.title, getSystemSectionStatusLabel(section.status), section.status),
        createMeta(`Category: ${section.category}`),
        createDescription(section.description),
        createAction(section.adminPath, section.status, "Open")
    );
    return card;
}

function createDetailCard(id, locationItems, titleText, statusText, status, description){
    const detail = document.createElement("article");
    detail.id = id;
    detail.className = "terminal-card terminal-detail-card";
    detail.append(
        createInlineLocation(locationItems),
        createCardHeader(titleText, statusText, status),
        createDescription(description),
        createOverviewBackLink()
    );
    return detail;
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

function createInlineLocation(items){
    const location = document.createElement("p");
    location.className = "terminal-current-location";
    location.textContent = items.join(" / ");
    return location;
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
        text.textContent = status === "planned" ? "Planned" : "Unavailable";
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

function findCreatorModules(site, modules){
    return modules.filter(module => module.ownerCreatorId === site.creatorId);
}

function isSafeLink(path){
    const value = String(path || "").trim().toLowerCase();

    return Boolean(value) &&
        !value.startsWith("javascript:") &&
        !value.startsWith("data:") &&
        !value.startsWith("vbscript:");
}

function safeTodaySummary(){
    try{
        return loadAdminTodaySummary();
    }catch{
        return {
            metrics: [],
            recent: [],
            lastBackupText: "Confirmation required"
        };
    }
}

function valueOf(summary, key){
    if(key === "publicCount"){
        return summary.metrics?.find(metric => /public|公開/i.test(metric.label))?.value ?? 0;
    }

    if(key === "draftCount"){
        return summary.metrics?.find(metric => /draft|待ち|下書き/i.test(metric.label))?.value ?? 0;
    }

    return 0;
}
