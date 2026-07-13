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
        .sort((a, b) => a.order - b.order);
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

    const category = document.createElement("span");
    category.className = "tool-category";
    category.textContent = tool.category || "道具";

    const title = document.createElement("h3");
    title.textContent = tool.name;
    article.append(category, title);

    const description = document.createElement("p");
    description.className = "tool-description";
    description.textContent = tool.summary || tool.description || "道具の説明を準備しています。";
    article.appendChild(description);

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
        list.replaceChildren(
            createToolsEmptyState(
                "道具を読み込めませんでした",
                "時間を置いて再度お試しください。"
            )
        );
    }
}

if(typeof document !== "undefined"){
    init();
}
