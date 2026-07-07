import {
    initProfileForm
} from "../features/profile/profileForm.js";

import {
    exportPublicProfile
} from "../features/profile/profilePublicExport.js";

import {
    exportBackupProfile,
    importBackupProfile
} from "../features/profile/profileBackup.js";

initProfileForm();

document.getElementById("profilePublicExportBtn")
    .addEventListener("click", exportPublicProfile);

document.getElementById("profileBackupExportBtn")
    .addEventListener("click", exportBackupProfile);

document.getElementById("profileBackupImportBtn")
    .addEventListener("click", () => {
        const input = document.getElementById("profileBackupImportInput");
        input.click();
    });

document.getElementById("profileBackupImportInput")
    .addEventListener("change", (event) => {
        const file = event.target.files[0];
        if(!file){
            return;
        }

        importBackupProfile(file)
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
