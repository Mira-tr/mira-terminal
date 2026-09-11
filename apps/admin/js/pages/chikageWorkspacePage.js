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
    createChikageWorkspaceDestinationGroups,
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

    renderHero(summary);
    renderMetrics(summary);
    renderDestinations(summary);
    renderPublication(summary);
    renderPublicSiteLink();
    renderDataSourceState(creatorResult, scenarioResult);
    setLoading(false);
}

function renderHero(summary){
    setText("chikageWorkspaceTitle", summary.displayName);
    setText("chikageWorkspaceBio", summary.bio || "Bioはまだ設定されていません。");
    setText("chikageWorkspaceUpdated", `最終更新 ${formatChikageWorkspaceTimestamp(summary.updatedAt)}`);

    const status = document.getElementById("chikageWorkspaceStatus");
    status.textContent = statusLabel(summary.status);
    status.className = `status-badge creator-workspace-status is-${summary.status}`;
}

function renderMetrics(summary){
    const container = document.getElementById("chikageWorkspaceMetrics");
    const metrics = [
        ["作品", summary.works.total, `公開 ${summary.works.public}`],
        ["連絡先", summary.links.total, `公開 ${summary.links.public}`],
        ["シナリオ", summary.scenarios.total, `公開 ${summary.scenarios.public}`]
    ];

    container.replaceChildren(...metrics.map(([label, value, note]) => {
        const item = document.createElement("div");
        item.className = "creator-workspace-metric";

        const name = document.createElement("span");
        name.textContent = label;
        const count = document.createElement("strong");
        count.textContent = String(value);
        const detail = document.createElement("small");
        detail.textContent = note;

        item.append(name, count, detail);
        return item;
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
        ...createChikageWorkspaceDestinationGroups().map(group => {
            const panel = document.createElement("section");
            panel.className = "creator-workspace-group";

            const title = document.createElement("h3");
            title.className = "creator-workspace-group-title";
            title.textContent = group.title;

            const list = document.createElement("div");
            list.className = "creator-workspace-action-list";

            list.replaceChildren(...group.items.map(destination => {
                const link = document.createElement("a");
                link.className = "creator-workspace-action";
                link.href = destination.href;

                const copy = document.createElement("span");
                copy.className = "creator-workspace-action-copy";
                const name = document.createElement("strong");
                name.textContent = destination.title;
                const description = document.createElement("small");
                description.textContent = destination.description;
                copy.append(name, description);

                const side = document.createElement("span");
                side.className = "creator-workspace-action-side";
                const counts = counters[destination.id];
                if(counts){
                    const meta = document.createElement("small");
                    meta.textContent = `${counts.public}/${counts.total} 公開`;
                    side.appendChild(meta);
                }

                const arrow = document.createElement("span");
                arrow.className = "creator-workspace-action-arrow";
                arrow.setAttribute("aria-hidden", "true");
                arrow.textContent = "→";
                side.appendChild(arrow);

                link.append(copy, side);
                return link;
            }));

            panel.append(title, list);
            return panel;
        })
    );
}

function renderPublication(summary){
    const container = document.getElementById("chikagePublicationSummary");

    const state = document.createElement("strong");
    state.textContent = publicationStateLabel(summary.status);

    const detail = document.createElement("span");
    detail.textContent = [
        `作品 ${summary.works.public}/${summary.works.total}`,
        `連絡先 ${summary.links.public}/${summary.links.total}`,
        `シナリオ ${summary.scenarios.public}/${summary.scenarios.total}`
    ].join(" ・ ");

    container.replaceChildren(state, detail);
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
        note.textContent = "CMS同期済み";
        note.classList.add("is-ready");
        return;
    }

    note.textContent = "CMS取得に失敗した項目があります。互換cacheを含む表示です。";
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

function publicationStateLabel(status){
    return ({
        public: "千景ページは公開対象です",
        draft: "千景ページはDraftです",
        private: "千景ページは非公開です"
    })[status] || "千景ページはDraftです";
}

function resolvePublicCreatorHref(){
    const path = String(location.pathname || "").replaceAll("\\", "/");
    return path.includes("/apps/admin/")
        ? "../../../web/creators/chikage/"
        : "../../../creators/chikage/";
}
