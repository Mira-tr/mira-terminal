(() => {
    const root = document.documentElement;
    const scriptUrl = document.currentScript?.src || new URL("./theme.js", location.href).href;

    // RELMUA public uses one authored visual theme. Creator pages can layer
    // their own world configuration from the public Creator snapshot.
    root.dataset.theme = "light";
    root.style.colorScheme = "light";

    try{
        localStorage.removeItem("mira-terminal-theme");
    }catch{
        // Storage may be unavailable in privacy-restricted contexts.
    }

    document.addEventListener("DOMContentLoaded", () => {
        if(!document.body?.dataset?.creatorSlug){
            return;
        }
        const runtimeUrl = new URL("../creators/js/creatorSiteRuntime.js", scriptUrl).href;
        import(runtimeUrl).catch(error => console.warn("[creator-site] Runtime load failed", error));
    }, { once: true });
})();
