(() => {
    const root = document.documentElement;

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
        const runtimeUrl = new URL("../creators/js/creatorSiteRuntime.js", document.currentScript?.src || location.href).href;
        import(runtimeUrl).catch(error => console.warn("[creator-site] Runtime load failed", error));
    }, { once: true });
})();
