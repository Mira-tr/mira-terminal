import {
    getAdminDashboardBackupText,
    loadAdminDashboardCards
} from "../features/common/adminDashboard.js";

import {
    initToastService
} from "../features/common/toastService.js";

initToastService();
renderDashboard();

function renderDashboard(){
    const container = document.getElementById("moduleDashboard");
    const cards = loadAdminDashboardCards();

    container.replaceChildren(
        ...cards.map(createModuleCard)
    );

    document.getElementById("lastBackupExportAt").textContent =
        getAdminDashboardBackupText();
}

function createModuleCard(card){
    const link = document.createElement("a");
    link.className = "module-card dashboard-module-card";
    link.href = card.href;
    link.setAttribute("aria-label", `${card.title}を開く`);

    if(card.error){
        link.classList.add("has-error");
    }

    const inner = document.createElement("div");
    inner.className = "module-card-inner dashboard-module-card-inner";

    const header = document.createElement("div");
    header.className = "dashboard-card-header";

    const title = document.createElement("h3");
    title.textContent = card.title;

    const openLabel = document.createElement("span");
    openLabel.className = "dashboard-card-open";
    openLabel.setAttribute("aria-hidden", "true");
    openLabel.textContent = "開く";

    const description = document.createElement("p");
    description.className = "dashboard-card-description";
    description.textContent = card.description;

    header.append(title, openLabel);
    inner.append(header, description);

    if(card.error){
        inner.appendChild(createErrorMessage(card.error));
    }else{
        inner.append(
            createPrimaryStat(card.primary),
            createStats(card.stats),
            createUpdatedAt(card.lastUpdated)
        );
    }

    link.appendChild(inner);
    return link;
}

function createPrimaryStat(primary){
    const container = document.createElement("div");
    container.className = "dashboard-primary-stat";

    const label = document.createElement("span");
    label.className = "dashboard-primary-label";
    label.textContent = primary.label;

    const value = document.createElement("strong");
    value.className = "dashboard-primary-value";
    value.textContent = `${primary.value}${primary.suffix}`;

    container.append(label, value);
    return container;
}

function createStats(stats){
    const list = document.createElement("dl");
    list.className = "dashboard-stats";

    stats.forEach(stat => {
        const item = document.createElement("div");
        item.className = `dashboard-stat dashboard-stat-${stat.tone}`;

        const label = document.createElement("dt");
        label.textContent = stat.label;

        const value = document.createElement("dd");
        value.textContent = String(stat.value);

        item.append(label, value);
        list.appendChild(item);
    });

    return list;
}

function createUpdatedAt(value){
    const text = document.createElement("p");
    text.className = "dashboard-updated-at";
    text.textContent = value;
    return text;
}

function createErrorMessage(message){
    const error = document.createElement("p");
    error.className = "dashboard-card-error";
    error.setAttribute("role", "status");
    error.textContent = message;
    return error;
}
