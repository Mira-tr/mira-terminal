import { getCmsAccessState } from "../features/cms/cmsClient.js";
import {
    appendCmsActivity,
    listSiteSections,
    upsertSiteSection
} from "../features/cms/cmsRepository.js";

const status = document.getElementById("structureStatus");
const list = document.getElementById("structureList");
const addButton = document.getElementById("structureAdd");
const publishedCount = document.getElementById("structurePublished");
const hiddenCount = document.getElementById("structureHidden");
const archivedCount = document.getElementById("structureArchived");
const dialog = document.getElementById("structureDialog");
const form = document.getElementById("structureForm");
const closeButton = document.getElementById("structureClose");
const archiveButton = document.getElementById("structureArchive");
const dialogTitle = document.getElementById("structureDialogTitle");
const idInput = document.getElementById("structureId");
const titleInput = document.getElementById("structureTitleInput");
const slugInput = document.getElementById("structureSlug");
const navigationLabelInput = document.getElementById("structureNavigationLabel");
const typeInput = document.getElementById("structureType");
const stateInput = document.getElementById("structureState");
const orderInput = document.getElementById("structureOrder");
const showNavigationInput = document.getElementById("structureShowNavigation");

let sections = [];
let canEdit = false;

addButton.addEventListener("click", () => openEditor(null));
closeButton.addEventListener("click", () => dialog.close());
archiveButton.addEventListener("click", archiveCurrent);
form.addEventListener("submit", saveCurrent);

initialize();

async function initialize(){
    try{
        const access = await getCmsAccessState();
        canEdit = Boolean(access.authenticated && access.isAdmin);
        addButton.disabled = !canEdit;

        if(!access.configured){
            setStatus("Supabaseが設定されていません。System > Databaseで接続設定を確認してください。", true);
            renderEmpty("DB接続後にRELMUAの公開構造を管理できます。");
            return;
        }
        if(!access.authenticated){
            setStatus("System > DatabaseからDiscordでログインしてください。", true);
            renderEmpty("ログイン後に公開構造を読み込みます。");
            return;
        }
        if(!access.isAdmin){
            setStatus("RELMUA全体を編集するAdmin権限がありません。", true);
            renderEmpty("Creator権限ではRELMUA全体の構造は変更できません。");
            return;
        }

        await reload();
        setStatus("RELMUAの公開構造をDBから読み込みました。");
    }catch(error){
        setStatus(error.message, true);
        renderEmpty("公開構造を読み込めませんでした。");
    }
}

async function reload(){
    sections = await listSiteSections();
    updateSummary();
    renderSections();
}

function renderSections(){
    if(!sections.length){
        renderEmpty("公開セクションはまだありません。");
        return;
    }

    list.replaceChildren(...sections.map(section => {
        const card = document.createElement("article");
        card.className = "structure-item";

        const order = document.createElement("span");
        order.className = "structure-order";
        order.textContent = String(section.sort_order || 0).padStart(2, "0");

        const body = document.createElement("div");
        body.className = "structure-item-body";

        const heading = document.createElement("div");
        heading.className = "structure-item-heading";
        const title = document.createElement("h3");
        title.textContent = section.title;
        const state = document.createElement("span");
        state.className = `structure-state is-${section.status}`;
        state.textContent = section.status;
        heading.append(title, state);

        const meta = document.createElement("p");
        const route = section.slug ? `/${section.slug}/` : "/";
        meta.textContent = `${section.section_type} · ${route}${section.show_in_navigation ? " · Navigation" : ""}`;

        body.append(heading, meta);

        const edit = document.createElement("button");
        edit.className = "button";
        edit.type = "button";
        edit.textContent = "編集";
        edit.disabled = !canEdit;
        edit.addEventListener("click", () => openEditor(section));

        card.append(order, body, edit);
        return card;
    }));
}

function openEditor(section){
    const isNew = !section;
    const nextOrder = sections.reduce((max, item) => Math.max(max, Number(item.sort_order) || 0), 0) + 1;

    dialogTitle.textContent = isNew ? "セクション追加" : "セクション編集";
    idInput.value = section?.id || "";
    titleInput.value = section?.title || "";
    slugInput.value = section?.slug || "";
    navigationLabelInput.value = section?.navigation_label || section?.title || "";
    typeInput.value = section?.section_type === "home" ? "page" : section?.section_type || "page";
    stateInput.value = section?.status || "draft";
    orderInput.value = String(section?.sort_order ?? nextOrder);
    showNavigationInput.checked = Boolean(section?.show_in_navigation);
    archiveButton.hidden = isNew || section?.status === "archived";
    slugInput.disabled = section?.section_key === "home";
    dialog.showModal();
    titleInput.focus();
}

async function saveCurrent(event){
    event.preventDefault();
    if(!canEdit){
        return;
    }

    const title = titleInput.value.trim();
    const slug = slugInput.value.trim().toLowerCase();
    if(!title){
        setStatus("表示名を入力してください。", true);
        return;
    }
    if(slug && !/^[a-z0-9-]+$/.test(slug)){
        setStatus("Slugは英小文字・数字・ハイフンだけ使えます。", true);
        return;
    }

    const current = sections.find(section => section.id === idInput.value) || null;
    const sectionKey = current?.section_key || `custom-${slug || createKey(title)}`;
    const payload = {
        ...(current?.id ? { id: current.id } : {}),
        section_key: sectionKey,
        title,
        slug: current?.section_key === "home" ? "" : slug,
        section_type: current?.section_key === "home" ? "home" : typeInput.value,
        status: stateInput.value,
        navigation_label: navigationLabelInput.value.trim() || title,
        show_in_navigation: showNavigationInput.checked,
        sort_order: Math.max(0, Number.parseInt(orderInput.value, 10) || 0),
        content: current?.content || {},
        created_at: current?.created_at
    };

    try{
        await upsertSiteSection(payload);
        await appendCmsActivity(
            current ? "site_section_updated" : "site_section_created",
            "site-section",
            sectionKey,
            { status: payload.status, slug: payload.slug }
        );
        dialog.close();
        await reload();
        setStatus(`${title}を保存しました。`);
    }catch(error){
        setStatus(error.message, true);
    }
}

async function archiveCurrent(){
    const current = sections.find(section => section.id === idInput.value);
    if(!current || !canEdit){
        return;
    }
    if(!globalThis.confirm(`${current.title}をPublicから外してArchiveしますか？`)){
        return;
    }

    try{
        await upsertSiteSection({
            ...current,
            status: "archived",
            show_in_navigation: false
        });
        await appendCmsActivity("site_section_archived", "site-section", current.section_key, {});
        dialog.close();
        await reload();
        setStatus(`${current.title}をArchiveしました。`);
    }catch(error){
        setStatus(error.message, true);
    }
}

function updateSummary(){
    publishedCount.textContent = String(sections.filter(item => item.status === "published").length);
    hiddenCount.textContent = String(sections.filter(item => item.status === "draft" || item.status === "hidden").length);
    archivedCount.textContent = String(sections.filter(item => item.status === "archived").length);
}

function renderEmpty(message){
    const empty = document.createElement("p");
    empty.className = "structure-empty";
    empty.textContent = message;
    list.replaceChildren(empty);
}

function setStatus(message, isError = false){
    status.textContent = message;
    status.classList.toggle("has-error", isError);
}

function createKey(value){
    const ascii = String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return ascii || `section-${Date.now()}`;
}
