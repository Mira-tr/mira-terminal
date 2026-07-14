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
        const currentLabel = isDark ? "Dark" : "Light";
        const nextLabel = isDark ? "Light" : "Dark";
        if(icon){
            icon.textContent = isDark ? "☾" : "☀";
        }
        if(label){
            label.textContent = currentLabel;
        }
        const description = `${currentLabel}テーマを使用中。${nextLabel}テーマに切り替える`;
        button.title = description;
        button.setAttribute("aria-label", description);
        button.setAttribute("aria-pressed", String(isDark));
        button.dataset.themeState = theme;
    }

    const initialTheme = getStoredTheme() || getPreferredTheme();
    applyTheme(initialTheme);

    document.addEventListener("DOMContentLoaded", () => {
        const header = document.querySelector(
            ".global-header .site-header-inner, .brand-header .site-header-inner, .site-header-inner"
        );
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
