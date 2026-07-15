import {
    initNoteForm
} from "../features/notes/noteForm.js";

import {
    populateCreatorPicker
} from "../features/creators/creatorPicker.js";

import {
    exportPublicNotes
} from "../features/notes/notePublicExport.js";

import {
    exportBackupNotes,
    importBackupNotes
} from "../features/notes/noteBackup.js";

import {
    initToastService,
    runToastOperation,
    showToast
} from "../features/common/toastService.js";

initToastService();
populateCreatorPicker("noteAuthorCreatorId");
const form = initNoteForm();

document.getElementById("publicExportBtn")
    .addEventListener("click", () => runToastOperation(
        exportPublicNotes,
        { errorMessage: "Public JSONの出力に失敗しました" }
    ));

document.getElementById("backupExportBtn")
    .addEventListener("click", () => runToastOperation(
        exportBackupNotes,
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
            () => importBackupNotes(file),
            { errorMessage: "読み込みに失敗しました" }
        );

        if(success){
            form.clear();
            form.refresh();
            showToast("Backupを読み込みました", "success");
        }

        event.target.value = "";
    });
