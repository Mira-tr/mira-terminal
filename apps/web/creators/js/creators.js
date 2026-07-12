const DEFAULT_DATA_URL = "../data/public-creators.json";
const FALLBACK_CREATOR_NAME = "千景";
const FALLBACK_MESSAGE = "プロフィール情報を読み込めませんでした";

initCreatorsPage();

async function initCreatorsPage(){
    const dataUrl = document.body.dataset.creatorsDataUrl || DEFAULT_DATA_URL;
    const slug = document.body.dataset.creatorSlug || "";

    try{
        const payload = await fetchCreators(dataUrl);

        if(slug){
            renderCreatorDetail(payload, slug);
        }else{
            renderCreatorsList(payload);
        }
    }catch(error){
        console.warn("[creators] Failed to load creators", error);
        renderFallback();
    }
}

async function fetchCreators(url){
    const response = await fetch(url, {
        cache: "no-store"
    });

    if(!response.ok){
        throw new Error(`Failed to fetch creators: ${response.status}`);
    }

    return response.json();
}

function renderCreatorsList(payload){
    const container = document.getElementById("creatorsList");

    if(!container){
        return;
    }

    const creators = normalizeCreators(payload);
    container.replaceChildren();

    if(!creators.length){
        appendEmpty(container, "公開中のCreatorはまだありません");
        return;
    }

    creators.forEach(creator => {
        container.appendChild(createCreatorCard(creator));
    });
}

function renderCreatorDetail(payload, slug){
    const creator = normalizeCreators(payload)
        .find(item => item.slug === slug);

    if(!creator){
        renderFallback();
        return;
    }

    setText("creatorName", creator.displayName);
    setText("creatorBio", creator.bio || "プロフィール情報を準備中です");
    setDetailSectionsHidden(false);
    renderActivities(creator.activities);
    renderLinks(creator.links);
}

function createCreatorCard(creator){
    const article = document.createElement("article");
    article.className = "activity-card";

    const label = document.createElement("span");
    label.className = "activity-number";
    label.textContent = String(creator.order || "");

    const title = document.createElement("h3");
    title.textContent = creator.displayName;

    const bio = document.createElement("p");
    bio.textContent = creator.bio || "プロフィール情報を準備中です";

    const link = document.createElement("a");
    link.href = `./${creator.slug}/`;
    link.textContent = "Creator詳細を見る ";

    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "→";
    link.appendChild(arrow);

    article.append(label, title, bio, link);
    return article;
}

function renderActivities(activities){
    const container = document.getElementById("creatorActivities");

    if(!container){
        return;
    }

    container.replaceChildren();

    if(!activities.length){
        appendEmpty(container, "活動タグは準備中です");
        return;
    }

    activities.forEach(activity => {
        const item = document.createElement("span");
        item.textContent = activity;
        container.appendChild(item);
    });
}

function renderLinks(links){
    const container = document.getElementById("creatorLinks");

    if(!container){
        return;
    }

    container.replaceChildren();

    const safeLinks = links.filter(link => isSafeHttpUrl(link.url));

    if(!safeLinks.length){
        appendEmpty(container, "外部リンクは現在準備中です");
        return;
    }

    safeLinks.forEach(link => {
        const item = document.createElement("li");
        const anchor = document.createElement("a");

        anchor.href = link.url;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        anchor.textContent = link.label;
        item.appendChild(anchor);
        container.appendChild(item);
    });
}

function renderFallback(){
    setText("creatorName", FALLBACK_CREATOR_NAME);
    setText("creatorBio", FALLBACK_MESSAGE);

    const activities = document.getElementById("creatorActivities");
    const links = document.getElementById("creatorLinks");

    if(activities){
        activities.replaceChildren();
    }

    if(links){
        links.replaceChildren();
    }

    setDetailSectionsHidden(true);

    const list = document.getElementById("creatorsList");

    if(list){
        list.replaceChildren();
        appendEmpty(list, FALLBACK_MESSAGE);
    }
}

function setDetailSectionsHidden(hidden){
    [
        "creatorActivitiesTitle",
        "linksTitle"
    ].forEach(id => {
        const title = document.getElementById(id);
        const section = title?.closest("section");

        if(section){
            section.hidden = hidden;
        }
    });
}

function normalizeCreators(payload){
    const creators = payload && Array.isArray(payload.creators)
        ? payload.creators
        : [];

    return creators
        .filter(creator => creator && typeof creator === "object")
        .map(creator => ({
            id: String(creator.id || "").trim(),
            slug: String(creator.slug || "").trim(),
            displayName: String(creator.displayName || "").trim(),
            bio: String(creator.bio || "").trim(),
            activities: Array.isArray(creator.activities)
                ? creator.activities.map(item => String(item || "").trim()).filter(Boolean)
                : [],
            links: Array.isArray(creator.links)
                ? creator.links.map(normalizeLink).filter(link => link.label && link.url)
                : [],
            order: Number(creator.order) || 0
        }))
        .filter(creator => creator.id && creator.slug && creator.displayName)
        .sort((a, b) => a.order - b.order);
}

function normalizeLink(link){
    return {
        id: String(link?.id || "").trim(),
        label: String(link?.label || "").trim(),
        url: String(link?.url || "").trim(),
        order: Number(link?.order) || 0
    };
}

function appendEmpty(container, text){
    const message = document.createElement("p");
    message.className = "profile-empty-message";
    message.textContent = text;
    container.appendChild(message);
}

function setText(id, value){
    const element = document.getElementById(id);

    if(element){
        element.textContent = value;
    }
}

function isSafeHttpUrl(url){
    try{
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    }catch{
        return false;
    }
}
