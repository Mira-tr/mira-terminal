export function createPluginManager({
    eventBus,
    registry
} = {}){
    const plugins = new Map();
    const enabled = new Set();

    return {
        registerPlugin(plugin){
            const normalized = normalizePlugin(plugin);
            plugins.set(normalized.id, normalized);
            normalized.register?.({
                eventBus,
                registry
            });
            eventBus?.publish("plugin.registered", {
                pluginId: normalized.id
            });
            return normalized;
        },
        enablePlugin(id){
            const plugin = plugins.get(id);
            if(!plugin){
                return false;
            }

            enabled.add(id);
            plugin.enable?.({
                eventBus,
                registry
            });
            eventBus?.publish("plugin.enabled", {
                pluginId: id
            });
            return true;
        },
        disablePlugin(id){
            const plugin = plugins.get(id);
            if(!plugin){
                return false;
            }

            enabled.delete(id);
            plugin.disable?.({
                eventBus,
                registry
            });
            eventBus?.publish("plugin.disabled", {
                pluginId: id
            });
            return true;
        },
        listPlugins(){
            return Array.from(plugins.values()).map(plugin => ({
                ...plugin,
                enabled: enabled.has(plugin.id)
            }));
        },
        isEnabled(id){
            return enabled.has(id);
        }
    };
}

export function createCollectionPlugin({
    id,
    label,
    collectionType
}){
    return {
        id,
        label,
        kind: "collection",
        collectionType
    };
}

export function createThemePlugin({
    id,
    label,
    group
}){
    return {
        id,
        label,
        kind: "theme",
        group
    };
}

export function createInspectorTabPlugin({
    id,
    label,
    tab
}){
    return {
        id,
        label,
        kind: "inspector-tab",
        tab
    };
}

function normalizePlugin(plugin){
    if(!plugin || typeof plugin !== "object"){
        throw new TypeError("Plugin must be an object.");
    }

    const id = String(plugin.id || "").trim();
    if(!id){
        throw new TypeError("Plugin id is required.");
    }

    return Object.freeze({
        id,
        label: String(plugin.label || id),
        kind: String(plugin.kind || "generic"),
        collectionType: plugin.collectionType || "",
        group: plugin.group || "",
        tab: plugin.tab || null,
        register: plugin.register,
        enable: plugin.enable,
        disable: plugin.disable
    });
}
