import {
    initGameForm,
    refreshGameForm
} from "../features/game/gameForm.js";

import {
    exportPublicGames
} from "../features/game/gamePublicExport.js";

import {
    exportBackupGames,
    importBackupGames
} from "../features/game/gameBackup.js";

import {
    initToastService,
    runToastOperation,
    showToast
} from "../features/common/toastService.js";

initToastService();
initGameForm();

document.getElementById("publicExportBtn")
    .addEventListener("click", () => runToastOperation(
        exportPublicGames,
        { errorMessage: "Public JSONの出力に失敗しました" }
    ));

document.getElementById("gameBackupExportBtn")
    .addEventListener("click", () => runToastOperation(
        exportBackupGames,
        {
            successMessage: "Backupを出力しました",
            errorMessage: "Backupの出力に失敗しました"
        }
    ));

document.getElementById("gameBackupImportBtn")
    .addEventListener("click", () => {
        document.getElementById("gameBackupImportInput").click();
    });

document.getElementById("gameBackupImportInput")
    .addEventListener("change", async event => {
        const file = event.target.files[0];

        if(!file){
            return;
        }

        const success = await runToastOperation(
            () => importBackupGames(file),
            { errorMessage: "読み込みに失敗しました" }
        );

        if(success){
            refreshGameForm();
            showToast("Backupを読み込みました", "success");
        }

        event.target.value = "";
    });
