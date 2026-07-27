export const HISTORY_ENGINE_SCHEMA_VERSION = 1;

export function createHistoryEngine({
    storage,
    key,
    limit = 50
}){
    const state = loadHistory(storage, key);

    return {
        record(label, payload = {}){
            const entry = createHistoryEntry(label, payload);
            state.entries = [entry, ...state.entries].slice(0, limit);
            saveHistory(storage, key, state);
            return entry;
        },
        list(){
            return [...state.entries];
        },
        snapshot(){
            return {
                schemaVersion: HISTORY_ENGINE_SCHEMA_VERSION,
                entries: [...state.entries]
            };
        }
    };
}

export function attachHistoryShortcuts(element, {
    onUndo = () => {},
    onRedo = () => {}
} = {}){
    element.addEventListener("keydown", event => {
        const key = String(event.key || "").toLowerCase();
        const isUndo = (event.ctrlKey || event.metaKey) && key === "z" && !event.shiftKey;
        const isRedo = (event.ctrlKey || event.metaKey) && key === "z" && event.shiftKey;

        if(isUndo){
            event.preventDefault();
            onUndo();
        }

        if(isRedo){
            event.preventDefault();
            onRedo();
        }
    });
}

function createHistoryEntry(label, payload){
    const now = new Date();

    return {
        id: `history-${now.getTime()}`,
        time: now.toISOString(),
        label: String(label || "Change").slice(0, 120),
        payload
    };
}

function loadHistory(storage, key){
    try{
        const parsed = JSON.parse(storage.getItem(key) || "null");

        return {
            schemaVersion: HISTORY_ENGINE_SCHEMA_VERSION,
            entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
        };
    }catch{
        return {
            schemaVersion: HISTORY_ENGINE_SCHEMA_VERSION,
            entries: []
        };
    }
}

function saveHistory(storage, key, state){
    try{
        storage.setItem(key, JSON.stringify({
            schemaVersion: HISTORY_ENGINE_SCHEMA_VERSION,
            entries: state.entries
        }));
    }catch{
        // History must never block editing.
    }
}
