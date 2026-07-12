import {
    getCreators,
    normalizeCreatorsCollection,
    saveCreators,
    validateCreatorsCollection
} from "./creatorStore.js";

import {
    CREATORS_KEY,
    load
} from "../../store.js";

import {
    recordBackupExport
} from "../common/backupMeta.js";

const APP_NAME = "RELMUA Terminal";
const MODULE_NAME = "creators";
const BACKUP_TYPE = "creators-backup";
const BACKUP_VERSION = "1.0.0";

export function createCreatorsBackup(collection = getCreators()){
    const normalized = normalizeCreatorsCollection(collection);

    validateCreatorsCollection(normalized);

    return {
        app: APP_NAME,
        module: MODULE_NAME,
        backupType: BACKUP_TYPE,
        backupVersion: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        data: {
            primaryCreatorId: normalized.primaryCreatorId,
            creators: normalized.creators
        }
    };
}

export function exportBackupCreators(){
    const backupData = createCreatorsBackup();
    const blob = new Blob(
        [JSON.stringify(backupData, null, 2)],
        { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `relmua-terminal-creators-backup-${dateStamp()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    recordBackupExport();
}

export function importBackupCreators(file){
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = event => {
            try{
                const data = JSON.parse(event.target.result);
                const normalized = validateBackupCreators(data);
                const existing = load(CREATORS_KEY, null);
                const hasExistingCreators = Boolean(
                    existing &&
                    typeof existing === "object" &&
                    Array.isArray(existing.creators) &&
                    existing.creators.length > 0
                );

                if(hasExistingCreators && !confirm(
                    "既存のCreatorsデータを上書きしますか？"
                )){
                    resolve(false);
                    return;
                }

                if(!saveCreators(normalized)){
                    throw new Error("Creatorsの保存に失敗しました");
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

export function validateBackupCreators(data){
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

    if(!data.data || typeof data.data !== "object"){
        throw new Error("Backupデータのdataが正しくありません");
    }

    const normalized = normalizeCreatorsCollection(data.data);

    validateCreatorsCollection(normalized);

    return normalized;
}

function dateStamp(){
    const date = new Date();

    return date.getFullYear() +
        String(date.getMonth() + 1).padStart(2, "0") +
        String(date.getDate()).padStart(2, "0");
}
