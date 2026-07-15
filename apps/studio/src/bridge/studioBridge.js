export async function invokeStudio(command, payload = {}){
    const tauriInvoke = globalThis.__TAURI__?.core?.invoke;
    if(typeof tauriInvoke !== "function"){
        return {
            ok: false,
            error: "Tauri bridge is unavailable in browser preview.",
            command,
            payload
        };
    }

    return tauriInvoke(command, payload);
}
