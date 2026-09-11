import {
    cp,
    lstat,
    mkdir,
    readdir,
    readFile,
    rm,
    writeFile
} from "node:fs/promises";

import {
    execFile
} from "node:child_process";

import {
    promisify
} from "node:util";

import {
    basename,
    dirname,
    extname,
    join,
    relative,
    resolve,
    sep
} from "node:path";

import {
    fileURLToPath
} from "node:url";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const PUBLIC_SOURCE = join(PROJECT_ROOT, "apps", "web");
const ADMIN_SOURCE = join(PROJECT_ROOT, "apps", "admin");
const OUTPUT_DIRECTORY = join(PROJECT_ROOT, "dist");
const OUTPUT_ADMIN_DIRECTORY = join(OUTPUT_DIRECTORY, "admin");
const CANONICAL_ORIGIN = "https://relmua.com";
const PRODUCTION_SUPABASE_URL = "https://wvtsddeegsiiqmgsbfgi.supabase.co";
const PRODUCTION_PUBLISHABLE_KEY = "sb_publishable_sV37BdNGlBcRniJebG-ITQ_bUpiTxln";
const SUPABASE_PUBLIC_CONFIG_OUTPUT = join(OUTPUT_DIRECTORY, "config", "supabase-public.json");
const execFileAsync = promisify(execFile);
const PUBLIC_JSON_PATHS = new Set([
    "data/public-creators.json",
    "data/public-home.json",
    "data/public-profile.json",
    "data/creators/chikage/trpg/public-scenarios.json",
    "data/creators/chikage/trpg/house-rules.json",
    "game/data/public-games.json",
    "tools/data/public-tools.json",
    "notes/data/public-notes.json"
]);
const ADMIN_TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".mjs", ".txt"]);
const FORBIDDEN_ADMIN_FILE_EXTENSIONS = new Set([".key", ".p12", ".pem", ".pfx"]);
const FORBIDDEN_ADMIN_CONTENT = [
    ["Supabase service role", /SUPABASE_SERVICE_ROLE_KEY|\bservice_role\b/i],
    ["secret Supabase key", /\bsb_secret_[A-Za-z0-9_-]+/],
    ["database connection string", /\bpostgres(?:ql)?:\/\//i],
    ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/]
];
const ADMIN_SIGNATURES = [
    "<title>RELMUA Admin</title>",
    "data-admin-page",
    "Admin Shell foundation",
    "Workspace Dashboard"
];

await loadLocalEnvFile(".env.local");
await loadLocalEnvFile(".env");

await buildPublic();

async function loadLocalEnvFile(fileName){
    const filePath = join(PROJECT_ROOT, fileName);
    let raw = "";

    try{
        raw = await readFile(filePath, "utf8");
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

function stripEnvQuotes(value){
    if(value.length >= 2 && (
        (value.startsWith("\"") && value.endsWith("\"")) ||
        (value.startsWith("'") && value.endsWith("'"))
    )){
        return value.slice(1, -1);
    }

    return value;
}

async function buildPublic(){
    assertBuildPaths();
    await validatePublicSource(PUBLIC_SOURCE);
    await validateAdminSource(ADMIN_SOURCE);

    await rm(OUTPUT_DIRECTORY, {
        recursive: true,
        force: true
    });
    await mkdir(OUTPUT_DIRECTORY, {
        recursive: true
    });
    await cp(PUBLIC_SOURCE, OUTPUT_DIRECTORY, {
        recursive: true
    });
    await cp(ADMIN_SOURCE, OUTPUT_ADMIN_DIRECTORY, {
        recursive: true,
        filter: shouldCopyAdminPath
    });
    await rewriteAdminPublicAssetReferences();
    await writeSupabasePublicConfig();
    await assertPublishedAdminIsSafe();
    await assertPublicShellDoesNotContainAdmin();

    const manifest = await createBuildManifest({
        adminIncluded: true,
        status: "success",
        warnings: []
    });
    await writeFile(
        join(OUTPUT_DIRECTORY, "build-manifest.json"),
        `${JSON.stringify(manifest, null, 2)}\n`,
        "utf8"
    );

    const topLevel = await readdir(OUTPUT_DIRECTORY);
    console.log("Public build completed: apps/web/ -> dist/");
    console.log("Admin build completed: apps/admin/ -> dist/admin/");
    console.log(`dist/ top level: ${topLevel.sort().join(", ")}`);
    console.log("Admin included: /admin/");
    console.log("Build manifest: dist/build-manifest.json");
}

async function writeSupabasePublicConfig(){
    const envUrl = String(process.env.SUPABASE_URL ?? "").trim();
    const envKey = String(
        process.env.SUPABASE_PUBLISHABLE_KEY ??
        process.env.SUPABASE_ANON_KEY ??
        ""
    ).trim();
    const envConfigured = isHttpsUrl(envUrl) && envKey.length > 20;
    const productionPagesBuild = process.env.GITHUB_ACTIONS === "true" &&
        process.env.GITHUB_REF === "refs/heads/main";
    const supabaseUrl = envConfigured
        ? envUrl
        : productionPagesBuild
            ? PRODUCTION_SUPABASE_URL
            : "";
    const publishableKey = envConfigured
        ? envKey
        : productionPagesBuild
            ? PRODUCTION_PUBLISHABLE_KEY
            : "";
    const enabled = isHttpsUrl(supabaseUrl) && publishableKey.length > 20;
    const source = envConfigured
        ? "environment"
        : productionPagesBuild && enabled
            ? "production-fallback"
            : "unconfigured";
    const payload = {
        schemaVersion: 1,
        enabled,
        scheduleEnabled: enabled,
        supabaseUrl: enabled ? supabaseUrl : "",
        publishableKey: enabled ? publishableKey : "",
        source,
        message: enabled ? "" : "Supabase is not configured for this build."
    };

    await mkdir(dirname(SUPABASE_PUBLIC_CONFIG_OUTPUT), {
        recursive: true
    });
    await writeFile(
        SUPABASE_PUBLIC_CONFIG_OUTPUT,
        `${JSON.stringify(payload, null, 2)}\n`,
        "utf8"
    );
}

function assertBuildPaths(){
    const sourceFromRoot = relative(PROJECT_ROOT, PUBLIC_SOURCE);
    const adminFromRoot = relative(PROJECT_ROOT, ADMIN_SOURCE);
    const outputFromRoot = relative(PROJECT_ROOT, OUTPUT_DIRECTORY);
    const adminOutputFromRoot = relative(PROJECT_ROOT, OUTPUT_ADMIN_DIRECTORY);

    if(sourceFromRoot !== join("apps", "web")){
        throw new Error(`Unexpected public source: ${sourceFromRoot}`);
    }

    if(adminFromRoot !== join("apps", "admin")){
        throw new Error(`Unexpected Admin source: ${adminFromRoot}`);
    }

    if(outputFromRoot !== "dist"){
        throw new Error(`Unexpected output directory: ${outputFromRoot}`);
    }

    if(adminOutputFromRoot !== join("dist", "admin")){
        throw new Error(`Unexpected Admin output directory: ${adminOutputFromRoot}`);
    }
}

async function validatePublicSource(directory){
    const entries = await readdir(directory, {
        withFileTypes: true
    });

    for(const entry of entries){
        const path = join(directory, entry.name);
        const stats = await lstat(path);

        if(stats.isSymbolicLink()){
            throw new Error(`Public build does not allow symbolic links: ${relative(PROJECT_ROOT, path)}`);
        }

        if(entry.isDirectory()){
            await validatePublicSource(path);
            continue;
        }

        if(extname(entry.name).toLowerCase() === ".json"){
            const publicPath = relative(PUBLIC_SOURCE, path)
            .split(sep)
            .join("/");

            if(basename(entry.name).toLowerCase().includes("backup")){
                throw new Error(`Backup JSON cannot be published: ${relative(PROJECT_ROOT, path)}`);
            }

            if(!PUBLIC_JSON_PATHS.has(publicPath)){
                throw new Error(`Unexpected Public JSON: ${relative(PROJECT_ROOT, path)}`);
            }

            try{
                JSON.parse(await readFile(path, "utf8"));
            }catch(error){
                throw new Error(`Broken Public JSON: ${relative(PROJECT_ROOT, path)} (${error.message})`);
            }
        }
    }
}

async function validateAdminSource(directory){
    const entries = await readdir(directory, {
        withFileTypes: true
    });

    for(const entry of entries){
        const path = join(directory, entry.name);
        const stats = await lstat(path);

        if(stats.isSymbolicLink()){
            throw new Error(`Admin publish does not allow symbolic links: ${relative(PROJECT_ROOT, path)}`);
        }

        if(entry.isDirectory()){
            await validateAdminSource(path);
            continue;
        }

        if(!shouldCopyAdminPath(path)){
            continue;
        }

        if(ADMIN_TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())){
            assertAdminTextIsSafe(await readFile(path, "utf8"), relative(PROJECT_ROOT, path));
        }
    }
}

function shouldCopyAdminPath(sourcePath){
    const name = basename(sourcePath).toLowerCase();
    const extension = extname(name);

    if(name === ".env" || name.startsWith(".env.")){
        return false;
    }

    if(FORBIDDEN_ADMIN_FILE_EXTENSIONS.has(extension)){
        return false;
    }

    if(extension === ".json" && name.includes("backup")){
        return false;
    }

    return true;
}

async function rewriteAdminPublicAssetReferences(){
    const files = await collectFiles(OUTPUT_ADMIN_DIRECTORY);

    for(const file of files){
        if(!ADMIN_TEXT_EXTENSIONS.has(extname(file).toLowerCase())){
            continue;
        }

        const original = await readFile(file, "utf8");
        const rewritten = original
            .replace(/((?:\.\.\/)+)web\//g, "$1")
            .replace(/([\"'(=])\/web\//g, "$1/");

        if(rewritten !== original){
            await writeFile(file, rewritten, "utf8");
        }
    }
}

async function assertPublishedAdminIsSafe(){
    const indexPath = join(OUTPUT_ADMIN_DIRECTORY, "index.html");

    if(!await hasPath(indexPath)){
        throw new Error("Public build failed: dist/admin/index.html is missing");
    }

    const files = await collectFiles(OUTPUT_ADMIN_DIRECTORY);
    let foundAdminSignature = false;

    for(const file of files){
        const relativePath = relative(OUTPUT_ADMIN_DIRECTORY, file).split(sep).join("/");
        const name = basename(file).toLowerCase();
        const extension = extname(name);

        if(name === ".env" || name.startsWith(".env.") || FORBIDDEN_ADMIN_FILE_EXTENSIONS.has(extension)){
            throw new Error(`Unsafe Admin file was published: admin/${relativePath}`);
        }

        if(extension === ".json" && name.includes("backup")){
            throw new Error(`Backup JSON cannot be published with Admin: admin/${relativePath}`);
        }

        if(!ADMIN_TEXT_EXTENSIONS.has(extension)){
            continue;
        }

        const source = await readFile(file, "utf8");
        assertAdminTextIsSafe(source, `dist/admin/${relativePath}`);

        if(/(?:\.\.\/)+web\//.test(source) || /[\"'(=]\/web\//.test(source)){
            throw new Error(`Admin publish contains an unresolved apps/web path: admin/${relativePath}`);
        }

        if(ADMIN_SIGNATURES.some(signature => source.includes(signature))){
            foundAdminSignature = true;
        }
    }

    if(!foundAdminSignature){
        throw new Error("Public build failed: dist/admin does not look like RELMUA Admin");
    }
}

function assertAdminTextIsSafe(source, path){
    for(const [label, pattern] of FORBIDDEN_ADMIN_CONTENT){
        if(pattern.test(source)){
            throw new Error(`Admin publish contains ${label}: ${path}`);
        }
    }
}

async function assertPublicShellDoesNotContainAdmin(){
    const files = (await collectFiles(OUTPUT_DIRECTORY)).filter(file => {
        const relativePath = relative(OUTPUT_DIRECTORY, file);
        return relativePath !== "admin" && !relativePath.startsWith(`admin${sep}`);
    });

    for(const file of files){
        if(!ADMIN_TEXT_EXTENSIONS.has(extname(file).toLowerCase())){
            continue;
        }

        const source = await readFile(file, "utf8");
        const signature = ADMIN_SIGNATURES.find(item => source.includes(item));

        if(signature){
            throw new Error(
                `Admin UI leaked outside /admin/: ${relative(OUTPUT_DIRECTORY, file)} (${signature})`
            );
        }
    }
}

async function createBuildManifest({
    adminIncluded,
    status,
    warnings
}){
    const git = await getGitInfo();
    const allFiles = await collectFiles(OUTPUT_DIRECTORY);
    const adminPrefix = `${resolve(OUTPUT_ADMIN_DIRECTORY)}${sep}`;
    const adminFiles = allFiles.filter(file => resolve(file).startsWith(adminPrefix));
    const publicFiles = allFiles.filter(file => !resolve(file).startsWith(adminPrefix));
    const publicJsonCount = publicFiles.filter(file => extname(file).toLowerCase() === ".json").length;
    const assetCount = publicFiles.filter(file => relative(OUTPUT_DIRECTORY, file).split(sep)[0] === "assets").length;
    const cname = await readOptionalText(join(OUTPUT_DIRECTORY, "CNAME"));

    return {
        buildVersion: 1,
        builtAt: new Date().toISOString(),
        gitSha: git.sha,
        branch: git.branch,
        sourceRoot: "apps/web",
        adminSourceRoot: "apps/admin",
        outputRoot: "dist",
        adminOutputRoot: "dist/admin",
        publicFileCount: publicFiles.length,
        adminFileCount: adminFiles.length,
        publicJsonCount,
        assetCount,
        adminIncluded,
        cname: cname.trim() || null,
        canonicalOrigin: CANONICAL_ORIGIN,
        warnings,
        status
    };
}

async function collectFiles(directory){
    const entries = await readdir(directory, {
        withFileTypes: true
    });
    const files = [];

    for(const entry of entries){
        const path = join(directory, entry.name);
        if(entry.isDirectory()){
            files.push(...await collectFiles(path));
        }else{
            files.push(path);
        }
    }

    return files;
}

async function hasPath(path){
    try{
        await lstat(path);
        return true;
    }catch(error){
        if(error?.code === "ENOENT"){
            return false;
        }
        throw error;
    }
}

async function readOptionalText(path){
    try{
        return await readFile(path, "utf8");
    }catch(error){
        if(error?.code === "ENOENT"){
            return "";
        }
        throw error;
    }
}

async function getGitInfo(){
    const [sha, branch] = await Promise.all([
        readGitValue(["rev-parse", "HEAD"]),
        readGitValue(["branch", "--show-current"])
    ]);

    return {
        sha,
        branch
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

async function readGitValue(args){
    try{
        const { stdout } = await execFileAsync("git", args, {
            cwd: PROJECT_ROOT
        });
        return stdout.trim() || null;
    }catch{
        return null;
    }
}
