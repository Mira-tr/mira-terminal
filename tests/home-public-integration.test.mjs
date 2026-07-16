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

test("Public Home selection dedupes manual, fallback, and source-order items", () => {
    const duplicatedItems = [
        {
            id: "creator-a",
            title: "Creator A",
            order: 1
        },
        {
            id: "creator-a",
            title: "Creator A Duplicate",
            order: 2
        },
        {
            id: "creator-b",
            title: "Creator B",
            order: 3
        }
    ];

    assert.deepEqual(
        selectHomeItems(duplicatedItems, {
            id: "creators",
            type: "creators",
            selectionMode: "source-order",
            limit: 3
        }).map(item => item.id),
        ["creator-a", "creator-b"]
    );

    assert.deepEqual(
        selectHomeItems(duplicatedItems, {
            id: "creators",
            type: "creators",
            selectionMode: "manual",
            itemIds: ["creator-a", "creator-a", "missing"],
            limit: 3
        }).map(item => item.id),
        ["creator-a", "creator-b"]
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
                        slug: "creator-a",
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
    assert.equal(dataByType.creators.items[0].slug, "creator-a");
    assert.equal(dataByType.notes.items, null);
    assert.ok(dataByType.notes.error);
});

test("Home Renderer updates hero, order, visibility, item content, and leaves failed sections static", () => {
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
                description: "Project section description",
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
                    summary: "Project A summary",
                    order: 1
                },
                {
                    id: "project-c",
                    title: "Project C",
                    summary: "Project C summary",
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
                    summary: "Creator source summary",
                    slug: "creator-a",
                    order: 1
                }
            ]
        }
    });

    assert.equal(document.querySelector("[data-home-section=\"hero\"] h1").textContent, "Configured Hero");
    assert.equal(
        document.querySelector("[data-home-section=\"hero\"] .section-description").textContent,
        "Configured description"
    );
    assert.equal(document.querySelector("[data-home-section=\"featured-tools\"]").hidden, true);
    assert.equal(
        document.querySelector("[data-home-section=\"notes\"] [data-home-section-description]").textContent,
        "Fallback note description"
    );
    assert.equal(
        document.querySelector("[data-home-section=\"notes\"] [data-home-item-title]").textContent,
        "Static Notes 1"
    );
    assert.deepEqual(
        document.querySelectorAll("[data-home-section]").map(section => section.getAttribute("data-home-section")),
        ["featured-tools", "notes", "hero", "featured-projects", "creators"]
    );
    assert.deepEqual(
        document.querySelectorAll("[data-home-section=\"featured-projects\"] [data-home-item]").map(item => ({
            title: item.querySelector("[data-home-item-title]").textContent,
            summary: item.querySelector("[data-home-item-summary]").textContent,
            hidden: item.hidden
        })),
        [
            {
                title: "Project C",
                summary: "Project C summary",
                hidden: false
            },
            {
                title: "Project A",
                summary: "Project A summary",
                hidden: false
            },
            {
                title: "Static Projects 3",
                summary: "static projects summary 3",
                hidden: true
            }
        ]
    );
    assert.equal(
        document.querySelector("[data-home-section=\"creators\"] [data-home-item-title]").textContent,
        "Creator A"
    );
    assert.equal(
        document.querySelector("[data-home-section=\"creators\"] [data-home-item-summary]").textContent,
        "static creators summary 1"
    );
    assert.equal(
        document.querySelector("[data-home-section=\"creators\"] [data-home-item-link]").getAttribute("href"),
        "./creators/creator-a/"
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
    assert.equal(document.querySelector("[data-home-section=\"hero\"] h1").textContent, "Still Renders");
    assert.equal(
        document.querySelector("[data-home-section=\"featured-projects\"] [data-home-item-title]").textContent,
        "Project A"
    );
});

test("Home Renderer renders one featured Creator, clears fallback text, and is stable on redraw", () => {
    const document = createHomeDocument();
    const config = normalizePublicHomeConfig({
        schemaVersion: 1,
        exportType: "public-home",
        module: "home",
        sections: [
            {
                id: "creators",
                type: "creators",
                enabled: true,
                order: 10,
                title: "Creators",
                description: "",
                layout: "cards",
                selectionMode: "source-order",
                limit: 4,
                itemIds: []
            }
        ]
    });

    renderHome(document, config, {
        creators: {
            items: [
                {
                    id: "creator-asagiri",
                    title: "朝霧",
                    slug: "asagiri",
                    order: 1
                },
                {
                    id: "creator-asagiri",
                    title: "朝霧 Duplicate",
                    slug: "asagiri",
                    order: 2
                },
                {
                    id: "creator-chikage",
                    title: "千景",
                    slug: "chikage",
                    order: 3
                }
            ]
        }
    });

    const creatorItems = document.querySelectorAll("[data-home-section=\"creators\"] [data-home-item]");

    assert.deepEqual(
        creatorItems.map(item => ({
            title: item.querySelector("[data-home-item-title]").textContent,
            hidden: item.hidden
        })),
        [
            {
                title: "朝霧",
                hidden: false
            }
        ]
    );
    assert.equal(document.querySelector("[data-home-item-avatar]").textContent, "");
    assert.equal(document.querySelector("[data-home-item-avatar]").dataset.creatorSlug, "asagiri");

    renderHome(document, config, {
        creators: {
            items: [
                {
                    id: "creator-chikage",
                    title: "千景",
                    slug: "chikage",
                    order: 1
                },
                {
                    id: "creator-asagiri",
                    title: "朝霧",
                    slug: "asagiri",
                    order: 2
                }
            ]
        }
    });

    assert.equal(document.querySelector("[data-home-section=\"creators\"] [data-home-item-title]").textContent, "千景");
    assert.equal(document.querySelector("[data-home-item-avatar]").dataset.creatorSlug, "chikage");
});

test("Home Renderer hides Tools section when public tools are empty", () => {
    const document = createHomeDocument();
    const config = normalizePublicHomeConfig({
        schemaVersion: 1,
        exportType: "public-home",
        module: "home",
        sections: [
            {
                id: "featured-tools",
                type: "tools",
                enabled: true,
                order: 10,
                title: "Tools",
                description: "",
                layout: "cards",
                selectionMode: "source-order",
                limit: 3,
                itemIds: []
            }
        ]
    });

    renderHome(document, config, {
        tools: {
            items: []
        }
    });

    assert.equal(document.querySelector("[data-home-section=\"featured-tools\"]").hidden, true);
    assert.ok(
        document.querySelectorAll("[data-home-section=\"featured-tools\"] [data-home-item]")
            .every(item => item.hidden)
    );
});

test("Home Renderer hides sections when loaded source items are brand-incompatible", () => {
    const document = createHomeDocument();
    const config = normalizePublicHomeConfig({
        schemaVersion: 1,
        exportType: "public-home",
        module: "home",
        sections: [
            {
                id: "featured-tools",
                type: "tools",
                enabled: true,
                order: 10,
                title: "Tools",
                description: "",
                layout: "cards",
                selectionMode: "source-order",
                limit: 1,
                itemIds: []
            }
        ]
    });

    renderHome(document, config, {
        tools: {
            items: [
                {
                    id: "tool-a",
                    title: `Table ${"T" + "RPG"} Utility`,
                    summary: `House ${"Ru" + "les"} helper for Mira ${"Terminal"}`,
                    order: 1
                }
            ]
        }
    });

    assert.equal(document.querySelector("[data-home-section=\"featured-tools\"]").hidden, true);
});

test("Home Page keeps static fallback when public-home fetch fails", async () => {
    const document = createHomeDocument();

    await initHomePage({
        documentRef: document,
        fetcher: createFetcher({})
    });

    assert.equal(document.querySelector("[data-home-section=\"hero\"] h1").textContent, "Static Hero");
    assert.equal(
        document.querySelector("[data-home-section=\"featured-projects\"] [data-home-item-title]").textContent,
        "Static Projects 1"
    );
});

test("Public Home HTML keeps SEO and static content while loading Home integration", async () => {
    const html = await read("apps/web/index.html");

    assert.match(html, /<title>RELMUA<\/title>/);
    assert.match(html, /<meta name="description"/);
    assert.match(html, /<meta property="og:title" content="RELMUA">/);
    assert.match(html, /<main class="page brand-main home-page">[\s\S]*<h1[^>]*>RELMUA<\/h1>/);
    assert.match(html, /data-home-section="hero"/);
    assert.match(html, /data-home-item-list="featured-projects"/);
    assert.match(html, /data-home-item-list="featured-tools"/);
    assert.match(html, /data-home-item-list="notes"/);
    assert.match(html, /home-featured-creator/);
    assert.match(html, /<section class="home-section home-tools" data-home-section="featured-tools" hidden/);
    assert.doesNotMatch(html, /JSON Viewer|Markdown Editor|Dice Roller/);
    assert.doesNotMatch(html, /<section class="home-section home-creators" data-home-section="creators"/);
    assert.doesNotMatch(html, /class="home-creator-card" data-home-item|data-home-item-avatar/);
    assert.match(html, /<script type="module" src="\.\/js\/homePage\.js"><\/script>/);
    assert.doesNotMatch(html, /<main class="page">\s*<\/main>/);
});

test("Public Home CSS keeps component structure and responsive safety", async () => {
    const css = await read("apps/web/css/home.css");

    [
        "/* Hero */",
        "/* Featured Project / Feature Block */",
        "/* Tool Tile */",
        "/* Note Row */",
        "/* Responsive */"
    ].forEach(section => assert.match(css, new RegExp(escapeRegExp(section)), section));

    assert.doesNotMatch(css, /!important|nth-child/i);
    assert.match(css, /\.home-hero__actions\s*{[\s\S]*flex-wrap:\s*wrap;/);
    assert.match(css, /@media \(max-width: 900px\)[\s\S]*\.home-feature-block\s*{[\s\S]*grid-template-columns:\s*1fr;/);
    assert.match(css, /@media \(max-width: 640px\)[\s\S]*\.home-tool-grid\s*{[\s\S]*grid-template-columns:\s*1fr;/);
    assert.match(css, /overflow-wrap:\s*anywhere;/);
    assert.match(css, /min-width:\s*0;/);
});

test("Public Home integration does not reference private data or Admin modules", async () => {
    const api = await read("apps/web/js/homeConfigApi.js");
    const renderer = await read("apps/web/js/homeRenderer.js");
    const page = await read("apps/web/js/homePage.js");

    [api, renderer, page].forEach(source => {
        assert.doesNotMatch(source, /localStorage|Backup|Admin/i);
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
    main.className = "page brand-main home-page";

    main.append(
        createHeroSection(document),
        createContentSection(document, "featured-projects", "Static Projects", 3),
        createContentSection(document, "featured-tools", "Static Tools", 3),
        createContentSection(document, "notes", "Static Notes", 3),
        createContentSection(document, "creators", "Static Creators", 1)
    );
    document.appendChild(main);

    return document;
}

function createHeroSection(document){
    const section = document.createElement("section");
    section.setAttribute("data-home-section", "hero");
    const heading = document.createElement("h1");
    heading.textContent = "Static Hero";
    const paragraph = document.createElement("p");
    paragraph.className = "section-description";
    paragraph.textContent = "Static Description";
    section.append(heading, paragraph);
    return section;
}

function createContentSection(document, id, titlePrefix, count){
    const section = document.createElement("section");
    section.setAttribute("data-home-section", id);
    const heading = document.createElement("h2");
    heading.setAttribute("data-home-section-title", "");
    heading.textContent = titlePrefix;
    const paragraph = document.createElement("p");
    paragraph.setAttribute("data-home-section-description", "");
    paragraph.textContent = `${titlePrefix} description`;
    const list = document.createElement("div");
    list.setAttribute("data-home-item-list", id);

    for(let index = 0; index < count; index += 1){
        list.appendChild(createHomeItem(document, titlePrefix, index + 1, id === "creators"));
    }

    section.append(heading, paragraph, list);
    return section;
}

function createHomeItem(document, titlePrefix, number, withAvatar){
    const item = document.createElement("article");
    item.setAttribute("data-home-item", "");
    const meta = document.createElement("p");
    meta.setAttribute("data-home-item-meta", "");
    meta.textContent = "Static";
    const heading = document.createElement("h3");
    heading.setAttribute("data-home-item-title", "");
    heading.textContent = `${titlePrefix} ${number}`;
    const summary = document.createElement("p");
    summary.setAttribute("data-home-item-summary", "");
    summary.textContent = `${titlePrefix.toLowerCase()} summary ${number}`;
    const link = document.createElement("a");
    link.setAttribute("data-home-item-link", "");
    link.setAttribute("href", "./");
    link.textContent = "Static link";

    if(withAvatar){
        const avatar = document.createElement("div");
        avatar.setAttribute("data-home-item-avatar", "");
        avatar.textContent = "S";
        item.append(avatar);
    }

    item.append(meta, heading, summary, link);
    return item;
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
        this.dataset = {};
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
    const dataMatch = selector.match(/^\[data-home-([a-z-]+)(?:="([^"]+)")?\]$/);

    if(dataMatch){
        const attribute = `data-home-${dataMatch[1]}`;

        if(dataMatch[2] === undefined){
            return Object.hasOwn(element.attributes, attribute);
        }

        return element.getAttribute(attribute) === dataMatch[2];
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

function escapeRegExp(value){
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
