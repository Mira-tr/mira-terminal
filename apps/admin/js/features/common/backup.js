import {
    showToast
} from "./toastService.js";

const DEFAULT_APP_NAME = "MIRA Terminal";
const DEFAULT_BACKUP_VERSION = "1.0.0";

export function exportData(payload, options = {}){
    const backup = createBackup(payload, options);
    const filename = options.filename || "mira-terminal-backup.json";

    const blob = new Blob(
        [
            JSON.stringify(
                backup,
                null,
                2
            )
        ],
        {
            type: "application/json"
        }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(()=>{
        URL.revokeObjectURL(url);
    }, 0);

    showToast("Backupを出力しました", "success");
}

export function importData(event, callback, options = {}){
    const file = event.target.files[0];

    if(!file){
        return;
    }

    const reader = new FileReader();

    reader.onload = e=>{
        try{
            const backup = JSON.parse(e.target.result);
            const validation = validateBackup(backup, options);

            if(!validation.ok){
                showToast(validation.message, "error");
                return;
            }

            if(!confirm(createImportConfirmMessage(backup, options))){
                return;
            }

            const saved = callback(normalizeBackup(backup));

            if(saved === false){
                showToast("読み込みに失敗しました", "error");
                return;
            }

            showToast("Backupを読み込みました", "success");
        }catch(error){
            console.error(error);
            showToast("読み込みに失敗しました：JSONを確認してください", "error");
        }
    };

    reader.onerror = () => {
        showToast("読み込みに失敗しました", "error");
    };

    reader.readAsText(file);
    event.target.value = "";
}

function createBackup(payload, options){
    const safePayload = normalizePayload(payload);

    return {
        app: options.appName || DEFAULT_APP_NAME,
        module: options.moduleName || "unknown",
        backupVersion: options.backupVersion || DEFAULT_BACKUP_VERSION,
        schemaVersion: options.schemaVersion || 1,
        exportedAt: new Date().toISOString(),
        counts: createCounts(safePayload),
        ...safePayload
    };
}

function normalizePayload(payload){
    return {
        scenarios: Array.isArray(payload?.scenarios)
            ? payload.scenarios
            : [],
        tags: Array.isArray(payload?.tags)
            ? payload.tags
            : [],
        authors: Array.isArray(payload?.authors)
            ? payload.authors
            : []
    };
}

function normalizeBackup(backup){
    return {
        scenarios: Array.isArray(backup.scenarios)
            ? backup.scenarios
            : [],
        tags: Array.isArray(backup.tags)
            ? backup.tags
            : [],
        authors: Array.isArray(backup.authors)
            ? backup.authors
            : []
    };
}

function validateBackup(backup, options){
    if(!backup || typeof backup !== "object"){
        return {
            ok: false,
            message: "バックアップ形式が違います"
        };
    }

    if(
        options.expectedModule &&
        backup.module &&
        backup.module !== options.expectedModule
    ){
        return {
            ok: false,
            message: `このバックアップは ${backup.module} 用です。${options.expectedModule} には読み込めません。`
        };
    }

    if(
        backup.schemaVersion &&
        options.maxSchemaVersion &&
        Number(backup.schemaVersion) > Number(options.maxSchemaVersion)
    ){
        return {
            ok: false,
            message: "このバックアップは現在の画面より新しい形式です。読み込みを中止します。"
        };
    }

    if(!Array.isArray(backup.scenarios)){
        return {
            ok: false,
            message: "バックアップ内の scenarios が配列ではありません"
        };
    }

    if(!Array.isArray(backup.tags)){
        return {
            ok: false,
            message: "バックアップ内の tags が配列ではありません"
        };
    }

    if(
        backup.authors !== undefined &&
        !Array.isArray(backup.authors)
    ){
        return {
            ok: false,
            message: "バックアップ内の authors が配列ではありません"
        };
    }

    return {
        ok: true,
        message: ""
    };
}

function createCounts(payload){
    return {
        scenarios: payload.scenarios.length,
        tags: payload.tags.length,
        authors: payload.authors.length
    };
}

function createImportConfirmMessage(backup, options){
    const counts = createCounts(normalizeBackup(backup));
    const moduleName = backup.module || "legacy";
    const schemaVersion = backup.schemaVersion || "legacy";
    const appName = backup.app || "不明";
    const currentCounts = options.currentCounts || {};

    return [
        "現在のデータを上書きしますか？",
        "",
        `app: ${appName}`,
        `module: ${moduleName}`,
        `schemaVersion: ${schemaVersion}`,
        "",
        "読み込むデータ:",
        `シナリオ: ${counts.scenarios}件`,
        `タグ: ${counts.tags}件`,
        `作者: ${counts.authors}件`,
        "",
        "現在のデータ:",
        `シナリオ: ${currentCounts.scenarios ?? "不明"}件`,
        `タグ: ${currentCounts.tags ?? "不明"}件`,
        `作者: ${currentCounts.authors ?? "不明"}件`,
        "",
        "この操作は現在のlocalStorage上のデータを置き換えます。"
    ].join("\n");
}
