export const SUPABASE_PUBLIC_CONFIG_PATH = "/config/supabase-public.json";
export const SUPABASE_ESM_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export async function loadSupabasePublicConfig(fetchImpl = globalThis.fetch){
    if(typeof fetchImpl !== "function"){
        return createDisabledConfig("fetch unavailable");
    }

    try{
        const response = await fetchImpl(SUPABASE_PUBLIC_CONFIG_PATH, {
            cache: "no-store"
        });

        if(!response.ok){
            return createDisabledConfig(`config unavailable: ${response.status}`);
        }

        return normalizeSupabasePublicConfig(await response.json());
    }catch(error){
        return createDisabledConfig(error?.message || "config unavailable");
    }
}

export function normalizeSupabasePublicConfig(value){
    const source = value && typeof value === "object" ? value : {};
    const supabaseUrl = text(source.supabaseUrl, 240);
    const publishableKey = text(source.publishableKey, 512);
    const enabled = Boolean(source.enabled) && isHttpsUrl(supabaseUrl) && publishableKey.length > 20;

    return {
        schemaVersion: 1,
        enabled,
        supabaseUrl: enabled ? supabaseUrl : "",
        publishableKey: enabled ? publishableKey : "",
        scheduleEnabled: enabled && Boolean(source.scheduleEnabled ?? true),
        message: enabled ? "" : text(source.message, 160) || "Supabase is not configured."
    };
}

export async function createSupabaseBrowserClient(config, moduleLoader = url => import(url)){
    const normalized = normalizeSupabasePublicConfig(config);

    if(!normalized.enabled || !normalized.scheduleEnabled){
        return null;
    }

    const module = await moduleLoader(SUPABASE_ESM_URL);
    return module.createClient(normalized.supabaseUrl, normalized.publishableKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    });
}

function createDisabledConfig(message){
    return {
        schemaVersion: 1,
        enabled: false,
        supabaseUrl: "",
        publishableKey: "",
        scheduleEnabled: false,
        message
    };
}

function isHttpsUrl(value){
    try{
        const url = new URL(value);
        return url.protocol === "https:";
    }catch{
        return false;
    }
}

function text(value, maxLength){
    return String(value ?? "").trim().slice(0, maxLength);
}
