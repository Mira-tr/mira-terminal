const DATA_URL = new URL(
    "../../../../../data/creators/chikage/trpg/house-rules.json",
    import.meta.url
);
const SUPPORTED_SCHEMA_VERSION = 1;
const DEFAULT_CATEGORY = "未分類";

let systems = [];
let selectedSystemId = "";
let selectedCategory = "";
let searchScope = "current";
let quickMode = false;

const refs = {};

export async function fetchHouseRules(){
    const response = await fetch(DATA_URL, { cache: "no-store" });

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
        .filter(system=>system && typeof system === "object")
        .map((system, index)=>normalizeSystem(system, index))
        .filter(system=>system.id);
}

function normalizeSystem(system, index){
    const label = toText(system.label) || `System ${index + 1}`;
    const title = toText(system.title) || label;

    return {
        id: toText(system.id) || `system-${index + 1}`,
        label,
        title,
        version: toText(system.version),
        description: toTextPreserveLines(system.description),
        sections: normalizeSections(system.sections || [])
    };
}

function normalizeSections(sections){
    if(!Array.isArray(sections)){
        return [];
    }

    return sections
        .filter(section=>section && typeof section === "object")
        .map((section, index)=>({
            id: toText(section.id) || `section-${index + 1}`,
            order: normalizeOrder(section.order, index),
            category: toText(section.category) || DEFAULT_CATEGORY,
            title: toText(section.title),
            body: toTextPreserveLines(section.body)
        }))
        .sort((a, b)=>a.order - b.order)
        .map((section, index)=>({ ...section, order: index + 1 }));
}

function normalizeOrder(value, index){
    const order = Number(value);
    return Number.isFinite(order) && order > 0 ? order : index + 1;
}

function toText(value){
    return String(value ?? "").trim();
}

function toTextPreserveLines(value){
    return String(value ?? "").replace(/\r\n?/g, "\n").trim();
}

function normalizeSearchText(value){
    return toText(value).normalize("NFKC").toLowerCase();
}

function toSlug(value){
    return toText(value)
        .normalize("NFKC")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}_-]+/gu, "-")
        .replace(/^-+|-+$/g, "")
        || "rule";
}

function groupSectionsByCategory(sections){
    const groups = [];
    const map = new Map();

    sections.forEach(section=>{
        const category = section.category || DEFAULT_CATEGORY;
        if(!map.has(category)){
            const group = { category, sections: [] };
            map.set(category, group);
            groups.push(group);
        }
        map.get(category).sections.push(section);
    });

    return groups;
}

function createSystemPanel(){
    const aside = document.createElement("aside");
    aside.className = "rules-system-panel";
    aside.setAttribute("aria-label", "ルールシステム選択");

    const eyebrow = document.createElement("p");
    eyebrow.className = "rules-system-panel__eyebrow";
    eyebrow.textContent = "SYSTEMS";

    const title = document.createElement("h2");
    title.className = "rules-system-panel__title";
    title.textContent = "遊ぶシステム";

    const lead = document.createElement("p");
    lead.className = "rules-system-panel__lead";
    lead.textContent = "システムごとに裁定を分離しています。追加されたシステムもここへ並びます。";

    const list = document.createElement("nav");
    list.className = "rules-system-list";
    list.setAttribute("aria-label", "House Rules systems");

    systems.forEach(system=>{
        const button = document.createElement("button");
        button.type = "button";
        button.className = "rules-system-button";
        button.dataset.systemId = system.id;

        const name = document.createElement("strong");
        name.textContent = system.label;

        const count = document.createElement("small");
        count.textContent = `${system.sections.length}`;

        button.append(name, count);
        list.appendChild(button);
    });

    const mobile = document.createElement("label");
    mobile.className = "rules-system-select-wrap";

    const mobileLabel = document.createElement("span");
    mobileLabel.textContent = "System";

    const select = document.createElement("select");
    select.id = "rulesSystemSelect";
    select.className = "rules-system-select";
    select.setAttribute("aria-label", "House Rules system");

    systems.forEach(system=>{
        const option = document.createElement("option");
        option.value = system.id;
        option.textContent = system.label;
        select.appendChild(option);
    });

    mobile.append(mobileLabel, select);
    aside.append(eyebrow, title, lead, list, mobile);
    return aside;
}

function createToolbar(){
    const toolbar = document.createElement("div");
    toolbar.className = "rules-toolbar";

    const main = document.createElement("div");
    main.className = "rules-toolbar__main";

    const searchLabel = document.createElement("label");
    searchLabel.className = "rules-search-field";

    const sr = document.createElement("span");
    sr.className = "sr-only";
    sr.textContent = "ルールを検索";

    const input = document.createElement("input");
    input.id = "rulesSearchInput";
    input.type = "search";
    input.className = "rules-search-input";
    input.placeholder = "ルールを検索（例: 回避、SAN、成長）";
    input.autocomplete = "off";

    searchLabel.append(sr, input);

    const actions = document.createElement("div");
    actions.className = "rules-toolbar__actions";

    const scope = document.createElement("div");
    scope.className = "rules-scope";
    scope.setAttribute("role", "group");
    scope.setAttribute("aria-label", "検索範囲");

    const scopeLabel = document.createElement("span");
    scopeLabel.className = "rules-scope__label";
    scopeLabel.textContent = "Search";

    const current = createToolButton("このSystem", "current");
    current.classList.add("rules-scope-button");
    current.dataset.scope = "current";
    current.setAttribute("aria-pressed", "true");

    const all = createToolButton("全System", "all");
    all.classList.add("rules-scope-button");
    all.dataset.scope = "all";
    all.setAttribute("aria-pressed", "false");

    scope.append(scopeLabel, current, all);

    const quick = createToolButton("卓中モード", "quick");
    quick.id = "rulesQuickModeBtn";
    quick.setAttribute("aria-pressed", "false");

    const toggleAll = createToolButton("すべて開く", "expand");
    toggleAll.id = "rulesToggleAllBtn";

    actions.append(scope, quick, toggleAll);
    main.append(searchLabel, actions);

    const status = document.createElement("p");
    status.id = "rulesSearchStatus";
    status.className = "rules-search-status";
    status.setAttribute("aria-live", "polite");

    toolbar.append(main, status);
    return toolbar;
}

function createToolButton(text, action){
    const button = document.createElement("button");
    button.type = "button";
    button.className = "rules-tool-button";
    button.dataset.action = action;
    button.textContent = text;
    return button;
}

function createSystemArticle(system){
    const article = document.createElement("article");
    article.className = "rules-system-article";
    article.dataset.systemId = system.id;
    article.appendChild(createSystemHero(system));

    const groups = groupSectionsByCategory(system.sections);
    if(groups.length === 0){
        article.appendChild(createState("公開できるルールが整ったものから掲載します。", "rules-empty"));
        return article;
    }

    article.appendChild(createCategoryNav(system, groups));

    let defaultOpenAvailable = true;
    groups.forEach(group=>{
        const category = createCategorySection(system, group, defaultOpenAvailable);
        if(group.sections.length > 0){
            defaultOpenAvailable = false;
        }
        article.appendChild(category);
    });

    return article;
}

function createSystemHero(system){
    const hero = document.createElement("header");
    hero.className = "rules-system-hero";

    const meta = document.createElement("p");
    meta.className = "rules-system-meta";
    meta.textContent = [system.label, system.version ? `VER.${system.version}` : ""].filter(Boolean).join(" / ");

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

function createCategoryNav(system, groups){
    const nav = document.createElement("nav");
    nav.className = "rules-category-nav";
    nav.dataset.systemId = system.id;
    nav.setAttribute("aria-label", `${system.label}カテゴリ`);

    nav.appendChild(createCategoryButton(system.id, "", "すべて", system.sections.length));
    groups.forEach(group=>{
        nav.appendChild(createCategoryButton(system.id, group.category, group.category, group.sections.length));
    });
    return nav;
}

function createCategoryButton(systemId, category, label, count){
    const button = document.createElement("button");
    button.type = "button";
    button.className = "rules-category-filter";
    button.dataset.systemId = systemId;
    button.dataset.category = category;

    const name = document.createElement("span");
    name.textContent = label;

    const small = document.createElement("small");
    small.textContent = String(count);

    button.append(name, small);
    return button;
}

function createCategorySection(system, group, openFirst){
    const section = document.createElement("section");
    section.className = "rules-category";
    section.dataset.systemId = system.id;
    section.dataset.category = group.category;

    const head = document.createElement("div");
    head.className = "rules-category-head";

    const title = document.createElement("h3");
    title.textContent = group.category;

    const count = document.createElement("p");
    count.textContent = `${group.sections.length}件`;

    head.append(title, count);
    section.appendChild(head);

    group.sections.forEach((rule, index)=>{
        section.appendChild(createRuleSection(system, rule, openFirst && index === 0));
    });

    return section;
}

function createRuleSection(system, section, open){
    const details = document.createElement("details");
    details.className = "rule-section";
    details.id = `rule-${toSlug(system.id)}-${toSlug(section.id)}`;
    details.open = open;
    details.dataset.defaultOpen = open ? "true" : "false";
    details.dataset.systemId = system.id;
    details.dataset.category = section.category;
    details.dataset.search = normalizeSearchText([
        system.label,
        system.title,
        section.title,
        section.category,
        section.body
    ].join(" "));

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
    details.append(summary, createRulesContent(section.body));
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

    body.split("\n").forEach(line=>{
        const trimmed = line.trim();

        if(!trimmed){
            list = null;
            return;
        }

        if(trimmed.startsWith("▼")){
            list = null;
            const heading = document.createElement("h4");
            heading.className = "rules-content-heading";
            heading.textContent = trimmed.replace(/^▼\s*/, "");
            content.appendChild(heading);
            return;
        }

        if(trimmed.startsWith("- ") || trimmed.startsWith("・")){
            if(!list){
                list = document.createElement("ul");
                content.appendChild(list);
            }

            const item = document.createElement("li");
            item.textContent = trimmed.startsWith("- ")
                ? trimmed.substring(2)
                : trimmed.substring(1).trim();
            list.appendChild(item);
            return;
        }

        list = null;
        const paragraph = document.createElement("p");
        paragraph.textContent = line;
        content.appendChild(paragraph);
    });

    return content;
}

function createState(message, className){
    const state = document.createElement("div");
    state.className = className;
    state.textContent = message;
    return state;
}

function buildApp(root){
    const shell = document.createElement("div");
    shell.className = "rules-v5-shell";

    const panel = createSystemPanel();
    const reference = document.createElement("section");
    reference.className = "rules-reference";
    reference.setAttribute("aria-label", "ルール参照");
    reference.appendChild(createToolbar());

    const body = document.createElement("div");
    body.className = "rules-reference__body";
    body.append(...systems.map(createSystemArticle));
    reference.appendChild(body);

    shell.append(panel, reference);
    root.replaceChildren(shell);

    refs.root = shell;
    refs.systemButtons = [...shell.querySelectorAll(".rules-system-button")];
    refs.systemSelect = shell.querySelector("#rulesSystemSelect");
    refs.searchInput = shell.querySelector("#rulesSearchInput");
    refs.scopeButtons = [...shell.querySelectorAll(".rules-scope-button")];
    refs.quickButton = shell.querySelector("#rulesQuickModeBtn");
    refs.toggleAll = shell.querySelector("#rulesToggleAllBtn");
    refs.status = shell.querySelector("#rulesSearchStatus");
    refs.categoryButtons = [...shell.querySelectorAll(".rules-category-filter")];
    refs.articles = [...shell.querySelectorAll(".rules-system-article")];
    refs.details = [...shell.querySelectorAll(".rule-section")];
}

function bindReferenceInteractions(){
    refs.systemButtons.forEach(button=>{
        button.addEventListener("click", ()=>selectSystem(button.dataset.systemId));
    });

    refs.systemSelect.addEventListener("change", ()=>selectSystem(refs.systemSelect.value));

    refs.searchInput.addEventListener("input", ()=>{
        selectedCategory = "";
        updateCategoryButtons();
        applyReferenceState();
    });

    refs.scopeButtons.forEach(button=>{
        button.addEventListener("click", ()=>{
            searchScope = button.dataset.scope === "all" ? "all" : "current";
            if(searchScope === "all"){
                selectedCategory = "";
            }
            updateScopeButtons();
            updateCategoryButtons();
            applyReferenceState();
        });
    });

    refs.quickButton.addEventListener("click", ()=>{
        quickMode = !quickMode;
        refs.root.classList.toggle("is-quick", quickMode);
        refs.quickButton.setAttribute("aria-pressed", String(quickMode));
        refs.quickButton.textContent = quickMode ? "通常表示" : "卓中モード";
    });

    refs.toggleAll.addEventListener("click", toggleVisibleRules);

    refs.categoryButtons.forEach(button=>{
        button.addEventListener("click", ()=>{
            if(button.dataset.systemId !== selectedSystemId){
                return;
            }
            selectedCategory = button.dataset.category || "";
            updateCategoryButtons();
            applyReferenceState();
        });
    });

    window.addEventListener("hashchange", ()=>revealHashTarget({ scroll: true }));
}

function readInitialSystemId(){
    const requested = new URL(window.location.href).searchParams.get("system");
    return systems.some(system=>system.id === requested)
        ? requested
        : systems[0]?.id || "";
}

function selectSystem(systemId, options = {}){
    if(!systems.some(system=>system.id === systemId)){
        return;
    }

    selectedSystemId = systemId;
    selectedCategory = "";
    updateSystemControls();
    updateCategoryButtons();

    if(options.syncUrl !== false){
        syncSystemUrl();
    }

    applyReferenceState();
}

function syncSystemUrl(){
    const url = new URL(window.location.href);
    url.searchParams.set("system", selectedSystemId);
    window.history.replaceState(window.history.state, "", url);
}

function updateSystemControls(){
    refs.systemButtons.forEach(button=>{
        const active = button.dataset.systemId === selectedSystemId;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-current", active ? "true" : "false");
    });
    refs.systemSelect.value = selectedSystemId;
}

function updateScopeButtons(){
    refs.scopeButtons.forEach(button=>{
        button.setAttribute("aria-pressed", String(button.dataset.scope === searchScope));
    });
}

function updateCategoryButtons(){
    refs.categoryButtons.forEach(button=>{
        const active = button.dataset.systemId === selectedSystemId
            && (button.dataset.category || "") === selectedCategory;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
    });
}

function applyReferenceState(){
    const query = normalizeSearchText(refs.searchInput.value);
    const searchAll = Boolean(query) && searchScope === "all";
    let matches = 0;

    refs.articles.forEach(article=>{
        const systemId = article.dataset.systemId;
        const selectedSystem = systemId === selectedSystemId;
        const systemAllowed = searchAll || selectedSystem;
        let articleMatches = 0;

        article.querySelectorAll(".rules-category").forEach(category=>{
            const categoryName = category.dataset.category || "";
            const categoryAllowed = searchAll || !selectedCategory || categoryName === selectedCategory;
            let categoryMatches = 0;

            category.querySelectorAll(".rule-section").forEach(item=>{
                const queryMatches = !query || (item.dataset.search || "").includes(query);
                const hit = systemAllowed && categoryAllowed && queryMatches;
                item.hidden = !hit;

                if(hit){
                    categoryMatches += 1;
                    articleMatches += 1;
                    matches += 1;
                    if(query){
                        item.open = true;
                    }
                }
            });

            category.hidden = categoryMatches === 0;
        });

        article.hidden = articleMatches === 0;
    });

    updateSearchStatus(query, matches, searchAll);
    updateToggleAllLabel();
}

function updateSearchStatus(query, matches, searchAll){
    const system = systems.find(item=>item.id === selectedSystemId);

    if(query){
        refs.status.textContent = matches === 0
            ? "一致するルールがありません"
            : `${matches}件一致 / ${searchAll ? "全System" : system?.label || "System"}`;
        return;
    }

    if(selectedCategory){
        refs.status.textContent = `${system?.label || "System"} / ${selectedCategory} / ${matches}件`;
        return;
    }

    refs.status.textContent = `${system?.label || "System"} / ${matches} rules`;
}

function toggleVisibleRules(){
    const visible = refs.details.filter(item=>!item.hidden && !item.closest(".rules-system-article")?.hidden);
    const shouldOpen = visible.some(item=>!item.open);
    visible.forEach(item=>{ item.open = shouldOpen; });
    updateToggleAllLabel();
}

function updateToggleAllLabel(){
    const visible = refs.details.filter(item=>!item.hidden && !item.closest(".rules-system-article")?.hidden);
    const allOpen = visible.length > 0 && visible.every(item=>item.open);
    refs.toggleAll.textContent = allOpen ? "すべて閉じる" : "すべて開く";
}

function revealHashTarget(options = {}){
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if(!hash){
        return false;
    }

    const target = document.getElementById(hash);
    if(!target){
        return false;
    }

    const systemId = target.dataset.systemId || target.closest(".rules-system-article")?.dataset.systemId;
    if(systemId && systemId !== selectedSystemId){
        selectSystem(systemId, { syncUrl: true });
    }

    if(target instanceof HTMLDetailsElement){
        target.hidden = false;
        target.open = true;
    }

    if(options.scroll !== false){
        window.requestAnimationFrame(()=>target.scrollIntoView({ block: "start", behavior: "smooth" }));
    }
    return true;
}

async function initRules(){
    const root = document.querySelector("#rulesApp");
    if(!root){
        return;
    }

    try{
        systems = await fetchHouseRules();

        if(systems.length === 0){
            root.replaceChildren(createState("公開できるハウスルールが整ったものから掲載します。", "rules-empty"));
            return;
        }

        selectedSystemId = readInitialSystemId();
        buildApp(root);
        bindReferenceInteractions();
        updateSystemControls();
        updateScopeButtons();
        updateCategoryButtons();
        applyReferenceState();
        revealHashTarget({ scroll: false });
    }catch(error){
        console.warn("House Rulesの読み込みに失敗しました", error);
        root.replaceChildren(createState(
            "ハウスルールを読み込めませんでした。時間をおいてもう一度お試しください。",
            "rules-error"
        ));
    }
}

if(typeof document !== "undefined"){
    initRules();
}
