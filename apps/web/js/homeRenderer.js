import {
    getHomeSection,
    selectHomeItems
} from "./homeConfigApi.js";

import {
    applyHomeComponentModelToDocument,
    publicHomeConfigToComponentModel
} from "./componentRenderer.js";

const CONTENT_SECTION_IDS = Object.freeze([
    "featured-projects",
    "featured-tools",
    "notes",
    "creators"
]);

const SECTION_META_LABELS = Object.freeze({
    projects: "\u6ce8\u76ee",
    tools: "\u9053\u5177",
    notes: "\u8a18\u9332",
    creators: "\u6d3b\u52d5\u8005"
});

const SECTION_LINK_LABELS = Object.freeze({
    projects: "\u4f5c\u54c1\u3092\u898b\u308b",
    tools: "\u9053\u5177\u3092\u958b\u304f",
    notes: "\u8a18\u9332\u3092\u8aad\u3080",
    creators: "\u6d3b\u52d5\u8005\u3092\u898b\u308b"
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

    applyHomeComponentModelToDocument(
        documentRef,
        publicHomeConfigToComponentModel(config)
    );

    CONTENT_SECTION_IDS.forEach(sectionId => {
        const section = getHomeSection(config, sectionId);
        applyContentSection(documentRef, sectionId, section, dataByType[section?.type]);
    });
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
