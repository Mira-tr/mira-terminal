const CREATOR_ROOT = "/creators/chikage/";
const TRPG_ROOT = `${CREATOR_ROOT}trpg/`;

const creatorLinks = [
    { label: "Works", href: `${CREATOR_ROOT}works/`, key: "works" },
    { label: "TRPG", href: TRPG_ROOT, key: "trpg" },
    { label: "Profile", href: `${CREATOR_ROOT}profile/`, key: "profile" },
    { label: "Contact", href: `${CREATOR_ROOT}contact/`, key: "contact" }
];

const trpgLinks = [
    { label: "Overview", href: TRPG_ROOT, key: "home" },
    { label: "卓", href: `${TRPG_ROOT}scheduler/`, key: "scheduler" },
    { label: "Calendar", href: `${TRPG_ROOT}calendar/`, key: "calendar" },
    { label: "Scenarios", href: `${TRPG_ROOT}scenarios/`, key: "scenarios" },
    { label: "Rules", href: `${TRPG_ROOT}rules/`, key: "rules" },
    { label: "Tools", href: `${TRPG_ROOT}picker/`, key: "picker" }
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

    sub.append(roomLabel, createTrpgNav(activeKey));
    inner.replaceChildren(top, sub);
}

function buildMobileDock(activeKey){
    const dock = document.querySelector(".trpg-mobile-dock");

    if(!dock){
        return;
    }

    const items = [
        { label: "Home", href: TRPG_ROOT, key: "home" },
        { label: "卓", href: `${TRPG_ROOT}scheduler/`, key: "scheduler" },
        { label: "Scenarios", href: `${TRPG_ROOT}scenarios/`, key: "scenarios" },
        { label: "Rules", href: `${TRPG_ROOT}rules/`, key: "rules" },
        { label: "Calendar", href: `${TRPG_ROOT}calendar/`, key: "calendar" }
    ];

    dock.replaceChildren(...items.map(item => createLink(item, activeKey)));
}

function buildRulesShortcut(activeKey){
    if(activeKey === "rules" || document.querySelector(".trpg-rules-orb")){
        return;
    }

    const link = document.createElement("a");
    link.className = "trpg-rules-orb";
    link.href = `${TRPG_ROOT}rules/`;
    link.setAttribute("aria-label", "House Rulesを開く");

    const title = document.createElement("strong");
    title.textContent = "RULES";

    const note = document.createElement("small");
    note.textContent = "卓中参照";

    link.append(title, note);
    document.body.appendChild(link);
}

function initChikageTrpgShell(){
    const activeKey = detectTrpgPage();
    buildHeader(activeKey);
    buildMobileDock(activeKey);
    buildRulesShortcut(activeKey);
}

if(typeof document !== "undefined"){
    initChikageTrpgShell();
}

export { detectTrpgPage, initChikageTrpgShell };
