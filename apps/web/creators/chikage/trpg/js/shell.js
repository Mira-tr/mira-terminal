const CREATOR_ROOT = "/creators/chikage/";
const TRPG_ROOT = `${CREATOR_ROOT}trpg/`;

const creatorLinks = [
    { label: "Works", href: `${CREATOR_ROOT}works/`, key: "works" },
    { label: "TRPG", href: TRPG_ROOT, key: "trpg" },
    { label: "Profile", href: `${CREATOR_ROOT}profile/`, key: "profile" },
    { label: "Contact", href: `${CREATOR_ROOT}contact/`, key: "contact" }
];

const trpgLinks = [
    { label: "概要", href: TRPG_ROOT, key: "home" },
    { label: "日程調整", href: `${TRPG_ROOT}scheduler/`, key: "scheduler" },
    { label: "予定", href: `${TRPG_ROOT}calendar/`, key: "calendar" },
    { label: "シナリオ", href: `${TRPG_ROOT}scenarios/`, key: "scenarios" },
    { label: "ルール", href: `${TRPG_ROOT}rules/`, key: "rules" },
    { label: "便利ツール", href: `${TRPG_ROOT}picker/`, key: "picker" }
];

function detectTrpgPage(pathname = window.location.pathname){
    if(pathname.includes("/scheduler/")) return "scheduler";
    if(pathname.includes("/calendar/")) return "calendar";
    if(pathname.includes("/scenarios/")) return "scenarios";
    if(pathname.includes("/rules/")) return "rules";
    if(pathname.includes("/picker/")) return "picker";
    return "home";
}

function createLink(item, activeKey){
    const link = document.createElement("a");
    link.href = item.href;
    link.textContent = item.label;

    if(item.key === activeKey){
        link.setAttribute("aria-current", "page");
    }

    return link;
}

function createCreatorNav(){
    const nav = document.createElement("nav");
    nav.className = "ch-house-shell__creator-nav";
    nav.setAttribute("aria-label", "千景サイト内");

    creatorLinks.forEach(item => {
        nav.appendChild(createLink(item, "trpg"));
    });

    return nav;
}

function createTrpgNav(activeKey){
    const nav = document.createElement("nav");
    nav.className = "ch-house-shell__trpg-nav";
    nav.setAttribute("aria-label", "TRPG内");

    trpgLinks.forEach(item => {
        nav.appendChild(createLink(item, activeKey));
    });

    return nav;
}

function syncTrpgSubOverflow(sub){
    if(!sub){
        return;
    }

    sub.classList.toggle(
        "is-scrollable",
        sub.scrollWidth > sub.clientWidth + 1
    );
}

function watchTrpgSubOverflow(sub){
    syncTrpgSubOverflow(sub);
    window.addEventListener("resize", () => syncTrpgSubOverflow(sub), {
        passive: true
    });
}

function enhanceExistingHeader(activeKey){
    const sub = document.querySelector(".ch-house-shell__sub");
    const nav = sub?.querySelector(".ch-house-shell__trpg-nav");

    if(!sub || !nav){
        return;
    }

    const hasPickerLink = Array.from(nav.querySelectorAll("a"))
        .some(link => {
            const href = String(link.getAttribute("href") || "");
            return link.textContent.trim() === "便利ツール" || href.includes("picker/");
        });

    if(!hasPickerLink){
        nav.appendChild(createLink(trpgLinks.find(item => item.key === "picker"), activeKey));
    }

    watchTrpgSubOverflow(sub);
}

function createMobileMenu(activeKey){
    const details = document.createElement("details");
    details.className = "ch-house-shell__mobile-menu";

    const summary = document.createElement("summary");
    summary.textContent = "MENU";

    const nav = document.createElement("nav");
    nav.setAttribute("aria-label", "千景 / TRPGメニュー");

    const home = document.createElement("a");
    home.href = CREATOR_ROOT;
    home.textContent = "千景 Home";
    nav.appendChild(home);

    creatorLinks.forEach(item => {
        nav.appendChild(createLink(item, item.key === "trpg" ? "trpg" : ""));
    });

    trpgLinks.forEach(item => {
        const link = createLink(item, activeKey);
        link.textContent = `TRPG / ${item.label}`;
        nav.appendChild(link);
    });

    const relmua = document.createElement("a");
    relmua.href = "/";
    relmua.textContent = "RELMUA";
    nav.appendChild(relmua);

    details.append(summary, nav);
    return details;
}

function buildHeader(activeKey){
    const inner = document.querySelector(".trpg-shell-header__inner");

    if(!inner){
        enhanceExistingHeader(activeKey);
        return;
    }

    inner.className = "ch-house-shell";

    const top = document.createElement("div");
    top.className = "ch-house-shell__top";

    const brand = document.createElement("a");
    brand.className = "ch-house-shell__brand";
    brand.href = CREATOR_ROOT;
    brand.setAttribute("aria-label", "千景 Home");

    const brandName = document.createElement("strong");
    brandName.textContent = "千景";

    const brandMeta = document.createElement("small");
    brandMeta.textContent = "HOUSE";

    brand.append(brandName, brandMeta);

    const relmua = document.createElement("a");
    relmua.className = "ch-house-shell__relmua";
    relmua.href = "/";
    relmua.textContent = "RELMUA ↗";

    top.append(brand, createCreatorNav(), relmua, createMobileMenu(activeKey));

    const sub = document.createElement("div");
    sub.className = "ch-house-shell__sub";

    const roomLabel = document.createElement("span");
    roomLabel.className = "ch-house-shell__room-label";
    roomLabel.textContent = "TRPG / PLAY ROOM";

    const trpgNav = createTrpgNav(activeKey);
    sub.append(roomLabel, trpgNav);
    inner.replaceChildren(top, sub);

    watchTrpgSubOverflow(sub);
}

function buildMobileDock(activeKey){
    const dock = document.querySelector(".trpg-mobile-dock");

    if(!dock){
        return;
    }

    const items = [
        { label: "概要", href: TRPG_ROOT, key: "home" },
        { label: "日程調整", href: `${TRPG_ROOT}scheduler/`, key: "scheduler" },
        { label: "シナリオ", href: `${TRPG_ROOT}scenarios/`, key: "scenarios" },
        { label: "ルール", href: `${TRPG_ROOT}rules/`, key: "rules" },
        { label: "予定", href: `${TRPG_ROOT}calendar/`, key: "calendar" }
    ];

    dock.replaceChildren(...items.map(item => createLink(item, activeKey)));
}

function loadPublicV5Bridges(activeKey){
    if(activeKey === "scheduler" || activeKey === "home"){
        import("../v2/js/calendarBusyImportV5.js?v=20260913-observer-fix").catch(error => {
            console.error("[trpg] Failed to load local calendar hints", error);
        });
    }
}

function initChikageTrpgShell(){
    const activeKey = detectTrpgPage();
    buildHeader(activeKey);
    buildMobileDock(activeKey);
    loadPublicV5Bridges(activeKey);
}

if(typeof document !== "undefined"){
    initChikageTrpgShell();
}

export { detectTrpgPage, initChikageTrpgShell };
