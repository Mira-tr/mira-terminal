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
    return {
        all: "全年齢",
        r18: "R18",
        r18g: "R18G"
    }[rating || "all"] || "全年齢";
}

export function ratingClass(rating){
    return {
        all: "rating-all",
        r18: "rating-r18",
        r18g: "rating-r18g"
    }[rating || "all"] || "rating-all";
}

export function getCreatedAtTime(scenario){
    const time = Number(scenario.createdAt);
    return Number.isFinite(time) ? time : 0;
}