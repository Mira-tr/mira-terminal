import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../", import.meta.url)));
const port = readPort(process.argv.slice(2));

await loadLocalEnvFile(".env.local");
await loadLocalEnvFile(".env");

const contentTypes = new Map([
    [".css", "text/css; charset=utf-8"],
    [".html", "text/html; charset=utf-8"],
    [".ico", "image/x-icon"],
    [".jpeg", "image/jpeg"],
    [".jpg", "image/jpeg"],
    [".js", "text/javascript; charset=utf-8"],
    [".json", "application/json; charset=utf-8"],
    [".mjs", "text/javascript; charset=utf-8"],
    [".png", "image/png"],
    [".svg", "image/svg+xml"],
    [".webp", "image/webp"]
]);

const server = createServer(async (request, response) => {
    try{
        const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);

        if(pathname === "/config/supabase-public.json"){
            respondJson(response, createSupabasePublicConfig());
            return;
        }

        const target = await resolveTarget(pathname);

        if(!target){
            respond(response, 404, "Not Found");
            return;
        }

        response.writeHead(200, {
            "Content-Type": contentTypes.get(extname(target).toLowerCase()) ?? "application/octet-stream",
            "Cache-Control": "no-store"
        });

        if(request.method === "HEAD"){
            response.end();
            return;
        }

        createReadStream(target).pipe(response);
    }catch(error){
        if(error instanceof URIError){
            respond(response, 400, "Bad Request");
            return;
        }
        respond(response, 500, "Internal Server Error");
    }
});

server.listen(port, "127.0.0.1", () => {
    console.log(`RELMUA local server: http://127.0.0.1:${port}/`);
});

async function resolveTarget(pathname){
    const normalizedPath = normalize(pathname.replace(/^[/\\]+/, "")).replace(/^(\.\.[/\\])+/, "");
    const candidate = resolve(ROOT, normalizedPath);
    const rootRelativePath = relative(ROOT, candidate);

    if(rootRelativePath.startsWith(`..${sep}`) || rootRelativePath === ".." || rootRelativePath.includes("\0")){
        return null;
    }

    try{
        const details = await stat(candidate);
        if(details.isDirectory()){
            return await existingFile(join(candidate, "index.html"));
        }
        return details.isFile() ? candidate : null;
    }catch{
        return null;
    }
}

async function existingFile(path){
    try{
        return (await stat(path)).isFile() ? path : null;
    }catch{
        return null;
    }
}

async function loadLocalEnvFile(fileName){
    let raw = "";
    try{
        raw = await readFile(join(ROOT, fileName), "utf8");
    }catch{
        return;
    }

    raw.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if(!trimmed || trimmed.startsWith("#")){
            return;
        }
        const separator = trimmed.indexOf("=");
        if(separator <= 0){
            return;
        }
        const key = trimmed.slice(0, separator).trim();
        const value = stripEnvQuotes(trimmed.slice(separator + 1).trim());
        if(key && process.env[key] === undefined){
            process.env[key] = value;
        }
    });
}

function createSupabasePublicConfig(){
    const supabaseUrl = String(process.env.SUPABASE_URL || "").trim();
    const publishableKey = String(
        process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || ""
    ).trim();
    const enabled = isHttpsUrl(supabaseUrl) && publishableKey.length > 20;

    return {
        schemaVersion: 1,
        enabled,
        scheduleEnabled: enabled,
        supabaseUrl: enabled ? supabaseUrl : "",
        publishableKey: enabled ? publishableKey : "",
        message: enabled ? "" : "Supabase is not configured for this local server."
    };
}

function respond(response, statusCode, message){
    response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(message);
}

function respondJson(response, value){
    response.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
    });
    response.end(`${JSON.stringify(value, null, 2)}\n`);
}

function readPort(args){
    const portIndex = args.findIndex((argument) => argument === "--port" || argument === "-p");
    const value = portIndex >= 0 ? Number(args[portIndex + 1]) : 8000;

    if(!Number.isInteger(value) || value < 1 || value > 65535){
        throw new Error("Port must be an integer between 1 and 65535.");
    }

    return value;
}

function stripEnvQuotes(value){
    if(value.length >= 2 && (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
    )){
        return value.slice(1, -1);
    }
    return value;
}

function isHttpsUrl(value){
    try{
        return new URL(value).protocol === "https:";
    }catch{
        return false;
    }
}
