const DATA_URL = "./data/public-tools.json";
const SUPPORTED_SCHEMA_VERSION = 1;

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

    const description = document.createElement("p");
    description.className = "tool-description";
    description.textContent = tool.summary || tool.description || "道具の説明を準備しています。";
    article.appendChild(description);

    if(tool.tags.length){
        article.appendChild(createToolTags(tool.tags.slice(0, 4)));
    }

    if(tool.url){
        const link = document.createElement("a");
        link.className = "tool-launch";
        link.href = tool.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
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

function renderCategoryRail(tools, rail){
    const categories = Array.from(new Set(tools.map(tool => tool.category || "道具")));
    const chips = ["すべて", ...categories].map(label => {
        const chip = document.createElement("span");
        chip.className = "tools-category-label";
        chip.textContent = label;
        return chip;
    });

    rail.replaceChildren(...chips);
}

async function init(){
    const list = document.getElementById("toolsList");
    const rail = document.getElementById("toolsCategoryRail");

    if(!list || !rail){
        return;
    }

    try{
        const tools = await fetchTools();
        renderCategoryRail(tools, rail);
        updateToolsSummary(tools.length);
        list.replaceChildren(...(
            tools.length
                ? tools.map(createToolTile)
                : [
                    createToolsEmptyState(
                        "公開道具を準備しています",
                        "使える状態になった道具から、ここに掲載します。"
                    )
                ]
        ));
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

function updateToolsSummary(count, failed = false){
    const summary = document.getElementById("toolsSummary");

    if(!summary){
        return;
    }

    if(failed){
        summary.textContent = "道具一覧を一時的に読み込めません。";
        return;
    }

    summary.textContent = count
        ? `${count}件の公開道具を表示しています。`
        : "公開中の道具はまだありません。";
}

if(typeof document !== "undefined"){
    init();
}
