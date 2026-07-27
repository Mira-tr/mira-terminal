import {
    createCommandManager
} from "./commandManager.js";

import {
    createDiagnosticsEngine
} from "./diagnostics.js";

import {
    createEventBus
} from "./eventBus.js";

import {
    createPluginManager
} from "./pluginManager.js";

import {
    createStudioRegistry
} from "./registry.js";

export function createRelmuaEngine({
    history,
    plugins = []
} = {}){
    const eventBus = createEventBus();
    const registry = createStudioRegistry();
    const pluginManager = createPluginManager({
        eventBus,
        registry
    });
    const commandManager = createCommandManager({
        eventBus,
        history
    });
    const diagnostics = createDiagnosticsEngine({
        eventBus
    });

    plugins.forEach(plugin => {
        pluginManager.registerPlugin(plugin);
        pluginManager.enablePlugin(plugin.id);
    });

    return {
        eventBus,
        registry,
        pluginManager,
        commandManager,
        diagnostics
    };
}
