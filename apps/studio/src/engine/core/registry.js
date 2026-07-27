export function createStudioRegistry(){
    const entries = new Map();

    return {
        register(kind, value){
            const key = String(kind || "");
            const list = entries.get(key) || [];
            entries.set(key, [...list, value]);
            return value;
        },
        list(kind){
            return [...(entries.get(String(kind || "")) || [])];
        },
        find(kind, predicate){
            return this.list(kind).find(predicate) || null;
        }
    };
}

export function registerMany(registry, kind, values){
    values.forEach(value => {
        registry.register(kind, value);
    });

    return registry.list(kind);
}
