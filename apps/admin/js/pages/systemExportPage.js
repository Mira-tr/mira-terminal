import {
    exportPublicSnapshotPackageCanonical
} from "../features/system/export/publicSnapshot.js";

const button = document.getElementById("systemExportSnapshot");
const status = document.getElementById("systemPageStatus");
const summary = document.getElementById("systemExportSnapshotSummary");

button?.addEventListener("click", async () => {
    button.disabled = true;
    setStatus("Supabase Canonical dataを読み込み、Public Snapshotを検証しています…");

    try{
        const { filename, snapshot } = await exportPublicSnapshotPackageCanonical();
        const sourceLabel = snapshot.source === "supabase-canonical"
            ? "Supabase Canonical"
            : "development compatibility cache";

        if(summary){
            summary.textContent = `${snapshot.files.length} Public JSON / ${sourceLabel} / ${filename}`;
        }
        setStatus(`Public Snapshot Packageを作成しました: ${filename}`, "success");
    }catch(error){
        console.error(error);
        setStatus(error?.message || "Public Snapshot Packageの作成に失敗しました。", "warning");
    }finally{
        button.disabled = false;
    }
});

function setStatus(message, state = "info"){
    if(!status){
        return;
    }

    status.textContent = message;
    status.dataset.state = state;
}
