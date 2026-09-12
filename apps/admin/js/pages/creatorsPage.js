import {
    initCreatorForm
} from "../features/creators/creatorForm.js";

import {
    getCreatorSites,
    getCreatorSiteStatusLabel
} from "../features/creators/creatorSiteRegistry.js";

import {
    createCreatorEditRoute
} from "../features/creators/creatorRouteState.js";

import {
    getCreators
} from "../features/creators/creatorStore.js";

import {
    createCreatorWorkspaces
} from "../features/creators/creatorWorkspace.js";

import {
    getCreatorPublicationIssue
} from "../features/creators/creatorPublication.js";

import {
    exportPublicCreators
} from "../features/creators/creatorPublicExport.js";

import {
    exportBackupCreators,
    importBackupCreators
} from "../features/creators/creatorBackup.js";

import {
    initToastService,
    runToastOperation,
    showToast
} from "../features/common/toastService.js";

initToastService();
const form = initCreatorForm({
    initialCreatorId: new URLSearchParams(window.location.search).get("creator") || "",
    onEditStateChange: syncCreatorRoute,
    onCollectionChange: renderCreatorWorkspaces,
    validateBeforeSave: validateCreatorBeforeSave
});

function validateCreatorBeforeSave(data, editingId){
    const issue = getCreatorPublicationIssue(
        {
            ...data,
            id: editingId
        },
        getCreatorSites()
    );

    if(issue){
        throw new Error(issue);
    }
}

function syncCreatorRoute(creatorId){
    const nextRoute = createCreatorEditRoute(window.location.href, creatorId);
    window.history.replaceState(null, "", nextRoute);
}

function renderCreatorWorkspaces(){
    const container = document.getElementById("creatorWorkspaces");
    if(!container){
        return;
    }

    const workspaces = createCreatorWorkspaces(getCreators(), getCreatorSites());

    container.replaceChildren(...workspaces.map(site => {
        const card = document.createElement("article");
        card.className = "module-card";
        const inner = document.createElement("div");
        inner.className = "module-card-inner";
        const title = document.createElement("h4");
        title.textContent = site.title;
        const description = document.createElement("p");
        description.textContent = site.description;
        const featureSummary = document.createElement("p");
        featureSummary.className = "panel-note";
        const featureLabels = site.features.map(feature => feature.title).filter(Boolean);
        featureSummary.textContent = featureLabels.length
            ? `${featureLabels.length}個の機能をCreator Workspaceで管理: ${featureLabels.join(" / ")}`
            : "Creator Workspaceで管理する機能はまだありません。";
        const destinations = createDestinationList(site);
        const actions = document.createElement("div");
        actions.className = "management-item-actions";

        if(site.adminPath){
            actions.appendChild(createWorkspaceLink("Creator Workspaceを開く", site.adminPath, "primary"));
        }
        if(site.publicPath){
            actions.appendChild(createWorkspaceLink(
                "個人サイトを見る",
                resolveCreatorPublicPath(site.publicPath),
                "secondary",
                true
            ));
        }

        inner.append(title, description, featureSummary, destinations, actions);
        card.appendChild(inner);
        return card;
    }));
}

function createDestinationList(site){
    const list = document.createElement("ul");
    list.className = "creator-destination-list";

    site.sections.forEach(section => {
        const item = document.createElement("li");
        const name = section.status === "active" && section.adminPath
            ? createWorkspaceLink(section.title, section.adminPath)
            : document.createElement("span");
        name.textContent = section.title;

        const status = document.createElement("span");
        status.className = `creator-destination-status is-${section.status}`;
        status.textContent = getCreatorSiteStatusLabel(section.status);

        item.append(name, status);
        list.appendChild(item);
    });

    return list;
}

function createWorkspaceLink(label, href, tone = "secondary", external = false){
    const link = document.createElement("a");
    link.className = `button button-${tone}`;
    link.href = href;
    link.textContent = label;
    if(external){
        link.target = "_blank";
        link.rel = "noopener";
    }
    return link;
}

function resolveCreatorPublicPath(path){
    const href = String(path || "");
    const currentPath = String(location.pathname || "").replaceAll("\\", "/");
    if(currentPath.includes("/apps/admin/")){
        return href;
    }

    return href.startsWith("../../web/")
        ? href.replace("../../web/", "../../")
        : href;
}

document.getElementById("publicExportBtn")
    .addEventListener("click", async () => {
        await form.ready;
        return runToastOperation(
            exportPublicCreators,
            { errorMessage: "Public JSONの出力に失敗しました" }
        );
    });

document.getElementById("backupExportBtn")
    .addEventListener("click", async () => {
        await form.ready;
        return runToastOperation(
            exportBackupCreators,
            {
                successMessage: "Backupを出力しました",
                errorMessage: "Backupの出力に失敗しました"
            }
        );
    });

document.getElementById("backupImportBtn")
    .addEventListener("click", () => {
        document.getElementById("backupImportInput").click();
    });

document.getElementById("backupImportInput")
    .addEventListener("change", async event => {
        const file = event.target.files[0];

        if(!file){
            return;
        }

        await form.ready;
        const success = await runToastOperation(
            () => importBackupCreators(file),
            { errorMessage: "読み込みに失敗しました" }
        );

        if(success){
            form.clear();
            form.refresh();
            showToast("Backupを読み込みました", "success");
        }

        event.target.value = "";
    });
