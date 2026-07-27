export const STUDIO_EVENTS = Object.freeze({
    COMPONENT_UPDATED: "component.updated",
    COMPONENT_ADDED: "component.added",
    COMPONENT_REMOVED: "component.removed",
    THEME_UPDATED: "theme.updated",
    ASSET_ADDED: "asset.added",
    PAGE_SAVED: "page.saved",
    GENERATOR_FINISHED: "generator.finished",
    PREVIEW_UPDATED: "preview.updated",
    HISTORY_RECORDED: "history.recorded",
    COMMAND_EXECUTED: "command.executed",
    COMMAND_UNDONE: "command.undone",
    COMMAND_REDONE: "command.redone",
    DIAGNOSTICS_UPDATED: "diagnostics.updated"
});

export function createEventBus(){
    const subscribers = new Map();
    const history = [];

    return {
        publish(type, payload = {}){
            const event = Object.freeze({
                type: String(type || ""),
                payload,
                timestamp: new Date().toISOString()
            });
            history.push(event);
            const handlers = subscribers.get(event.type) || [];

            handlers.forEach(handler => {
                handler(event);
            });

            return event;
        },
        subscribe(type, handler){
            const key = String(type || "");
            const handlers = subscribers.get(key) || [];
            subscribers.set(key, [...handlers, handler]);

            return () => {
                const nextHandlers = (subscribers.get(key) || []).filter(item => item !== handler);
                subscribers.set(key, nextHandlers);
            };
        },
        history(){
            return [...history];
        }
    };
}
