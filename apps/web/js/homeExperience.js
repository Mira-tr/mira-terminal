const DEFAULT_DOCUMENT = typeof document === "undefined" ? null : document;
const DEFAULT_WINDOW = typeof window === "undefined" ? null : window;

const SECTION_LABELS = [
    ["home-hero", "ORIGIN"],
    ["home-featured-projects", "PROJECT"],
    ["home-recent-updates", "INDEX"],
    ["home-tools", "TOOLS"],
    ["home-trpg", "CREATOR / TRPG"],
    ["home-notes", "NOTES"],
    ["home-featured-creator", "CREATOR / EXTERNAL"]
];

export function prepareHomeExperience({
    documentRef = DEFAULT_DOCUMENT
} = {}){
    if(!documentRef?.head || !documentRef.createElement){
        return;
    }

    if(documentRef.querySelector?.('link[data-relmua-home-experience]')){
        return;
    }

    const stylesheet = documentRef.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = new URL("../css/home-experience.css", import.meta.url).href;
    stylesheet.dataset.relmuaHomeExperience = "true";
    documentRef.head.append(stylesheet);
}

export function initHomeExperience({
    documentRef = DEFAULT_DOCUMENT,
    windowRef = DEFAULT_WINDOW
} = {}){
    if(!documentRef?.querySelector){
        return;
    }

    const home = documentRef.querySelector(".home-page");
    if(!home){
        return;
    }

    home.classList.add("relmua-archive-experience");

    const sections = Array.from(home.children || [])
        .filter(section => section?.tagName?.toLowerCase?.() === "section" && !section.hidden);

    sections.forEach((section, index) => {
        section.classList.add("home-archive-section");
        section.dataset.archiveMark = `${String(index + 1).padStart(2, "0")} / ${getSectionLabel(section)}`;
    });

    home.dataset.archiveTotal = String(sections.length).padStart(2, "0");

    const reducedMotion = Boolean(windowRef?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
    if(reducedMotion){
        sections.forEach(section => section.classList.add("is-visible"));
        return;
    }

    initReveal(sections, windowRef);
    initArchiveProgress(home, windowRef);
    initHeroDepth(home, windowRef);
}

function getSectionLabel(section){
    const match = SECTION_LABELS.find(([className]) => section.classList?.contains?.(className));
    return match?.[1] || "ARCHIVE";
}

function initReveal(sections, windowRef){
    const viewportHeight = Number(windowRef?.innerHeight) || 900;

    sections.forEach(section => {
        section.classList.add("is-reveal-ready");

        const top = Number(section.getBoundingClientRect?.().top);
        if(Number.isFinite(top) && top <= viewportHeight * .92){
            section.classList.add("is-visible");
        }
    });

    if(typeof windowRef?.IntersectionObserver !== "function"){
        sections.forEach(section => section.classList.add("is-visible"));
        return;
    }

    const observer = new windowRef.IntersectionObserver(entries => {
        entries.forEach(entry => {
            if(!entry.isIntersecting){
                return;
            }

            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
        });
    }, {
        rootMargin: "0px 0px -10% 0px",
        threshold: .08
    });

    sections
        .filter(section => !section.classList.contains("is-visible"))
        .forEach(section => observer.observe(section));
}

function initArchiveProgress(home, windowRef){
    if(!windowRef?.addEventListener || !windowRef?.requestAnimationFrame){
        return;
    }

    let queued = false;

    const update = () => {
        queued = false;

        const rect = home.getBoundingClientRect?.();
        if(!rect){
            return;
        }

        const viewportHeight = Number(windowRef.innerHeight) || 1;
        const totalTravel = Math.max(1, rect.height - viewportHeight * .35);
        const travelled = Math.min(totalTravel, Math.max(0, -rect.top + viewportHeight * .24));
        const progress = travelled / totalTravel * 100;

        home.style?.setProperty?.("--archive-progress", `${progress.toFixed(2)}%`);
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

function initHeroDepth(home, windowRef){
    const visual = home.querySelector?.(".home-hero__visual");
    if(!visual?.addEventListener){
        return;
    }

    if(!windowRef?.matchMedia?.("(pointer: fine)")?.matches){
        return;
    }

    const reset = () => {
        visual.style?.setProperty?.("--hero-depth-x", "0px");
        visual.style?.setProperty?.("--hero-depth-y", "0px");
    };

    visual.addEventListener("pointermove", event => {
        const rect = visual.getBoundingClientRect?.();
        if(!rect?.width || !rect?.height){
            return;
        }

        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;

        visual.style?.setProperty?.("--hero-depth-x", `${(x * 8).toFixed(2)}px`);
        visual.style?.setProperty?.("--hero-depth-y", `${(y * 8).toFixed(2)}px`);
    });

    visual.addEventListener("pointerleave", reset);
    visual.addEventListener("blur", reset, true);
}
