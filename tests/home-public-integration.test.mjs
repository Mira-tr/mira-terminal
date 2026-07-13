import test from "node:test";
import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";

import {
    loadHomeDataByType,
    loadPublicHomeConfig,
    normalizePublicHomeConfig,
    selectHomeItems
} from "../apps/web/js/homeConfigApi.js";

import {
    renderHome
} from "../apps/web/js/homeRenderer.js";

import {
    initHomePage
} from "../apps/web/js/homePage.js";

const ROOT = new URL("../", import.meta.url);

test("Public Home Config API loads and validates public-home.json", async () => {
    const config = await loadPublicHomeConfig({
        fetcher: createFetcher({
            "./data/public-home.json": {
                schemaVersion: 1,
                exportType: "public-home",
                module: "home",
                sections: [
                    {
                        id: "featured-tools",
                        type: "tools",
                        enabled: true,
                        order: 30,
                        title: "Tools",
                        description: "",
                        layout: "cards",
                        selectionMode: "manual",
                        limit: 2,
                        itemIds: ["tool-a", "tool-a"]
                    }
                ]
            }
        })
    });

    assert.equal(config.schemaVersion, 1);
    assert.equal(config.sections[0].id, "featured-tools");
    assert.deepEqual(config.sections[0].itemIds, ["tool-a"]);
});

test("Public Home Config API rejects fetch failure and schema mismatch for static fallback", async () => {
    await assert.rejects(
        () => loadPublicHomeConfig({
            fetcher: createFetcher({})
        }),
        /Failed to fetch/
    );

    assert.throws(
        () => normalizePublicHomeConfig({
            schemaVersion: 2,
            exportType: "public-home",
            module: "home",
            sections: []
        }),
        /schemaVersion/
    );
});

test("Public Home selection supports manual, source-order, limit, and missing ID completion", () => {
    const items = [
        {
            id: "project-a",
            title: "Project A",
            order: 20
        },
        {
            id: "project-b",
            title: "Project B",
            order: 10
        },
        {
            id: "project-c",
            title: "Project C",
            order: 30
        }
    ];

    assert.deepEqual(
        selectHomeItems(items, {
            id: "featured-projects",
            type: "projects",
            selectionMode: "source-order",
            limit: 2
        }).map(item => item.id),
        ["project-b", "project-a"]
    );

    assert.deepEqual(
        selectHomeItems(items, {
            id: "featured-projects",
            type: "projects",
            selectionMode: "manual",
            itemIds: ["missing", "project-c"],
            limit: 3
        }).map(item => item.id),
        ["project-c", "project-b", "project-a"]
    );
});

test("Public Home section data joins only successful content JSON", async () => {
    const dataByType = await loadHomeDataByType([
        "projects",
        "tools",
        "notes",
        "creators"
    ], {
        fetcher: createFetcher({
            "./game/data/public-games.json": {
                games: [
                    {
                        id: "game-a",
                        title: "Game A",
                        order: 1
                    }
                ]
            },
            "./tools/data/public-tools.json": {
                tools: [
                    {
                        id: "tool-a",
                        name: "Tool A",
                        order: 1
                    }
                ]
            },
            "./data/public-creators.json": {
                creators: [
                    {
                        id: "creator-a",
                        displayName: "Creator A",
                        order: 1
                    }
                ]
            }
        })
    });

    assert.equal(dataByType.projects.items[0].title, "Game A");
    assert.equal(dataByType.tools.items[0].title, "Tool A");
    assert.equal(dataByType.creators.items[0].title, "Creator A");
    assert.equal(dataByType.notes.items, null);
    assert.ok(dataByType.notes.error);
});

test("Home Renderer updates hero, order, visibility, and leaves failed sections static", () => {
    const document = createHomeDocument();
    const config = normalizePublicHomeConfig({
        schemaVersion: 1,
        exportType: "public-home",
        module: "home",
        sections: [
            {
                id: "featured-tools",
                type: "tools",
                enabled: false,
                order: 10,
                title: "Configured Tools",
                description: "Hidden tools",
                layout: "cards",
                selectionMode: "source-order",
                limit: 1,
                itemIds: []
            },
            {
                id: "notes",
                type: "notes",
                enabled: true,
                order: 20,
                title: "Configured Notes",
                description: "Fallback note description",
                layout: "list",
                selectionMode: "source-order",
                limit: 1,
                itemIds: []
            },
            {
                id: "hero",
                type: "hero",
                enabled: true,
                order: 30,
                title: "Configured Hero",
                description: "Configured description",
                layout: "hero"
            },
            {
                id: "featured-projects",
                type: "projects",
                enabled: true,
                order: 40,
                title: "Configured Projects",
                description: "",
                layout: "cards",
                selectionMode: "manual",
                limit: 2,
                itemIds: ["missing", "project-c"]
            },
            {
                id: "creators",
                type: "creators",
                enabled: true,
                order: 50,
                title: "Configured Creators",
                description: "",
                layout: "cards",
                selectionMode: "source-order",
                limit: 1,
                itemIds: []
            }
        ]
    });

    renderHome(document, config, {
        projects: {
            items: [
                {
                    id: "project-a",
                    title: "Project A",
                    order: 1
                },
                {
                    id: "project-c",
                    title: "Project C",
                    order: 3
                }
            ]
        },
        notes: {
            items: null,
            error: new Error("notes failed")
        },
        creators: {
            items: [
                {
                    id: "creator-a",
                    title: "Creator A",
                    order: 1
                }
            ]
        }
    });

    assert.equal(document.querySelector("[data-home-section=\"hero\"] h2").textContent, "Configured Hero");
    assert.equal(
        document.querySelector("[data-home-section=\"hero\"] .section-description").textContent,
        "Configured description"
    );
    assert.equal(document.querySelector("[data-home-card=\"featured-tools\"]").hidden, true);
    assert.equal(document.querySelector("[data-home-card=\"notes\"] p").textContent, "Fallback note description");
    assert.equal(document.querySelector("[data-home-card=\"featured-projects\"] p").textContent, "Static Projects");
    assert.equal(document.querySelector("[data-home-card=\"creators\"] p").textContent, "Static Creators");
    assert.deepEqual(
        document.querySelectorAll("[data-home-section=\"featured-projects\"] li").map(item => ({
            text: item.textContent,
            hidden: item.hidden
        })),
        [
            {
                text: "Project C",
                hidden: false
            },
            {
                text: "Project A",
                hidden: false
            },
            {
                text: "Static 3",
                hidden: true
            }
        ]
    );
    assert.deepEqual(
        document.querySelectorAll(".module-card").map(card => card.getAttribute("data-home-card")),
        ["featured-tools", "notes", "featured-projects", "creators"]
    );
});

test("Home Renderer skips a missing Section DOM without stopping other sections", () => {
    const document = createHomeDocument();
    const missing = document.querySelector("[data-home-section=\"creators\"]");
    missing.parentNode.children = missing.parentNode.children.filter(child => child !== missing);

    const config = normalizePublicHomeConfig({
        schemaVersion: 1,
        exportType: "public-home",
        module: "home",
        sections: [
            {
                id: "hero",
                type: "hero",
                enabled: true,
                order: 10,
                title: "Still Renders",
                description: "Hero remains safe",
                layout: "hero"
            },
            {
                id: "creators",
                type: "creators",
                enabled: false,
                order: 20,
                title: "Missing Creators",
                description: "",
                layout: "cards",
                selectionMode: "source-order",
                limit: 1,
                itemIds: []
            },
            {
                id: "featured-projects",
                type: "projects",
                enabled: true,
                order: 30,
                title: "Projects Still Render",
                description: "",
                layout: "cards",
                selectionMode: "source-order",
                limit: 1,
                itemIds: []
            }
        ]
    });

    assert.doesNotThrow(() => renderHome(document, config, {
        projects: {
            items: [
                {
                    id: "project-a",
                    title: "Project A",
                    order: 1
                }
            ]
        }
    }));
    assert.equal(document.querySelector("[data-home-section=\"hero\"] h2").textContent, "Still Renders");
    assert.equal(document.querySelector("[data-home-section=\"featured-projects\"] li").textContent, "Project A");
});

test("Home Page keeps static fallback when public-home fetch fails", async () => {
    const document = createHomeDocument();

    await initHomePage({
        documentRef: document,
        fetcher: createFetcher({})
    });

    assert.equal(document.querySelector("[data-home-section=\"hero\"] h2").textContent, "Static Hero");
    assert.equal(document.querySelector("[data-home-card=\"featured-projects\"] p").textContent, "Static Projects");
});

test("Public Home HTML keeps SEO and static content while loading Home integration", async () => {
    const html = await read("apps/web/index.html");

    assert.match(html, /<title>RELMUA<\/title>/);
    assert.match(html, /<meta name="description"/);
    assert.match(html, /<meta property="og:title" content="RELMUA">/);
    assert.match(html, /<h1>RELMUA<\/h1>/);
    assert.match(html, /data-home-section="hero"/);
    assert.match(html, /data-home-card="featured-projects"/);
    assert.match(html, /<script type="module" src="\.\/js\/homePage\.js"><\/script>/);
    assert.doesNotMatch(html, /<main class="page">\s*<\/main>/);
});

test("Public Home integration does not reference TRPG data or Admin modules", async () => {
    const api = await read("apps/web/js/homeConfigApi.js");
    const renderer = await read("apps/web/js/homeRenderer.js");
    const page = await read("apps/web/js/homePage.js");

    [api, renderer, page].forEach(source => {
        assert.doesNotMatch(source, /trpg|rules|localStorage|Backup|Admin/i);
        assert.doesNotMatch(source, /innerHTML/);
    });
});

function createFetcher(payloads){
    return async url => {
        if(!Object.hasOwn(payloads, url)){
            return {
                ok: false,
                json: async () => ({})
            };
        }

        return {
            ok: true,
            json: async () => payloads[url]
        };
    };
}

function createHomeDocument(){
    const document = new FakeDocument();
    const main = document.createElement("main");
    main.className = "page";

    const hero = createSection(document, "hero", "Static Hero", "Static Description");
    const projects = createSection(document, "featured-projects", "Static Projects Section", "Static Projects Description");
    const creators = createSection(document, "creators", "Static Creators Section", "Static Creators Description");
    const links = document.createElement("div");
    links.className = "home-links";
    links.setAttribute("data-home-card-list", "");

    [
        ["featured-projects", "Projects", "Static Projects"],
        ["featured-tools", "Tools", "Static Tools"],
        ["notes", "Notes", "Static Notes"],
        ["creators", "Creators", "Static Creators"]
    ].forEach(([id, title, description]) => {
        links.appendChild(createCard(document, id, title, description));
    });

    hero.appendChild(links);
    projects.appendChild(createFeatureList(document, 3));
    main.append(hero, projects, creators);
    document.appendChild(main);

    return document;
}

function createSection(document, id, title, description){
    const section = document.createElement("section");
    section.setAttribute("data-home-section", id);
    const heading = document.createElement("h2");
    heading.textContent = title;
    const paragraph = document.createElement("p");
    paragraph.className = "section-description";
    paragraph.textContent = description;
    section.append(heading, paragraph);
    return section;
}

function createCard(document, id, title, description){
    const card = document.createElement("a");
    card.className = "module-card";
    card.setAttribute("data-home-card", id);
    const heading = document.createElement("h3");
    heading.textContent = title;
    const paragraph = document.createElement("p");
    paragraph.textContent = description;
    card.append(heading, paragraph);
    return card;
}

function createFeatureList(document, count){
    const list = document.createElement("ul");
    list.className = "feature-list";

    for(let index = 0; index < count; index += 1){
        const item = document.createElement("li");
        item.textContent = `Static ${index + 1}`;
        list.appendChild(item);
    }

    return list;
}

class FakeDocument {
    constructor(){
        this.children = [];
    }

    createElement(tagName){
        return new FakeElement(tagName);
    }

    appendChild(child){
        child.parentNode = this;
        this.children.push(child);
        return child;
    }

    querySelector(selector){
        return querySelector(this, selector);
    }

    querySelectorAll(selector){
        return querySelectorAll(this, selector);
    }
}

class FakeElement {
    constructor(tagName){
        this.tagName = tagName.toLowerCase();
        this.children = [];
        this.parentNode = null;
        this.attributes = {};
        this.className = "";
        this.textContent = "";
        this.hidden = false;
    }

    append(...children){
        children.forEach(child => this.appendChild(child));
    }

    appendChild(child){
        if(child.parentNode){
            const siblings = child.parentNode.children;
            const index = siblings.indexOf(child);

            if(index >= 0){
                siblings.splice(index, 1);
            }
        }

        child.parentNode = this;
        this.children.push(child);
        return child;
    }

    setAttribute(name, value){
        this.attributes[name] = String(value);
    }

    getAttribute(name){
        return this.attributes[name] ?? null;
    }

    querySelector(selector){
        return querySelector(this, selector);
    }

    querySelectorAll(selector){
        return querySelectorAll(this, selector);
    }
}

function querySelector(root, selector){
    return querySelectorAll(root, selector)[0] ?? null;
}

function querySelectorAll(root, selector){
    const parts = selector.trim().split(/\s+/);
    let current = [root];

    parts.forEach(part => {
        current = current.flatMap(element => findDescendants(element, part));
    });

    return current;
}

function findDescendants(root, selector){
    const found = [];
    const visit = element => {
        if(matchesSelector(element, selector)){
            found.push(element);
        }

        element.children?.forEach(visit);
    };

    root.children?.forEach(visit);
    return found;
}

function matchesSelector(element, selector){
    if(selector === "[data-home-card-list]"){
        return Object.hasOwn(element.attributes, "data-home-card-list");
    }

    const dataMatch = selector.match(/^\[data-home-(section|card)="([^"]+)"\]$/);

    if(dataMatch){
        return element.getAttribute(`data-home-${dataMatch[1]}`) === dataMatch[2];
    }

    if(selector.startsWith(".")){
        return element.className.split(/\s+/).includes(selector.slice(1));
    }

    if(selector.includes(".")){
        const [tagName, className] = selector.split(".");
        return element.tagName === tagName &&
            element.className.split(/\s+/).includes(className);
    }

    return element.tagName === selector.toLowerCase();
}

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
