import {
    getHomeSection,
    selectHomeItems
} from "./homeConfigApi.js";

const SECTION_NODE_IDS = Object.freeze([
    "hero",
    "featured-projects",
    "creators"
]);

const CARD_SECTION_IDS = Object.freeze([
    "featured-projects",
    "featured-tools",
    "notes",
    "creators"
]);

export function renderHome(documentRef, config, dataByType = {}){
    if(!documentRef || !config?.sections){
        return;
    }

    applyHero(documentRef, getHomeSection(config, "hero"));
    applyMainSectionOrder(documentRef, config);
    applyCards(documentRef, config, dataByType);
    applyFeatureSection(
        documentRef,
        "featured-projects",
        getHomeSection(config, "featured-projects"),
        dataByType.projects
    );
    applyFeatureSection(
        documentRef,
        "creators",
        getHomeSection(config, "creators"),
        dataByType.creators
    );
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

    setText(container.querySelector("h2"), section.title);
    setText(container.querySelector(".section-description"), section.description);
}

function applyMainSectionOrder(documentRef, config){
    const main = documentRef.querySelector("main.page");

    if(!main){
        return;
    }

    const nodes = SECTION_NODE_IDS
        .map(id => ({
            id,
            section: getHomeSection(config, id),
            node: findSection(documentRef, id)
        }))
        .filter(entry => entry.section && entry.node)
        .sort((a, b) => a.section.order - b.section.order);

    nodes.forEach(entry => main.appendChild(entry.node));
}

function applyCards(documentRef, config, dataByType){
    const container = documentRef.querySelector("[data-home-card-list]");

    if(!container){
        return;
    }

    const allCards = Array.from(container.querySelectorAll(".module-card"));
    const configuredCards = CARD_SECTION_IDS
        .map(id => ({
            id,
            section: getHomeSection(config, id),
            card: container.querySelector(`[data-home-card="${id}"]`)
        }))
        .filter(entry => entry.section && entry.card)
        .sort((a, b) => a.section.order - b.section.order);

    configuredCards.forEach(entry => {
        applyCard(entry.card, entry.section, dataByType[entry.section.type]);
    });

    const configuredCardSet = new Set(configuredCards.map(entry => entry.card));
    const staticCards = allCards.filter(card => !configuredCardSet.has(card));

    [
        ...configuredCards.map(entry => entry.card),
        ...staticCards
    ].forEach(card => container.appendChild(card));
}

function applyCard(card, section, dataResult){
    card.hidden = section.enabled === false;

    if(section.enabled === false){
        return;
    }

    setText(card.querySelector("h3"), section.title);

    const description = card.querySelector("p");

    if(section.description){
        setText(description, section.description);
    }
}

function applyFeatureSection(documentRef, sectionId, section, dataResult){
    const container = findSection(documentRef, sectionId);

    if(!container || !section){
        return;
    }

    container.hidden = section.enabled === false;

    if(section.enabled === false){
        return;
    }

    setText(container.querySelector("h2"), section.title);

    if(section.description){
        setText(container.querySelector(".section-description"), section.description);
    }

    updateFeatureList(container, section, dataResult);
}

function updateFeatureList(container, section, dataResult){
    const list = container.querySelector(".feature-list");

    if(!list){
        return;
    }

    const selected = getSelectedItems(section, dataResult);

    if(!selected.length){
        return;
    }

    const items = Array.from(list.querySelectorAll("li"));

    items.forEach((item, index) => {
        if(index < selected.length){
            item.textContent = selected[index].title;
            item.hidden = false;
        }else{
            item.hidden = true;
        }
    });
}

function getSelectedItems(section, dataResult){
    if(!Array.isArray(dataResult?.items)){
        return [];
    }

    return selectHomeItems(dataResult.items, section);
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
