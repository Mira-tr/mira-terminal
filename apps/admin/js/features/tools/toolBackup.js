import {
    APP_NAME,
    isSupportedAppName
} from "../../appIdentity.js";

import {
    getTools,
    setTools
} from "./toolStore.js";

import {
    recordBackupExport
} from "../common/backupMeta.js";

export function createToolsBackup(value = getTools()){
    return {
        app: APP_NAME,
        module: "tools",
        backupType: "tools",
        backupVersion: "1.0.0",
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        tools: value
    };
}

export function exportBackupTools(){
    download(createToolsBackup(), `relmua-terminal-tools-backup-${date()}.json`);
    recordBackupExport();
}

export async function importBackupTools(file){
    const data = JSON.parse(await file.text());
    validate(data);

    if(!confirm("既存のToolsデータを上書きしますか？")){
        return false;
    }

    if(!setTools(data.tools)){
        throw new Error("Toolsの保存に失敗しました");
    }

    return true;
}

function validate(data){
    if(!data ||
        !isSupportedAppName(data.app) ||
        data.module !== "tools" ||
        data.backupType !== "tools" ||
        data.schemaVersion !== 1 ||
        !Array.isArray(data.tools?.tools)){
        throw new Error("Tools Backupデータの形式が正しくありません");
    }
}

function date(){
    const value = new Date();
    return `${value.getFullYear()}${String(value.getMonth() + 1).padStart(2, "0")}${String(value.getDate()).padStart(2, "0")}`;
}

function download(data, filename){
    const url = URL.createObjectURL(
        new Blob(
            [JSON.stringify(data, null, 2)],
            { type: "application/json" }
        )
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}
