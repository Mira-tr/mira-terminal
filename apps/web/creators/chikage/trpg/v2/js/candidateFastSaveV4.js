const root = document.querySelector("[data-trpg-v2-app]");

let observer = null;
let queued = false;

if(root){
    observer = new MutationObserver(queueEnhance);
    observeRoot();
    enhanceFastSave();
}

function observeRoot(){
    observer?.observe(root, { childList: true, subtree: true });
}

function queueEnhance(){
    if(queued){
        return;
    }

    queued = true;
    queueMicrotask(()=>{
        queued = false;
        enhanceFastSave();
    });
}

function enhanceFastSave(){
    if(!root){
        return;
    }

    observer?.disconnect();
    try{
        const panel = root.querySelector(".vnext-candidate-paste");
        const composer = panel?.closest(".v2-candidate-composer");
        const actions = panel?.querySelector(".vnext-candidate-paste__actions");
        const previewButton = actions?.querySelector('[data-candidate-preview="true"], .v2-command--primary:not([data-candidate-fast-save="true"])');

        if(!panel || !composer || !actions || !previewButton){
            return;
        }

        const help = panel.querySelector(".vnext-candidate-paste__head small");
        const helpText = "1行1候補。まとめて追加は1回で保存。保存前に編集したい時だけ「候補欄で確認」を使えます。";
        if(help && help.textContent !== helpText){
            help.textContent = helpText;
        }

        if(previewButton.classList.contains("v2-command--primary")){
            previewButton.classList.remove("v2-command--primary");
        }
        if(previewButton.dataset.candidatePreview !== "true"){
            previewButton.dataset.candidatePreview = "true";
        }
        if(previewButton.textContent !== "候補欄で確認"){
            previewButton.textContent = "候補欄で確認";
        }

        if(actions.querySelector('[data-candidate-fast-save="true"]')){
            return;
        }

        const saveButton = document.createElement("button");
        saveButton.type = "button";
        saveButton.className = "v2-command v2-command--primary";
        saveButton.dataset.candidateFastSave = "true";
        saveButton.textContent = "候補日をまとめて追加";
        saveButton.addEventListener("click", ()=>submitFastCandidates({ previewButton, saveButton }));

        actions.prepend(saveButton);
    }finally{
        observeRoot();
    }
}

function submitFastCandidates({ previewButton, saveButton }){
    if(saveButton.disabled){
        return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "候補を確認中…";

    previewButton.click();

    queueMicrotask(()=>{
        const currentPanel = root?.querySelector(".vnext-candidate-paste");
        const currentComposer = currentPanel?.closest(".v2-candidate-composer");
        const status = currentPanel?.querySelector(".vnext-candidate-paste__status");
        const nativeSubmit = currentComposer?.querySelector(':scope > button[type="submit"]');

        if(!currentPanel || !currentComposer || !status?.classList.contains("is-success")){
            const currentFastSave = currentPanel?.querySelector('[data-candidate-fast-save="true"]');
            if(currentFastSave){
                currentFastSave.disabled = false;
                currentFastSave.textContent = "候補日をまとめて追加";
            }else{
                saveButton.disabled = false;
                saveButton.textContent = "候補日をまとめて追加";
            }
            return;
        }

        saveButton.textContent = "保存中…";
        if(typeof currentComposer.requestSubmit !== "function"){
            status.className = "vnext-candidate-paste__status is-error";
            status.dataset.renderSignature = "fast-save-unsupported";
            const message = document.createElement("small");
            message.textContent = "このブラウザでは一括保存を開始できませんでした。「候補欄で確認」から保存してください。";
            status.replaceChildren(message);
            saveButton.disabled = false;
            saveButton.textContent = "候補日をまとめて追加";
            return;
        }

        currentComposer.requestSubmit(nativeSubmit ?? undefined);
    });
}
