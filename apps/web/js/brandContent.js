const PUBLIC_BRAND_URL = new URL("../data/public-brand.json", import.meta.url);
const NAVIGATION_KEYS = Object.freeze([
    "home",
    "projects",
    "tools",
    "notes",
    "creators",
    "about",
    "contact"
]);

export async function hydrateBrandPublicContent({
    documentRef = typeof document === "undefined" ? null : document,
    fetchImpl = typeof fetch === "undefined" ? null : fetch
} = {}){
    if(!documentRef?.body?.classList?.contains("brand-page") || typeof fetchImpl !== "function"){
        return null;
    }

    try{
        const response = await fetchImpl(PUBLIC_BRAND_URL, { cache: "no-store" });
        if(!response?.ok){
            throw new Error(`public-brand fetch failed: ${response?.status || "unknown"}`);
        }
        const payload = await response.json();
        validatePublicBrandPayload(payload);
        applyBrandPublicContent(payload, documentRef);
        return payload;
    }catch(error){
        console.warn("[brand] Static Brand fallback is active.", error);
        return null;
    }
}

export function applyBrandPublicContent(payload, documentRef = document){
    validatePublicBrandPayload(payload);
    applyNavigation(payload.navigation, documentRef);

    documentRef.querySelectorAll("[data-brand-field]").forEach(element => {
        const value = readPath(payload, element.dataset.brandField);
        if(typeof value !== "string"){
            return;
        }
        replaceText(element, value, documentRef);
    });
}

export function validatePublicBrandPayload(payload){
    if(!payload || typeof payload !== "object" || Array.isArray(payload)){
        throw new Error("public-brand must be an object.");
    }
    if(payload.schemaVersion !== 1 || payload.exportType !== "public-brand" || payload.module !== "brand-site"){
        throw new Error("public-brand identity is invalid.");
    }
    if(!payload.navigation || !payload.about || !payload.contact){
        throw new Error("public-brand is missing a required section.");
    }

    NAVIGATION_KEYS.forEach(key => {
        assertText(payload.navigation[key], `navigation.${key}`, 40);
    });
    validateTextTree(payload.about, "about");
    validateTextTree(payload.contact, "contact");
    return true;
}

function applyNavigation(navigation, documentRef){
    documentRef.querySelectorAll(".header-nav a, .brand-footer__nav a").forEach(anchor => {
        const key = navigationKeyFromAnchor(anchor, documentRef);
        if(key && typeof navigation[key] === "string"){
            anchor.textContent = navigation[key];
        }
    });
}

function navigationKeyFromAnchor(anchor, documentRef){
    const rawHref = String(anchor?.href || anchor?.getAttribute?.("href") || "");
    if(!rawHref) return null;

    let pathname = rawHref;
    try{
        pathname = new URL(rawHref, documentRef?.baseURI || "https://relmua.com/").pathname;
    }catch{
        pathname = rawHref.split("#")[0].split("?")[0];
    }

    const value = pathname.toLowerCase().replaceAll("\\", "/");
    if(/\/projects\/?$/.test(value)) return "projects";
    if(/\/tools\/?$/.test(value)) return "tools";
    if(/\/notes\/?$/.test(value)) return "notes";
    if(/\/creators\/?$/.test(value)) return "creators";
    if(/\/about\/?$/.test(value)) return "about";
    if(/\/contact\/?$/.test(value)) return "contact";
    if(value === "/" || /\/apps\/web\/?$/.test(value)) return "home";
    return null;
}

function replaceText(element, value, documentRef){
    const lines = String(value).replace(/\r\n?/g, "\n").split("\n");
    const nodes = [];
    lines.forEach((line, index) => {
        if(index > 0){
            nodes.push(documentRef.createElement("br"));
        }
        nodes.push(documentRef.createTextNode(line));
    });
    element.replaceChildren(...nodes);
}

function readPath(target, path){
    return String(path || "").split(".").reduce((value, segment) => {
        if(value === null || value === undefined) return undefined;
        const key = /^\d+$/.test(segment) ? Number(segment) : segment;
        return value[key];
    }, target);
}

function validateTextTree(value, path){
    if(Array.isArray(value)){
        value.forEach((item, index) => validateTextTree(item, `${path}[${index}]`));
        return;
    }
    if(!value || typeof value !== "object"){
        throw new Error(`${path} must be an object.`);
    }
    Object.entries(value).forEach(([key, item]) => {
        const nextPath = `${path}.${key}`;
        if(typeof item === "string"){
            assertText(item, nextPath, 1200);
            return;
        }
        validateTextTree(item, nextPath);
    });
}

function assertText(value, path, maxLength){
    if(typeof value !== "string" || !value.trim() || value.length > maxLength){
        throw new Error(`${path} must be a non-empty string within ${maxLength} characters.`);
    }
}
