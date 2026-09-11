import { TOOLS_KEY, load, save } from "../../store.js";
import { normalizeCreatorIds } from "../creators/creatorCore.js";
import {
    hydrateGlobalCmsSnapshot,
    persistGlobalCmsSnapshot
} from "../cms/cmsCanonicalStore.js";

const DEFAULT_VALUE = { tools: [] };
const ALLOWED_STATUS = new Set(["draft", "public", "private"]);
const TOOLS_CMS_COLLECTION = "tools";
const TOOLS_CMS_RECORD_KEY = "collection";

function text(value, max){
    return String(value ?? "").trim().slice(0, max);
}

function status(value){
    const valueText = text(value, 20).toLowerCase();
    return ALLOWED_STATUS.has(valueText) ? valueText : "draft";
}

function url(value){
    const valueText = text(value, 500);
    try{
        const parsed = new URL(valueText);
        return ["http:", "https:"].includes(parsed.protocol) ? valueText : "";
    }catch{
        return "";
    }
}

function path(value){
    const valueText = text(value, 300);
    return valueText &&
        !valueText.startsWith("//") &&
        !/^[a-z][a-z0-9+.-]*:/i.test(valueText) &&
        (valueText.startsWith("./") || valueText.startsWith("../"))
        ? valueText
        : "";
}

function tags(value){
    const source = Array.isArray(value)
        ? value
        : String(value ?? "").split(/[\n,]/);
    return [...new Set(source.map(item => text(item, 24)).filter(Boolean))].slice(0, 12);
}

function order(value){
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : 0;
}

function timestamp(value, fallback){
    return text(value, 50) || fallback;
}

function id(){
    return globalThis.crypto?.randomUUID
        ? `tool-${globalThis.crypto.randomUUID()}`
        : `tool-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalize(item, options = {}){
    const now = options.now || new Date().toISOString();
    return {
        id: options.id || text(item.id, 120) || id(),
        name: text(item.name, 80),
        summary: text(item.summary, 160),
        description: text(item.description, 2000),
        category: text(item.category, 60),
        status: status(item.status),
        path: path(item.path),
        url: url(item.url),
        tags: tags(item.tags),
        maintainerCreatorIds: normalizeCreatorIds(item.maintainerCreatorIds),
        order: options.order ?? order(item.order),
        createdAt: timestamp(item.createdAt, now),
        updatedAt: options.touch ? now : timestamp(item.updatedAt, now)
    };
}

export function normalizeToolsCollection(value){
    const source = value && Array.isArray(value.tools) ? value.tools : [];
    const now = new Date().toISOString();
    const used = new Set();
    const sorted = source
        .filter(item => item && typeof item === "object")
        .map((item, index) => ({ item, index, order: order(item.order) }))
        .sort((a, b) => {
            if(a.order === b.order){
                return a.index - b.index;
            }
            if(a.order === 0){
                return 1;
            }
            if(b.order === 0){
                return -1;
            }
            return a.order - b.order;
        });

    return {
        tools: sorted.map(({ item }, index) => {
            let itemId = text(item.id, 120);
            if(!itemId || used.has(itemId)){
                itemId = id();
            }
            used.add(itemId);
            return normalize(item, {
                id: itemId,
                order: index + 1,
                now
            });
        })
    };
}

export function getTools(){
    const loaded = load(TOOLS_KEY, DEFAULT_VALUE);
    const normalized = normalizeToolsCollection(loaded);
    if(JSON.stringify(loaded) !== JSON.stringify(normalized)){
        saveTools(normalized);
    }
    return normalized;
}

export function saveTools(value){
    return save(TOOLS_KEY, value);
}

export function setTools(value){
    const normalized = normalizeToolsCollection(value);
    return saveTools(normalized) ? normalized : false;
}

export function addTool(item){
    const value = getTools();
    const created = normalize(item, {
        id: id(),
        order: value.tools.length + 1,
        touch: true
    });
    value.tools.push(created);
    return setTools(value) ? created : false;
}

export function updateTool(itemId, updates){
    const value = getTools();
    const index = value.tools.findIndex(item => item.id === itemId);
    if(index < 0){
        return false;
    }
    value.tools[index] = normalize(
        { ...value.tools[index], ...updates },
        {
            id: itemId,
            order: value.tools[index].order,
            touch: true
        }
    );
    return Boolean(setTools(value));
}

export function deleteTool(itemId){
    const value = getTools();
    value.tools = value.tools.filter(item => item.id !== itemId);
    return Boolean(setTools(value));
}

export function moveTool(itemId, direction){
    const value = getTools();
    const index = value.tools.findIndex(item => item.id === itemId);
    const target = direction === "up" ? index - 1 : index + 1;
    if(index < 0 || target < 0 || target >= value.tools.length){
        return false;
    }
    const [item] = value.tools.splice(index, 1);
    value.tools.splice(target, 0, item);
    value.tools.forEach((record, recordIndex) => {
        record.order = recordIndex + 1;
    });
    return Boolean(setTools(value));
}

export async function hydrateToolsFromCms(){
    const result = await hydrateGlobalCmsSnapshot(createToolsCmsContract());
    return result.value;
}

export async function setToolsCanonical(value){
    const result = await persistGlobalCmsSnapshot(
        createToolsCmsContract(),
        value
    );
    return result.value;
}

export async function addToolCanonical(item){
    const value = getTools();
    const created = normalize(item, {
        id: id(),
        order: value.tools.length + 1,
        touch: true
    });
    value.tools.push(created);
    await setToolsCanonical(value);
    return created;
}

export async function updateToolCanonical(itemId, updates){
    const value = getTools();
    const index = value.tools.findIndex(item => item.id === itemId);
    if(index < 0){
        return false;
    }
    value.tools[index] = normalize(
        { ...value.tools[index], ...updates },
        {
            id: itemId,
            order: value.tools[index].order,
            touch: true
        }
    );
    await setToolsCanonical(value);
    return true;
}

export async function deleteToolCanonical(itemId){
    const value = getTools();
    const next = value.tools.filter(item => item.id !== itemId);
    if(next.length === value.tools.length){
        return false;
    }
    value.tools = next;
    await setToolsCanonical(value);
    return true;
}

export async function moveToolCanonical(itemId, direction){
    const value = getTools();
    const index = value.tools.findIndex(item => item.id === itemId);
    const target = direction === "up" ? index - 1 : index + 1;
    if(index < 0 || target < 0 || target >= value.tools.length){
        return false;
    }
    const [item] = value.tools.splice(index, 1);
    value.tools.splice(target, 0, item);
    value.tools.forEach((record, recordIndex) => {
        record.order = recordIndex + 1;
    });
    await setToolsCanonical(value);
    return true;
}

function createToolsCmsContract(){
    return {
        collection: TOOLS_CMS_COLLECTION,
        recordKey: TOOLS_CMS_RECORD_KEY,
        status: "private",
        readLocal: getTools,
        normalize: normalizeToolsCollection,
        validate: validateToolsCollection,
        writeCache(value){
            if(saveTools(value) === false){
                throw new Error("Toolsのローカルcacheを更新できませんでした");
            }
        }
    };
}

function validateToolsCollection(value){
    if(!value || !Array.isArray(value.tools)){
        throw new Error("Toolsデータの形式が正しくありません");
    }
    return true;
}
