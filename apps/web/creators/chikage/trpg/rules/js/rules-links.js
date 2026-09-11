function toSlug(value){
    return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    || "rule";
}

function createRuleId(section, index){
    const title = section.querySelector(".rule-section-title")?.textContent || "rule";
    const number = section.querySelector(".rule-section-number")?.textContent || String(index + 1);
    const system = section.dataset.systemId || "system";
    return `rule-${toSlug(system)}-${toSlug(title)}-${toSlug(number)}`;
}

function createRuleUrl(section){
    const url = new URL(window.location.href);
    const systemId = section.dataset.systemId || "";

    if(systemId){
        url.searchParams.set("system", systemId);
    }

    url.hash = section.id;
    return url;
}

async function copyText(text){
    if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(text);
        return true;
    }

    window.prompt("このURLをコピーしてください", text);
    return false;
}

function createDeepLinkActions(section){
    if(section.querySelector(".rule-link-actions")){
        return;
    }

    const content = section.querySelector(".rules-content");

    if(!content){
        return;
    }

    const actions = document.createElement("div");
    actions.className = "rule-link-actions";

    const anchor = document.createElement("a");
    anchor.className = "rule-deep-link";
    anchor.href = createRuleUrl(section).toString();
    anchor.textContent = "この項目を開く";

    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "rule-deep-link rule-deep-link--button";
    copy.textContent = "リンクをコピー";

    const status = document.createElement("span");
    status.className = "rule-link-status";
    status.setAttribute("aria-live", "polite");

    copy.addEventListener("click", async ()=>{
        try{
            await copyText(createRuleUrl(section).toString());
            status.textContent = "コピーしました";
        }catch(error){
            console.warn("House Rulesのリンクをコピーできませんでした", error);
            status.textContent = "コピーできませんでした";
        }

        window.setTimeout(()=>{
            status.textContent = "";
        }, 2200);
    });

    actions.append(anchor, copy, status);
    content.appendChild(actions);
}

function openHashTarget(options = {}){
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));

    if(!hash){
        return;
    }

    const target = document.getElementById(hash);

    if(!target){
        return;
    }

    if(target instanceof HTMLDetailsElement){
        target.open = true;
    }

    if(options.scroll !== false){
        window.requestAnimationFrame(()=>{
            target.scrollIntoView({ block: "start", behavior: "smooth" });
        });
    }
}

function enhanceRuleLinks(root){
    const sections = [...root.querySelectorAll(".rule-section")];

    if(sections.length === 0){
        return false;
    }

    const usedIds = new Set();

    sections.forEach((section, index)=>{
        let id = section.id || createRuleId(section, index);
        let suffix = 2;

        while(usedIds.has(id) || (document.getElementById(id) && document.getElementById(id) !== section)){
            id = `${section.id || createRuleId(section, index)}-${suffix}`;
            suffix += 1;
        }

        section.id = id;
        usedIds.add(id);
        createDeepLinkActions(section);
    });

    openHashTarget();
    return true;
}

function initRuleDeepLinks(){
    const root = document.querySelector("#rulesApp");

    if(!root){
        return;
    }

    if(enhanceRuleLinks(root)){
        return;
    }

    const observer = new MutationObserver(()=>{
        if(enhanceRuleLinks(root)){
            observer.disconnect();
        }
    });

    observer.observe(root, { childList: true, subtree: true });
}

if(typeof document !== "undefined"){
    initRuleDeepLinks();
    window.addEventListener("hashchange", ()=>openHashTarget());
}

export { enhanceRuleLinks, openHashTarget };
