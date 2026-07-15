(() => {
    const STORAGE_KEY = "mira-terminal-admin-theme";
    const ACTIVITY_LOG_KEY = "mira_terminal_activity_log";
    const MAX_LOG_ITEMS = 500;
    const root = document.documentElement;

    function preferredTheme(){
        try{
            const stored = localStorage.getItem(STORAGE_KEY);
            if(stored === "light" || stored === "dark"){
                return stored;
            }
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
        button.setAttribute("aria-label", dark ? "Switch to Light theme" : "Switch to Dark theme");
        button.querySelector(".admin-theme-toggle-icon").textContent = dark ? "☾" : "☀";
        button.querySelector(".admin-theme-toggle-label").textContent = dark ? "Dark" : "Light";
    }

    function recordThemeActivity(theme){
        try{
            const raw = localStorage.getItem(ACTIVITY_LOG_KEY);
            const payload = raw ? JSON.parse(raw) : null;
            const entries = Array.isArray(payload?.entries) ? payload.entries : [];
            const timestamp = new Date().toISOString();
            const entry = {
                id: `activity-${timestamp.replace(/[^0-9]/g, "").slice(0, 14)}-theme`,
                timestamp,
                actor: "local-admin",
                action: "theme-change",
                workspace: "system",
                module: "theme",
                creatorId: "",
                targetId: theme,
                summary: `Admin theme changed to ${theme}.`,
                result: "success",
                severity: "info"
            };
            localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify({
                schemaVersion: 1,
                maxItems: MAX_LOG_ITEMS,
                entries: [entry, ...entries].slice(0, MAX_LOG_ITEMS)
            }));
        }catch{
            // Theme changes must not fail when activity storage is unavailable.
        }
    }

    function createThemeToggle(){
        const header = document.querySelector(".admin-header-inner");
        if(!header || header.querySelector(".admin-theme-toggle")){
            return;
        }

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
            try{
                localStorage.setItem(STORAGE_KEY, next);
            }catch{
                // no-op
            }
            recordThemeActivity(next);
            applyTheme(next);
        });
        header.appendChild(button);
        updateButton(button, root.dataset.theme);
    }

    function createOperationGuide(){
        const main = document.querySelector(".admin-main");
        if(!main || main.classList.contains("terminal-main") || main.classList.contains("system-main") || document.querySelector(".dashboard-overview")){
            return;
        }

        const guide = document.createElement("aside");
        guide.className = "admin-operation-guide";
        guide.setAttribute("aria-label", "Operation guide");
        [
            ["Save", "Update the local editing data in this browser."],
            ["Public Export", "Download the Public JSON for the site."],
            ["Backup Export", "Download a restore file that includes private editing data."],
            ["Backup Import", "Replace local editing data with a selected backup file."]
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
                description = "Backup Import replaces current local data with file contents. Export a backup first.";
            }else if(resetButton){
                zone.classList.add("operation-zone", "operation-zone--danger");
                description = "Reset returns saved settings to their defaults. Confirm the impact before running it.";
            }else if(text.includes("Public Export") || zone.classList.contains("home-public-export-section")){
                zone.classList.add("operation-zone", "operation-zone--publish");
                description = "Public Export creates JSON for the public site. Admin notes and private fields must not be included.";
            }else if(text.includes("Backup")){
                zone.classList.add("operation-zone", "operation-zone--backup");
                description = "Backup files are for restore. They are not Public JSON.";
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
            if(button.closest(".system-main")){
                return;
            }
            const id = button.id.toLowerCase();
            const label = button.textContent.trim();
            if(id.includes("import")) button.classList.add("button-import");
            if(id.includes("reset")) button.classList.add("button-reset");
            if(id.includes("delete") || label === "Delete") button.classList.add("button-delete");

            if(id.includes("import")) addDangerNotice(
                button,
                "Backup Import",
                "This action can overwrite current local editing data. Preview the file and export a backup first."
            );
            if(id.includes("reset")) addDangerNotice(
                button,
                "Reset",
                "This action restores defaults for saved settings. Review the impact before continuing."
            );
        });
    }

    function addDangerNotice(button, title, description){
        if(button.previousElementSibling?.classList.contains("operation-danger-inline")){
            return;
        }
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
            if(!message.hasAttribute("role")){
                message.setAttribute("role", "status");
            }
        });
    }

    applyTheme(preferredTheme());
    document.addEventListener("DOMContentLoaded", () => {
        createThemeToggle();
        createOperationGuide();
        enhanceOperationZones();
        enhanceFormSemantics();
        new MutationObserver(enhanceOperationZones).observe(document.body, {
            childList: true,
            subtree: true
        });
    });
})();
