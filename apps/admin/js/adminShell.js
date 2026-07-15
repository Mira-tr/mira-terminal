(() => {
    const STORAGE_KEY = "mira-terminal-admin-theme";
    const root = document.documentElement;

    function preferredTheme(){
        try{
            const stored = localStorage.getItem(STORAGE_KEY);
            if(stored === "light" || stored === "dark") return stored;
        }catch{
            // Storage may be unavailable in privacy-restricted contexts.
        }

        return globalThis.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
    }

    function applyTheme(theme){
        root.dataset.theme = theme;
        root.style.colorScheme = theme;
        document.querySelectorAll(".admin-theme-toggle").forEach(button => updateButton(button, theme));
    }

    function updateButton(button, theme){
        const dark = theme === "dark";
        button.dataset.themeState = theme;
        button.setAttribute("aria-label", dark ? "Lightテーマへ切り替える" : "Darkテーマへ切り替える");
        button.querySelector(".admin-theme-toggle-icon").textContent = dark ? "☾" : "☀";
        button.querySelector(".admin-theme-toggle-label").textContent = dark ? "Dark" : "Light";
    }

    function createThemeToggle(){
        const header = document.querySelector(".admin-header-inner");
        if(!header || header.querySelector(".admin-theme-toggle")) return;

        const button = document.createElement("button");
        button.type = "button";
        button.className = "button-icon admin-theme-toggle";

        const icon = document.createElement("span");
        icon.className = "admin-theme-toggle-icon";
        icon.setAttribute("aria-hidden", "true");

        const label = document.createElement("span");
        label.className = "admin-theme-toggle-label";
        button.append(icon, label);
        button.addEventListener("click", () => {
            const next = root.dataset.theme === "dark" ? "light" : "dark";
            try{ localStorage.setItem(STORAGE_KEY, next); }catch{ /* no-op */ }
            applyTheme(next);
        });
        header.appendChild(button);
        updateButton(button, root.dataset.theme);
    }

    function createOperationGuide(){
        const main = document.querySelector(".admin-main");
        if(!main || main.classList.contains("terminal-main") || document.querySelector(".dashboard-overview")) return;

        const guide = document.createElement("aside");
        guide.className = "admin-operation-guide";
        guide.setAttribute("aria-label", "操作の違い");
        [
            ["保存", "この端末の編集中データを更新"],
            ["Public Export", "公開用JSONをダウンロード"],
            ["Backup Export", "非公開を含む復元用データを保存"],
            ["Backup Import", "現在のデータをファイル内容で置換"]
        ].forEach(([title, description]) => {
            const item = document.createElement("div");
            const strong = document.createElement("strong");
            const text = document.createElement("span");
            strong.textContent = title;
            text.textContent = description;
            item.append(strong, text);
            guide.appendChild(item);
        });

        const breadcrumb = main.querySelector(".admin-breadcrumb");
        breadcrumb?.after(guide);
    }

    function enhanceOperationZones(){
        document.querySelectorAll(".panel-sub, .home-public-export-section").forEach(zone => {
            const text = zone.textContent || "";
            const importButton = zone.querySelector('[id*="Import"], [id="importBtn"]');
            const resetButton = zone.querySelector('[id*="reset" i]');
            let description = "";

            if(importButton){
                zone.classList.add("operation-zone", "operation-zone--backup");
                description = "Backup Exportは復元用ファイルを保存します。下部のImportは現在のデータを置き換える別操作です。";
            }else if(resetButton){
                zone.classList.add("operation-zone", "operation-zone--danger");
                description = "Resetは保存済みの設定を初期状態へ戻します。内容を確認してから実行してください。";
            }else if(text.includes("Public Export") || zone.classList.contains("home-public-export-section")){
                zone.classList.add("operation-zone", "operation-zone--publish");
                description = "公開ページ用のJSONを作成します。管理用メモや非公開データは含みません。";
            }else if(text.includes("Backup")){
                zone.classList.add("operation-zone", "operation-zone--backup");
                description = "復元用ファイルです。公開用JSONとは用途が異なります。";
            }

            if(description && !zone.querySelector(".operation-zone-description")){
                const note = document.createElement("p");
                note.className = "operation-zone-description";
                note.textContent = description;
                const heading = zone.querySelector("h2, h3");
                heading?.after(note);
            }
        });

        document.querySelectorAll("button").forEach(button => {
            const id = button.id.toLowerCase();
            const label = button.textContent.trim();
            if(id.includes("import")) button.classList.add("button-import");
            if(id.includes("reset")) button.classList.add("button-reset");
            if(id.includes("delete") || label === "削除") button.classList.add("button-delete");

            if(id.includes("import")) addDangerNotice(
                button,
                "Backup Import",
                "現在の保存内容をファイルの内容で置き換えます。先にBackup Exportを実行してください。"
            );
            if(id.includes("reset")) addDangerNotice(
                button,
                "Reset",
                "保存済み設定を初期状態へ戻します。元に戻すには再設定が必要です。"
            );
        });
    }

    function addDangerNotice(button, title, description){
        if(button.previousElementSibling?.classList.contains("operation-danger-inline")) return;
        const notice = document.createElement("div");
        notice.className = "operation-danger-inline";
        notice.id = `${button.id || "danger-action"}-description`;
        const strong = document.createElement("strong");
        const text = document.createElement("span");
        strong.textContent = `Danger Zone / ${title}`;
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

    applyTheme(preferredTheme());
    document.addEventListener("DOMContentLoaded", () => {
        createThemeToggle();
        createOperationGuide();
        enhanceOperationZones();
        enhanceFormSemantics();
        new MutationObserver(enhanceOperationZones).observe(document.body, { childList: true, subtree: true });
    });
})();
