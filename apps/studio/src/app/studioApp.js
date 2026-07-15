import {
    getStudioPublicJsonModules,
    validatePublicJsonRegistry
} from "../shared/studioPublicJsonRegistry.js";

import {
    createProjectStatus
} from "../shared/studioProjectRoot.js";

renderStudio();

function renderStudio(){
    renderProjectStatus();
    renderJsonModules();
}

function renderProjectStatus(){
    const container = document.getElementById("studioStatus");
    if(!container) return;

    const status = createProjectStatus({
        rootPath: "(select in Tauri app)",
        entries: {
            "apps/web": true,
            "apps/admin": true,
            "scripts/build-public.mjs": true,
            "apps/web/CNAME": true,
            ".git": true
        },
        packageJson: true,
        publicJsonCount: getStudioPublicJsonModules().length,
        git: {
            branch: "(read-only)",
            headSha: "",
            dirty: false
        },
        dist: {
            exists: false,
            cname: "",
            canonicalOrigin: "",
            builtAt: ""
        }
    });

    container.replaceChildren(
        createCard("Project Root", status.rootPath, status.ok ? "Root contract is valid." : status.errors.join(" / ")),
        createCard("Git", status.branch || "read-only", "Phase 0 never commits, pushes, resets, or checks out."),
        createCard("Public JSON", String(status.publicJsonCount), "Read-only registry mapping.")
    );
}

function renderJsonModules(){
    const container = document.getElementById("studioJsonModules");
    if(!container) return;

    const modules = getStudioPublicJsonModules();
    const errors = validatePublicJsonRegistry(modules);
    const cards = modules.map(module => createCard(
        module.title,
        module.sourceFile,
        `${module.publicUrl} -> ${module.buildOutput}`
    ));

    if(errors.length > 0){
        cards.unshift(createCard("Registry Error", "Blocked", errors.join(" / ")));
    }

    container.replaceChildren(...cards);
}

function createCard(title, value, detail){
    const article = document.createElement("article");
    article.className = "studio-card";
    const heading = document.createElement("h3");
    const strong = document.createElement("strong");
    const text = document.createElement("p");
    heading.textContent = title;
    strong.textContent = value;
    text.textContent = detail;
    article.append(heading, strong, text);
    return article;
}
