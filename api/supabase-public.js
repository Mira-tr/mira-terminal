function isHttpsUrl(value){
    try{
        return new URL(value).protocol === "https:";
    }catch{
        return false;
    }
}

export default function handler(request, response){
    const supabaseUrl = String(process.env.SUPABASE_URL || "").trim();
    const publishableKey = String(
        process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || ""
    ).trim();
    const enabled = isHttpsUrl(supabaseUrl) && publishableKey.length > 20;

    response.setHeader("Cache-Control", "no-store, max-age=0");
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.status(200).json({
        schemaVersion: 1,
        enabled,
        scheduleEnabled: enabled,
        supabaseUrl: enabled ? supabaseUrl : "",
        publishableKey: enabled ? publishableKey : "",
        message: enabled ? "" : "Supabase is not configured for this deployment."
    });
}
