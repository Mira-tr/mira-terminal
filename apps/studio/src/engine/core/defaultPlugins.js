import {
    createCollectionPlugin,
    createInspectorTabPlugin,
    createThemePlugin
} from "./pluginManager.js";

import {
    THEME_GROUPS
} from "../theme/index.js";

const COLLECTION_TYPES = Object.freeze([
    "TRPG",
    "Game",
    "Tool",
    "Note",
    "Gallery",
    "Music",
    "Video",
    "Portfolio"
]);

const INSPECTOR_TABS = Object.freeze([
    "Property",
    "Style",
    "Behavior",
    "Animation",
    "Accessibility",
    "Advanced"
]);

export function createDefaultStudioPlugins(){
    return [
        ...COLLECTION_TYPES.map(type => createCollectionPlugin({
            id: `collection:${type.toLowerCase()}`,
            label: type,
            collectionType: type
        })),
        ...THEME_GROUPS.map(group => createThemePlugin({
            id: `theme:${group.id}`,
            label: group.label,
            group: group.id
        })),
        ...INSPECTOR_TABS.map(tab => createInspectorTabPlugin({
            id: `inspector:${tab.toLowerCase()}`,
            label: tab,
            tab: {
                id: tab.toLowerCase(),
                label: tab
            }
        }))
    ];
}
