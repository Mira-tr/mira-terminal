const state = {
    sources: [],
    results: []
};

const elements = {};

init();

function init(){
    if(typeof document === "undefined"){
        return;
    }

    [
        "imageInput",
        "dropZone",
        "fileCount",
        "sourceList",
        "formatSelect",
        "maxWidthInput",
        "maxHeightInput",
        "qualityInput",
        "qualityValue",
        "allowUpscaleInput",
        "processButton",
        "clearButton",
        "downloadAllButton",
        "resultList",
        "toolStatus"
    ].forEach(id => {
        elements[id] = document.getElementById(id);
    });

    if(!elements.imageInput || !elements.processButton){
        return;
    }

    elements.imageInput.addEventListener("change", event => {
        addFiles(event.target.files);
        event.target.value = "";
    });
    elements.qualityInput.addEventListener("input", updateQualityLabel);
    elements.processButton.addEventListener("click", processImages);
    elements.clearButton.addEventListener("click", clearAll);
    elements.downloadAllButton.addEventListener("click", downloadAll);
    initDropZone();
    updateQualityLabel();
    renderSources();
    renderResults();
}

function initDropZone(){
    const dropZone = elements.dropZone;

    if(!dropZone){
        return;
    }

    ["dragenter", "dragover"].forEach(type => {
        dropZone.addEventListener(type, event => {
            event.preventDefault();
            dropZone.classList.add("is-dragging");
        });
    });

    ["dragleave", "drop"].forEach(type => {
        dropZone.addEventListener(type, event => {
            event.preventDefault();
            dropZone.classList.remove("is-dragging");
        });
    });

    dropZone.addEventListener("drop", event => {
        addFiles(event.dataTransfer?.files);
    });
}

function addFiles(fileList){
    const files = Array.from(fileList || [])
        .filter(file => file.type.startsWith("image/"));

    if(!files.length){
        setStatus("画像ファイルを選んでください。", "error");
        return;
    }

    const nextSources = files.map(file => ({
        id: createId(),
        file,
        previewUrl: URL.createObjectURL(file)
    }));

    state.sources.push(...nextSources);
    setStatus(`${nextSources.length}件の画像を追加しました。`);
    renderSources();
}

function renderSources(){
    elements.fileCount.textContent = `${state.sources.length} files`;

    if(!state.sources.length){
        elements.sourceList.replaceChildren(createMessage("まだ画像が選ばれていません。"));
        return;
    }

    elements.sourceList.replaceChildren(...state.sources.map(source => {
        const item = document.createElement("article");
        item.className = "source-item";

        const image = document.createElement("img");
        image.src = source.previewUrl;
        image.alt = "";

        const body = document.createElement("div");
        const title = document.createElement("h3");
        title.textContent = source.file.name;
        const meta = document.createElement("p");
        meta.textContent = `${formatBytes(source.file.size)} / ${source.file.type || "image"}`;
        body.append(title, meta);

        item.append(image, body);
        return item;
    }));
}

async function processImages(){
    if(!state.sources.length){
        setStatus("先に画像を選んでください。", "error");
        return;
    }

    clearResults();
    setBusy(true);
    setStatus("画像を処理しています。");

    try{
        const settings = getSettings();
        const results = [];

        for(const source of state.sources){
            results.push(await processSource(source, settings));
        }

        state.results = results;
        renderResults();
        setStatus(`${results.length}件の画像を書き出しました。`);
    }catch(error){
        console.warn("[image-toolkit] processing failed", error);
        setStatus("画像の処理に失敗しました。別の画像または設定で試してください。", "error");
    }finally{
        setBusy(false);
    }
}

async function processSource(source, settings){
    const image = await loadImage(source.previewUrl);
    const size = getOutputSize(image, settings);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;

    const context = canvas.getContext("2d", {
        alpha: settings.mimeType !== "image/jpeg"
    });

    if(settings.mimeType === "image/jpeg"){
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
    }

    context.drawImage(image, 0, 0, size.width, size.height);

    const blob = await canvasToBlob(canvas, settings);
    const extension = getExtension(settings.mimeType);
    const outputName = createOutputName(source.file.name, extension);

    return {
        id: source.id,
        sourceName: source.file.name,
        outputName,
        width: size.width,
        height: size.height,
        sourceSize: source.file.size,
        outputSize: blob.size,
        blob,
        url: URL.createObjectURL(blob)
    };
}

function getSettings(){
    return {
        mimeType: elements.formatSelect.value,
        maxWidth: normalizeDimension(elements.maxWidthInput.value),
        maxHeight: normalizeDimension(elements.maxHeightInput.value),
        quality: Number(elements.qualityInput.value) / 100,
        allowUpscale: elements.allowUpscaleInput.checked
    };
}

function getOutputSize(image, settings){
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const widthRatio = settings.maxWidth ? settings.maxWidth / sourceWidth : 1;
    const heightRatio = settings.maxHeight ? settings.maxHeight / sourceHeight : 1;
    const scale = Math.min(widthRatio, heightRatio);
    const effectiveScale = settings.allowUpscale ? scale : Math.min(scale, 1);

    return {
        width: Math.max(1, Math.round(sourceWidth * effectiveScale)),
        height: Math.max(1, Math.round(sourceHeight * effectiveScale))
    };
}

function renderResults(){
    elements.downloadAllButton.disabled = state.results.length === 0;

    if(!state.results.length){
        elements.resultList.replaceChildren(createMessage("処理後の画像がここに並びます。"));
        return;
    }

    elements.resultList.replaceChildren(...state.results.map(result => {
        const item = document.createElement("article");
        item.className = "result-item";

        const image = document.createElement("img");
        image.src = result.url;
        image.alt = "";

        const body = document.createElement("div");
        const title = document.createElement("h3");
        title.textContent = result.outputName;
        const meta = document.createElement("p");
        meta.textContent = `${result.width} x ${result.height} / ${formatBytes(result.sourceSize)} -> ${formatBytes(result.outputSize)}`;
        const actions = document.createElement("div");
        actions.className = "result-item__actions";
        actions.appendChild(createDownloadLink(result));
        body.append(title, meta, actions);

        item.append(image, body);
        return item;
    }));
}

function createDownloadLink(result){
    const link = document.createElement("a");
    link.className = "result-download";
    link.href = result.url;
    link.download = result.outputName;
    link.textContent = "保存";
    return link;
}

function downloadAll(){
    state.results.forEach((result, index) => {
        window.setTimeout(() => {
            createDownloadLink(result).click();
        }, index * 120);
    });
}

function clearAll(){
    state.sources.forEach(source => URL.revokeObjectURL(source.previewUrl));
    clearResults();
    state.sources = [];
    renderSources();
    renderResults();
    setStatus("クリアしました。");
}

function clearResults(){
    state.results.forEach(result => URL.revokeObjectURL(result.url));
    state.results = [];
}

function updateQualityLabel(){
    elements.qualityValue.textContent = `${elements.qualityInput.value}%`;
}

function setBusy(isBusy){
    elements.processButton.disabled = isBusy;
    elements.clearButton.disabled = isBusy;
    elements.processButton.setAttribute("aria-busy", String(isBusy));
}

function setStatus(message, tone = "info"){
    elements.toolStatus.textContent = message;
    elements.toolStatus.dataset.tone = tone;
}

function createMessage(message){
    const paragraph = document.createElement("p");
    paragraph.className = "empty-result";
    paragraph.textContent = message;
    return paragraph;
}

function loadImage(url){
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Image could not be loaded."));
        image.src = url;
    });
}

function canvasToBlob(canvas, settings){
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if(blob){
                resolve(blob);
                return;
            }

            reject(new Error("Canvas export failed."));
        }, settings.mimeType, settings.quality);
    });
}

function normalizeDimension(value){
    const dimension = Number(value);
    return Number.isInteger(dimension) && dimension > 0
        ? Math.min(dimension, 10000)
        : 0;
}

function createOutputName(filename, extension){
    const baseName = String(filename || "image")
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-z0-9_-]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "image";

    return `${baseName}-relmua.${extension}`;
}

function getExtension(mimeType){
    return {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp"
    }[mimeType] || "webp";
}

function formatBytes(bytes){
    const value = Number(bytes) || 0;

    if(value < 1024){
        return `${value} B`;
    }

    if(value < 1024 * 1024){
        return `${Math.round(value / 1024)} KiB`;
    }

    return `${(value / 1024 / 1024).toFixed(1)} MiB`;
}

function createId(){
    return globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
