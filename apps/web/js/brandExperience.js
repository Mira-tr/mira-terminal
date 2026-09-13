const DEFAULT_DOCUMENT = typeof document === "undefined" ? null : document;
const DEFAULT_WINDOW = typeof window === "undefined" ? null : window;

const DEPTH_SURFACES = [
    ".projects-niia-card__visual",
    ".notes-desk-prologue__image",
    ".creators-portrait-prologue__art",
    ".about-visual-story__image",
    ".contact-visual-guide__image",
    ".niia-hero__visual",
    ".niia-forms__visual"
].join(",");

export function initBrandExperience({
    documentRef = DEFAULT_DOCUMENT,
    windowRef = DEFAULT_WINDOW
} = {}){
    const body = documentRef?.body;
    const header = documentRef?.querySelector?.(".brand-header");

    if(!body || !header || !body.classList?.contains("brand-page")){
        return;
    }

    body.classList.add("is-brand-enhanced");
    setupNavigation(body, header, documentRef, windowRef);
    setupScrollProgress(body, header, documentRef, windowRef);
    setupSectionReveal(documentRef, windowRef);
    setupDepthSurfaces(documentRef, windowRef);
}

function setupNavigation(body, header, documentRef, windowRef){
    const headerInner = header.querySelector(".site-header-inner");
    const nav = header.querySelector(".header-nav");

    if(!headerInner || !nav || header.querySelector(".brand-menu-toggle")){
        return;
    }

    if(!nav.id){
        nav.id = "brandPrimaryNavigation";
    }

    const button = documentRef.createElement("button");
    button.type = "button";
    button.className = "brand-menu-toggle";
    button.setAttribute("aria-controls", nav.id);
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", "メニューを開く");
    button.textContent = "MENU";

    const scrim = documentRef.createElement("button");
    scrim.type = "button";
    scrim.className = "brand-menu-scrim";
    scrim.setAttribute("aria-label", "メニューを閉じる");
    scrim.tabIndex = -1;

    headerInner.insertBefore(button, nav);
    body.insertBefore(scrim, header);

    const mobileQuery = windowRef?.matchMedia?.("(max-width: 760px)");
    const syncNavigationAvailability = open => {
        const unavailable = Boolean(mobileQuery?.matches) && !open;

        if(unavailable){
            nav.setAttribute("inert", "");
        }else{
            nav.removeAttribute("inert");
        }
    };

    const setOpen = open => {
        body.classList.toggle("is-brand-menu-open", open);
        button.setAttribute("aria-expanded", open ? "true" : "false");
        button.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
        button.textContent = open ? "CLOSE" : "MENU";
        syncNavigationAvailability(open);
    };

    button.addEventListener("click", () => {
        setOpen(!body.classList.contains("is-brand-menu-open"));
    });
    scrim.addEventListener("click", () => setOpen(false));
    nav.addEventListener("click", event => {
        if(event.target.closest("a")){
            setOpen(false);
        }
    });
    documentRef.addEventListener("keydown", event => {
        if(event.key === "Escape" && body.classList.contains("is-brand-menu-open")){
            setOpen(false);
            button.focus();
        }
    });
    mobileQuery?.addEventListener?.("change", () => setOpen(false));
    setOpen(false);
}

function setupScrollProgress(body, header, documentRef, windowRef){
    const progress = documentRef.createElement("div");
    progress.className = "brand-scroll-progress";
    progress.setAttribute("aria-hidden", "true");
    header.appendChild(progress);

    if(!windowRef?.addEventListener || !windowRef?.requestAnimationFrame){
        return;
    }

    let queued = false;
    const update = () => {
        queued = false;
        const root = documentRef.documentElement;
        const scrollTop = Math.max(0, Number(windowRef.scrollY) || Number(root.scrollTop) || 0);
        const travel = Math.max(1, Number(root.scrollHeight) - Number(windowRef.innerHeight || root.clientHeight || 1));
        const ratio = Math.min(1, scrollTop / travel);
        body.style.setProperty("--brand-v5-progress", ratio.toFixed(4));
        body.classList.toggle("is-brand-scrolled", scrollTop > 20);
    };
    const queueUpdate = () => {
        if(queued){
            return;
        }
        queued = true;
        windowRef.requestAnimationFrame(update);
    };

    windowRef.addEventListener("scroll", queueUpdate, { passive: true });
    windowRef.addEventListener("resize", queueUpdate, { passive: true });
    queueUpdate();
}

function setupSectionReveal(documentRef, windowRef){
    const main = documentRef.querySelector(".brand-main");

    if(!main || main.classList.contains("home-page")){
        return;
    }

    const sections = Array.from(main.children)
        .filter(element => element.tagName?.toLowerCase() === "section" && !element.hidden);
    const reducedMotion = Boolean(windowRef?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);

    sections.forEach((section, index) => {
        section.dataset.brandSection = String(index + 1).padStart(2, "0");
        section.classList.add("is-brand-reveal-ready");
    });

    if(reducedMotion || typeof windowRef?.IntersectionObserver !== "function"){
        sections.forEach(section => section.classList.add("is-brand-visible"));
        return;
    }

    const viewportHeight = Number(windowRef.innerHeight) || 900;
    sections.forEach(section => {
        const top = Number(section.getBoundingClientRect?.().top);
        if(Number.isFinite(top) && top < viewportHeight * .96){
            section.classList.add("is-brand-visible");
        }
    });

    const observer = new windowRef.IntersectionObserver(entries => {
        entries.forEach(entry => {
            if(!entry.isIntersecting){
                return;
            }
            entry.target.classList.add("is-brand-visible");
            observer.unobserve(entry.target);
        });
    }, { rootMargin: "0px 0px -8% 0px", threshold: .06 });

    sections
        .filter(section => !section.classList.contains("is-brand-visible"))
        .forEach(section => observer.observe(section));
}

function setupDepthSurfaces(documentRef, windowRef){
    if(!windowRef?.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches){
        return;
    }

    documentRef.querySelectorAll(DEPTH_SURFACES).forEach(surface => {
        surface.classList.add("brand-depth-surface");
        const reset = () => {
            surface.style.setProperty("--brand-depth-x", "0px");
            surface.style.setProperty("--brand-depth-y", "0px");
        };

        surface.addEventListener("pointermove", event => {
            const rect = surface.getBoundingClientRect();
            if(!rect.width || !rect.height){
                return;
            }
            const x = (event.clientX - rect.left) / rect.width - .5;
            const y = (event.clientY - rect.top) / rect.height - .5;
            surface.style.setProperty("--brand-depth-x", `${(x * 7).toFixed(2)}px`);
            surface.style.setProperty("--brand-depth-y", `${(y * 7).toFixed(2)}px`);
        });
        surface.addEventListener("pointerleave", reset);
    });
}

if(typeof document !== "undefined"){
    if(document.readyState === "loading"){
        document.addEventListener("DOMContentLoaded", () => initBrandExperience(), { once: true });
    }else{
        initBrandExperience();
    }
}
