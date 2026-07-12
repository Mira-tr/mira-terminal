import {
    initCreatorForm
} from "../features/creators/creatorForm.js";

import {
    exportPublicCreators
} from "../features/creators/creatorPublicExport.js";

import {
    exportBackupCreators,
    importBackupCreators
} from "../features/creators/creatorBackup.js";

import {
    initToastService,
    runToastOperation,
    showToast
} from "../features/common/toastService.js";

initToastService();
const form = initCreatorForm();

document.getElementById("publicExportBtn")
    .addEventListener("click", () => runToastOperation(
        exportPublicCreators,
        { errorMessage: "Public JSONの出力に失敗しました" }
    ));

document.getElementById("backupExportBtn")
    .addEventListener("click", () => runToastOperation(
        exportBackupCreators,
        {
            successMessage: "Backupを出力しました",
            errorMessage: "Backupの出力に失敗しました"
        }
    ));

document.getElementById("backupImportBtn")
    .addEventListener("click", () => {
        document.getElementById("backupImportInput").click();
    });

document.getElementById("backupImportInput")
    .addEventListener("change", async event => {
        const file = event.target.files[0];

        if(!file){
            return;
        }

        const success = await runToastOperation(
            () => importBackupCreators(file),
            { errorMessage: "読み込みに失敗しました" }
        );

        if(success){
            form.clear();
            form.refresh();
            showToast("Backupを読み込みました", "success");
        }

        event.target.value = "";
    });
