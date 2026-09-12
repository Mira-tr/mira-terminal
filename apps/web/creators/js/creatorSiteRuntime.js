const body = document.body;
const PREVIEW_MESSAGE_TYPE = "relmua-admin-preview";

if(body?.dataset?.creatorSlug){
    initCreatorSite().catch(error => console.warn("[creator-site] Failed to apply site config", error));
    initAdminPreviewReceiver();
}

async function initCreatorSite(){
    const dataUrl = body.dataset.creatorsDataUrl || "/data/public-creators.json";
    const response = await fetch(dataUrl, { cache: "no-store" });
    if(!response.ok) throw new Error(`Creator site data ${response.status}`);
    const payload = await response.json();
    const creator = (Array.isArray(payload?.creators) ? payload.creators : []).find(item => item?.slug === body.dataset.creatorSlug);
    if(!creator?.site) return;
    applyCreator(creator);
}

function initAdminPreviewReceiver(){
    window.addEventListener("message", event => {
        if(window.parent === window) return;
        if(event.source !== window.parent) return;
        if(event.origin !== window.location.origin) return;
        if(event.data?.type !== PREVIEW_MESSAGE_TYPE) return;
        const payload = event.data?.payload;
        if(payload?.kind !== "creator") return;
        const creator = payload.creator;
        if(!creator?.site || creator.slug !== body.dataset.creatorSlug) return;
        applyCreator(creator);
        markAdminDraftPreview();
    });
}

function applyCreator(creator){
    applyWorld(creator.site.theme || {});
    applyNavigation(creator.site.navigation || [], creator.displayName || "Creator");
    applyCoreCopy(creator);
    applyPageCopy(creator.site, creator);
    applyFooter(creator.site.footer, creator.displayName);
}

function applyCoreCopy(creator){
    setText("#creatorName", creator.displayName);
    setText("#creatorBio", creator.bio);
    const activities = document.getElementById("creatorActivities");
    if(activities && Array.isArray(creator.activities)){
        const nodes = creator.activities.map(activity => {
            const item = document.createElement("span");
            item.textContent = String(activity || "").trim();
            return item;
        }).filter(item => item.textContent);
        activities.replaceChildren(...nodes);
    }
}

function markAdminDraftPreview(){
    document.documentElement.dataset.adminDraftPreview = "true";
    if(document.getElementById("adminDraftPreviewBadge")) return;
    const badge = document.createElement("div");
    badge.id = "adminDraftPreviewBadge";
    badge.setAttribute("role", "status");
    badge.textContent = "ADMIN / 未保存プレビュー";
    Object.assign(badge.style, {
        position: "fixed",
        right: "12px",
        bottom: "12px",
        zIndex: "9999",
        padding: "7px 10px",
        borderRadius: "999px",
        background: "rgba(12, 12, 18, .88)",
        color: "#fff",
        fontSize: "11px",
        fontWeight: "800",
        letterSpacing: ".08em",
        pointerEvents: "none"
    });
    document.body.appendChild(badge);
}

function applyWorld(theme){
    const root = document.documentElement;
    const accent = safeColor(theme.accent, "#60438a");
    const canvas = safeColor(theme.canvas, "#0d0b14");
    const surface = safeColor(theme.surface, "#15111e");
    const text = safeColor(theme.text, "#f3eef8");
    const muted = safeColor(theme.muted, "#aaa0b5");
    const accentHi = mixHex(accent, "#ffffff", .22);
    const accentPale = mixHex(accent, "#ffffff", .52);
    root.style.setProperty("--ch-house-bg", canvas);
    root.style.setProperty("--ch-house-bg-deep", mixHex(canvas, "#000000", .28));
    root.style.setProperty("--ch-house-surface", surface);
    root.style.setProperty("--ch-house-surface-2", mixHex(surface, accent, .16));
    root.style.setProperty("--ch-house-purple", accent);
    root.style.setProperty("--ch-house-purple-hi", accentHi);
    root.style.setProperty("--ch-house-purple-pale", accentPale);
    root.style.setProperty("--ch-house-purple-soft", hexToRgba(accent,.18));
    root.style.setProperty("--ch-house-purple-glow", hexToRgba(accent,.34));
    root.style.setProperty("--ch-house-text", text);
    root.style.setProperty("--ch-house-muted", muted);
}

function applyNavigation(navigation, displayName){
    const items = Array.isArray(navigation) ? navigation.slice().sort((a,b)=>(Number(a?.order)||0)-(Number(b?.order)||0)) : [];
    const byId = new Map(items.map(item => [String(item?.id||""), item]));
    document.querySelectorAll(".creator-local-nav a, .ch-mobile-menu nav a, .ch-house-shell__creator-nav a, .ch-house-shell__mobile-menu nav a, .trpg-shell-menu nav a").forEach(anchor => {
        const id = anchor.matches("[aria-current=\"page\"]")
            ? currentCreatorNavigationId()
            : navIdFromHref(anchor.getAttribute("href") || "");
        if(!id) return;
        const config = byId.get(id);
        if(!config) return;
        anchor.textContent = String(config.label || anchor.textContent).trim();
        anchor.hidden = config.visible === false;
    });
    document.querySelectorAll(".ch-signature, .ch-house-shell__brand strong").forEach(node => {
        if(node.classList.contains("ch-signature")){
            const small = node.querySelector("small")?.cloneNode(true);
            node.replaceChildren(document.createTextNode(displayName + " "));
            if(small) node.appendChild(small);
        }else{
            node.textContent = displayName;
        }
    });
}

function applyPageCopy(site, creator){
    if(body.classList.contains("chikage-page--profile")){
        setIntro(site.profile);
        const principles = Array.isArray(site.profile?.principles) ? site.profile.principles : [];
        document.querySelectorAll(".ch-principles p").forEach((node,index)=>{if(principles[index]) node.textContent=principles[index];});
        return;
    }
    if(body.classList.contains("chikage-page--works")){
        setIntro(site.works);
        return;
    }
    if(body.classList.contains("chikage-page--contact")){
        setIntro(site.contact);
        const linksLead = document.querySelector(".ch-contact-copy > p");
        if(linksLead && site.contact?.linksLead) linksLead.textContent = site.contact.linksLead;
        return;
    }
    if(body.classList.contains("trpg-v2-home")){
        setText(".trpg-overview-hero .trpg-v3-kicker", site.trpg?.eyebrow);
        setText("#trpgHomeTitle", site.trpg?.title);
        setText(".trpg-overview-hero__lead", site.trpg?.lead);
        return;
    }

    setText(".ch-hero .ch-eyebrow", site.home?.eyebrow);
    setText(".ch-role", site.home?.role);
    const homeLead = document.querySelector(".ch-hero .ch-lead");
    if(homeLead && site.home?.lead) homeLead.textContent = site.home.lead;
    setText("#roomsTitle", site.home?.sectionTitle);
    setText(".ch-house-rooms__head .ch-copy", site.home?.sectionLead);
    if(document.getElementById("chikageTitle")) document.getElementById("chikageTitle").textContent = creator.displayName || "千景";
}

function setIntro(page){
    setText(".ch-page-intro .ch-eyebrow", page?.eyebrow);
    setText(".ch-page-intro h1", page?.title);
    setText(".ch-page-intro .ch-lead", page?.lead);
}
function applyFooter(footer, displayName){document.querySelectorAll(".ch-footer small, .trpg-shell-footer small").forEach(node=>{node.textContent=footer?.copyright||`© RELMUA / ${displayName||"Creator"}`;});}
function setText(selector,value){const node=document.querySelector(selector);if(node&&String(value||"").trim())node.textContent=String(value).trim();}
function currentCreatorNavigationId(){if(body.classList.contains("trpg-v3"))return"trpg";if(body.classList.contains("chikage-page--works"))return"works";if(body.classList.contains("chikage-page--profile"))return"profile";if(body.classList.contains("chikage-page--contact"))return"contact";return"home";}
function navIdFromHref(href){const text=String(href||"").split("#")[0].split("?")[0];if(/contact\/?$/.test(text))return"contact";if(/profile\/?$/.test(text))return"profile";if(/trpg\/?$/.test(text))return"trpg";if(/works\/?$/.test(text))return"works";if(text==="./"||text==="../"||/chikage\/?$/.test(text))return"home";return"";}
function safeColor(value,fallback){return /^#[0-9a-f]{6}$/i.test(String(value||""))?String(value).toLowerCase():fallback;}
function hexToRgb(hex){const n=parseInt(hex.slice(1),16);return[(n>>16)&255,(n>>8)&255,n&255];}
function toHex(values){return"#"+values.map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,"0")).join("");}
function mixHex(a,b,amount){const aa=hexToRgb(a),bb=hexToRgb(b);return toHex(aa.map((v,i)=>v+(bb[i]-v)*amount));}
function hexToRgba(hex,alpha){const [r,g,b]=hexToRgb(hex);return`rgba(${r}, ${g}, ${b}, ${alpha})`;}
