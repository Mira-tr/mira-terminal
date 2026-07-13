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
    label.textContent = "Tools";

    const heading = document.createElement("h3");
    heading.textContent = title;

    const description = document.createElement("p");
    description.textContent = message;

    box.append(
        label,
        heading,
        description,
        createBrandTextLink("Contact", "../contact/")
    );
    return box;
}

function createToolTile(tool){
    const article = document.createElement("article");
    article.className = "tool-tile";

    const category = document.createElement("span");
    category.className = "tool-category";
    category.textContent = tool.category || "Tool";

    const title = document.createElement("h3");
    title.textContent = tool.name;
    article.append(category, title);

    const description = document.createElement("p");
    description.className = "tool-description";
    description.textContent = tool.summary || tool.description || "Tool details are being prepared.";
    article.appendChild(description);

    if(tool.url){
        const link = document.createElement("a");
        link.className = "tool-launch";
        link.href = tool.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Launch";
        article.appendChild(link);
    }else{
        const unavailable = document.createElement("span");
        unavailable.className = "tool-launch is-unavailable";
        unavailable.textContent = "Preparing";
        article.appendChild(unavailable);
    }

    return article;
}

function renderCategoryRail(tools, rail){
    const categories = Array.from(new Set(tools.map(tool => tool.category || "Tool")));
    const chips = ["All Tools", ...categories].map(label => {
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
                        "Public tools are being prepared",
                        "Small utilities will appear here once they are ready to launch."
                    )
                ]
        ));
    }catch(error){
        console.warn("Failed to load Tools data.", error);
        list.replaceChildren(
            createToolsEmptyState(
                "Tools could not be loaded",
                "Please wait a moment and try again."
            )
        );
    }
}

if(typeof document !== "undefined"){
    init();
}
