import {
    initRulesForm,
    refreshRulesForm
} from "../features/trpg/rules/rulesForm.js";

import {
    exportPublicRules
} from "../features/trpg/rules/rulesPublicExport.js";

import {
    exportBackupRules,
    importBackupRules
} from "../features/trpg/rules/rulesBackup.js";

import {
    initToastService,
    runToastOperation,
    showToast
} from "../features/common/toastService.js";

initToastService();
initRulesForm();

document.getElementById("publicExportBtn")
    .addEventListener("click", () => runToastOperation(
        exportPublicRules,
        { errorMessage: "Public JSONの出力に失敗しました" }
    ));

document.getElementById("rulesBackupExportBtn")
    .addEventListener("click", () => runToastOperation(
        exportBackupRules,
        {
            successMessage: "Backupを出力しました",
            errorMessage: "Backupの出力に失敗しました"
        }
    ));

document.getElementById("rulesBackupImportBtn")
    .addEventListener("click", () => {
        document.getElementById("rulesBackupImportInput").click();
    });

document.getElementById("rulesBackupImportInput")
    .addEventListener("change", async event => {
        const file = event.target.files[0];

        if(!file){
            return;
        }

        const success = await runToastOperation(
            () => importBackupRules(file),
            { errorMessage: "読み込みに失敗しました" }
        );

        if(success){
            refreshRulesForm();
            showToast("Backupを読み込みました", "success");
        }

        event.target.value = "";
    });
