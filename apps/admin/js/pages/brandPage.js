import {
    getPublicAdminSurfaces,
    resolveSurfaceUrls
} from "../features/site/publicAdminRegistry.js";

const adminRootUrl = new URL("../../", import.meta.url);
const container = document.getElementById("publicAdminBridge");

if(container){
    const surfaces = getPublicAdminSurfaces("brand", "relmua");
    container.replaceChildren(...surfaces.map(createSurfaceCard));
}

function createSurfaceCard(surface){
    const urls = resolveSurfaceUrls(surface, adminRootUrl);
    const article = document.createElement("article");
    article.className = "public-admin-bridge-card";

    const copy = document.createElement("div");
    copy.className = "public-admin-bridge-card__copy";

    const eyebrow = document.createElement("span");
    eyebrow.className = "public-admin-bridge-card__eyebrow";
    eyebrow.textContent = `PUBLIC / ${surface.label}`;

    const title = document.createElement("h3");
    title.textContent = surface.editorLabel;

    const description = document.createElement("p");
    description.textContent = surface.description;

    const route = document.createElement("code");
    route.textContent = `/${surface.publicPath}`.replace(/\/$/, surface.publicPath ? "/" : "/");

    copy.append(eyebrow, title, description, route);

    const actions = document.createElement("div");
    actions.className = "public-admin-bridge-card__actions";

    const edit = document.createElement("a");
    edit.className = "button button-primary";
    edit.href = urls.adminHref;
    edit.textContent = "編集する";

    const preview = document.createElement("a");
    preview.className = "button button-secondary";
    preview.href = urls.publicHref;
    preview.target = "_blank";
    preview.rel = "noopener";
    preview.textContent = "公開ページ ↗";

    actions.append(edit, preview);
    article.append(copy, actions);
    return article;
}
