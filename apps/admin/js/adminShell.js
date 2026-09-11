(() => {
    const adminRootUrl = new URL("../", document.currentScript.src);
    const navigationRegistryPromise = import("./features/navigation/adminRouteRegistry.js");

    async function createPrimaryNavigation(){
        const navigation = document.querySelector(".admin-header .header-nav");
        if(!navigation){
            return;
        }

        const { getAdminPrimaryNavigation } = await navigationRegistryPromise;
        const currentSection = getCurrentAdminSection(location.pathname);
        const links = getAdminPrimaryNavigation().map(route => {
            const link = document.createElement("a");
            link.className = "nav-item";
            link.href = new URL(route.adminHref, adminRootUrl).href;
            link.textContent = route.label;
            link.dataset.adminRoot = route.id;
            if(route.id === currentSection){
                link.classList.add("is-current");
                link.setAttribute("aria-current", "page");
            }
            return link;
        });

        navigation.setAttribute("aria-label", "管理画面のメインメニュー");
        navigation.replaceChildren(...links);
        document.body.dataset.adminSection = currentSection;
    }

    function getRelativeAdminPath(pathname){
        const path = String(pathname || "").replaceAll("\\", "/").toLowerCase();
        const adminRootPath = adminRootUrl.pathname.toLowerCase();
        return path.startsWith(adminRootPath)
            ? path.slice(adminRootPath.length)
            : path.replace(/^\/+/, "");
    }

    function getCurrentAdminSection(pathname){
        const relativePath = getRelativeAdminPath(pathname);
        if(relativePath.startsWith("system/")) return "admin-system";
        if(relativePath.startsWith("creators/") || relativePath.startsWith("profile/") || relativePath.startsWith("trpg/")) return "admin-creators";
        if(relativePath.startsWith("brand/") || relativePath.startsWith("home/") || relativePath.startsWith("game/") || relativePath.startsWith("tools/") || relativePath.startsWith("notes/")) return "admin-relmua";
        return "admin-home";
    }

    function createOperationGuide(){
        const main = document.querySelector(".admin-main");
        if(!main || main.classList.contains("system-main") || main.classList.contains("creator-workspace-main") || document.querySelector(".dashboard-overview")){
            return;
        }

        const guide = document.createElement("aside");
        guide.className = "admin-operation-guide";
        guide.setAttribute("aria-label", "操作の種類");
        [
            ["保存", "編集内容をCMSへ保存します。"],
            ["公開用データ", "公開サイトに必要な情報だけを書き出します。"],
            ["バックアップ", "復元できるように管理データを保存します。"],
            ["バックアップから復元", "内容を確認してから編集データを戻します。"]
        ].forEach(([title, description]) => {
            const item = document.createElement("div");
            const strong = document.createElement("strong");
            const text = document.createElement("span");
            strong.textContent = title;
            text.textContent = description;
            item.append(strong, text);
            guide.appendChild(item);
        });
        main.querySelector(".admin-breadcrumb")?.after(guide);
    }

    function enhanceOperationZones(){
        document.querySelectorAll(".panel-sub, .home-public-export-section").forEach(zone => {
            const text = zone.textContent || "";
            const importButton = zone.querySelector('[id*="Import"], [id="importBtn"]');
            const resetButton = zone.querySelector('[id*="reset" i]');
            let description = "";

            if(importButton){
                zone.classList.add("operation-zone", "operation-zone--backup");
                description = "バックアップから復元すると、現在の編集データが置き換わる場合があります。先に内容を確認してください。";
            }else if(resetButton){
                zone.classList.add("operation-zone", "operation-zone--danger");
                description = "初期化すると保存済み設定が既定値に戻ります。影響を確認してから実行してください。";
            }else if(text.includes("Public Export") || text.includes("公開用") || zone.classList.contains("home-public-export-section")){
                zone.classList.add("operation-zone", "operation-zone--publish");
                description = "公開用データには、管理メモや非公開情報を含めません。";
            }else if(text.includes("Backup") || text.includes("バックアップ")){
                zone.classList.add("operation-zone", "operation-zone--backup");
                description = "バックアップは復元用です。公開サイトには使いません。";
            }

            if(description && !zone.querySelector(".operation-zone-description")){
                const note = document.createElement("p");
                note.className = "operation-zone-description";
                note.textContent = description;
                zone.querySelector("h2, h3")?.after(note);
            }
        });

        document.querySelectorAll("button").forEach(button => {
            if(button.closest(".system-main")) return;
            const id = button.id.toLowerCase();
            const label = button.textContent.trim();
            if(id.includes("import")) button.classList.add("button-import");
            if(id.includes("reset")) button.classList.add("button-reset");
            if(id.includes("delete") || label === "Delete" || label === "削除") button.classList.add("button-delete");
            if(id.includes("import")) addDangerNotice(button, "バックアップから復元", "現在の編集データを上書きする場合があります。内容を確認し、必要なら先にバックアップしてください。");
            if(id.includes("reset")) addDangerNotice(button, "初期化", "保存済み設定を既定値へ戻します。影響を確認してから実行してください。");
        });
    }

    function addDangerNotice(button, title, description){
        if(button.previousElementSibling?.classList.contains("operation-danger-inline")) return;
        const notice = document.createElement("div");
        notice.className = "operation-danger-inline";
        notice.id = `${button.id || "danger-action"}-description`;
        const strong = document.createElement("strong");
        const text = document.createElement("span");
        strong.textContent = `注意 / ${title}`;
        text.textContent = description;
        notice.append(strong, text);
        button.before(notice);
        button.setAttribute("aria-describedby", notice.id);
    }

    function enhanceFormSemantics(){
        ["creatorDisplayName", "gameTitleInput", "toolName", "noteTitle", "title"]
            .map(id => document.getElementById(id))
            .filter(Boolean)
            .forEach(field => {
                field.required = true;
                field.setAttribute("aria-required", "true");
            });
        document.querySelectorAll(".form-message").forEach(message => {
            if(!message.hasAttribute("role")) message.setAttribute("role", "status");
        });
    }

    document.documentElement.style.colorScheme = "dark";
    document.addEventListener("DOMContentLoaded", () => {
        createPrimaryNavigation();
        createOperationGuide();
        enhanceOperationZones();
        enhanceFormSemantics();
        new MutationObserver(enhanceOperationZones).observe(document.body, { childList: true, subtree: true });
    });
})();
