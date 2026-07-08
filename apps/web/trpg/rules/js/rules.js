const DATA_URL = "./data/house-rules.json";

const SUPPORTED_SCHEMA_VERSION = 1;

export async function fetchHouseRules(){
    const response = await fetch(DATA_URL, {
        cache: "no-store"
    });

    if(!response.ok){
        throw new Error(`House Rulesデータの読み込みに失敗しました: ${response.status}`);
    }

    const data = await response.json();

    validateRulesPayload(data);

    return normalizeRules(data);
}

function validateRulesPayload(data){
    if(typeof data !== "object" || data === null){
        throw new Error("House Rulesデータの形式が正しくありません");
    }

    if(data.module !== undefined && data.module !== "trpg"){
        throw new Error("House Rulesデータのモジュールが正しくありません");
    }

    if(data.exportType !== undefined && data.exportType !== "house-rules"){
        throw new Error("House Rulesデータのエクスポートタイプが正しくありません");
    }

    if(data.schemaVersion !== undefined){
        const version = Number(data.schemaVersion);
        if(!Number.isInteger(version) || version > SUPPORTED_SCHEMA_VERSION){
            throw new Error(`House Rulesデータのスキーマバージョン${version}はサポートされていません`);
        }
    }

    if(!Array.isArray(data.systems)){
        throw new Error("House Rulesデータのsystemsが正しくありません");
    }
}

function normalizeRules(data){
    const systems = data.systems || [];

    return systems
        .filter(system => system && typeof system === "object")
        .map(system => ({
            id: toText(system.id),
            label: toText(system.label),
            description: toText(system.description),
            sections: normalizeSections(system.sections || [])
        }))
        .filter(system => system.id);
}

function normalizeSections(sections){
    if(!Array.isArray(sections)){
        return [];
    }

    return sections
        .filter(section => section && typeof section === "object")
        .map(section => ({
            id: toText(section.id),
            title: toText(section.title),
            body: toText(section.body),
            order: Number(section.order) || 0
        }))
        .filter(section => section.id)
        .sort((a, b) => a.order - b.order);
}

function toText(value){
    return String(value ?? "").trim();
}

function createSectionHead(label, title){
    const head = document.createElement("div");
    head.className = "section-head";

    const inner = document.createElement("div");
    const labelElement = document.createElement("p");
    labelElement.className = "section-label";
    labelElement.textContent = label;

    const titleElement = document.createElement("h2");
    titleElement.textContent = title;

    inner.append(labelElement, titleElement);
    head.appendChild(inner);
    return head;
}

function createRulesContent(body){
    const content = document.createElement("div");
    content.className = "rules-content";
    let list = null;

    body.split("\n").forEach(line => {
        if(line.startsWith("- ")){
            if(!list){
                list = document.createElement("ul");
                content.appendChild(list);
            }

            const item = document.createElement("li");
            item.textContent = line.substring(2);
            list.appendChild(item);
            return;
        }

        list = null;

        if(!line.trim()){
            return;
        }

        const paragraph = document.createElement("p");
        paragraph.textContent = line;
        content.appendChild(paragraph);
    });

    return content;
}

function createSystemElements(system){
    const elements = [createSectionHead(system.label, system.label)];

    if(system.description){
        elements.push(createRulesContent(system.description));
    }

    system.sections.forEach(section => {
        elements.push(
            createSectionHead("Section", section.title),
            createRulesContent(section.body)
        );
    });

    return elements;
}

function createRulesState(messageText, className = "empty-state"){
    const state = document.createElement("div");
    state.className = className;

    const message = document.createElement("p");
    message.className = "empty-state-message";
    message.textContent = messageText;

    state.appendChild(message);
    return state;
}

async function initRules(){
    try{
        const rules = await fetchHouseRules();
        const rulesContent = document.querySelector(".search-panel");

        if(!rulesContent){
            return;
        }

        const elements = rules.flatMap(createSystemElements);

        if(elements.length === 0){
            rulesContent.replaceChildren(
                createRulesState("公開中のハウスルールはありません。")
            );
            return;
        }

        rulesContent.replaceChildren(...elements);
    }catch(error){
        console.warn("House Rulesの読み込みに失敗しました", error);

        const rulesContent = document.querySelector(".search-panel");
        if(rulesContent){
            rulesContent.replaceChildren(
                createRulesState(
                    "ハウスルールを読み込めませんでした。時間をおいてもう一度お試しください。",
                    "error-state"
                )
            );
        }
    }
}

if(typeof document !== "undefined"){
    initRules();
}
