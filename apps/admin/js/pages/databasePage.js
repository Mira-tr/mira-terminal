import {
    getCmsAccessState,
    signInCmsWithDiscord,
    signOutCms
} from "../features/cms/cmsClient.js";

import {
    LEGACY_STORAGE_KEYS,
    exportLegacyStorageToCms,
    restoreLegacyStorageFromCms
} from "../features/cms/cmsLegacyBridge.js";

const status = document.getElementById("databaseStatus");
const connection = document.getElementById("databaseConnection");
const connectionNote = document.getElementById("databaseConnectionNote");
const permission = document.getElementById("databasePermission");
const permissionNote = document.getElementById("databasePermissionNote");
const legacyCount = document.getElementById("databaseLegacyCount");
const loginButton = document.getElementById("databaseLogin");
const logoutButton = document.getElementById("databaseLogout");
const uploadButton = document.getElementById("databaseUploadLegacy");
const restoreButton = document.getElementById("databaseRestoreLegacy");
const identityPanel = document.getElementById("databaseIdentityPanel");
const identityName = document.getElementById("databaseIdentityName");
const identityId = document.getElementById("databaseIdentityId");
const copyIdentityButton = document.getElementById("databaseCopyIdentity");

loginButton.addEventListener("click", async () => {
    setStatus("Discordログインへ移動します…");
    try{
        await signInCmsWithDiscord(globalThis.location.href);
    }catch(error){
        setStatus(error.message, true);
    }
});

logoutButton.addEventListener("click", async () => {
    try{
        await signOutCms();
        await refresh();
    }catch(error){
        setStatus(error.message, true);
    }
});

copyIdentityButton.addEventListener("click", async () => {
    const value = identityId.textContent.trim();
    if(!value || value === "-"){
        return;
    }
    try{
        await navigator.clipboard.writeText(value);
        setStatus("現在のAuth User IDをコピーしました。");
    }catch{
        setStatus("コピーできませんでした。表示されているUser IDを選択してください。", true);
    }
});

uploadButton.addEventListener("click", async () => {
    uploadButton.disabled = true;
    setStatus("旧AdminデータをDBへ保存しています…");
    try{
        const result = await exportLegacyStorageToCms();
        setStatus(`${result.migratedKeys.length}件の保存領域をDBへ退避しました。`);
    }catch(error){
        setStatus(error.message, true);
    }finally{
        await refresh();
    }
});

restoreButton.addEventListener("click", async () => {
    if(!globalThis.confirm("DBの旧データSnapshotで、この端末のlocalStorageを上書きします。続けますか？")){
        return;
    }

    restoreButton.disabled = true;
    setStatus("DBから旧Adminデータを復元しています…");
    try{
        const restored = await restoreLegacyStorageFromCms();
        setStatus(`${restored.length}件をこの端末へ復元しました。ページを再読み込みすると反映されます。`);
        legacyCount.textContent = String(countLegacyKeys());
    }catch(error){
        setStatus(error.message, true);
    }finally{
        await refresh();
    }
});

refresh();

async function refresh(){
    legacyCount.textContent = String(countLegacyKeys());

    try{
        const access = await getCmsAccessState();
        renderAccess(access);
    }catch(error){
        connection.textContent = "Error";
        connectionNote.textContent = error.message;
        permission.textContent = "Unavailable";
        permissionNote.textContent = "権限を確認できませんでした。";
        renderIdentity(null);
        setStatus(error.message, true);
    }
}

function renderAccess(access){
    connection.textContent = access.configured ? "Configured" : "Not configured";
    connectionNote.textContent = access.configured
        ? "Supabaseの公開接続設定を読み込めています。"
        : "ローカル環境のSupabase設定が必要です。";

    loginButton.hidden = access.authenticated;
    logoutButton.hidden = !access.authenticated;
    renderIdentity(access.user);

    if(!access.authenticated){
        permission.textContent = "Signed out";
        permissionNote.textContent = access.message;
        uploadButton.disabled = true;
        restoreButton.disabled = true;
        setStatus(access.message, !access.configured);
        return;
    }

    if(access.isAdmin){
        permission.textContent = access.role === "owner" ? "Owner" : "Admin";
        permissionNote.textContent = "RELMUA全体のCMSデータを編集できます。";
        uploadButton.disabled = false;
        restoreButton.disabled = false;
        setStatus(access.message);
        return;
    }

    if(access.creatorIds.length){
        permission.textContent = "Creator";
        permissionNote.textContent = "自分に割り当てられたCreator領域だけ編集できます。";
    }else{
        permission.textContent = "No access";
        permissionNote.textContent = "AdminまたはCreator所有者としての割り当てが必要です。";
    }
    uploadButton.disabled = true;
    restoreButton.disabled = true;
    setStatus(access.message, true);
}

function renderIdentity(user){
    identityPanel.hidden = !user;
    if(!user){
        identityName.textContent = "-";
        identityId.textContent = "-";
        return;
    }

    const metadata = user.user_metadata || {};
    identityName.textContent = String(
        metadata.full_name || metadata.global_name || metadata.name || metadata.user_name || metadata.preferred_username || "Discord account"
    );
    identityId.textContent = String(user.id || "-");
}

function countLegacyKeys(){
    return LEGACY_STORAGE_KEYS.reduce((count, key) => {
        return count + (globalThis.localStorage?.getItem?.(key) !== null ? 1 : 0);
    }, 0);
}

function setStatus(message, isError = false){
    status.textContent = message;
    status.classList.toggle("has-error", isError);
}
