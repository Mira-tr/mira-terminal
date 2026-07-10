import {
    initProfileForm,
    refreshProfileForm
} from "../features/profile/profileForm.js";

import {
    exportPublicProfile
} from "../features/profile/profilePublicExport.js";

import {
    exportBackupProfile,
    importBackupProfile
} from "../features/profile/profileBackup.js";

import {
    initToastService,
    runToastOperation,
    showToast
} from "../features/common/toastService.js";

initToastService();
initProfileForm();

document.getElementById("profilePublicExportBtn")
    .addEventListener("click", () => runToastOperation(
        exportPublicProfile,
        { errorMessage: "Public JSONの出力に失敗しました" }
    ));

document.getElementById("profileBackupExportBtn")
    .addEventListener("click", () => runToastOperation(
        exportBackupProfile,
        {
            successMessage: "Backupを出力しました",
            errorMessage: "Backupの出力に失敗しました"
        }
    ));

document.getElementById("profileBackupImportBtn")
    .addEventListener("click", () => {
        document.getElementById("profileBackupImportInput").click();
    });

document.getElementById("profileBackupImportInput")
    .addEventListener("change", async event => {
        const file = event.target.files[0];

        if(!file){
            return;
        }

        const success = await runToastOperation(
            () => importBackupProfile(file),
            { errorMessage: "読み込みに失敗しました" }
        );

        if(success){
            refreshProfileForm();
            showToast("Backupを読み込みました", "success");
        }

        event.target.value = "";
    });
