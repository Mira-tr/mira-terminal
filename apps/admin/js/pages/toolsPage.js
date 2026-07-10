import {
    initToolForm
} from "../features/tools/toolForm.js";

import {
    exportPublicTools
} from "../features/tools/toolPublicExport.js";

import {
    exportBackupTools,
    importBackupTools
} from "../features/tools/toolBackup.js";

import {
    initToastService,
    runToastOperation,
    showToast
} from "../features/common/toastService.js";

initToastService();
const form = initToolForm();

document.getElementById("publicExportBtn")
    .addEventListener("click", () => runToastOperation(
        exportPublicTools,
        { errorMessage: "Public JSONの出力に失敗しました" }
    ));

document.getElementById("backupExportBtn")
    .addEventListener("click", () => runToastOperation(
        exportBackupTools,
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
            () => importBackupTools(file),
            { errorMessage: "読み込みに失敗しました" }
        );

        if(success){
            form.clear();
            form.refresh();
            showToast("Backupを読み込みました", "success");
        }

        event.target.value = "";
    });
