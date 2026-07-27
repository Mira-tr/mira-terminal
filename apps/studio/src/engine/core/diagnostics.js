import {
    STUDIO_EVENTS
} from "./eventBus.js";

export function createDiagnosticsEngine({
    eventBus
} = {}){
    const diagnostics = new Map([
        ["saved", createDiagnostic("saved", "保存済み", "pending")],
        ["generator", createDiagnostic("generator", "Generator待機中", "pending")],
        ["preview", createDiagnostic("preview", "Preview待機中", "pending")],
        ["hero-image", createDiagnostic("hero-image", "Hero画像なし", "warning")],
        ["publishable", createDiagnostic("publishable", "公開準備待ち", "pending")]
    ]);

    eventBus?.subscribe(STUDIO_EVENTS.COMPONENT_UPDATED, () => {
        set("saved", "未保存", "warning");
    });
    eventBus?.subscribe(STUDIO_EVENTS.COMPONENT_ADDED, () => {
        set("saved", "未保存", "warning");
    });
    eventBus?.subscribe(STUDIO_EVENTS.THEME_UPDATED, () => {
        set("saved", "未保存", "warning");
    });
    eventBus?.subscribe(STUDIO_EVENTS.ASSET_ADDED, () => {
        set("hero-image", "Asset追加済み", "success");
    });
    eventBus?.subscribe(STUDIO_EVENTS.PAGE_SAVED, () => {
        set("saved", "保存済み", "success");
        set("publishable", "公開可能", "success");
    });
    eventBus?.subscribe(STUDIO_EVENTS.GENERATOR_FINISHED, () => {
        set("generator", "Generator成功", "success");
    });
    eventBus?.subscribe(STUDIO_EVENTS.PREVIEW_UPDATED, () => {
        set("preview", "Preview一致", "success");
    });

    function set(id, label, tone){
        diagnostics.set(id, createDiagnostic(id, label, tone));
        eventBus?.publish(STUDIO_EVENTS.DIAGNOSTICS_UPDATED, {
            diagnostics: list()
        });
    }

    function list(){
        return Array.from(diagnostics.values());
    }

    return {
        set,
        list
    };
}

function createDiagnostic(id, label, tone){
    return Object.freeze({
        id,
        label,
        tone
    });
}
