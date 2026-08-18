const DATA_URL = "./data/public-tools.json";
const SUPPORTED_SCHEMA_VERSION = 1;
const ALL_CATEGORY = "すべて";

const directory = {
    tools: [],
    query: "",
    category: ALL_CATEGORY
};

async function fetchTools(){
    const response = await fetch(DATA_URL, {
        cache: "no-store"
    });

    if(!response.ok){
        throw new Error(`Failed to load Tools data: ${response.status}`);
    }

    const data = await response.json();
    const schemaVersion = Number(data?.schemaVersion);

    if(
        !data ||
        data.module !== "tools" ||
        data.exportType !== "public-tools" ||
        !Number.isInteger(schemaVersion) ||
        schemaVersion > SUPPORTED_SCHEMA_VERSION ||
        !Array.isArray(data.tools)
    ){
        throw new Error("Tools data format is invalid.");
    }

    return data.tools
        .filter(value => value && typeof value === "object")
        .map(value => ({
            id: text(value.id),
            name: text(value.name),
            summary: text(value.summary),
            description: text(value.description),
            category: text(value.category),
            url: safeUrl(value.url),
            path: safePath(value.path),
            tags: Array.isArray(value.tags)
                ? value.tags.map(text).filter(Boolean)
                : [],
            maintainerCreatorIds: Array.isArray(value.maintainerCreatorIds)
                ? value.maintainerCreatorIds.map(text).filter(Boolean)
                : [],
            order: Number(value.order) || 0
        }))
        .filter(value => value.id && value.name)
        .filter(isBrandVisibleTool)
        .sort((a, b) => a.order - b.order);
}

function isBrandVisibleTool(tool){
    const source = [
        tool.name,
        tool.summary,
        tool.description,
        tool.category,
        tool.url,
        tool.path,
        ...tool.tags
    ].join(" ").toLowerCase();

    return ![
        "trpg",
        "house rules",
        "scenario library",
        "ハウスルール",
        "シナリオ"
    ].some(keyword => source.includes(keyword.toLowerCase()));
}

function text(value){
    return String(value ?? "").trim();
}

function safeUrl(value){
    const normalized = text(value);

    try{
        const parsed = new URL(normalized);
        return ["http:", "https:"].includes(parsed.protocol)
            ? normalized
            : "";
    }catch{
        return "";
    }
}

function safePath(value){
    const normalized = text(value);

    if(!normalized || normalized.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(normalized)){
        return "";
    }

    if(!normalized.startsWith("./") && !normalized.startsWith("../")){
        return "";
    }

    return normalized;
}

function createBrandTextLink(label, href){
    const link = document.createElement("a");
    link.className = "brand-text-link";
    link.href = href;
    link.textContent = label;
    return link;
}

function createToolsEmptyState(title, message){
    const box = document.createElement("div");
    box.className = "tools-empty-state";
    box.setAttribute("role", "status");

    const label = document.createElement("p");
    label.className = "section-label";
    label.textContent = "道具";

    const heading = document.createElement("h3");
    heading.textContent = title;

    const description = document.createElement("p");
    description.textContent = message;

    box.append(
        label,
        heading,
        description,
        createBrandTextLink("連絡する", "../contact/")
    );
    return box;
}

function createToolTile(tool){
    const article = document.createElement("article");
    article.className = "tool-tile";

    const icon = document.createElement("div");
    icon.className = "tool-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = getToolIconLabel(tool);

    const category = document.createElement("span");
    category.className = "tool-category";
    category.textContent = tool.category || "道具";

    const title = document.createElement("h3");
    title.textContent = tool.name;
    article.append(icon, category, title);

    if(isLocalTool(tool)){
        const badge = document.createElement("span");
        badge.className = "tool-badge tool-badge--local";
        badge.textContent = "ローカル処理";
        badge.title = "この道具はブラウザ内で完結し、データを送信しません";
        article.appendChild(badge);
    }

    const description = document.createElement("p");
    description.className = "tool-description";
    description.textContent = tool.summary || tool.description || "道具の説明を準備しています。";
    article.appendChild(description);

    if(tool.tags.length){
        article.appendChild(createToolTags(tool.tags.slice(0, 4)));
    }

    const launchHref = tool.path || tool.url;

    if(launchHref){
        const link = document.createElement("a");
        link.className = "tool-launch";
        link.href = launchHref;

        if(tool.url && !tool.path){
            link.target = "_blank";
            link.rel = "noopener noreferrer";
        }

        link.textContent = "開く";
        article.appendChild(link);
    }else{
        const unavailable = document.createElement("span");
        unavailable.className = "tool-launch is-unavailable";
        unavailable.textContent = "準備中";
        article.appendChild(unavailable);
    }

    return article;
}

function getToolIconLabel(tool){
    const source = tool.category || tool.name || "道具";
    return Array.from(source)[0] || "道";
}

function createToolTags(tags){
    const list = document.createElement("div");
    list.className = "tool-tag-list";
    list.setAttribute("aria-label", "関連タグ");

    tags.forEach(value => {
        const tag = document.createElement("span");
        tag.className = "tool-tag";
        tag.textContent = value;
        list.appendChild(tag);
    });

    return list;
}

function isLocalTool(tool){
    const source = [tool.summary, tool.description].join(" ");
    return /ブラウザ内|ブラウザだけ|端末内|送信しません|ローカル/.test(source);
}

function toolSearchIndex(tool){
    return [
        tool.name,
        tool.summary,
        tool.description,
        tool.category,
        ...tool.tags
    ].join(" ").toLowerCase();
}

function renderCategoryRail(tools, rail){
    const categories = Array.from(new Set(tools.map(tool => tool.category || "道具")));
    const chips = [ALL_CATEGORY, ...categories].map(label => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "tools-category-label";
        chip.dataset.category = label;
        chip.textContent = label;
        const active = label === directory.category;
        chip.classList.toggle("is-active", active);
        chip.setAttribute("aria-pressed", active ? "true" : "false");
        return chip;
    });

    rail.replaceChildren(...chips);
}

function getFilteredTools(){
    const query = directory.query.trim().toLowerCase();

    return directory.tools.filter(tool => {
        const categoryOk = directory.category === ALL_CATEGORY ||
            (tool.category || "道具") === directory.category;
        const queryOk = query === "" || toolSearchIndex(tool).includes(query);
        return categoryOk && queryOk;
    });
}

function renderFilteredTools(){
    const list = document.getElementById("toolsList");

    if(!list){
        return;
    }

    const filtered = getFilteredTools();
    updateToolsSummary(filtered.length, false, directory.tools.length);

    if(filtered.length === 0){
        list.replaceChildren(
            createToolsEmptyState(
                "条件に合う道具が見つかりません",
                "検索語や分類を変えてみてください。"
            )
        );
        return;
    }

    list.replaceChildren(...filtered.map(createToolTile));
}

function setCategory(category, rail){
    directory.category = category;
    rail.querySelectorAll(".tools-category-label").forEach(chip => {
        const active = chip.dataset.category === category;
        chip.classList.toggle("is-active", active);
        chip.setAttribute("aria-pressed", active ? "true" : "false");
    });
    renderFilteredTools();
}

async function init(){
    const list = document.getElementById("toolsList");
    const rail = document.getElementById("toolsCategoryRail");

    if(!list || !rail){
        return;
    }

    try{
        const tools = await fetchTools();
        directory.tools = tools;

        if(tools.length === 0){
            updateToolsSummary(0);
            list.replaceChildren(
                createToolsEmptyState(
                    "公開できる品質になった道具だけを置きます",
                    "RELMUAの道具箱には、ブランド共通で使えるものだけを掲載します。個人活動内の機能は各Creatorサイトへ分けています。"
                )
            );
            return;
        }

        renderCategoryRail(tools, rail);
        bindDirectoryEvents(rail);
        renderFilteredTools();
    }catch(error){
        console.warn("Failed to load Tools data.", error);
        updateToolsSummary(0, true);
        list.replaceChildren(
            createToolsEmptyState(
                "道具を読み込めませんでした",
                "時間を置いて再度お試しください。"
            )
        );
    }
}

function bindDirectoryEvents(rail){
    const search = document.getElementById("toolToolbarSearch");

    if(search){
        search.addEventListener("input", () => {
            directory.query = search.value;
            renderFilteredTools();
        });
    }

    rail.addEventListener("click", event => {
        const chip = event.target.closest("button[data-category]");

        if(chip){
            setCategory(chip.dataset.category, rail);
        }
    });
}

function updateToolsSummary(count, failed = false, total = count){
    const summary = document.getElementById("toolsSummary");

    if(!summary){
        return;
    }

    if(failed){
        summary.textContent = "道具一覧を一時的に読み込めません。";
        return;
    }

    if(total === 0){
        summary.textContent = "公開できる品質になったブランド共通ツールだけを掲載します。";
        return;
    }

    summary.textContent = count === total
        ? `${total}件の公開道具を表示しています。`
        : `${count} / ${total}件を表示中（絞り込み中）。`;
}

if(typeof document !== "undefined"){
    init();
}
