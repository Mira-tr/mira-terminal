import {
    initGameForm
} from "../features/game/gameForm.js";

import {
    exportPublicGames
} from "../features/game/gamePublicExport.js";

import {
    exportBackupGames,
    importBackupGames
} from "../features/game/gameBackup.js";

initGameForm();

document.getElementById("publicExportBtn")
    .addEventListener("click", exportPublicGames);

document.getElementById("gameBackupExportBtn")
    .addEventListener("click", exportBackupGames);

document.getElementById("gameBackupImportBtn")
    .addEventListener("click", () => {
        const input = document.getElementById("gameBackupImportInput");
        input.click();
    });

document.getElementById("gameBackupImportInput")
    .addEventListener("change", (event) => {
        const file = event.target.files[0];
        if(!file){
            return;
        }

        importBackupGames(file)
            .then((success) => {
                if(success){
                    alert("Backup読み込みが成功しました");
                    location.reload();
                }
            })
            .catch((error) => {
                alert(`Backup読み込みに失敗しました: ${error.message}`);
            });

        event.target.value = "";
    });
