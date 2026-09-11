const root = document.querySelector("#rulesApp");

function normalizeStatus(status){
    if(!status){
        return;
    }

    const value = status.textContent || "";
    status.textContent = value
        .replace(/\s+rules\b/gi, "項目")
        .replace(/全System/g, "全システム")
        .replace(/\bSystem\b/g, "システム");
}

function normalizeToggle(button){
    if(button?.textContent === "すべて開く"){
        button.textContent = "すべて展開";
    }
}

function enhance(){
    const shell = root?.querySelector(".rules-v5-shell");
    if(!shell || shell.dataset.clarityReady === "true"){
        return Boolean(shell);
    }

    const systemButtons = [...shell.querySelectorAll(".rules-system-button")];
    shell.classList.toggle("is-single-system", systemButtons.length === 1);

    const scope = shell.querySelector(".rules-scope");
    if(scope){
        const label = scope.querySelector(".rules-scope__label");
        const current = scope.querySelector('[data-scope="current"]');
        const all = scope.querySelector('[data-scope="all"]');

        if(label){ label.textContent = "検索範囲"; }
        if(current){ current.textContent = "選択中"; }
        if(all){ all.textContent = "全システム"; }
    }

    shell.querySelector("#rulesQuickModeBtn")?.remove();

    const toggle = shell.querySelector("#rulesToggleAllBtn");
    normalizeToggle(toggle);
    if(toggle){
        new MutationObserver(()=>normalizeToggle(toggle)).observe(toggle, { childList: true, subtree: true });
    }

    const status = shell.querySelector("#rulesSearchStatus");
    normalizeStatus(status);
    if(status){
        new MutationObserver(()=>normalizeStatus(status)).observe(status, { childList: true, subtree: true });
    }

    if(!window.location.hash){
        shell.querySelectorAll(".rule-section[open]").forEach(section=>{
            section.open = false;
        });
    }

    shell.dataset.clarityReady = "true";
    return true;
}

if(root && !enhance()){
    const observer = new MutationObserver(()=>{
        if(enhance()){
            observer.disconnect();
        }
    });
    observer.observe(root, { childList: true, subtree: true });
}
