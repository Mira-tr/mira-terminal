// =====================
// DOM
// =====================

export function getElement(id){
    const element = document.getElementById(id);

    if(!element){
        throw new Error(`Element not found: #${id}`);
    }

    return element;
}

export function value(id){
    return getElement(id).value.trim();
}

export function setValue(id, val){
    getElement(id).value = val ?? "";
}

export function createOption(value, label = value){
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = String(label);
    return option;
}

// =====================
// Text
// =====================

export function toSafeText(value){
    return String(value ?? "");
}

export function escapeHtml(text){
    return toSafeText(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function isSafeHttpUrl(url){
    if(!url){
        return false;
    }

    try{
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    }catch{
        return false;
    }
}

// =====================
// Message
// =====================

let messageTimer = null;

export function showMessage(text){
    const msg = getElement("message");

    msg.textContent = text;

    if(messageTimer){
        clearTimeout(messageTimer);
    }

    messageTimer = setTimeout(()=>{
        msg.textContent = "";
        messageTimer = null;
    }, 1500);
}