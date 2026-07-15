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
const OUTPUT_DIRECTORY = join(PROJECT_ROOT, "dist");
const CANONICAL_ORIGIN = "https://relmua.com";
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

await buildPublic();

async function buildPublic(){
    assertBuildPaths();
    await validatePublicSource(PUBLIC_SOURCE);

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

    const adminIncluded = await hasPath(join(OUTPUT_DIRECTORY, "admin"));
    await assertAdminIsExcluded(adminIncluded);
    const manifest = await createBuildManifest({
        adminIncluded,
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
    console.log(`dist/ top level: ${topLevel.sort().join(", ")}`);
    console.log("Admin included: no");
    console.log("Build manifest: dist/build-manifest.json");
}

function assertBuildPaths(){
    const sourceFromRoot = relative(PROJECT_ROOT, PUBLIC_SOURCE);
    const outputFromRoot = relative(PROJECT_ROOT, OUTPUT_DIRECTORY);

    if(sourceFromRoot !== join("apps", "web")){
        throw new Error(`Unexpected public source: ${sourceFromRoot}`);
    }

    if(outputFromRoot !== "dist"){
        throw new Error(`Unexpected output directory: ${outputFromRoot}`);
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

async function assertAdminIsExcluded(adminIncluded){
    if(!adminIncluded){
        return;
    }
    throw new Error("Public build failed: dist/admin must not exist");
}

async function createBuildManifest({
    adminIncluded,
    status,
    warnings
}){
    const git = await getGitInfo();
    const publicFiles = await collectFiles(OUTPUT_DIRECTORY);
    const publicJsonCount = publicFiles.filter(file => extname(file).toLowerCase() === ".json").length;
    const assetCount = publicFiles.filter(file => relative(OUTPUT_DIRECTORY, file).split(sep)[0] === "assets").length;
    const cname = await readOptionalText(join(OUTPUT_DIRECTORY, "CNAME"));

    return {
        buildVersion: 1,
        builtAt: new Date().toISOString(),
        gitSha: git.sha,
        branch: git.branch,
        sourceRoot: "apps/web",
        outputRoot: "dist",
        publicFileCount: publicFiles.length,
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
