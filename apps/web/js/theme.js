(() => {
    const STORAGE_KEY = "mira-terminal-theme";
    const root = document.documentElement;

    function getStoredTheme(){
        try{
            const value = localStorage.getItem(STORAGE_KEY);
            return value === "light" || value === "dark" ? value : "";
        }catch{
            return "";
        }
    }

    function getPreferredTheme(){
        return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    function applyTheme(theme){
        root.dataset.theme = theme;
        root.style.colorScheme = theme;
    }

    function updateButton(button, theme){
        const isDark = theme === "dark";
        const icon = button.querySelector(".theme-toggle-icon");
        const label = button.querySelector(".theme-toggle-label");
        if(icon){
            icon.textContent = isDark ? "☾" : "☀";
        }
        if(label){
            label.textContent = isDark ? "Dark" : "Light";
        }
        button.setAttribute("aria-label", `${isDark ? "Dark" : "Light"}テーマを使用中。${isDark ? "Light" : "Dark"}テーマに切り替える`);
        button.setAttribute("aria-pressed", String(isDark));
    }

    const initialTheme = getStoredTheme() || getPreferredTheme();
    applyTheme(initialTheme);

    document.addEventListener("DOMContentLoaded", () => {
        const header = document.querySelector(".site-header-inner");
        const nav = header?.querySelector(".header-nav");
        if(!header || !nav){
            return;
        }

        const main = header.firstElementChild;
        main?.classList.add("site-header-main");

        const actions = document.createElement("div");
        actions.className = "site-header-actions";
        const button = document.createElement("button");
        button.className = "theme-toggle";
        button.type = "button";
        const icon = document.createElement("span");
        icon.className = "theme-toggle-icon";
        icon.setAttribute("aria-hidden", "true");
        const label = document.createElement("span");
        label.className = "theme-toggle-label";
        button.append(icon, label);
        actions.append(button, nav);
        header.append(actions);

        updateButton(button, root.dataset.theme);
        button.addEventListener("click", () => {
            const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
            applyTheme(nextTheme);
            try{
                localStorage.setItem(STORAGE_KEY, nextTheme);
            }catch{
                // Storage may be unavailable in privacy-restricted contexts.
            }
            updateButton(button, nextTheme);
        });
    });
})();
