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
    label.textContent = "Projects";

    const heading = document.createElement("h3");
    heading.textContent = title;

    const description = document.createElement("p");
    description.textContent = message;

    emptyState.append(
        label,
        heading,
        description,
        createBrandTextLink("Return Home", "../")
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
    description.textContent = project.summary || project.description || "Project details are being prepared.";
    body.appendChild(description);

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
    title.textContent = project.title || "Untitled Project";
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

function createProjectAction(project){
    const link = document.createElement("a");
    link.className = "project-action";
    link.textContent = "View Project";

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
    return DEVELOPMENT_STATUS_LABELS[toText(status)] || "ステータス未設定";
}

function getDevelopmentStatusClass(status){
    const normalized = toText(status);
    return DEVELOPMENT_STATUS_LABELS[normalized]
        ? `is-${normalized}`
        : "is-unset";
}

function renderProjects(projects, featuredContainer, gridContainer){
    if(projects.length === 0){
        featuredContainer.replaceChildren(
            createProjectEmptyState(
                "Projects are being prepared",
                "Featured work will appear here once a public project is ready."
            )
        );
        gridContainer.replaceChildren(
            createProjectEmptyState(
                "No project archive yet",
                "Additional projects will be collected here as they become ready to show."
            )
        );
        return;
    }

    // Phase 2D-1C uses source order for the first featured work.
    // Future Home/Projects config can replace this with featuredProjectId or featuredIds
    // without changing the public-games.json data shape in this phase.
    const [featuredProject, ...restProjects] = projects;
    featuredContainer.replaceChildren(createFeaturedProject(featuredProject));

    if(restProjects.length === 0){
        gridContainer.replaceChildren(
            createProjectEmptyState(
                "More projects are coming",
                "The wider project grid will grow as additional works become public."
            )
        );
        return;
    }

    const grid = document.createElement("div");
    grid.className = "project-grid";
    grid.replaceChildren(...restProjects.map(createProjectCard));
    gridContainer.replaceChildren(grid);
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
                "Projects could not be loaded",
                "Please wait a moment and try again."
            )
        );
        gridContainer.replaceChildren(
            createProjectEmptyState(
                "Project archive unavailable",
                "The archive is temporarily unavailable."
            )
        );
    }
}

if(typeof document !== "undefined"){
    initProjects();
}
