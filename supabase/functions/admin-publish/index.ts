import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import {
    computePublicSnapshotFingerprint,
    validatePublicSnapshotPackage
} from "../_shared/publicationContract.ts";

const JSON_HEADERS = {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
    "access-control-allow-methods": "POST, OPTIONS"
};
const MAX_SNAPSHOT_BYTES = 2_000_000;
const HISTORY_LIMIT = 20;

Deno.serve(async request => {
    if(request.method === "OPTIONS"){
        return new Response("ok", { headers: JSON_HEADERS });
    }
    if(request.method !== "POST"){
        return json({ error: "method_not_allowed" }, 405);
    }

    try{
        const { supabase, user } = await requireAdmin(request);
        const body = await readBody(request);
        const action = String(body?.action || "status");

        if(action === "enqueue"){
            return json(await enqueuePublication(supabase, user.id, body));
        }
        if(action === "status"){
            return json(await readPublicationStatus(supabase));
        }
        if(action === "rollback"){
            return json(await enqueueRollback(supabase, user.id, body));
        }
        return json({ error: "unknown_action" }, 400);
    }catch(error){
        console.error("[admin-publish]", error);
        const status = error instanceof HttpError ? error.status : 500;
        return json({ error: safeMessage(error) }, status);
    }
});

async function requireAdmin(request: Request){
    const token = bearerToken(request.headers.get("authorization"));
    if(!token){
        throw new HttpError(401, "Discordでログインしてください。");
    }
    const supabase = adminClient();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const user = userData?.user || null;
    if(userError || !user){
        throw new HttpError(401, "ログイン情報を確認できませんでした。");
    }
    const { data: membership, error: membershipError } = await supabase
        .from("cms_admin_members")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
    if(membershipError){
        throw new HttpError(503, "Admin権限を確認できませんでした。");
    }
    if(!membership){
        throw new HttpError(403, "RELMUA Admin権限がありません。");
    }
    return { supabase, user, membership };
}

async function enqueuePublication(supabase: any, userId: string, body: any){
    const snapshot = body?.snapshot;
    assertSnapshotSize(snapshot);
    validatePublicSnapshotPackage(snapshot);
    const fingerprint = await computePublicSnapshotFingerprint(snapshot);
    const surfaceId = String(body?.surfaceId || "").trim().slice(0, 160);

    const processing = await latestRequest(supabase, ["processing"]);
    if(processing && processing.fingerprint !== fingerprint){
        throw new HttpError(409, "別の公開処理が進行中です。完了後にもう一度公開してください。");
    }
    if(processing?.fingerprint === fingerprint){
        return { request: sanitizeRequest(processing), alreadyQueued: true };
    }

    const matchingActive = await latestMatchingRequest(supabase, fingerprint, ["queued"]);
    if(matchingActive){
        return { request: sanitizeRequest(matchingActive), alreadyQueued: true };
    }

    const published = await latestRequest(supabase, ["published"]);
    if(published?.fingerprint === fingerprint){
        return { request: sanitizeRequest(published), alreadyPublished: true };
    }

    const { data, error } = await supabase
        .from("cms_publication_requests")
        .insert({
            requested_by: userId,
            surface_id: surfaceId,
            fingerprint,
            snapshot,
            status: "queued"
        })
        .select(publicationColumns())
        .single();
    if(error){
        throw new HttpError(503, "公開キューへ登録できませんでした。");
    }
    return { request: sanitizeRequest(data), alreadyQueued: false };
}

async function readPublicationStatus(supabase: any){
    const { data, error } = await supabase
        .from("cms_publication_requests")
        .select(publicationColumns())
        .order("requested_at", { ascending: false })
        .limit(HISTORY_LIMIT);
    if(error){
        throw new HttpError(503, "公開履歴を取得できませんでした。");
    }
    return { requests: (data || []).map(sanitizeRequest) };
}

async function enqueueRollback(supabase: any, userId: string, body: any){
    const requestId = String(body?.requestId || "").trim();
    if(!requestId){
        throw new HttpError(400, "戻す公開履歴を選んでください。");
    }
    const processing = await latestRequest(supabase, ["processing"]);
    if(processing){
        throw new HttpError(409, "公開処理が進行中です。完了後に戻してください。");
    }

    const { data: source, error: sourceError } = await supabase
        .from("cms_publication_requests")
        .select("id, fingerprint, snapshot, surface_id, status")
        .eq("id", requestId)
        .eq("status", "published")
        .maybeSingle();
    if(sourceError || !source){
        throw new HttpError(404, "戻せる公開履歴が見つかりません。");
    }
    assertSnapshotSize(source.snapshot);
    validatePublicSnapshotPackage(source.snapshot);
    const fingerprint = await computePublicSnapshotFingerprint(source.snapshot);
    if(fingerprint !== source.fingerprint){
        throw new HttpError(409, "公開履歴の整合性を確認できませんでした。");
    }

    const latestPublished = await latestRequest(supabase, ["published"]);
    if(latestPublished?.fingerprint === fingerprint){
        return { request: sanitizeRequest(latestPublished), alreadyPublished: true };
    }

    const { data, error } = await supabase
        .from("cms_publication_requests")
        .insert({
            requested_by: userId,
            surface_id: String(source.surface_id || ""),
            fingerprint,
            snapshot: source.snapshot,
            status: "queued",
            rollback_of: source.id
        })
        .select(publicationColumns())
        .single();
    if(error){
        throw new HttpError(503, "ロールバックを公開キューへ登録できませんでした。");
    }
    return { request: sanitizeRequest(data), rollback: true };
}

async function latestRequest(supabase: any, statuses: string[]){
    const { data, error } = await supabase
        .from("cms_publication_requests")
        .select(publicationColumns())
        .in("status", statuses)
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    if(error){
        throw new HttpError(503, "公開状態を確認できませんでした。");
    }
    return data || null;
}

async function latestMatchingRequest(supabase: any, fingerprint: string, statuses: string[]){
    const { data, error } = await supabase
        .from("cms_publication_requests")
        .select(publicationColumns())
        .eq("fingerprint", fingerprint)
        .in("status", statuses)
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    if(error){
        throw new HttpError(503, "公開状態を確認できませんでした。");
    }
    return data || null;
}

function publicationColumns(){
    return "id,surface_id,fingerprint,status,requested_at,started_at,finished_at,commit_sha,workflow_run_id,deployment_url,error_message,rollback_of";
}

function sanitizeRequest(row: any){
    return {
        id: String(row?.id || ""),
        surfaceId: String(row?.surface_id || ""),
        fingerprint: String(row?.fingerprint || ""),
        status: String(row?.status || "queued"),
        requestedAt: row?.requested_at || null,
        startedAt: row?.started_at || null,
        finishedAt: row?.finished_at || null,
        commitSha: row?.commit_sha || null,
        workflowRunId: row?.workflow_run_id || null,
        deploymentUrl: safeHttpsUrl(row?.deployment_url),
        errorMessage: String(row?.error_message || "").slice(0, 500),
        rollbackOf: row?.rollback_of || null
    };
}

function adminClient(){
    const url = Deno.env.get("SUPABASE_URL") || "";
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if(!url || !key){
        throw new HttpError(503, "Publish service is not configured.");
    }
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
}

async function readBody(request: Request){
    try{
        return await request.json();
    }catch{
        throw new HttpError(400, "リクエストJSONが不正です。");
    }
}

function assertSnapshotSize(snapshot: any){
    const size = new TextEncoder().encode(JSON.stringify(snapshot ?? null)).byteLength;
    if(size > MAX_SNAPSHOT_BYTES){
        throw new HttpError(413, "公開データが大きすぎます。");
    }
}

function bearerToken(header: string | null){
    const match = String(header || "").match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim() || "";
}

function safeHttpsUrl(value: unknown){
    try{
        const url = new URL(String(value || ""));
        return url.protocol === "https:" ? url.href : null;
    }catch{
        return null;
    }
}

function safeMessage(error: unknown){
    return error instanceof Error ? error.message : "公開サービスでエラーが発生しました。";
}

function json(payload: unknown, status = 200){
    return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

class HttpError extends Error{
    status: number;
    constructor(status: number, message: string){
        super(message);
        this.status = status;
    }
}
