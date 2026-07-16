const DATA_URL = "../game/data/public-games.json";
const SUPPORTED_SCHEMA_VERSION = 1;

const DEVELOPMENT_STATUS_LABELS = Object.freeze({
    planning: "制作構想中",
    development: "制作中",
    released: "公開中",
    archived: "アーカイブ"
});

export async function fetchPublicGames(){
    const response = await fetch(DATA_URL, {
        cache: "no-store"
    });

    if(!response.ok){
        throw new Error(`Failed to load Projects data: ${response.status}`);
    }

    const data = await response.json();
    validateGamesPayload(data);
    return normalizeGames(data);
}

function validateGamesPayload(data){
    if(typeof data !== "object" || data === null){
        throw new Error("Projects data must be an object.");
    }

    if(data.module !== undefined && data.module !== "game"){
        throw new Error("Projects data module is invalid.");
    }

    if(data.exportType !== undefined && data.exportType !== "public-games"){
        throw new Error("Projects data exportType is invalid.");
    }

    if(data.schemaVersion !== undefined){
        const version = Number(data.schemaVersion);

        if(!Number.isInteger(version) || version > SUPPORTED_SCHEMA_VERSION){
            throw new Error(`Projects schemaVersion ${version} is not supported.`);
        }
    }

    if(!Array.isArray(data.games)){
        throw new Error("Projects data games must be an array.");
    }
}

function normalizeGames(data){
    return (data.games || [])
        .filter(game => game && typeof game === "object")
        .map(game => ({
            id: toText(game.id),
            title: toText(game.title),
            summary: toText(game.summary),
            description: toText(game.description),
            developmentStatus: toText(game.developmentStatus),
            platform: toText(game.platform),
            genre: toText(game.genre),
            role: toText(game.role),
            team: normalizeTeam(game.team),
            url: normalizeGameUrl(game.url),
            tags: normalizeTags(game.tags || []),
            order: Number(game.order) || 0
        }))
        .filter(game => game.id)
        .sort((a, b) => a.order - b.order);
}

export function normalizeGameUrl(url){
    const normalized = String(url || "").trim();

    if(!normalized){
        return "";
    }

    try{
        const parsed = new URL(normalized);
        return parsed.protocol === "http:" || parsed.protocol === "https:"
            ? normalized
            : "";
    }catch{
        return "";
    }
}

function normalizeTags(tags){
    if(!Array.isArray(tags)){
        return [];
    }

    return tags
        .map(tag => String(tag || "").trim())
        .filter(tag => tag);
}

function normalizeTeam(team){
    if(!Array.isArray(team)){
        return [];
    }

    return team
        .filter(member => member && typeof member === "object")
        .map(member => ({
            creatorId: toText(member.creatorId),
            roleId: toText(member.roleId),
            primary: Boolean(member.primary)
        }))
        .filter(member => member.creatorId);
}

function toText(value){
    return String(value ?? "").trim();
}

function createBrandTextLink(label, href){
    const link = document.createElement("a");
    link.className = "brand-text-link";
    link.href = href;
    link.textContent = label;
    return link;
}

function createProjectEmptyState(title, message){
    const emptyState = document.createElement("div");
    emptyState.className = "projects-empty-state";
    emptyState.setAttribute("role", "status");

    const label = document.createElement("p");
    label.className = "section-label";
    label.textContent = "作品";

    const heading = document.createElement("h3");
    heading.textContent = title;

    const description = document.createElement("p");
    description.textContent = message;

    emptyState.append(
        label,
        heading,
        description,
        createBrandTextLink("ホームへ戻る", "../")
    );
    return emptyState;
}

function createFeaturedProject(project){
    const article = document.createElement("article");
    article.className = "project-feature-block";
    article.id = getProjectAnchorId(project);

    const visual = document.createElement("div");
    visual.className = "project-feature-visual";
    visual.setAttribute("aria-hidden", "true");

    const body = document.createElement("div");
    body.className = "project-feature-body";
    body.append(
        createStatus(project),
        createTitle(project, "h3", "project-feature-title")
    );

    const description = document.createElement("p");
    description.className = "project-feature-description";
    description.textContent = project.summary || project.description || "作品情報を準備しています。";
    body.appendChild(description);

    body.appendChild(createProjectFacts(project));

    if(project.tags.length){
        body.appendChild(createProjectTags(project.tags.slice(0, 6)));
    }

    body.appendChild(createProjectAction(project));
    article.append(visual, body);
    return article;
}

function createProjectCard(project){
    const card = document.createElement("article");
    card.className = "project-card";
    card.id = getProjectAnchorId(project);

    card.append(createStatus(project), createTitle(project, "h3", "project-card-title"));

    if(project.summary){
        const summary = document.createElement("p");
        summary.className = "project-card-summary";
        summary.textContent = project.summary;
        card.appendChild(summary);
    }

    card.appendChild(createProjectFacts(project));

    if(project.tags.length){
        card.appendChild(createProjectTags(project.tags.slice(0, 5)));
    }

    return card;
}

function createStatus(project){
    const status = document.createElement("span");
    status.className = `project-status ${getDevelopmentStatusClass(project.developmentStatus)}`;
    status.textContent = getDevelopmentStatusLabel(project.developmentStatus);
    return status;
}

function createTitle(project, tagName, className){
    const title = document.createElement(tagName);
    title.className = className;
    title.textContent = project.title || "無題の作品";
    return title;
}

function createProjectTags(tagValues){
    const tags = document.createElement("div");
    tags.className = "project-tags";

    tagValues.forEach(value => {
        const tag = document.createElement("span");
        tag.className = "project-tag";
        tag.textContent = value;
        tags.appendChild(tag);
    });

    return tags;
}

function createProjectFacts(project){
    const facts = document.createElement("dl");
    facts.className = "project-facts";

    [
        ["ジャンル", project.genre],
        ["対応", project.platform]
    ].forEach(([label, value]) => {
        if(!value){
            return;
        }

        const term = document.createElement("dt");
        term.textContent = label;

        const detail = document.createElement("dd");
        detail.textContent = value;

        facts.append(term, detail);
    });

    if(!facts.children.length){
        const term = document.createElement("dt");
        term.textContent = "情報";

        const detail = document.createElement("dd");
        detail.textContent = "詳細準備中";

        facts.append(term, detail);
    }

    return facts;
}

function createProjectAction(project){
    const link = document.createElement("a");
    link.className = "project-action";
    link.textContent = "作品を見る";

    if(project.url){
        link.href = project.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
    }else{
        link.href = `#${getProjectAnchorId(project)}`;
    }

    return link;
}

function getProjectAnchorId(project){
    return `project-${project.id.replace(/[^a-z0-9_-]/gi, "-")}`;
}

export function getDevelopmentStatusLabel(status){
    return DEVELOPMENT_STATUS_LABELS[toText(status)] || "状態未設定";
}

function getDevelopmentStatusClass(status){
    const normalized = toText(status);
    return DEVELOPMENT_STATUS_LABELS[normalized]
        ? `is-${normalized}`
        : "is-unset";
}

function renderProjects(projects, featuredContainer, gridContainer){
    setProjectsGridSectionVisible(gridContainer, true);

    if(projects.length === 0){
        updateProjectsSummary(0);
        featuredContainer.replaceChildren(
            createProjectEmptyState(
                "展示できる作品だけを置きます",
                "公開できる品質になった作品から、この展示室に並びます。"
            )
        );
        gridContainer.replaceChildren();
        setProjectsGridSectionVisible(gridContainer, false);
        return;
    }

    // Phase 2D-1C uses source order for the first featured work.
    // Future Home/Projects config can replace this with featuredProjectId or featuredIds
    // without changing the public-games.json data shape in this phase.
    const [featuredProject, ...restProjects] = projects;
    featuredContainer.replaceChildren(createFeaturedProject(featuredProject));

    if(restProjects.length === 0){
        updateProjectsSummary(0);
        gridContainer.replaceChildren();
        setProjectsGridSectionVisible(gridContainer, false);
        return;
    }

    updateProjectsSummary(restProjects.length);
    const grid = document.createElement("div");
    grid.className = "project-grid";
    grid.replaceChildren(...restProjects.map(createProjectCard));
    gridContainer.replaceChildren(grid);
}

function setProjectsGridSectionVisible(gridContainer, isVisible){
    const section = gridContainer.closest(".projects-grid-section");
    if(section){
        section.hidden = !isVisible;
    }
}

function updateProjectsSummary(count){
    const summary = document.getElementById("projectsSummary");

    if(summary){
        summary.textContent = count
            ? `${count}件の作品を公開順に表示しています。`
            : "展示できる品質になった作品だけを掲載します。";
    }
}

async function initProjects(){
    const featuredContainer = document.getElementById("featuredProject");
    const gridContainer = document.getElementById("projectsGrid");

    if(!featuredContainer || !gridContainer){
        return;
    }

    try{
        renderProjects(await fetchPublicGames(), featuredContainer, gridContainer);
    }catch(error){
        console.warn("Failed to load Projects data.", error);
        featuredContainer.replaceChildren(
            createProjectEmptyState(
                "作品を読み込めませんでした",
                "時間を置いて再度お試しください。"
            )
        );
        gridContainer.replaceChildren(
            createProjectEmptyState(
                "作品一覧を表示できません",
                "一時的に一覧を利用できません。"
            )
        );
    }
}

if(typeof document !== "undefined"){
    initProjects();
}
