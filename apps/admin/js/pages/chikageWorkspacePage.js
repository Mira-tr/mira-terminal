import {
    getCreators
} from "../features/creators/creatorStore.js";

import {
    hydrateCreatorsFromCms
} from "../features/creators/creatorCmsStore.js";

import {
    getOwnerScenarios,
    hydrateScenariosFromCms
} from "../features/trpg/scenarios/scenarioCmsStore.js";

import {
    buildChikageWorkspaceSummary,
    CHIKAGE_CREATOR_ID,
    createChikageWorkspaceDestinations,
    formatChikageWorkspaceTimestamp
} from "../features/creators/chikageWorkspace.js";

import {
    initToastService,
    showToast
} from "../features/common/toastService.js";

initToastService();
initWorkspace();

async function initWorkspace(){
    setLoading(true);

    const [creatorResult, scenarioResult] = await Promise.allSettled([
        hydrateCreatorsFromCms(),
        hydrateScenariosFromCms(CHIKAGE_CREATOR_ID)
    ]);

    if(creatorResult.status === "rejected"){
        console.warn("[cms] Failed to hydrate Chikage Creator", creatorResult.reason);
        showToast(
            creatorResult.reason?.message || "千景のCreator情報をDBから読み込めませんでした。この端末のcacheを表示します。",
            "warning"
        );
    }

    if(scenarioResult.status === "rejected"){
        console.warn("[cms] Failed to hydrate Chikage scenarios", scenarioResult.reason);
    }

    const collection = getCreators();
    const creator = collection.creators.find(item => item.id === CHIKAGE_CREATOR_ID);

    if(!creator){
        renderMissingCreator();
        setLoading(false);
        return;
    }

    const scenarios = getOwnerScenarios(CHIKAGE_CREATOR_ID);
    const summary = buildChikageWorkspaceSummary(creator, scenarios);

    renderHero(summary, collection.primaryCreatorId === CHIKAGE_CREATOR_ID);
    renderMetrics(summary);
    renderDestinations(summary);
    renderPublication(summary);
    renderPublicSiteLink();
    renderDataSourceState(creatorResult, scenarioResult);
    setLoading(false);
}

function renderHero(summary, isPrimary){
    setText("chikageWorkspaceTitle", summary.displayName);
    setText("chikageWorkspaceBio", summary.bio || "Bioはまだ設定されていません。");
    setText("chikageWorkspaceSlug", `/${summary.slug}/`);
    setText("chikageWorkspaceUpdated", `最終更新 ${formatChikageWorkspaceTimestamp(summary.updatedAt)}`);

    const status = document.getElementById("chikageWorkspaceStatus");
    status.textContent = statusLabel(summary.status);
    status.className = `status-badge creator-workspace-status is-${summary.status}`;

    const primary = document.getElementById("chikageWorkspacePrimary");
    primary.textContent = isPrimary ? "Primary Creator" : "Creator";
    primary.classList.toggle("is-primary", isPrimary);
}

function renderMetrics(summary){
    const container = document.getElementById("chikageWorkspaceMetrics");
    const metrics = [
        ["作品", summary.works.total, `Public ${summary.works.public}`],
        ["公開連絡先", summary.links.total, `Public ${summary.links.public}`],
        ["TRPGシナリオ", summary.scenarios.total, `Public ${summary.scenarios.public}`]
    ];

    container.replaceChildren(...metrics.map(([label, value, note]) => {
        const card = document.createElement("article");
        card.className = "creator-workspace-metric";

        const name = document.createElement("span");
        name.textContent = label;
        const count = document.createElement("strong");
        count.textContent = String(value);
        const detail = document.createElement("small");
        detail.textContent = note;

        card.append(name, count, detail);
        return card;
    }));
}

function renderDestinations(summary){
    const container = document.getElementById("chikageWorkspaceDestinations");
    const counters = {
        works: summary.works,
        contact: summary.links,
        trpg: summary.scenarios
    };

    container.replaceChildren(
        ...createChikageWorkspaceDestinations().map(destination => {
            const link = document.createElement("a");
            link.className = "creator-workspace-card";
            link.href = destination.href;

            const header = document.createElement("div");
            header.className = "creator-workspace-card-header";
            const title = document.createElement("h3");
            title.textContent = destination.title;
            const arrow = document.createElement("span");
            arrow.className = "creator-workspace-card-arrow";
            arrow.setAttribute("aria-hidden", "true");
            arrow.textContent = "→";
            header.append(title, arrow);

            const description = document.createElement("p");
            description.textContent = destination.description;

            const footer = document.createElement("div");
            footer.className = "creator-workspace-card-footer";
            const action = document.createElement("strong");
            action.textContent = destination.action;
            footer.appendChild(action);

            const counts = counters[destination.id];
            if(counts){
                const meta = document.createElement("span");
                meta.textContent = `${counts.total}件 / Public ${counts.public}`;
                footer.appendChild(meta);
            }

            link.append(header, description, footer);
            return link;
        })
    );
}

function renderPublication(summary){
    const container = document.getElementById("chikagePublicationSummary");
    const rows = [
        ["Creator", statusLabel(summary.status), summary.status === "public" ? "公開対象" : "非公開"],
        ["作品", `${summary.works.public} / ${summary.works.total} Public`, summary.works.total ? "作品編集から変更" : "未登録"],
        ["公開連絡先", `${summary.links.public} / ${summary.links.total} Public`, summary.links.total ? "連絡先編集から変更" : "未登録"],
        ["TRPGシナリオ", `${summary.scenarios.public} / ${summary.scenarios.total} Public`, summary.scenarios.total ? "シナリオ管理から変更" : "未登録"]
    ];

    container.replaceChildren(...rows.map(([label, value, note]) => {
        const row = document.createElement("div");
        row.className = "creator-workspace-publication-row";
        const name = document.createElement("span");
        name.textContent = label;
        const content = document.createElement("strong");
        content.textContent = value;
        const detail = document.createElement("small");
        detail.textContent = note;
        row.append(name, content, detail);
        return row;
    }));
}

function renderPublicSiteLink(){
    const link = document.getElementById("chikagePublicSiteLink");
    link.href = resolvePublicCreatorHref();
}

function renderDataSourceState(creatorResult, scenarioResult){
    const note = document.getElementById("chikageWorkspaceSource");
    const cmsCount = [creatorResult, scenarioResult]
        .filter(result => result.status === "fulfilled")
        .length;

    if(cmsCount === 2){
        note.textContent = "CMS同期済み。表示中の内容はProduction CMSから取得しています。";
        note.classList.add("is-ready");
        return;
    }

    note.textContent = "一部データをCMSから取得できなかったため、この端末の互換cacheを含めて表示しています。";
    note.classList.add("has-warning");
}

function renderMissingCreator(){
    const content = document.getElementById("chikageWorkspaceContent");
    content.hidden = true;

    const missing = document.getElementById("chikageWorkspaceMissing");
    missing.hidden = false;
    missing.querySelector("p").textContent = "千景のCreatorデータが見つかりません。Creators管理から状態を確認してください。";
}

function setLoading(loading){
    const loadingNode = document.getElementById("chikageWorkspaceLoading");
    loadingNode.hidden = !loading;
    document.getElementById("chikageWorkspaceContent").hidden = loading;
}

function setText(id, value){
    const node = document.getElementById(id);
    if(node){
        node.textContent = value;
    }
}

function statusLabel(status){
    return ({
        public: "Public",
        draft: "Draft",
        private: "Private"
    })[status] || "Draft";
}

function resolvePublicCreatorHref(){
    const path = String(location.pathname || "").replaceAll("\\", "/");
    return path.includes("/apps/admin/")
        ? "../../../web/creators/chikage/"
        : "../../../creators/chikage/";
}
