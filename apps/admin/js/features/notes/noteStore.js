import { NOTES_KEY, load, save } from "../../store.js";
import { normalizeCreatorId } from "../creators/creatorCore.js";
import {
    hydrateGlobalCmsSnapshot,
    persistGlobalCmsSnapshot
} from "../cms/cmsCanonicalStore.js";

const DEFAULT_VALUE = { notes: [] };
const ALLOWED_STATUS = new Set(["draft", "public", "private"]);
const NOTES_CMS_COLLECTION = "notes";
const NOTES_CMS_RECORD_KEY = "collection";

function text(value, max){
    return String(value ?? "").trim().slice(0, max);
}

function status(value){
    const valueText = text(value, 20).toLowerCase();
    return ALLOWED_STATUS.has(valueText) ? valueText : "draft";
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
        ? `note-${globalThis.crypto.randomUUID()}`
        : `note-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalize(item, options = {}){
    const now = options.now || new Date().toISOString();
    return {
        id: options.id || text(item.id, 120) || id(),
        title: text(item.title, 100),
        summary: text(item.summary, 200),
        body: text(item.body, 5000),
        category: text(item.category, 60),
        status: status(item.status),
        tags: tags(item.tags),
        authorCreatorId: normalizeCreatorId(item.authorCreatorId),
        order: options.order ?? order(item.order),
        createdAt: timestamp(item.createdAt, now),
        updatedAt: options.touch ? now : timestamp(item.updatedAt, now)
    };
}

export function normalizeNotesCollection(value){
    const source = value && Array.isArray(value.notes) ? value.notes : [];
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
        notes: sorted.map(({ item }, index) => {
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

export function getNotes(){
    const loaded = load(NOTES_KEY, DEFAULT_VALUE);
    const normalized = normalizeNotesCollection(loaded);
    if(JSON.stringify(loaded) !== JSON.stringify(normalized)){
        saveNotes(normalized);
    }
    return normalized;
}

export function saveNotes(value){
    return save(NOTES_KEY, value);
}

export function setNotes(value){
    const normalized = normalizeNotesCollection(value);
    return saveNotes(normalized) ? normalized : false;
}

export function addNote(item){
    const value = getNotes();
    const created = normalize(item, {
        id: id(),
        order: value.notes.length + 1,
        touch: true
    });
    value.notes.push(created);
    return setNotes(value) ? created : false;
}

export function updateNote(itemId, updates){
    const value = getNotes();
    const index = value.notes.findIndex(item => item.id === itemId);
    if(index < 0){
        return false;
    }
    value.notes[index] = normalize(
        { ...value.notes[index], ...updates },
        {
            id: itemId,
            order: value.notes[index].order,
            touch: true
        }
    );
    return Boolean(setNotes(value));
}

export function deleteNote(itemId){
    const value = getNotes();
    value.notes = value.notes.filter(item => item.id !== itemId);
    return Boolean(setNotes(value));
}

export function moveNote(itemId, direction){
    const value = getNotes();
    const index = value.notes.findIndex(item => item.id === itemId);
    const target = direction === "up" ? index - 1 : index + 1;
    if(index < 0 || target < 0 || target >= value.notes.length){
        return false;
    }
    const [item] = value.notes.splice(index, 1);
    value.notes.splice(target, 0, item);
    value.notes.forEach((record, recordIndex) => {
        record.order = recordIndex + 1;
    });
    return Boolean(setNotes(value));
}

export async function hydrateNotesFromCms(){
    const result = await hydrateGlobalCmsSnapshot(createNotesCmsContract());
    return result.value;
}

export async function setNotesCanonical(value){
    const result = await persistGlobalCmsSnapshot(
        createNotesCmsContract(),
        value
    );
    return result.value;
}

export async function addNoteCanonical(item){
    const value = getNotes();
    const created = normalize(item, {
        id: id(),
        order: value.notes.length + 1,
        touch: true
    });
    value.notes.push(created);
    await setNotesCanonical(value);
    return created;
}

export async function updateNoteCanonical(itemId, updates){
    const value = getNotes();
    const index = value.notes.findIndex(item => item.id === itemId);
    if(index < 0){
        return false;
    }
    value.notes[index] = normalize(
        { ...value.notes[index], ...updates },
        {
            id: itemId,
            order: value.notes[index].order,
            touch: true
        }
    );
    await setNotesCanonical(value);
    return true;
}

export async function deleteNoteCanonical(itemId){
    const value = getNotes();
    const next = value.notes.filter(item => item.id !== itemId);
    if(next.length === value.notes.length){
        return false;
    }
    value.notes = next;
    await setNotesCanonical(value);
    return true;
}

export async function moveNoteCanonical(itemId, direction){
    const value = getNotes();
    const index = value.notes.findIndex(item => item.id === itemId);
    const target = direction === "up" ? index - 1 : index + 1;
    if(index < 0 || target < 0 || target >= value.notes.length){
        return false;
    }
    const [item] = value.notes.splice(index, 1);
    value.notes.splice(target, 0, item);
    value.notes.forEach((record, recordIndex) => {
        record.order = recordIndex + 1;
    });
    await setNotesCanonical(value);
    return true;
}

function createNotesCmsContract(){
    return {
        collection: NOTES_CMS_COLLECTION,
        recordKey: NOTES_CMS_RECORD_KEY,
        status: "private",
        readLocal: getNotes,
        normalize: normalizeNotesCollection,
        validate: validateNotesCollection,
        writeCache(value){
            if(saveNotes(value) === false){
                throw new Error("Notesのローカルcacheを更新できませんでした");
            }
        }
    };
}

function validateNotesCollection(value){
    if(!value || !Array.isArray(value.notes)){
        throw new Error("Notesデータの形式が正しくありません");
    }
    return true;
}
