const SUPABASE_PUBLIC_CONFIG_PATH = "/config/supabase-public.json";
const SUPABASE_ESM_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.56.0/+esm";

let clientPromise = null;

export async function getCmsClient(){
    if(!clientPromise){
        clientPromise = createCmsClient();
    }
    return clientPromise;
}

export async function getCmsAccessState(){
    const client = await getCmsClient();
    if(!client){
        return {
            configured: false,
            authenticated: false,
            isAdmin: false,
            creatorIds: [],
            user: null,
            message: "Supabaseが設定されていません。"
        };
    }

    const { data: userData, error: userError } = await client.auth.getUser();
    const user = userData?.user || null;
    if(userError || !user){
        return {
            configured: true,
            authenticated: false,
            isAdmin: false,
            creatorIds: [],
            user: null,
            message: "DiscordでログインするとDB管理を利用できます。"
        };
    }

    const [memberResult, creatorResult] = await Promise.all([
        client.from("cms_admin_members").select("role").eq("user_id", user.id).maybeSingle(),
        client.from("cms_creators").select("id, slug").eq("owner_user_id", user.id)
    ]);

    const creatorIds = Array.isArray(creatorResult.data)
        ? creatorResult.data.map(item => item.id)
        : [];

    return {
        configured: true,
        authenticated: true,
        isAdmin: Boolean(memberResult.data),
        role: memberResult.data?.role || "creator",
        creatorIds,
        creators: creatorResult.data || [],
        user,
        message: memberResult.data
            ? "RELMUA Admin DBへ接続済みです。"
            : creatorIds.length
                ? "Creator領域へ接続済みです。"
                : "ログイン済みですが、Admin権限はまだ割り当てられていません。"
    };
}

export async function signInCmsWithDiscord(redirectTo = globalThis.location?.href || ""){
    const client = await getCmsClient();
    if(!client){
        throw new Error("Supabaseが設定されていません");
    }

    const { error } = await client.auth.signInWithOAuth({
        provider: "discord",
        options: {
            redirectTo
        }
    });

    if(error){
        throw error;
    }
}

export async function signOutCms(){
    const client = await getCmsClient();
    if(!client){
        return;
    }
    const { error } = await client.auth.signOut();
    if(error){
        throw error;
    }
}

async function createCmsClient(){
    const config = await loadConfig();
    if(!config){
        return null;
    }

    const module = await import(SUPABASE_ESM_URL);
    return module.createClient(config.supabaseUrl, config.publishableKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    });
}

async function loadConfig(){
    try{
        const response = await fetch(SUPABASE_PUBLIC_CONFIG_PATH, { cache: "no-store" });
        if(!response.ok){
            return null;
        }
        const raw = await response.json();
        const supabaseUrl = String(raw?.supabaseUrl || "").trim();
        const publishableKey = String(raw?.publishableKey || "").trim();
        if(!raw?.enabled || !isHttpsUrl(supabaseUrl) || publishableKey.length <= 20){
            return null;
        }
        return { supabaseUrl, publishableKey };
    }catch{
        return null;
    }
}

function isHttpsUrl(value){
    try{
        return new URL(value).protocol === "https:";
    }catch{
        return false;
    }
}
