import {
    getCreators
} from "./creatorStore.js";

import {
    addCreatorCanonical,
    deleteCreatorCanonical,
    hydrateCreatorsFromCms,
    moveCreatorCanonical,
    setPrimaryCreatorCanonical,
    updateCreatorCanonical
} from "./creatorCmsStore.js";

import {
    initCreatorCollectionsEditor
} from "./creatorCollectionsEditor.js";

import {
    validateCreatorContent
} from "./creatorContentValidation.js";

import {
    showToast
} from "../common/toastService.js";

let editingId = null;

export function initCreatorForm({
    initialCreatorId = "",
    onEditStateChange = () => {},
    onCollectionChange = () => {},
    validateBeforeSave = () => {}
} = {}){
    const byId = id => document.getElementById(id);
    const collectionsEditor = initCreatorCollectionsEditor();
    let mutating = false;

    const clear = (options = {}) => {
        editingId = null;
        byId("formTitle").textContent = "新しい活動者を追加";
        byId("saveCreatorBtn").textContent = "追加";
        byId("cancelEditBtn").style.display = "none";
        byId("creatorDisplayName").value = "";
        byId("creatorSlug").value = "";
        byId("creatorNameEn").value = "";
        byId("creatorBio").value = "";
        byId("creatorActivities").value = "";
        collectionsEditor.clear();
        byId("creatorStatus").value = "draft";
        if(options.syncRoute !== false){
            onEditStateChange("");
        }
    };

    const refresh = () => {
        renderPrimary();
        renderList();
        onCollectionChange();
    };

    const renderPrimary = () => {
        const collection = getCreators();
        const primary = collection.creators.find(
            creator => creator.id === collection.primaryCreatorId
        );

        byId("primaryCreatorText").textContent = primary
            ? `${primary.displayName} (${primary.slug})`
            : "未設定";
    };

    const renderList = () => {
        const collection = getCreators();
        const container = byId("creatorsList");
        const creators = collection.creators
            .slice()
            .sort((a, b) => a.order - b.order);

        container.replaceChildren();

        if(!creators.length){
            const message = document.createElement("p");
            message.className = "panel-note";
            message.textContent = "Creatorはまだ登録されていません";
            container.appendChild(message);
            return;
        }

        creators.forEach(creator => {
            container.appendChild(createItem(creator, collection.primaryCreatorId));
        });
    };

    const createItem = (creator, primaryCreatorId) => {
        const item = document.createElement("article");
        item.className = "management-item";

        const header = document.createElement("div");
        header.className = "management-item-header";

        const title = document.createElement("h3");
        title.textContent = creator.displayName || "無題";

        const badge = document.createElement("span");
        badge.className = "status-badge";
        badge.textContent = creator.status;

        const summary = document.createElement("p");
        summary.className = "management-item-summary";
        summary.textContent = [
            `/${creator.slug}/`,
            creator.id === primaryCreatorId ? "Primary" : "",
            creator.bio || "説明なし"
        ].filter(Boolean).join(" / ");

        const actions = document.createElement("div");
        actions.className = "management-item-actions";

        [
            ["編集", () => edit(creator)],
            ["Primary", () => makePrimary(creator.id)],
            ["上へ", () => move(creator.id, "up")],
            ["下へ", () => move(creator.id, "down")],
            ["削除", () => remove(creator.id)]
        ].forEach(([label, handler]) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "button button-secondary";
            button.textContent = label;
            button.addEventListener("click", handler);
            actions.appendChild(button);
        });

        header.append(title, badge);
        item.append(header, summary, actions);
        return item;
    };

    const values = () => ({
        displayName: byId("creatorDisplayName").value.trim(),
        slug: byId("creatorSlug").value.trim(),
        nameEn: byId("creatorNameEn").value.trim(),
        bio: byId("creatorBio").value.trim(),
        activities: byId("creatorActivities").value.trim(),
        works: collectionsEditor.getWorks(),
        links: collectionsEditor.getLinks(),
        status: byId("creatorStatus").value
    });

    const edit = creator => {
        editingId = creator.id;
        onEditStateChange(creator.id);
        byId("formTitle").textContent = `${creator.displayName}の活動者情報を編集`;
        byId("saveCreatorBtn").textContent = "更新";
        byId("cancelEditBtn").style.display = "inline-block";
        byId("creatorDisplayName").value = creator.displayName;
        byId("creatorSlug").value = creator.slug;
        byId("creatorNameEn").value = creator.nameEn || "";
        byId("creatorBio").value = creator.bio || "";
        byId("creatorActivities").value = creator.activities.join("\n");
        collectionsEditor.setWorks(creator.works);
        collectionsEditor.setLinks(creator.links);
        byId("creatorStatus").value = creator.status;
        scrollTo({ top: 0, behavior: "smooth" });
    };

    const saveCreator = async () => {
        const data = values();

        if(!data.displayName){
            showToast("入力内容を確認してください：表示名は必須です", "warning");
            return;
        }

        if(!data.slug){
            showToast("入力内容を確認してください：slugは必須です", "warning");
            return;
        }

        if(isPublishedSlugChange(data) && !confirm(
            "公開済みCreatorのslugを変更しますか？公開URLに影響します。"
        )){
            return;
        }

        try{
            const isEditing = Boolean(editingId);
            validateCreatorContent(data);
            validateBeforeSave(data, editingId);
            const success = await runMutation(() => (
                isEditing
                    ? updateCreatorCanonical(editingId, data)
                    : addCreatorCanonical(data)
            ));

            if(!success){
                showToast("保存に失敗しました", "error");
                return;
            }

            clear();
            refresh();
            showToast(isEditing ? "更新しました" : "保存しました", "success");
        }catch(error){
            showToast(error.message, "error");
        }
    };

    const isPublishedSlugChange = data => {
        if(!editingId){
            return false;
        }

        const creator = getCreators().creators.find(
            current => current.id === editingId
        );

        return Boolean(
            creator &&
            creator.status === "public" &&
            creator.slug !== data.slug
        );
    };

    const makePrimary = async id => {
        try{
            const success = await runMutation(() => setPrimaryCreatorCanonical(id));
            if(!success){
                showToast("Primary Creatorを更新できませんでした", "error");
                return;
            }
            refresh();
            showToast("Primary Creatorを更新しました", "success");
        }catch(error){
            showToast(error.message, "error");
        }
    };

    const move = async (id, direction) => {
        try{
            if(await runMutation(() => moveCreatorCanonical(id, direction))){
                refresh();
            }
        }catch(error){
            showToast(error.message, "error");
        }
    };

    const remove = async id => {
        if(!confirm("このCreatorを管理一覧から外しますか？DB上ではArchiveとして保持します。")){
            return;
        }

        try{
            const success = await runMutation(() => deleteCreatorCanonical(id));
            if(!success){
                showToast("Primary Creatorは削除できません", "warning");
                return;
            }

            if(editingId === id){
                clear();
            }

            refresh();
            showToast("Archiveしました", "success");
        }catch(error){
            showToast(error.message, "error");
        }
    };

    byId("saveCreatorBtn").addEventListener("click", saveCreator);
    byId("addCreatorBtn").addEventListener("click", clear);
    byId("cancelEditBtn").addEventListener("click", clear);

    clear({ syncRoute: false });
    refresh();

    const ready = hydrateCreatorsFromCms()
        .then(() => {
            refresh();
            openInitialCreator(initialCreatorId);
            return true;
        })
        .catch(error => {
            console.warn("[cms] Failed to hydrate Creators", error);
            showToast(
                error?.message || "DBからCreatorsを読み込めませんでした。この端末のcacheを表示しています。",
                "warning"
            );
            openInitialCreator(initialCreatorId);
            return false;
        });

    return {
        clear,
        refresh,
        ready
    };

    async function runMutation(operation){
        if(mutating){
            return false;
        }

        mutating = true;
        byId("saveCreatorBtn").disabled = true;
        try{
            const result = await operation();
            return result !== false;
        }finally{
            mutating = false;
            byId("saveCreatorBtn").disabled = false;
        }
    }

    function openInitialCreator(id){
        if(!id){
            return;
        }

        const creator = getCreators().creators.find(current => current.id === id);
        if(creator){
            edit(creator);
            return;
        }

        onEditStateChange("");
        showToast("指定された活動者が見つからないため、新規追加画面を表示しました", "warning");
    }
}
