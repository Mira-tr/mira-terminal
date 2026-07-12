import {
    cp,
    lstat,
    mkdir,
    readdir,
    rm
} from "node:fs/promises";

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
const PUBLIC_JSON_PATHS = new Set([
    "data/public-creators.json",
    "data/public-profile.json",
    "trpg/data/public-scenarios.json",
    "trpg/rules/data/house-rules.json",
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

    await assertAdminIsExcluded();

    const topLevel = await readdir(OUTPUT_DIRECTORY);
    console.log("Public build completed: apps/web/ -> dist/");
    console.log(`dist/ top level: ${topLevel.sort().join(", ")}`);
    console.log("Admin included: no");
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
        }
    }
}

async function assertAdminIsExcluded(){
    const adminPath = join(OUTPUT_DIRECTORY, "admin");

    try{
        await lstat(adminPath);
    }catch(error){
        if(error?.code === "ENOENT"){
            return;
        }

        throw error;
    }

    throw new Error("Public build failed: dist/admin must not exist");
}
