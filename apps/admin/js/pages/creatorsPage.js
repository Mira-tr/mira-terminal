import {
    initCreatorForm
} from "../features/creators/creatorForm.js";

import {
    getCreatorSites,
    getCreatorSiteStatusLabel
} from "../features/creators/creatorSiteRegistry.js";

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
renderCreatorWorkspaces();
const form = initCreatorForm({
    initialCreatorId: new URLSearchParams(window.location.search).get("creator") || ""
});

function renderCreatorWorkspaces(){
    const container = document.getElementById("creatorWorkspaces");
    if(!container){
        return;
    }

    container.replaceChildren(...getCreatorSites().map(site => {
        const card = document.createElement("article");
        card.className = "module-card";
        const inner = document.createElement("div");
        inner.className = "module-card-inner";
        const title = document.createElement("h4");
        title.textContent = site.title;
        const description = document.createElement("p");
        description.textContent = site.description;
        const destinations = createDestinationList(site);
        const actions = document.createElement("div");
        actions.className = "management-item-actions";

        actions.append(
            createWorkspaceLink("個人サイトを見る", `../../web/creators/${site.slug}/`),
            ...site.features.map(feature => createWorkspaceLink(feature.title, feature.adminPath))
        );

        inner.append(title, description, destinations, actions);
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

function createWorkspaceLink(label, href){
    const link = document.createElement("a");
    link.className = "button button-secondary";
    link.href = href;
    link.textContent = label;
    return link;
}

document.getElementById("publicExportBtn")
    .addEventListener("click", () => runToastOperation(
        exportPublicCreators,
        { errorMessage: "Public JSONの出力に失敗しました" }
    ));

document.getElementById("backupExportBtn")
    .addEventListener("click", () => runToastOperation(
        exportBackupCreators,
        {
            successMessage: "Backupを出力しました",
            errorMessage: "Backupの出力に失敗しました"
        }
    ));

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
