import {
    STUDIO_EVENTS
} from "./eventBus.js";

export function createCommandManager({
    eventBus,
    history
} = {}){
    const undoStack = [];
    const redoStack = [];

    return {
        execute(command){
            const normalized = normalizeCommand(command);
            const result = normalized.execute();
            undoStack.push(normalized);
            redoStack.length = 0;
            const historyEntry = history?.record(normalized.label, {
                commandId: normalized.id,
                payload: normalized.payload
            });
            eventBus?.publish(STUDIO_EVENTS.HISTORY_RECORDED, {
                entry: historyEntry
            });
            eventBus?.publish(STUDIO_EVENTS.COMMAND_EXECUTED, {
                command: publicCommand(normalized),
                result
            });
            return result;
        },
        undo(){
            const command = undoStack.pop();
            if(!command){
                return null;
            }

            const result = command.undo();
            redoStack.push(command);
            eventBus?.publish(STUDIO_EVENTS.COMMAND_UNDONE, {
                command: publicCommand(command),
                result
            });
            return command;
        },
        redo(){
            const command = redoStack.pop();
            if(!command){
                return null;
            }

            const result = command.redo();
            undoStack.push(command);
            eventBus?.publish(STUDIO_EVENTS.COMMAND_REDONE, {
                command: publicCommand(command),
                result
            });
            return command;
        },
        canUndo(){
            return undoStack.length > 0;
        },
        canRedo(){
            return redoStack.length > 0;
        }
    };
}

export function createCommand({
    id,
    label,
    payload = {},
    execute,
    undo,
    redo
}){
    return normalizeCommand({
        id,
        label,
        payload,
        execute,
        undo,
        redo
    });
}

function normalizeCommand(command){
    if(!command || typeof command !== "object"){
        throw new TypeError("Command must be an object.");
    }

    ["execute", "undo", "redo"].forEach(method => {
        if(typeof command[method] !== "function"){
            throw new TypeError(`Command ${method}() is required.`);
        }
    });

    return {
        id: String(command.id || `command-${Date.now()}`),
        label: String(command.label || "Command"),
        payload: command.payload || {},
        execute: command.execute,
        undo: command.undo,
        redo: command.redo
    };
}

function publicCommand(command){
    return {
        id: command.id,
        label: command.label,
        payload: command.payload
    };
}
