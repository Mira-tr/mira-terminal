const DATA_URL = "./data/house-rules.json";
const SUPPORTED_SCHEMA_VERSION = 1;
const DEFAULT_CATEGORY = "未分類";

export async function fetchHouseRules(){
    const response = await fetch(DATA_URL, {
        cache: "no-store"
    });

    if(!response.ok){
        throw new Error(`House Rulesデータの読み込みに失敗しました: ${response.status}`);
    }

    const data = await response.json();

    validateRulesPayload(data);

    return normalizeRules(data);
}

function validateRulesPayload(data){
    if(typeof data !== "object" || data === null){
        throw new Error("House Rulesデータの形式が正しくありません");
    }

    if(data.module !== undefined && data.module !== "trpg"){
        throw new Error("House Rulesデータのモジュールが正しくありません");
    }

    if(data.exportType !== undefined && data.exportType !== "house-rules"){
        throw new Error("House Rulesデータのエクスポートタイプが正しくありません");
    }

    if(data.schemaVersion !== undefined){
        const version = Number(data.schemaVersion);
        if(!Number.isInteger(version) || version > SUPPORTED_SCHEMA_VERSION){
            throw new Error(`House Rulesデータのスキーマバージョン${version}はサポートされていません`);
        }
    }

    if(!Array.isArray(data.systems)){
        throw new Error("House Rulesデータのsystemsが正しくありません");
    }
}

export function normalizeRules(data){
    return (data.systems || [])
    .filter(system => system && typeof system === "object")
    .map((system, index) => normalizeSystem(system, index))
    .filter(system => system.id);
}

function normalizeSystem(system, index){
    const label = toText(system.label) || `System ${index + 1}`;
    const title = toText(system.title) || label;

    return {
        id: toText(system.id) || `system-${index + 1}`,
        label,
        title,
        version: toText(system.version),
        description: toText(system.description),
        sections: normalizeSections(system.sections || [])
    };
}

function normalizeSections(sections){
    if(!Array.isArray(sections)){
        return [];
    }

    return sections
    .filter(section => section && typeof section === "object")
    .map((section, index) => ({
        id: toText(section.id) || `section-${index + 1}`,
        order: normalizeOrder(section.order, index),
        category: toText(section.category) || DEFAULT_CATEGORY,
        title: toText(section.title),
        body: toTextPreserveLines(section.body)
    }))
    .sort((a, b) => a.order - b.order)
    .map((section, index) => ({
        ...section,
        order: index + 1
    }));
}

function normalizeOrder(value, index){
    const order = Number(value);

    return Number.isFinite(order) && order > 0
        ? order
        : index + 1;
}

function toText(value){
    return String(value ?? "").trim();
}

function toTextPreserveLines(value){
    return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .trim();
}

function createSystemElement(system){
    const article = document.createElement("article");
    article.className = "rules-system";

    article.appendChild(createSystemHero(system));

    const categoryGroups = groupSectionsByCategory(system.sections);

    if(categoryGroups.length === 0){
        article.appendChild(
            createRulesState("公開中のセクションはありません。")
        );
        return article;
    }

    article.appendChild(createCategoryToc(system, categoryGroups));

    categoryGroups.forEach(group => {
        article.appendChild(createCategorySection(system, group));
    });

    return article;
}

function createSystemHero(system){
    const hero = document.createElement("header");
    hero.className = "rules-system-hero";

    const meta = document.createElement("p");
    meta.className = "rules-system-meta";
    meta.textContent = createSystemMetaText(system);

    const title = document.createElement("h2");
    title.textContent = system.title;

    hero.append(meta, title);

    if(system.description){
        const description = document.createElement("p");
        description.className = "rules-system-description";
        description.textContent = system.description;
        hero.appendChild(description);
    }

    return hero;
}

function createSystemMetaText(system){
    const values = [
        system.label,
        system.version ? `Ver.${system.version}` : ""
    ].filter(Boolean);

    return values.join(" / ");
}

function createCategoryToc(system, groups){
    const nav = document.createElement("nav");
    nav.className = "rules-toc";
    nav.setAttribute("aria-label", `${system.label}のカテゴリ目次`);

    const title = document.createElement("h3");
    title.textContent = "カテゴリ目次";

    const list = document.createElement("div");
    list.className = "rules-toc-list";

    groups.forEach(group => {
        const link = document.createElement("a");
        link.className = "rules-toc-link";
        link.href = `#${createCategoryAnchorId(system, group.category)}`;

        const name = document.createElement("span");
        name.textContent = group.category;

        const count = document.createElement("small");
        count.textContent = `${group.sections.length}件`;

        link.append(name, count);
        list.appendChild(link);
    });

    nav.append(title, list);
    return nav;
}

function createCategorySection(system, group){
    const section = document.createElement("section");
    section.className = "rules-category";
    section.id = createCategoryAnchorId(system, group.category);

    const head = document.createElement("div");
    head.className = "rules-category-head";

    const title = document.createElement("h3");
    title.textContent = group.category;

    const count = document.createElement("p");
    count.textContent = `${group.sections.length}件`;

    head.append(title, count);
    section.appendChild(head);

    group.sections.forEach((ruleSection, index) => {
        section.appendChild(createRuleSection(ruleSection, index === 0));
    });

    return section;
}

function createRuleSection(section, open){
    const details = document.createElement("details");
    details.className = "rule-section";
    details.open = open;

    const summary = document.createElement("summary");
    summary.className = "rule-section-summary";

    const marker = document.createElement("span");
    marker.className = "rule-section-marker";
    marker.setAttribute("aria-hidden", "true");
    marker.textContent = "▶";

    const number = document.createElement("span");
    number.className = "rule-section-number";
    number.textContent = `[${String(section.order).padStart(2, "0")}]`;

    const title = document.createElement("span");
    title.className = "rule-section-title";
    title.textContent = section.title || "セクション";

    const category = document.createElement("span");
    category.className = "rule-section-category";
    category.textContent = section.category;

    summary.append(marker, number, title, category);

    const body = createRulesContent(section.body);

    details.append(summary, body);
    return details;
}

function createRulesContent(body){
    const content = document.createElement("div");
    content.className = "rules-content";

    if(!body){
        const empty = document.createElement("p");
        empty.className = "rules-muted";
        empty.textContent = "本文は未設定です。";
        content.appendChild(empty);
        return content;
    }

    let list = null;

    body.split("\n").forEach(line => {
        const trimmed = line.trim();

        if(trimmed.startsWith("- ")){
            if(!list){
                list = document.createElement("ul");
                content.appendChild(list);
            }

            const item = document.createElement("li");
            item.textContent = trimmed.substring(2);
            list.appendChild(item);
            return;
        }

        list = null;

        if(!trimmed){
            return;
        }

        const paragraph = document.createElement("p");
        paragraph.textContent = line;
        content.appendChild(paragraph);
    });

    return content;
}

function groupSectionsByCategory(sections){
    const groups = [];
    const groupMap = new Map();

    sections.forEach(section => {
        const category = section.category || DEFAULT_CATEGORY;

        if(!groupMap.has(category)){
            const group = {
                category,
                sections: []
            };
            groupMap.set(category, group);
            groups.push(group);
        }

        groupMap.get(category).sections.push(section);
    });

    return groups;
}

function createCategoryAnchorId(system, category){
    return `rules-${toSlug(system.id)}-${toSlug(category)}`;
}

function toSlug(value){
    return toText(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    || "category";
}

function createRulesState(messageText, className = "empty-state"){
    const state = document.createElement("div");
    state.className = className;

    const message = document.createElement("p");
    message.className = "empty-state-message";
    message.textContent = messageText;

    state.appendChild(message);
    return state;
}

async function initRules(){
    const rulesContent = document.querySelector("#rulesApp");

    if(!rulesContent){
        return;
    }

    try{
        const rules = await fetchHouseRules();

        if(rules.length === 0){
            rulesContent.replaceChildren(
                createRulesState("公開中のハウスルールはありません。")
            );
            return;
        }

        rulesContent.replaceChildren(
            ...rules.map(createSystemElement)
        );
    }catch(error){
        console.warn("House Rulesの読み込みに失敗しました", error);

        rulesContent.replaceChildren(
            createRulesState(
                "ハウスルールを読み込めませんでした。時間をおいてもう一度お試しください。",
                "error-state"
            )
        );
    }
}

if(typeof document !== "undefined"){
    initRules();
}
