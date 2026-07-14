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
    projects: "注目",
    tools: "道具",
    notes: "記録",
    creators: "活動者"
});

const SECTION_LINK_LABELS = Object.freeze({
    projects: "作品を見る",
    tools: "道具を開く",
    notes: "記録を読む",
    creators: "活動者を見る"
});

const LOCALIZED_SECTION_TITLES = Object.freeze({
    Projects: "作品",
    Tools: "道具",
    Notes: "記録",
    Creators: "活動者"
});

const SECTION_LINK_HREFS = Object.freeze({
    projects: "./projects/",
    tools: "./tools/",
    notes: "./notes/",
    creators: "./creators/"
});

const HOME_CREATOR_LIMIT = 1;

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

    const configuredEntries = SECTION_NODE_IDS
        .map(id => ({
            id,
            order: getHomeSection(config, id)?.order,
            node: findSection(documentRef, id),
            sourceIndex: 0
        }))
        .filter(entry => Number.isFinite(entry.order) && entry.node);

    const staticEntries = Array.from(main.querySelectorAll("[data-home-static-order]")).map((node, index) => ({
        id: node.getAttribute("data-home-static-order") || `static-${index}`,
        order: Number(node.getAttribute("data-home-static-order")),
        node,
        sourceIndex: index + SECTION_NODE_IDS.length
    })).filter(entry => Number.isFinite(entry.order));

    [...configuredEntries, ...staticEntries]
        .sort((a, b) => a.order - b.order || a.sourceIndex - b.sourceIndex)
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

    setText(container.querySelector("[data-home-section-title]"), localizeSectionTitle(section.title));
    setOptionalText(container.querySelector("[data-home-section-description]"), section.description);
    updateContentItems(container, section, dataResult);
}

function updateContentItems(container, section, dataResult){
    const list = container.querySelector(`[data-home-item-list="${section.id}"]`);

    if(!list || !Array.isArray(dataResult?.items)){
        return;
    }

    const selected = getSelectedItems(section, dataResult);
    const nodes = Array.from(list.querySelectorAll("[data-home-item]"));

    if(!selected.length){
        container.hidden = true;
        nodes.forEach(node => {
            node.hidden = true;
        });
        return;
    }

    container.hidden = false;

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

    if(avatar){
        avatar.textContent = "";
        avatar.dataset.creatorId = item.id || "";
        avatar.dataset.creatorSlug = item.slug || "";
    }
}

function getSelectedItems(section, dataResult){
    const items = Array.isArray(dataResult?.items)
        ? dataResult.items.filter(item => !isHomeSensitiveItem(item))
        : [];

    const effectiveSection = section.type === "creators"
        ? {
            ...section,
            limit: HOME_CREATOR_LIMIT
        }
        : section;

    return selectHomeItems(items, effectiveSection);
}

function isHomeSensitiveItem(item){
    const search = `${item.title ?? ""} ${item.summary ?? ""}`.toLowerCase();
    const tableTopic = `t${"rpg"}`;
    const privateGuide = `house ${"ru" + "les"}`;
    const legacyTerminal = `mira ${"terminal"}`;

    return search.includes(tableTopic) || search.includes(privateGuide) || search.includes(legacyTerminal);
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

function localizeSectionTitle(value){
    return LOCALIZED_SECTION_TITLES[value] || value;
}
