import {
    getCmsAccessState,
    signInCmsWithDiscord,
    signOutCms
} from "../features/cms/cmsClient.js";

const status = document.getElementById("databaseStatus");
const connection = document.getElementById("databaseConnection");
const connectionNote = document.getElementById("databaseConnectionNote");
const permission = document.getElementById("databasePermission");
const permissionNote = document.getElementById("databasePermissionNote");
const loginButton = document.getElementById("databaseLogin");
const logoutButton = document.getElementById("databaseLogout");
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

refresh();

async function refresh(){
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
        ? "Supabase CMSへ接続する設定を読み込めています。"
        : "ローカル環境のSupabase設定が必要です。";

    loginButton.hidden = access.authenticated;
    logoutButton.hidden = !access.authenticated;
    renderIdentity(access.user);

    if(!access.authenticated){
        permission.textContent = "Signed out";
        permissionNote.textContent = access.message;
        setStatus(access.message, !access.configured);
        return;
    }

    if(access.isAdmin){
        permission.textContent = access.role === "owner" ? "Owner" : "Admin";
        permissionNote.textContent = "RELMUA全体のCMSデータを編集できます。";
        setStatus(access.message);
        return;
    }

    if(access.creatorIds.length){
        permission.textContent = "Creator";
        permissionNote.textContent = "割り当てられたCreator領域を編集できます。";
    }else{
        permission.textContent = "No access";
        permissionNote.textContent = "AdminまたはCreator所有者としての割り当てが必要です。";
    }
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

function setStatus(message, isError = false){
    status.textContent = message;
    status.classList.toggle("has-error", isError);
}
