import {
    APP_NAME,
    isSupportedAppName
} from "../../appIdentity.js";

import {
    getNotes,
    setNotes
} from "./noteStore.js";

import {
    recordBackupExport
} from "../common/backupMeta.js";

export function createNotesBackup(value = getNotes()){
    return {
        app: APP_NAME,
        module: "notes",
        backupType: "notes",
        backupVersion: "1.0.0",
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        notes: value
    };
}

export function exportBackupNotes(){
    download(createNotesBackup(), `relmua-terminal-notes-backup-${date()}.json`);
    recordBackupExport();
}

export async function importBackupNotes(file){
    const data = JSON.parse(await file.text());
    validate(data);

    if(!confirm("既存のNotesデータを上書きしますか？")){
        return false;
    }

    if(!setNotes(data.notes)){
        throw new Error("Notesの保存に失敗しました");
    }

    return true;
}

function validate(data){
    if(!data ||
        !isSupportedAppName(data.app) ||
        data.module !== "notes" ||
        data.backupType !== "notes" ||
        data.schemaVersion !== 1 ||
        !Array.isArray(data.notes?.notes)){
        throw new Error("Notes Backupデータの形式が正しくありません");
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
