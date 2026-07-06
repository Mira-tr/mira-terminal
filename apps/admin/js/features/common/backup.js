import {
    showMessage
} from "../../utils.js";

export function exportData(payload, filename = "mira-terminal-backup.json"){
    const backup = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        ...payload
    };

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
    a.click();

    URL.revokeObjectURL(url);

    showMessage("データを出力しました");
}

export function importData(event, callback){
    const file = event.target.files[0];

    if(!file){
        return;
    }

    const reader = new FileReader();

    reader.onload = e=>{
        try{
            const backup = JSON.parse(e.target.result);

            if(!isValidBackup(backup)){
                alert("バックアップ形式が違います");
                return;
            }

            if(!confirm("現在のデータを上書きしますか？")){
                return;
            }

            callback({
                scenarios: backup.scenarios,
                tags: backup.tags,
                authors: backup.authors || []
            });

            showMessage("読み込みました");
        }catch(error){
            console.error(error);
            alert("読み込み失敗");
        }
    };

    reader.readAsText(file);
    event.target.value = "";
}

function isValidBackup(backup){
    return (
        backup &&
        Array.isArray(backup.scenarios) &&
        Array.isArray(backup.tags) &&
        (
            backup.authors === undefined ||
            Array.isArray(backup.authors)
        )
    );
}