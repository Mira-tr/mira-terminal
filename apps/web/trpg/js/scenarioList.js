import {
    getElement,
    clearElement
} from "./dom.js";

const VISIBLE_TAG_LIMIT = 4;

export function renderScenarioList(scenarios){
    const list = getElement("scenarioList");
    clearElement(list);

    if(!Array.isArray(scenarios) || scenarios.length === 0){
        list.appendChild(createEmptyState());
        return;
    }

    const fragment = document.createDocumentFragment();

    scenarios.forEach(scenario=>{
        fragment.appendChild(createScenarioItem(scenario));
    });

    list.appendChild(fragment);
}

export function renderError(message){
    const list = getElement("scenarioList");
    clearElement(list);

    const element = document.createElement("div");
    element.className = "error-state";
    element.textContent = message;

    list.appendChild(element);
}

function createScenarioItem(scenario){
    const article = document.createElement("article");
    article.className = "scenario-item";

    article.appendChild(createScenarioMain(scenario));
    article.appendChild(createTagList(scenario));

    return article;
}

function createScenarioMain(scenario){
    const main = document.createElement("div");
    main.className = "scenario-item-main";

    main.appendChild(createTitleBlock(scenario));
    main.appendChild(createDataBlock("システム", scenario.system || "不明"));
    main.appendChild(createDataBlock("人数", scenario.playersRaw || "不明"));
    main.appendChild(createDataBlock("時間", scenario.timeRaw || "不明"));
    main.appendChild(createDataBlock("ロスト", scenario.loss || "不明"));
    main.appendChild(createRatingBadge(scenario.rating));

    if(isSafeHttpUrl(scenario.url)){
        main.appendChild(createScenarioLink(scenario.url));
    } else {
        main.appendChild(createDisabledLink());
    }

    return main;
}

function createTitleBlock(scenario){
    const block = document.createElement("div");
    block.className = "scenario-title-block";

    const title = document.createElement("h3");
    title.className = "scenario-title";
    title.textContent = scenario.title || "無題";

    const kana = document.createElement("p");
    kana.className = "scenario-kana";
    kana.textContent = scenario.kana || "";

    const author = document.createElement("p");
    author.className = "scenario-author";
    author.textContent = scenario.author
        ? `作者：${scenario.author}`
        : "作者：不明";

    block.append(title, kana, author);

    return block;
}

function createDataBlock(label, value){
    const block = document.createElement("div");
    block.className = "scenario-data";

    const labelElement = document.createElement("span");
    labelElement.className = "scenario-data-label";
    labelElement.textContent = label;

    const valueElement = document.createElement("span");
    valueElement.className = "scenario-data-value";
    valueElement.textContent = value;

    block.append(labelElement, valueElement);

    return block;
}

function createRatingBadge(rating){
    const badge = document.createElement("span");
    badge.className = `rating-badge ${ratingClass(rating)}`;
    badge.textContent = ratingText(rating);

    return badge;
}

function createTagList(scenario){
    const wrapper = document.createElement("div");
    wrapper.className = "tag-list";

    const tags = Array.isArray(scenario.tags)
        ? scenario.tags
        : [];

    if(tags.length === 0){
        wrapper.appendChild(createTag("タグなし"));
        return wrapper;
    }

    const visibleTags = tags.slice(0, VISIBLE_TAG_LIMIT);
    const hiddenCount = tags.length - visibleTags.length;

    visibleTags.forEach(tagText=>{
        wrapper.appendChild(createTag(tagText));
    });

    if(hiddenCount > 0){
        wrapper.appendChild(createTag(`+${hiddenCount}`, "tag-muted"));
    }

    return wrapper;
}

function createTag(text, extraClass = ""){
    const tag = document.createElement("span");
    tag.className = extraClass
        ? `tag ${extraClass}`
        : "tag";
    tag.textContent = text;

    return tag;
}

function createScenarioLink(url){
    const link = document.createElement("a");
    link.className = "scenario-link";
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "配布ページ";

    return link;
}

function createDisabledLink(){
    const span = document.createElement("span");
    span.className = "scenario-link scenario-link-disabled";
    span.textContent = "URLなし";

    return span;
}

function createEmptyState(){
    const element = document.createElement("div");
    element.className = "empty-state";
    element.textContent = "条件に一致するシナリオがありません。";

    return element;
}

function ratingText(rating){
    return {
        all: "全年齢",
        r18: "R18",
        r18g: "R18G"
    }[rating] || "全年齢";
}

function ratingClass(rating){
    return {
        r18: "is-r18",
        r18g: "is-r18g"
    }[rating] || "";
}

function isSafeHttpUrl(url){
    try {
        const parsed = new URL(url);

        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
}