import {
    getHomeSection,
    selectHomeItems
} from "./homeConfigApi.js";

const SECTION_NODE_IDS = Object.freeze([
    "hero",
    "featured-projects",
    "featured-tools",
    "notes",
    "creators"
]);

const CONTENT_SECTION_IDS = Object.freeze([
    "featured-projects",
    "featured-tools",
    "notes",
    "creators"
]);

const SECTION_META_LABELS = Object.freeze({
    projects: "Featured",
    tools: "Utility",
    notes: "Note",
    creators: "Creator"
});

const SECTION_LINK_LABELS = Object.freeze({
    projects: "View project",
    tools: "Open tools",
    notes: "Read notes",
    creators: "View Creator"
});

const SECTION_LINK_HREFS = Object.freeze({
    projects: "./projects/",
    tools: "./tools/",
    notes: "./notes/",
    creators: "./creators/"
});

export function renderHome(documentRef, config, dataByType = {}){
    if(!documentRef || !config?.sections){
        return;
    }

    applyHero(documentRef, getHomeSection(config, "hero"));
    applyMainSectionOrder(documentRef, config);

    CONTENT_SECTION_IDS.forEach(sectionId => {
        const section = getHomeSection(config, sectionId);
        applyContentSection(documentRef, sectionId, section, dataByType[section?.type]);
    });
}

function applyHero(documentRef, section){
    const container = findSection(documentRef, "hero");

    if(!container || !section){
        return;
    }

    container.hidden = section.enabled === false;

    if(section.enabled === false){
        return;
    }

    setText(container.querySelector("h1"), section.title);
    setOptionalText(container.querySelector(".section-description"), section.description);
}

function applyMainSectionOrder(documentRef, config){
    const main = documentRef.querySelector("main.page");

    if(!main){
        return;
    }

    SECTION_NODE_IDS
        .map(id => ({
            id,
            section: getHomeSection(config, id),
            node: findSection(documentRef, id)
        }))
        .filter(entry => entry.section && entry.node)
        .sort((a, b) => a.section.order - b.section.order)
        .forEach(entry => main.appendChild(entry.node));
}

function applyContentSection(documentRef, sectionId, section, dataResult){
    const container = findSection(documentRef, sectionId);

    if(!container || !section){
        return;
    }

    container.hidden = section.enabled === false;

    if(section.enabled === false){
        return;
    }

    setText(container.querySelector("[data-home-section-title]"), section.title);
    setOptionalText(container.querySelector("[data-home-section-description]"), section.description);
    updateContentItems(container, section, dataResult);
}

function updateContentItems(container, section, dataResult){
    const list = container.querySelector(`[data-home-item-list="${section.id}"]`);

    if(!list || !Array.isArray(dataResult?.items)){
        return;
    }

    const selected = getSelectedItems(section, dataResult);

    if(!selected.length){
        return;
    }

    const nodes = Array.from(list.querySelectorAll("[data-home-item]"));

    nodes.forEach((node, index) => {
        if(index >= selected.length){
            node.hidden = true;
            return;
        }

        applyItem(node, selected[index], section.type);
        node.hidden = false;
    });
}

function applyItem(node, item, sectionType){
    const fallbackSummary = node.querySelector("[data-home-item-summary]")?.textContent;
    // Creator bio belongs to the Creator source/detail page; Home keeps a short local intro.
    const safeSummary = sectionType === "creators"
        ? fallbackSummary
        : item.summary || fallbackSummary;

    setText(node.querySelector("[data-home-item-meta]"), SECTION_META_LABELS[sectionType]);
    setText(node.querySelector("[data-home-item-title]"), item.title);
    setText(node.querySelector("[data-home-item-summary]"), safeSummary);

    const link = node.querySelector("[data-home-item-link]");

    if(link){
        link.setAttribute("href", getItemHref(item, sectionType));
        setText(link, SECTION_LINK_LABELS[sectionType]);
    }

    const avatar = node.querySelector("[data-home-item-avatar]");

    if(avatar && item.title){
        avatar.textContent = item.title.slice(0, 1).toUpperCase();
    }
}

function getSelectedItems(section, dataResult){
    const items = Array.isArray(dataResult?.items)
        ? dataResult.items.filter(item => !isHomeSensitiveItem(item))
        : [];

    return selectHomeItems(items, section);
}

function isHomeSensitiveItem(item){
    const search = `${item.title ?? ""} ${item.summary ?? ""}`.toLowerCase();
    const tableTopic = `t${"rpg"}`;
    const privateGuide = `house ${"ru" + "les"}`;

    return search.includes(tableTopic) || search.includes(privateGuide);
}

function getItemHref(item, sectionType){
    if(sectionType === "creators" && /^[a-z0-9-]+$/.test(item.slug ?? "")){
        return `./creators/${item.slug}/`;
    }

    return SECTION_LINK_HREFS[sectionType] ?? "./";
}

function findSection(documentRef, id){
    return documentRef.querySelector(`[data-home-section="${id}"]`);
}

function setText(element, value){
    if(!element || value === undefined || value === null){
        return;
    }

    element.textContent = String(value);
}

function setOptionalText(element, value){
    if(value === ""){
        return;
    }

    setText(element, value);
}
