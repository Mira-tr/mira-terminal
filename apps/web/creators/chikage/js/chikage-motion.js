const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

const revealSelectors = [
    ".ch-hero > *",
    ".ch-page-intro > *",
    ".ch-main > .ch-section",
    ".ch-room-grid > .ch-room",
    ".ch-feature-list > .ch-feature",
    ".ch-card-grid > *",
    ".profile-link-list > *",
    ".trpg-v3-main > .trpg-v3-intro",
    ".trpg-v3-main > .trpg-v3-section",
    ".trpg-overview-main > section",
    ".trpg-overview-route-grid > .trpg-overview-route",
    ".scheduler-v6-companion > *",
    ".library-results > :not(.sr-only)",
    ".scenario-list > .scenario-card",
    ".rules-document > *",
    ".picker-results > *"
];

let revealObserver;
let frame = 0;

function revealImmediately(element){
    element.classList.add("is-ch-visible");
}

function registerRevealElements(root=document){
    const matches = [];

    if(root instanceof Element && root.matches(revealSelectors.join(","))){
        matches.push(root);
    }

    if("querySelectorAll" in root){
        matches.push(...root.querySelectorAll(revealSelectors.join(",")));
    }

    matches.forEach((element,index) => {
        if(element.dataset.chReveal)return;
        element.dataset.chReveal = element.matches(".ch-hero > *, .ch-page-intro > *, .trpg-v3-intro") ? "hero" : "section";
        element.style.setProperty("--ch-reveal-order",String(Math.min(index % 6,5)));
        if(reduceMotion.matches || !revealObserver){
            revealImmediately(element);
        }else{
            revealObserver.observe(element);
        }
    });
}

function updateViewportState(){
    frame = 0;
    const root = document.documentElement;
    const scrollable = Math.max(root.scrollHeight - window.innerHeight,1);
    const progress = Math.min(Math.max(window.scrollY / scrollable,0),1);
    document.body.style.setProperty("--ch-ultimate-progress",progress.toFixed(4));
    document.body.classList.toggle("ch-page-scrolled",window.scrollY > 18);
}

function requestViewportUpdate(){
    if(frame)return;
    frame = window.requestAnimationFrame(updateViewportState);
}

function updatePointer(event){
    if(!finePointer.matches || reduceMotion.matches)return;
    const x = `${((event.clientX / window.innerWidth) * 100).toFixed(2)}%`;
    const y = `${((event.clientY / window.innerHeight) * 100).toFixed(2)}%`;
    document.body.style.setProperty("--ch-ultimate-pointer-x",x);
    document.body.style.setProperty("--ch-ultimate-pointer-y",y);
}

if(!reduceMotion.matches && "IntersectionObserver" in window){
    revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if(!entry.isIntersecting)return;
            revealImmediately(entry.target);
            revealObserver.unobserve(entry.target);
        });
    },{rootMargin:"0px 0px -7%",threshold:.06});
}

registerRevealElements();
document.body.classList.add("ch-motion-ready");
window.requestAnimationFrame(() => window.requestAnimationFrame(requestViewportUpdate));

const mutationObserver = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
        if(node instanceof Element)registerRevealElements(node);
    }));
});

mutationObserver.observe(document.body,{childList:true,subtree:true});
window.addEventListener("scroll",requestViewportUpdate,{passive:true});
window.addEventListener("resize",requestViewportUpdate,{passive:true});
window.addEventListener("pointermove",updatePointer,{passive:true});
reduceMotion.addEventListener("change",() => {
    document.querySelectorAll("[data-ch-reveal]").forEach(revealImmediately);
});
