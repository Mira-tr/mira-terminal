import {
    isSafeHttpUrl
} from "../../../utils.js";

import {
    normalizeScenarioRating
} from "./scenarioRating.js";

export function statusText(status){
    return {
        draft: "未整理",
        ready: "整理済み",
        public: "公開",
        private: "非公開"
    }[status || "draft"] || "未整理";
}

export function statusClass(status){
    return {
        draft: "status-draft",
        ready: "status-ready",
        public: "status-public",
        private: "status-private"
    }[status || "draft"] || "status-draft";
}

export function ratingText(rating){
    return normalizeScenarioRating(rating) === "r18"
        ? "R18"
        : "全年齢";
}

export function ratingClass(rating){
    return normalizeScenarioRating(rating) === "r18"
        ? "rating-r18"
        : "rating-all";
}

export function getCreatedAtTime(scenario){
    const time = Number(scenario.createdAt);
    return Number.isFinite(time) ? time : 0;
}

export function getPublicIssues(scenario){
    const issues = [];

    if(scenario.status !== "public"){
        return issues;
    }

    const url = String(scenario.url ?? "").trim();

    if(!url){
        issues.push({
            type: "missing-url",
            label: "URLなし",
            message: "URLが未入力の公開シナリオがあります"
        });
    }else if(!isSafeHttpUrl(url)){
        issues.push({
            type: "invalid-url",
            label: "URL不正",
            message: "URLがhttpまたはhttps形式ではない公開シナリオがあります"
        });
    }

    if(!Array.isArray(scenario.tags) || scenario.tags.length === 0){
        issues.push({
            type: "missing-tags",
            label: "タグなし",
            message: "タグが未設定の公開シナリオがあります"
        });
    }

    if(!String(scenario.summary ?? "").trim()){
        issues.push({
            type: "missing-summary",
            label: "概要なし",
            message: "短い概要が未入力の公開シナリオがあります"
        });
    }

    return issues;
}

export function getPublicWarnings(scenario){
    return getPublicIssues(scenario)
    .map(issue=>issue.label);
}
