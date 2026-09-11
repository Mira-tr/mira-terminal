const PRODUCTION_SUPABASE_URL = "https://wvtsddeegsiiqmgsbfgi.supabase.co";
const PRODUCTION_PUBLISHABLE_KEY = "sb_publishable_sV37BdNGlBcRniJebG-ITQ_bUpiTxln";

function isHttpsUrl(value){
    try{
        return new URL(value).protocol === "https:";
    }catch{
        return false;
    }
}

function resolvePublicConfig(){
    const envUrl = String(process.env.SUPABASE_URL || "").trim();
    const envKey = String(
        process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || ""
    ).trim();

    if(isHttpsUrl(envUrl) && envKey.length > 20){
        return {
            supabaseUrl: envUrl,
            publishableKey: envKey,
            source: "environment"
        };
    }

    if(process.env.VERCEL_ENV === "production"){
        return {
            supabaseUrl: PRODUCTION_SUPABASE_URL,
            publishableKey: PRODUCTION_PUBLISHABLE_KEY,
            source: "production-fallback"
        };
    }

    return {
        supabaseUrl: "",
        publishableKey: "",
        source: "unconfigured"
    };
}

export default function handler(request, response){
    const config = resolvePublicConfig();
    const enabled = isHttpsUrl(config.supabaseUrl) && config.publishableKey.length > 20;

    response.setHeader("Cache-Control", "no-store, max-age=0");
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.status(200).json({
        schemaVersion: 1,
        enabled,
        scheduleEnabled: enabled,
        supabaseUrl: enabled ? config.supabaseUrl : "",
        publishableKey: enabled ? config.publishableKey : "",
        source: config.source,
        message: enabled ? "" : "Supabase is not configured for this deployment."
    });
}
