import {
    copyFile,
    lstat,
    mkdir,
    readFile,
    rename,
    rm,
    writeFile
} from "node:fs/promises";

import {
    createHash
} from "node:crypto";

import {
    basename,
    dirname,
    join,
    relative,
    resolve,
    sep
} from "node:path";

export async function safeWriteJsonFile({
    projectRoot,
    targetPath,
    nextValue,
    operation = "studio-safe-write-poc",
    validate = () => [],
    now = new Date()
}){
    const root = resolve(projectRoot);
    const target = resolve(root, targetPath);
    assertInsideRoot(root, target);
    await assertNotSymlink(target);

    const originalText = await readFile(target, "utf8");
    JSON.parse(originalText);

    const nextText = `${JSON.stringify(nextValue, null, 2)}\n`;
    const validationErrors = validate(nextValue);
    if(validationErrors.length > 0){
        return {
            ok: false,
            changed: false,
            errors: validationErrors,
            backup: null
        };
    }

    JSON.parse(nextText);

    const stamp = createTimestamp(now);
    const backupRoot = join(root, "backup", "studio", stamp.date, stamp.time);
    const backupFiles = join(backupRoot, "files");
    const backupFile = join(backupFiles, relative(root, target));
    const tempPath = `${target}.${stamp.date}${stamp.time}.tmp`;

    try{
        await mkdir(dirname(backupFile), {
            recursive: true
        });
        await copyFile(target, backupFile);
        await writeFile(tempPath, nextText, "utf8");
        JSON.parse(await readFile(tempPath, "utf8"));
        await rename(tempPath, target);

        const readback = await readFile(target, "utf8");
        if(checksum(readback) !== checksum(nextText)){
            await copyFile(backupFile, target);
            return {
                ok: false,
                changed: false,
                errors: ["Readback checksum did not match. Rollback restored the original file."],
                backup: backupRoot
            };
        }

        const manifest = createBackupManifest({
            createdAt: now.toISOString(),
            operation,
            root,
            target,
            backupFile,
            originalText,
            nextText
        });
        await writeFile(join(backupRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

        return {
            ok: true,
            changed: true,
            errors: [],
            backup: backupRoot,
            manifest
        };
    }catch(error){
        await rm(tempPath, {
            force: true
        });
        return {
            ok: false,
            changed: false,
            errors: [error.message],
            backup: null
        };
    }
}

export function validatePublicNotesPayload(value){
    const errors = [];

    if(!value || typeof value !== "object" || Array.isArray(value)){
        return ["public-notes payload must be an object."];
    }

    if(value.exportType !== "public-notes"){
        errors.push("exportType must be public-notes.");
    }

    if(value.module !== "notes"){
        errors.push("module must be notes.");
    }

    if(!Array.isArray(value.notes)){
        errors.push("notes must be an array.");
    }

    return errors;
}

export function assertInsideRoot(root, target){
    const relativePath = relative(root, target);
    if(relativePath.startsWith("..") || relativePath === "" || relativePath.includes(`..${sep}`)){
        throw new Error("Target path must stay inside the project root.");
    }
}

async function assertNotSymlink(target){
    const stat = await lstat(target);
    if(stat.isSymbolicLink()){
        throw new Error("Refusing to write through a symbolic link.");
    }
}

function createBackupManifest({
    createdAt,
    operation,
    root,
    target,
    backupFile,
    originalText,
    nextText
}){
    return {
        schemaVersion: 1,
        appVersion: "0.6.0-phase0",
        createdAt,
        operation,
        projectRootHash: checksum(root),
        gitBranch: "",
        gitSha: "",
        result: "success",
        files: [
            {
                target: relative(root, target).split(sep).join("/"),
                backup: relative(root, backupFile).split(sep).join("/"),
                beforeSha256: checksum(originalText),
                afterSha256: checksum(nextText),
                bytes: Buffer.byteLength(nextText, "utf8")
            }
        ]
    };
}

function checksum(value){
    return createHash("sha256").update(String(value)).digest("hex");
}

function createTimestamp(date){
    return {
        date: [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-"),
        time: [
            String(date.getHours()).padStart(2, "0"),
            String(date.getMinutes()).padStart(2, "0"),
            String(date.getSeconds()).padStart(2, "0")
        ].join("")
    };
}
