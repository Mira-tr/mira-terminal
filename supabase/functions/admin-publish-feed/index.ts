import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import {
    computePublicSnapshotFingerprint,
    validatePublicSnapshotPackage
} from "../_shared/publicationContract.ts";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const GITHUB_ISSUER = "https://token.actions.githubusercontent.com";
const GITHUB_JWKS_URL = `${GITHUB_ISSUER}/.well-known/jwks`;
const EXPECTED_AUDIENCE = "relmua-cms-publish";
const EXPECTED_REPOSITORY = "Mira-tr/mira-terminal";
const EXPECTED_REPOSITORY_ID = "1291073303";
const EXPECTED_REF = "refs/heads/main";
const EXPECTED_WORKFLOW_REF = "Mira-tr/mira-terminal/.github/workflows/publish-cms-queue.yml@refs/heads/main";
const ALLOWED_EVENTS = new Set(["schedule", "workflow_dispatch"]);
const CLOCK_SKEW_SECONDS = 60;
const STALE_PROCESSING_MINUTES = 30;

let jwksCache: { expiresAt: number; keys: JsonWebKey[] } | null = null;

Deno.serve(async request => {
    if(request.method !== "POST"){
        return json({ error: "method_not_allowed" }, 405);
    }

    try{
        const claims = await requireGitHubOidc(request);
        const body = await readBody(request);
        const action = String(body?.action || "claim");
        const supabase = adminClient();

        if(action === "claim"){
            return json(await claimLatestRequest(supabase, claims));
        }
        if(action === "complete"){
            return json(await completeRequest(supabase, claims, body));
        }
        return json({ error: "unknown_action" }, 400);
    }catch(error){
        console.error("[admin-publish-feed]", error);
        const status = error instanceof HttpError ? error.status : 500;
        return json({ error: safeMessage(error) }, status);
    }
});

async function claimLatestRequest(supabase: any, claims: any){
    await failStaleProcessing(supabase);

    const { data: request, error } = await supabase
        .from("cms_publication_requests")
        .select("id,fingerprint,snapshot,surface_id,requested_at,status")
        .eq("status", "queued")
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    if(error){
        throw new HttpError(503, "Publication queue is unavailable.");
    }
    if(!request){
        return { request: null };
    }

    validatePublicSnapshotPackage(request.snapshot);
    const fingerprint = await computePublicSnapshotFingerprint(request.snapshot);
    if(fingerprint !== request.fingerprint){
        await markFailed(supabase, request.id, String(claims.run_id || ""), "Snapshot fingerprint mismatch.");
        throw new HttpError(409, "Queued snapshot fingerprint mismatch.");
    }

    const now = new Date().toISOString();
    const { error: supersedeError } = await supabase
        .from("cms_publication_requests")
        .update({
            status: "superseded",
            finished_at: now,
            error_message: "Superseded by a newer publication request."
        })
        .eq("status", "queued")
        .neq("id", request.id);
    if(supersedeError){
        throw new HttpError(503, "Publication queue could not supersede older requests.");
    }

    const { data: claimed, error: claimError } = await supabase
        .from("cms_publication_requests")
        .update({
            status: "processing",
            started_at: now,
            finished_at: null,
            workflow_run_id: String(claims.run_id || ""),
            error_message: null
        })
        .eq("id", request.id)
        .eq("status", "queued")
        .select("id,fingerprint,snapshot,surface_id,requested_at,status,workflow_run_id")
        .maybeSingle();
    if(claimError){
        throw new HttpError(503, "Publication request could not be claimed.");
    }
    if(!claimed){
        throw new HttpError(409, "Publication request was already claimed.");
    }

    return {
        request: {
            id: claimed.id,
            fingerprint: claimed.fingerprint,
            surfaceId: claimed.surface_id || "",
            requestedAt: claimed.requested_at,
            workflowRunId: claimed.workflow_run_id,
            snapshot: claimed.snapshot
        }
    };
}

async function completeRequest(supabase: any, claims: any, body: any){
    const requestId = String(body?.requestId || "").trim();
    const outcome = String(body?.outcome || "").trim();
    const workflowRunId = String(claims.run_id || "");
    if(!requestId || !["published", "failed"].includes(outcome)){
        throw new HttpError(400, "Invalid publication completion payload.");
    }

    const { data: request, error: requestError } = await supabase
        .from("cms_publication_requests")
        .select("id,status,workflow_run_id")
        .eq("id", requestId)
        .maybeSingle();
    if(requestError || !request){
        throw new HttpError(404, "Publication request was not found.");
    }
    if(request.status !== "processing" || String(request.workflow_run_id || "") !== workflowRunId){
        throw new HttpError(409, "Publication request is not owned by this workflow run.");
    }

    if(outcome === "failed"){
        const message = String(body?.errorMessage || "GitHub Actions publication failed.").slice(0, 500);
        const { error } = await supabase
            .from("cms_publication_requests")
            .update({ status: "failed", finished_at: new Date().toISOString(), error_message: message })
            .eq("id", requestId)
            .eq("workflow_run_id", workflowRunId);
        if(error){
            throw new HttpError(503, "Publication failure state could not be recorded.");
        }
        return { ok: true, status: "failed" };
    }

    const commitSha = String(body?.commitSha || "").trim().toLowerCase();
    if(!/^[0-9a-f]{40}$/.test(commitSha)){
        throw new HttpError(400, "Invalid publication commit SHA.");
    }
    const deploymentUrl = normalizeHttpsUrl(body?.deploymentUrl);
    if(!deploymentUrl){
        throw new HttpError(400, "Invalid publication deployment URL.");
    }
    const { error } = await supabase
        .from("cms_publication_requests")
        .update({
            status: "published",
            finished_at: new Date().toISOString(),
            commit_sha: commitSha,
            deployment_url: deploymentUrl,
            error_message: null
        })
        .eq("id", requestId)
        .eq("workflow_run_id", workflowRunId);
    if(error){
        throw new HttpError(503, "Publication success state could not be recorded.");
    }
    return { ok: true, status: "published", commitSha, deploymentUrl };
}

async function failStaleProcessing(supabase: any){
    const staleBefore = new Date(Date.now() - STALE_PROCESSING_MINUTES * 60_000).toISOString();
    const { error } = await supabase
        .from("cms_publication_requests")
        .update({
            status: "failed",
            finished_at: new Date().toISOString(),
            error_message: "Publication worker timed out before reporting completion."
        })
        .eq("status", "processing")
        .lt("started_at", staleBefore);
    if(error){
        throw new HttpError(503, "Stale publication requests could not be recovered.");
    }
}

async function markFailed(supabase: any, requestId: string, workflowRunId: string, message: string){
    await supabase
        .from("cms_publication_requests")
        .update({
            status: "failed",
            started_at: new Date().toISOString(),
            finished_at: new Date().toISOString(),
            workflow_run_id: workflowRunId,
            error_message: message.slice(0, 500)
        })
        .eq("id", requestId);
}

async function requireGitHubOidc(request: Request){
    const token = bearerToken(request.headers.get("authorization"));
    if(!token){
        throw new HttpError(401, "GitHub OIDC token is required.");
    }
    const claims = await verifyGitHubJwt(token);
    if(claims.iss !== GITHUB_ISSUER){
        throw new HttpError(401, "Invalid GitHub OIDC issuer.");
    }
    if(!audienceIncludes(claims.aud, EXPECTED_AUDIENCE)){
        throw new HttpError(401, "Invalid GitHub OIDC audience.");
    }
    if(String(claims.repository || "") !== EXPECTED_REPOSITORY || String(claims.repository_id || "") !== EXPECTED_REPOSITORY_ID){
        throw new HttpError(403, "GitHub repository is not allowed.");
    }
    if(String(claims.ref || "") !== EXPECTED_REF || String(claims.workflow_ref || "") !== EXPECTED_WORKFLOW_REF){
        throw new HttpError(403, "GitHub workflow identity is not allowed.");
    }
    if(!ALLOWED_EVENTS.has(String(claims.event_name || ""))){
        throw new HttpError(403, "GitHub workflow event is not allowed.");
    }
    validateTokenTimes(claims);
    return claims;
}

async function verifyGitHubJwt(token: string){
    const parts = token.split(".");
    if(parts.length !== 3){
        throw new HttpError(401, "Malformed GitHub OIDC token.");
    }
    const header = decodeJson(parts[0]);
    const claims = decodeJson(parts[1]);
    if(header.alg !== "RS256" || !header.kid){
        throw new HttpError(401, "Unsupported GitHub OIDC signature.");
    }
    const keys = await getGithubJwks();
    const jwk = keys.find(key => key.kid === header.kid);
    if(!jwk){
        jwksCache = null;
        const refreshed = await getGithubJwks();
        const retryKey = refreshed.find(key => key.kid === header.kid);
        if(!retryKey){
            throw new HttpError(401, "GitHub OIDC signing key is unavailable.");
        }
        return verifyWithKey(parts, claims, retryKey);
    }
    return verifyWithKey(parts, claims, jwk);
}

async function verifyWithKey(parts: string[], claims: any, jwk: JsonWebKey){
    const key = await crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"]
    );
    const verified = await crypto.subtle.verify(
        "RSASSA-PKCS1-v1_5",
        key,
        base64UrlBytes(parts[2]),
        new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    );
    if(!verified){
        throw new HttpError(401, "Invalid GitHub OIDC signature.");
    }
    return claims;
}

async function getGithubJwks(){
    if(jwksCache && jwksCache.expiresAt > Date.now()){
        return jwksCache.keys;
    }
    const response = await fetch(GITHUB_JWKS_URL, { headers: { accept: "application/json" } });
    if(!response.ok){
        throw new HttpError(503, "GitHub OIDC signing keys are unavailable.");
    }
    const payload = await response.json();
    const keys = Array.isArray(payload?.keys) ? payload.keys : [];
    if(!keys.length){
        throw new HttpError(503, "GitHub OIDC signing keys are empty.");
    }
    jwksCache = { keys, expiresAt: Date.now() + 10 * 60_000 };
    return keys;
}

function validateTokenTimes(claims: any){
    const now = Math.floor(Date.now() / 1000);
    const exp = Number(claims.exp);
    const nbf = claims.nbf === undefined ? null : Number(claims.nbf);
    const iat = Number(claims.iat);
    if(!Number.isFinite(exp) || exp < now - CLOCK_SKEW_SECONDS){
        throw new HttpError(401, "GitHub OIDC token has expired.");
    }
    if(nbf !== null && (!Number.isFinite(nbf) || nbf > now + CLOCK_SKEW_SECONDS)){
        throw new HttpError(401, "GitHub OIDC token is not active yet.");
    }
    if(!Number.isFinite(iat) || iat > now + CLOCK_SKEW_SECONDS || iat < now - 15 * 60){
        throw new HttpError(401, "GitHub OIDC token issued-at time is invalid.");
    }
}

function adminClient(){
    const url = Deno.env.get("SUPABASE_URL") || "";
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if(!url || !key){
        throw new HttpError(503, "Publish feed is not configured.");
    }
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
}

async function readBody(request: Request){
    try{
        return await request.json();
    }catch{
        throw new HttpError(400, "Invalid request JSON.");
    }
}

function decodeJson(segment: string){
    try{
        return JSON.parse(new TextDecoder().decode(base64UrlBytes(segment)));
    }catch{
        throw new HttpError(401, "Malformed GitHub OIDC token payload.");
    }
}

function base64UrlBytes(value: string){
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = atob(padded);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function bearerToken(header: string | null){
    const match = String(header || "").match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim() || "";
}

function audienceIncludes(audience: unknown, expected: string){
    return Array.isArray(audience)
        ? audience.map(String).includes(expected)
        : String(audience || "") === expected;
}

function normalizeHttpsUrl(value: unknown){
    try{
        const url = new URL(String(value || ""));
        return url.protocol === "https:" ? url.href : "";
    }catch{
        return "";
    }
}

function safeMessage(error: unknown){
    return error instanceof Error ? error.message : "Publication feed failed.";
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
