import {
    readdirSync
} from "node:fs";

import {
    extname,
    join
} from "node:path";

import {
    spawnSync
} from "node:child_process";

const SOURCE_ROOTS = [
    "apps",
    "scripts",
    "tests"
];

const SCRIPT_EXTENSIONS = new Set([
    ".js",
    ".mjs"
]);

const scriptFiles = SOURCE_ROOTS
.flatMap(collectScriptFiles)
.sort((a, b)=>a.localeCompare(b));

let hasError = false;

scriptFiles.forEach(file=>{
    const result = spawnSync(
        process.execPath,
        ["--check", file],
        {
            stdio: "inherit"
        }
    );

    if(result.status !== 0){
        hasError = true;
    }
});

if(hasError){
    process.exitCode = 1;
}else{
    console.log(`Syntax check passed: ${scriptFiles.length} files`);
}

function collectScriptFiles(directory){
    return readdirSync(
        directory,
        {
            withFileTypes: true
        }
    )
    .flatMap(entry=>{
        const path = join(directory, entry.name);

        if(entry.isDirectory()){
            return collectScriptFiles(path);
        }

        return SCRIPT_EXTENSIONS.has(extname(entry.name))
            ? [path]
            : [];
    });
}
