(() => {
    const root = document.documentElement;

    // RELMUA v2 uses one authored visual theme. The previous user-facing
    // Light/Dark brightness switch is intentionally retired.
    root.dataset.theme = "light";
    root.style.colorScheme = "light";

    try{
        localStorage.removeItem("mira-terminal-theme");
    }catch{
        // Storage may be unavailable in privacy-restricted contexts.
    }
})();
