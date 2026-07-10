const TOAST_TYPES = new Set([
    "success",
    "error",
    "warning",
    "info"
]);

const TOAST_LABELS = {
    success: "成功",
    error: "エラー",
    warning: "警告",
    info: "お知らせ"
};

const TOAST_DURATIONS = {
    success: 3000,
    error: 5000,
    warning: 4000,
    info: 3000
};

const DUPLICATE_WINDOW = 1000;
const recentToasts = new Map();
let toastContainer = null;

export function initToastService(){
    if(!canUseToastDom()){
        return null;
    }

    if(toastContainer?.isConnected){
        return toastContainer;
    }

    const existing = document.querySelector(".toast-container");

    if(existing){
        toastContainer = existing;
        return toastContainer;
    }

    toastContainer = document.createElement("section");
    toastContainer.className = "toast-container";
    toastContainer.setAttribute("aria-label", "通知");
    toastContainer.setAttribute("aria-live", "polite");
    toastContainer.setAttribute("aria-atomic", "false");
    toastContainer.replaceChildren();
    document.body.appendChild(toastContainer);

    return toastContainer;
}

export function showToast(message, type = "info", options = {}){
    const normalizedType = TOAST_TYPES.has(type) ? type : "info";
    const text = String(message ?? "").trim();

    if(!text){
        return null;
    }

    const container = initToastService();

    if(!container){
        return null;
    }

    const duplicateKey = `${normalizedType}:${text}`;
    const now = Date.now();
    const duplicate = recentToasts.get(duplicateKey);

    if(
        duplicate &&
        duplicate.element.isConnected &&
        now - duplicate.createdAt < DUPLICATE_WINDOW
    ){
        duplicate.createdAt = now;
        restartTimer(duplicate, options.duration);
        return duplicate.element;
    }

    const toast = document.createElement("article");
    toast.className = `toast toast-${normalizedType}`;
    toast.dataset.toastType = normalizedType;

    const content = document.createElement("div");
    content.className = "toast-content";

    const label = document.createElement("strong");
    label.className = "toast-label";
    label.textContent = TOAST_LABELS[normalizedType];

    const messageElement = document.createElement("p");
    messageElement.className = "toast-message";
    messageElement.textContent = text;

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "toast-close";
    closeButton.textContent = "×";
    closeButton.setAttribute(
        "aria-label",
        `${TOAST_LABELS[normalizedType]}通知を閉じる`
    );

    content.append(label, messageElement);
    toast.append(content, closeButton);
    container.appendChild(toast);

    const record = {
        element: toast,
        createdAt: now,
        duplicateKey,
        timeoutId: null,
        type: normalizedType
    };

    closeButton.addEventListener("click", () => removeToast(record));
    toast.addEventListener("keydown", event => {
        if(event.key === "Escape"){
            event.preventDefault();
            removeToast(record);
        }
    });

    recentToasts.set(duplicateKey, record);
    restartTimer(record, options.duration);

    return toast;
}

export function clearToasts(){
    recentToasts.forEach(record => {
        if(record.timeoutId){
            clearTimeout(record.timeoutId);
        }
    });
    recentToasts.clear();
    initToastService()?.replaceChildren();
}

export function runToastOperation(operation, messages = {}){
    try{
        const result = operation();

        if(result && typeof result.then === "function"){
            return result
                .then(value => completeOperation(value, messages))
                .catch(error => failOperation(error, messages));
        }

        return completeOperation(result, messages);
    }catch(error){
        return failOperation(error, messages);
    }
}

function restartTimer(record, requestedDuration){
    if(record.timeoutId){
        clearTimeout(record.timeoutId);
    }

    const duration = Number.isFinite(requestedDuration)
        ? Math.max(0, requestedDuration)
        : TOAST_DURATIONS[record.type];

    record.timeoutId = duration > 0
        ? setTimeout(() => removeToast(record), duration)
        : null;
}

function removeToast(record){
    if(record.timeoutId){
        clearTimeout(record.timeoutId);
    }

    record.element.remove();

    if(recentToasts.get(record.duplicateKey) === record){
        recentToasts.delete(record.duplicateKey);
    }
}

function completeOperation(result, messages){
    if(result !== false && messages.successMessage){
        showToast(messages.successMessage, "success");
    }

    return result;
}

function failOperation(error, messages){
    console.error(error);
    showToast(messages.errorMessage || "処理に失敗しました", "error");
    return false;
}

function canUseToastDom(){
    return Boolean(
        globalThis.document &&
        typeof document.createElement === "function" &&
        typeof document.querySelector === "function" &&
        typeof document.body?.appendChild === "function"
    );
}
