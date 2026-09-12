import {
    getCmsAccessState,
    getCmsClient
} from "../../cms/cmsClient.js";

const FUNCTION_NAME = "admin-publish";

export async function getAutomaticPublishAccess(){
    const access = await getCmsAccessState();
    return {
        configured: Boolean(access?.configured),
        authenticated: Boolean(access?.authenticated),
        isAdmin: Boolean(access?.isAdmin),
        role: access?.role || "",
        message: access?.message || ""
    };
}

export async function requestAutomaticPublish({ snapshot, surfaceId = "" } = {}){
    return invokePublication({
        action: "enqueue",
        snapshot,
        surfaceId: String(surfaceId || "")
    });
}

export async function getPublicationHistory(){
    const result = await invokePublication({ action: "status" });
    return Array.isArray(result?.requests) ? result.requests : [];
}

export async function requestPublicationRollback(requestId){
    return invokePublication({
        action: "rollback",
        requestId: String(requestId || "")
    });
}

async function invokePublication(body){
    const access = await getCmsAccessState();
    if(!access?.configured){
        throw new Error("Supabase CMSが設定されていないため、自動公開を利用できません。");
    }
    if(!access?.authenticated){
        throw new Error("自動公開するにはDiscordでログインしてください。");
    }
    if(!access?.isAdmin){
        throw new Error("自動公開にはRELMUA Admin権限が必要です。");
    }

    const client = await getCmsClient();
    if(!client){
        throw new Error("Supabase CMSへ接続できません。");
    }
    const { data, error } = await client.functions.invoke(FUNCTION_NAME, { body });
    if(error){
        throw new Error(await extractFunctionError(error));
    }
    if(data?.error){
        throw new Error(String(data.error));
    }
    return data || {};
}

async function extractFunctionError(error){
    const fallback = String(error?.message || "自動公開サービスへ接続できませんでした。");
    try{
        const context = error?.context;
        if(context instanceof Response){
            const payload = await context.clone().json();
            return String(payload?.error || fallback);
        }
    }catch{}
    return fallback;
}
