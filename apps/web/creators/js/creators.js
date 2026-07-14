import {
    getCreatorRoleLabel
} from "../../js/creatorRoles.js";

const DEFAULT_DATA_URL = "../data/public-creators.json";
const FALLBACK_CREATOR_NAME = "千景";
const FALLBACK_MESSAGE = "プロフィール情報を読み込めませんでした";
const CREATOR_LIST_INTRO = "RELMUAに参加するCreatorです。詳しい活動は個人サイトで確認できます。";
const CREATOR_RELATED_LIMIT = 3;
const HIDDEN_LIST_ACTIVITIES = new Set([
    "trpg",
    "house rules",
    "scenario library"
]);

initCreatorsPage();

async function initCreatorsPage(){
    const dataUrl = document.body.dataset.creatorsDataUrl || DEFAULT_DATA_URL;
    const slug = document.body.dataset.creatorSlug || "";

    try{
        const payload = await fetchJson(dataUrl);

        if(slug){
            await renderCreatorDetail(payload, slug);
        }else{
            renderCreatorsList(payload);
        }
    }catch(error){
        console.warn("[creators] Failed to load creators", error);
        renderFallback();
    }
}

async function fetchJson(url){
    const response = await fetch(url, {
        cache: "no-store"
    });

    if(!response.ok){
        throw new Error(`Failed to fetch data: ${response.status}`);
    }

    return response.json();
}

function renderCreatorsList(payload){
    const container = document.getElementById("creatorsList");

    if(!container){
        return;
    }

    const creators = normalizeCreators(payload);

    if(!creators.length){
        updateCreatorsSummary(0);
        container.replaceChildren(
            createCreatorsEmptyState(
                "活動者情報を準備しています",
                "公開中の活動者情報はまだありません。ブランド全体についてはブランドページをご覧ください。"
            )
        );
        return;
    }

    updateCreatorsSummary(creators.length);
    container.replaceChildren(...creators.map(createCreatorCard));
}

async function renderCreatorDetail(payload, slug){
    const creators = normalizeCreators(payload);
    const creator = creators.find(item => item.slug === slug);

    if(!creator){
        renderFallback();
        return;
    }

    setText("creatorName", creator.displayName);
    setText("creatorBio", creator.bio || "プロフィール情報を準備中です。");
    setDetailSectionsHidden(false);
    renderActivities(creator.activities);
    renderLinks(creator.links);
    await renderRelatedContent(creator, creators, payload.primaryCreatorId || "");
}

function createCreatorCard(creator){
    const article = document.createElement("article");
    article.className = `creator-card creator-card--${creator.slug}`;

    const avatar = document.createElement("div");
    avatar.className = `creator-card__avatar creator-card__avatar--${creator.slug}`;
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = getCreatorInitial(creator.displayName);

    const body = document.createElement("div");
    body.className = "creator-card__body";

    const title = document.createElement("h3");
    title.textContent = creator.displayName;

    const activities = createCreatorActivities(creator.activities);

    const bio = document.createElement("p");
    bio.className = "creator-card__intro";
    bio.textContent = creator.bio || CREATOR_LIST_INTRO;

    const link = document.createElement("a");
    link.className = "creator-card__link";
    link.href = `./${creator.slug}/`;
    link.textContent = `${creator.displayName}サイトへ `;

    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "->";
    link.appendChild(arrow);

    body.append(title, activities, bio, link);
    article.append(avatar, body);
    return article;
}

function updateCreatorsSummary(count){
    const summary = document.getElementById("creatorsSummary");

    if(summary){
        summary.textContent = count
            ? `${count}名の活動者を掲載しています。`
            : "公開中の活動者はまだありません。";
    }
}

function createCreatorActivities(activities){
    const list = document.createElement("ul");
    list.className = "creator-card__activities";
    list.setAttribute("aria-label", "活動");

    const visibleActivities = activities.filter(isVisibleListActivity).slice(0, 4);
    const values = visibleActivities.length
        ? visibleActivities
        : ["活動者"];

    values.forEach(activity => {
        const item = document.createElement("li");
        item.textContent = activity;
        list.appendChild(item);
    });

    return list;
}

function isVisibleListActivity(activity){
    return !HIDDEN_LIST_ACTIVITIES.has(text(activity).toLowerCase());
}

function getCreatorInitial(name){
    return Array.from(text(name))[0] || "C";
}

function createCreatorsEmptyState(title, message){
    const box = document.createElement("div");
    box.className = "creator-empty-state";
    box.setAttribute("role", "status");

    const label = document.createElement("p");
    label.className = "section-label";
    label.textContent = "活動者";

    const heading = document.createElement("h3");
    heading.textContent = title;

    const description = document.createElement("p");
    description.textContent = message;

    const link = document.createElement("a");
    link.className = "brand-text-link";
    link.href = "../about/";
    link.textContent = "ブランドについて";

    box.append(label, heading, description, link);
    return box;
}

function renderActivities(activities){
    const container = document.getElementById("creatorActivities");

    if(!container){
        return;
    }

    container.replaceChildren();

    if(!activities.length){
        appendEmpty(container, "活動タグは準備中です。");
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
        appendEmpty(container, "外部リンクは現在準備中です。");
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

async function renderRelatedContent(creator, creators, primaryCreatorId){
    const tasks = [
        renderRelatedGroup(
            "creatorProjects",
            document.body.dataset.projectsDataUrl,
            data => normalizeProjects(data, creator.id, creators, primaryCreatorId),
            "関連作品はまだありません。"
        ),
        renderRelatedGroup(
            "creatorTools",
            document.body.dataset.toolsDataUrl,
            data => normalizeTools(data, creator.id, primaryCreatorId),
            "関連道具はまだありません。"
        ),
        renderRelatedGroup(
            "creatorNotes",
            document.body.dataset.notesDataUrl,
            data => normalizeNotes(data, creator.id, primaryCreatorId),
            "関連記録はまだありません。"
        ),
        renderRelatedGroup(
            "creatorTrpg",
            document.body.dataset.trpgDataUrl,
            data => normalizeTrpg(data, creator.id, primaryCreatorId),
            "関連TRPGはまだありません。"
        )
    ];

    await Promise.all(tasks);
}

async function renderRelatedGroup(containerId, url, normalize, emptyMessage){
    const container = document.getElementById(containerId);

    if(!container){
        return;
    }

    container.replaceChildren();

    if(!url){
        appendEmpty(container, emptyMessage);
        return;
    }

    try{
        const data = await fetchJson(url);
        const items = normalize(data);

        if(!items.length){
            appendEmpty(container, emptyMessage);
            return;
        }

        container.replaceChildren(...items.map(createRelatedCard));
    }catch(error){
        console.warn(`[creators] Failed to load ${containerId}`, error);
        appendEmpty(container, "データを読み込めませんでした。");
    }
}

function createRelatedCard(item){
    const article = document.createElement("article");
    article.className = "creator-related-card";

    const title = document.createElement("h4");
    title.textContent = item.title;
    article.appendChild(title);

    if(item.summary){
        const summary = document.createElement("p");
        summary.textContent = item.summary;
        article.appendChild(summary);
    }

    if(item.meta){
        const meta = document.createElement("span");
        meta.className = "creator-related-meta";
        meta.textContent = item.meta;
        article.appendChild(meta);
    }

    if(item.href){
        const link = document.createElement("a");
        link.href = item.href;
        link.textContent = "見る ";

        const arrow = document.createElement("span");
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "->";
        link.appendChild(arrow);
        article.appendChild(link);
    }

    return article;
}

function normalizeProjects(data, creatorId, creators, primaryCreatorId){
    const games = Array.isArray(data?.games)
        ? data.games
        : [];
    const creatorNameById = new Map(creators.map(creator => [
        creator.id,
        creator.displayName
    ]));

    return games
        .filter(item => item && typeof item === "object")
        .map(game => {
            const team = normalizeTeam(game.team, primaryCreatorId);

            return {
                id: text(game.id),
                title: text(game.title),
                summary: text(game.summary),
                team,
                order: Number(game.order) || 0
            };
        })
        .filter(game => game.id && game.title && game.team.some(member => member.creatorId === creatorId))
        .sort(byOrder)
        .slice(0, CREATOR_RELATED_LIMIT)
        .map(game => ({
            title: game.title,
            summary: game.summary,
            meta: game.team
                .map(member => {
                    const name = creatorNameById.get(member.creatorId) || member.creatorId;
                    return `${name}: ${getCreatorRoleLabel(member.roleId)}`;
                })
                .join(" / "),
            href: "../../projects/"
        }));
}

function normalizeTools(data, creatorId, primaryCreatorId){
    const tools = Array.isArray(data?.tools)
        ? data.tools
        : [];

    return tools
        .filter(item => item && typeof item === "object")
        .map(tool => ({
            id: text(tool.id),
            title: text(tool.name),
            summary: text(tool.summary),
            maintainerCreatorIds: normalizeCreatorIds(tool.maintainerCreatorIds, primaryCreatorId),
            order: Number(tool.order) || 0
        }))
        .filter(tool => tool.id && tool.title && tool.maintainerCreatorIds.includes(creatorId))
        .sort(byOrder)
        .slice(0, CREATOR_RELATED_LIMIT)
        .map(tool => ({
            title: tool.title,
            summary: tool.summary,
            meta: "管理",
            href: "../../tools/"
        }));
}

function normalizeNotes(data, creatorId, primaryCreatorId){
    const notes = Array.isArray(data?.notes)
        ? data.notes
        : [];

    return notes
        .filter(item => item && typeof item === "object")
        .map(note => ({
            id: text(note.id),
            title: text(note.title),
            summary: text(note.summary),
            authorCreatorId: text(note.authorCreatorId) || primaryCreatorId,
            order: Number(note.order) || 0
        }))
        .filter(note => note.id && note.title && note.authorCreatorId === creatorId)
        .sort(byOrder)
        .slice(0, CREATOR_RELATED_LIMIT)
        .map(note => ({
            title: note.title,
            summary: note.summary,
            meta: "執筆",
            href: "../../notes/"
        }));
}

function normalizeTrpg(data, creatorId, primaryCreatorId){
    const scenarios = Array.isArray(data?.scenarios)
        ? data.scenarios
        : [];

    return scenarios
        .filter(item => item && typeof item === "object")
        .map(scenario => ({
            id: text(scenario.id),
            title: text(scenario.title),
            summary: text(scenario.summary),
            ownerCreatorId: text(scenario.ownerCreatorId) || primaryCreatorId,
            order: text(scenario.kana) || text(scenario.title)
        }))
        .filter(scenario => scenario.id && scenario.title && scenario.ownerCreatorId === creatorId)
        .sort((a, b) => a.order.localeCompare(b.order, "ja"))
        .slice(0, CREATOR_RELATED_LIMIT)
        .map(scenario => ({
            title: scenario.title,
            summary: scenario.summary,
            meta: "管理",
            href: "../../trpg/"
        }));
}

function normalizeTeam(team, primaryCreatorId){
    if(!Array.isArray(team) || team.length === 0){
        return primaryCreatorId
            ? [
                {
                    creatorId: primaryCreatorId,
                    roleId: "lead",
                    primary: true
                }
            ]
            : [];
    }

    return team
        .filter(member => member && typeof member === "object")
        .map(member => ({
            creatorId: text(member.creatorId),
            roleId: text(member.roleId) || "lead",
            primary: Boolean(member.primary)
        }))
        .filter(member => member.creatorId);
}

function normalizeCreatorIds(value, primaryCreatorId){
    const ids = Array.isArray(value)
        ? value.map(text).filter(Boolean)
        : [];

    return ids.length
        ? ids
        : [primaryCreatorId].filter(Boolean);
}

function byOrder(a, b){
    return a.order - b.order;
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
        list.replaceChildren(
            createCreatorsEmptyState(
                "活動者情報を読み込めませんでした",
                FALLBACK_MESSAGE
            )
        );
    }
}

function setDetailSectionsHidden(hidden){
    [
        "creatorActivitiesTitle",
        "creatorRelatedTitle",
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
            id: text(creator.id),
            slug: text(creator.slug),
            displayName: text(creator.displayName),
            bio: text(creator.bio),
            activities: Array.isArray(creator.activities)
                ? creator.activities.map(text).filter(Boolean)
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
        id: text(link?.id),
        label: text(link?.label),
        url: text(link?.url),
        order: Number(link?.order) || 0
    };
}

function appendEmpty(container, messageText){
    const message = document.createElement("p");
    message.className = "profile-empty-message";
    message.textContent = messageText;
    container.appendChild(message);
}

function setText(id, value){
    const element = document.getElementById(id);

    if(element){
        element.textContent = value;
    }
}

function text(value){
    return String(value ?? "").trim();
}

function isSafeHttpUrl(url){
    try{
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    }catch{
        return false;
    }
}
