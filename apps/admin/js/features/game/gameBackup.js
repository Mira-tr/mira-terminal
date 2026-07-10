import {
    getGames,
    setGames
} from "./gameStore.js";

import {
    recordBackupExport
} from "../common/backupMeta.js";

const APP_NAME = "MIRA Terminal";
const MODULE_NAME = "game";
const BACKUP_TYPE = "games";
const BACKUP_VERSION = "1.0.0";
const SCHEMA_VERSION = 1;

export function exportBackupGames(){
    const games = getGames();

    const backupData = {
        app: APP_NAME,
        module: MODULE_NAME,
        backupType: BACKUP_TYPE,
        backupVersion: BACKUP_VERSION,
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        games: games
    };

    const date = new Date();
    const dateStr = date.getFullYear() +
        String(date.getMonth() + 1).padStart(2, "0") +
        String(date.getDate()).padStart(2, "0");

    const filename = `mira-terminal-game-backup-${dateStr}.json`;

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

export function importBackupGames(file){
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try{
                const data = JSON.parse(event.target.result);

                validateBackupGames(data);

                if(!confirm("既存のGameデータを上書きしますか？")){
                    resolve(false);
                    return;
                }

                if(!setGames(data.games)){
                    throw new Error("Gameの保存に失敗しました");
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

function validateBackupGames(data){
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

    if(!data.games || typeof data.games !== "object"){
        throw new Error("Backupデータのgamesが正しくありません");
    }

    if(!Array.isArray(data.games.games)){
        throw new Error("Backupデータのgames配列が正しくありません");
    }
}
