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

const OVERVIEW_TYPES = ["brand", "creator", "system"];

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
    const systemSections = getSystemSections();

    if(breadcrumbContainer){
        breadcrumbContainer.replaceChildren(
            createBreadcrumb(["RELMUA Terminal", "Workspace Navigation"])
        );
    }

    if(workspaceOverviewContainer){
        workspaceOverviewContainer.replaceChildren(
            ...OVERVIEW_TYPES.map(type => createWorkspaceGroup({
                type,
                workspaces: workspaces.filter(workspace => workspace.type === type),
                creatorSites,
                modules,
                systemSections
            }))
        );
    }

    if(workspaceDetailContainer){
        workspaceDetailContainer.replaceChildren(
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
    }

    if(statusElement){
        const activeCreators = creatorSites.filter(site => site.status === "active").length;
        const activeSystem = systemSections.filter(section => section.status === "active").length;
        const activeModules = modules.filter(module => module.status === "active").length;

        statusElement.textContent =
            `Brand / Creators / System: ${activeCreators} creators, ${activeModules} personal module, ${activeSystem} system entries active`;
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

function createWorkspaceGroup({
    type,
    workspaces,
    creatorSites,
    modules,
    systemSections
}){
    const section = document.createElement("section");
    section.className = `terminal-workspace-group is-${type}`;
    section.id = type === "creator"
        ? "creator-workspaces"
        : `overview-${type}`;

    const heading = document.createElement("div");
    heading.className = "terminal-group-head";

    const title = document.createElement("h3");
    title.textContent = type === "creator"
        ? "Creator Workspaces"
        : `${getWorkspaceTypeLabel(type)} Workspace`;

    const count = document.createElement("span");
    count.className = "terminal-group-count";
    count.textContent = createGroupCount(type, workspaces, creatorSites, systemSections);

    heading.append(title, count);
    section.appendChild(heading);

    const list = document.createElement("div");
    list.className = "terminal-workspace-node-list";

    if(type === "creator"){
        list.replaceChildren(...creatorSites.map(site => createCreatorSiteNode(site, modules)));
    }else if(type === "system"){
        list.replaceChildren(
            ...workspaces.map(createWorkspaceNode),
            ...systemSections.map(createSystemSectionNode)
        );
    }else{
        list.replaceChildren(...workspaces.map(createWorkspaceNode));
    }

    section.appendChild(list);
    return section;
}

function createGroupCount(type, workspaces, creatorSites, systemSections){
    if(type === "creator"){
        return `${creatorSites.length} creators`;
    }

    if(type === "system"){
        return `${systemSections.length} entries`;
    }

    return `${workspaces.length} workspace`;
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
        createAction(workspace.adminPath, workspace.status, "詳細")
    );
    return card;
}

function createSystemSectionNode(section){
    const card = document.createElement("article");
    card.className = "terminal-workspace-node";
    card.append(
        createCardHeader(
            section.title,
            getSystemSectionStatusLabel(section.status),
            section.status
        ),
        createMeta(`Category: ${section.category}`),
        createDescription(section.description),
        createAction(section.adminPath, section.status, "入口")
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
        createCreatorModuleSummary(site, modules),
        createAction(`#creator-site-${site.creatorId}`, site.status, "Creator Workspace")
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
        workspace?.description || "RELMUAブランド全体の公開構成とコンテンツ入口です。"
    );

    const activeSections = sections.filter(section => section.status === "active");
    const plannedSections = sections.filter(section => section.status !== "active");

    detail.append(
        createBrandSectionGroup("利用可能", activeSections),
        createBrandSectionGroup("計画中", plannedSections)
    );
    return detail;
}

function createBrandSectionGroup(titleText, sections){
    const group = document.createElement("section");
    group.className = "terminal-nested-section terminal-brand-section-group";

    const title = document.createElement("h4");
    title.textContent = titleText;
    group.appendChild(title);

    if(sections.length === 0){
        group.appendChild(createEmptyMessage("項目はありません。"));
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

function createCreatorsWorkspaceContent(workspace, creatorSites, modules){
    const detail = createDetailCard(
        workspace?.id || "workspace-creators",
        ["RELMUA Terminal", "Creators"],
        workspace?.title || "Creators",
        getWorkspaceStatusLabel(workspace?.status),
        workspace?.status || "active",
        workspace?.description || "RELMUAに参加するCreatorごとのWorkspace入口です。"
    );

    detail.append(...creatorSites.map(site => createCreatorSiteContent(site, modules)));
    return detail;
}

function createCreatorSiteContent(site, modules){
    const detail = document.createElement("section");
    detail.id = `creator-site-${site.creatorId}`;
    detail.className = "terminal-nested-section terminal-creator-workspace";

    const title = document.createElement("h4");
    title.textContent = site.title;

    const breadcrumb = createInlineLocation([
        "RELMUA Terminal",
        "Creators",
        site.title
    ]);

    detail.append(
        breadcrumb,
        createCardHeader(
            site.title,
            getCreatorSiteStatusLabel(site.status),
            site.status
        ),
        createDescription(site.description),
        createCreatorSiteSections(site)
    );

    const modulesForCreator = findCreatorModules(site, modules);
    if(modulesForCreator.length > 0){
        detail.append(...modulesForCreator.map(module => createCreatorModuleGroup(site, module)));
    }

    return detail;
}

function createCreatorSiteSections(site){
    const section = document.createElement("section");
    section.className = "terminal-nested-section";

    const title = document.createElement("h5");
    title.textContent = "Creator Site";
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

function createCreatorModuleGroup(site, module){
    const section = document.createElement("section");
    section.className = "terminal-nested-section terminal-personal-module";

    section.append(
        createInlineLocation([
            "RELMUA Terminal",
            "Creators",
            site.title,
            module.title
        ]),
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
        createAction(module.adminPath, module.status, "Module Admin"),
        createAction(module.publicPath, module.status, "Public URL")
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
        createInlineLocation([
            "RELMUA Terminal",
            "Creators",
            site.title,
            module.title,
            feature.title
        ]),
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

function createSystemWorkspaceContent(workspace, sections){
    const detail = createDetailCard(
        workspace?.id || "workspace-system",
        ["RELMUA Terminal", "System"],
        workspace?.title || "System",
        getWorkspaceStatusLabel(workspace?.status),
        workspace?.status || "active",
        workspace?.description || "Backup、Import、Export、Settings、Publish、Activity Logを扱う運用基盤です。"
    );

    const list = document.createElement("div");
    list.className = "terminal-operations-grid";
    list.replaceChildren(...sections.map(createSystemOperationCard));

    const accessModel = document.createElement("section");
    accessModel.className = "terminal-nested-section terminal-access-model";
    const title = document.createElement("h4");
    title.textContent = "Future Access Model";
    const description = createDescription(
        "現Phaseでは認証・権限制御を実装しません。将来、AdministratorはBrand・全Creator・Systemへ、Creatorは自分のWorkspaceへ接続できる前提でWorkspaceを分離しています。"
    );
    accessModel.append(title, description);

    detail.append(list, accessModel);
    return detail;
}

function createSystemOperationCard(section){
    const card = document.createElement("article");
    card.className = `terminal-operation is-${section.status}`;
    card.append(
        createCardHeader(
            section.title,
            getSystemSectionStatusLabel(section.status),
            section.status
        ),
        createMeta(`Category: ${section.category}`),
        createDescription(section.description),
        createAction(section.adminPath, section.status, "入口")
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

function createCreatorModuleSummary(site, modules){
    const summary = document.createElement("div");
    summary.className = "terminal-module-summary";

    const label = document.createElement("span");
    label.textContent = "Personal Module";
    summary.appendChild(label);

    const modulesForCreator = findCreatorModules(site, modules);
    if(modulesForCreator.length === 0){
        const empty = document.createElement("span");
        empty.textContent = "なし";
        summary.appendChild(empty);
        return summary;
    }

    modulesForCreator.forEach(module => {
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
        text.textContent = status === "active"
            ? "利用不可"
            : status === "planned"
                ? "計画中"
                : "確認必要";
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
