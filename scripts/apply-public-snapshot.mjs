import {
    mkdir,
    readFile,
    writeFile
} from "node:fs/promises";

import {
    dirname,
    resolve
} from "node:path";

import {
    fileURLToPath
} from "node:url";

import {
    PUBLIC_SNAPSHOT_TARGETS,
    validatePublicSnapshotPackage
} from "../apps/admin/js/features/system/export/publicSnapshotContract.js";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const inputPath = args.find(arg => !arg.startsWith("--"));

if(!inputPath){
    console.error("使い方: npm run apply:public-snapshot -- <公開用データセット.json> [--check]");
    process.exitCode = 1;
}else{
    try{
        const source = await readFile(resolve(process.cwd(), inputPath), "utf8");
        const snapshot = JSON.parse(source);
        validatePublicSnapshotPackage(snapshot);

        const prepared = snapshot.files.map(file => {
            const target = PUBLIC_SNAPSHOT_TARGETS.find(item => item.id === file.id);
            const destination = resolve(PROJECT_ROOT, target.destination);
            const publicRoot = resolve(PROJECT_ROOT, "apps", "web");

            if(destination !== publicRoot && !destination.startsWith(`${publicRoot}/`) && !destination.startsWith(`${publicRoot}\\`)){
                throw new Error(`公開サイト外への書き込みを拒否しました: ${target.destination}`);
            }

            return {
                ...file,
                destination
            };
        });

        console.log(`公開用データセットを確認しました: ${prepared.length} files`);
        console.log(`source: ${snapshot.source || "unknown"}`);
        console.log(`generatedAt: ${snapshot.generatedAt || "unknown"}`);

        if(checkOnly){
            prepared.forEach(file => console.log(`check  ${file.id} -> ${file.destination}`));
            console.log("チェックのみ完了しました。ファイルは変更していません。");
        }else{
            for(const file of prepared){
                await mkdir(dirname(file.destination), { recursive: true });
                await writeFile(
                    file.destination,
                    `${JSON.stringify(file.payload, null, 2)}\n`,
                    "utf8"
                );
                console.log(`write  ${file.id} -> ${file.destination}`);
            }

            console.log("公開用JSON 8種類を apps/web/ に反映しました。");
            console.log("次に npm run check && npm run build:public で確認してください。");
        }
    }catch(error){
        console.error(`公開用データの反映を中止しました: ${error?.message || error}`);
        process.exitCode = 1;
    }
}
