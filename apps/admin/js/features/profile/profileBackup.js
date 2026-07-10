import {
    getProfile,
    saveProfile
} from "./profileStore.js";

import {
    recordBackupExport
} from "../common/backupMeta.js";

const APP_NAME = "MIRA Terminal";
const MODULE_NAME = "site";
const BACKUP_TYPE = "profile";
const BACKUP_VERSION = "1.0.0";
const SCHEMA_VERSION = 1;

export function exportBackupProfile(){
    const profile = getProfile();

    const backupData = {
        app: APP_NAME,
        module: MODULE_NAME,
        backupType: BACKUP_TYPE,
        backupVersion: BACKUP_VERSION,
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        profile: profile
    };

    const date = new Date();
    const dateStr = date.getFullYear() +
        String(date.getMonth() + 1).padStart(2, "0") +
        String(date.getDate()).padStart(2, "0");

    const filename = `mira-terminal-profile-backup-${dateStr}.json`;

    const blob = new Blob(
        [JSON.stringify(backupData, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    recordBackupExport();
}

export function importBackupProfile(file){
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try{
                const data = JSON.parse(event.target.result);

                validateBackupProfile(data);

                if(!confirm("既存のProfileデータを上書きしますか？")){
                    resolve(false);
                    return;
                }

                if(!saveProfile(data.profile)){
                    throw new Error("Profileの保存に失敗しました");
                }

                resolve(true);
            }catch(error){
                reject(error);
            }
        };

        reader.onerror = () => {
            reject(new Error("ファイルの読み込みに失敗しました"));
        };

        reader.readAsText(file);
    });
}

function validateBackupProfile(data){
    if(typeof data !== "object" || data === null){
        throw new Error("Backupデータの形式が正しくありません");
    }

    if(data.app !== APP_NAME){
        throw new Error("Backupデータのアプリが正しくありません");
    }

    if(data.module !== MODULE_NAME){
        throw new Error("Backupデータのモジュールが正しくありません");
    }

    if(data.backupType !== BACKUP_TYPE){
        throw new Error("Backupデータのタイプが正しくありません");
    }

    if(data.schemaVersion !== SCHEMA_VERSION){
        throw new Error(`Backupデータのスキーマバージョン${data.schemaVersion}はサポートされていません`);
    }

    if(!data.profile || typeof data.profile !== "object"){
        throw new Error("Backupデータのprofileが正しくありません");
    }
}
