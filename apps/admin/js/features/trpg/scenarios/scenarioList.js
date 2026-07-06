import {
    getScenarios
} from "./scenarioStore.js";

import {
    ratingText
} from "./scenarioUtils.js";

import {
    filterScenarios
} from "./scenarioFilter.js";

let handlers = {};

export function initScenarioList(events){
    handlers = events;
}

export function renderScenarioList(){
    const list = document.getElementById("scenarioList");
    const searchInput = document.getElementById("search");
    const sortSelect = document.getElementById("sort");
    const statusFilter = document.getElementById("statusFilter");
    const systemFilter = document.getElementById("systemFilter");

    const result = filterScenarios(
        getScenarios(),
        {
            keyword: searchInput.value,
            status: statusFilter.value,
            system: systemFilter.value,
            sort: sortSelect.value
        }
    );

    list.innerHTML = "";

    result.forEach(scenario=>{
        list.appendChild(
            createScenarioCard(scenario)
        );
    });
}

function createScenarioCard(s){
    const div = document.createElement("div");
    div.className = "scenario-item";

    div.innerHTML = `
        <div class="scenario-main">
            <div class="scenario-head">
                <div class="scenario-title">
                    ${escapeHtml(s.title || "無題")}
                </div>

                <span class="status-badge ${statusClass(s.status)}">
                    ${statusText(s.status)}
                </span>

                <span class="rating-badge ${ratingClass(s.rating)}">
                    ${ratingText(s.rating)}
                </span>
            </div>

            <div class="scenario-meta">
                <span>${escapeHtml(s.system || "システム不明")}</span>
                <span>/</span>
                <span>${escapeHtml(s.playersRaw || "人数不明")}</span>
                <span>/</span>
                <span>${escapeHtml(s.timeRaw || "時間不明")}</span>
                <span>/</span>
                <span>${escapeHtml(s.loss || "ロスト率不明")}</span>
            </div>

            <div class="scenario-tags">
                ${
                    (s.tags || [])
                    .slice(0,4)
                    .map(tag=>`<span class="tag">#${escapeHtml(tag)}</span>`)
                    .join("")
                }
            </div>
        </div>
    `;

    const buttonArea = document.createElement("div");
    buttonArea.className = "card-buttons";

    const detailBtn = document.createElement("button");
    detailBtn.type = "button";
    detailBtn.textContent = "詳細";

    detailBtn.addEventListener("click",()=>{
        handlers.onDetail(s.id);
    });

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "編集";

    editBtn.addEventListener("click",()=>{
        handlers.onEdit(s.id);
    });

    buttonArea.append(detailBtn, editBtn);
    div.appendChild(buttonArea);

    return div;
}

function statusText(status){
    return {
        draft: "未整理",
        ready: "整理済み",
        public: "公開",
        private: "非公開"
    }[status || "draft"];
}

function statusClass(status){
    return {
        draft: "status-draft",
        ready: "status-ready",
        public: "status-public",
        private: "status-private"
    }[status || "draft"];
}

function ratingClass(rating){
    return {
        all: "rating-all",
        r18: "rating-r18",
        r18g: "rating-r18g"
    }[rating || "all"];
}

function escapeHtml(text){
    return String(text)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}