const DATA_URL = "../game/data/public-games.json";

const SUPPORTED_SCHEMA_VERSION = 1;

const DEVELOPMENT_STATUS_LABELS = Object.freeze({
    planning: "制作構想中",
    development: "制作中",
    released: "公開中",
    archived: "アーカイブ"
});

export async function fetchPublicGames(){
    const response = await fetch(DATA_URL, {
        cache: "no-store"
    });

    if(!response.ok){
        throw new Error(`Projectsデータの読み込みに失敗しました: ${response.status}`);
    }

    const data = await response.json();

    validateGamesPayload(data);

    return normalizeGames(data);
}

function validateGamesPayload(data){
    if(typeof data !== "object" || data === null){
        throw new Error("Projectsデータの形式が正しくありません");
    }

    if(data.module !== undefined && data.module !== "game"){
        throw new Error("Projectsデータのモジュールが正しくありません");
    }

    if(data.exportType !== undefined && data.exportType !== "public-games"){
        throw new Error("Projectsデータのエクスポートタイプが正しくありません");
    }

    if(data.schemaVersion !== undefined){
        const version = Number(data.schemaVersion);
        if(!Number.isInteger(version) || version > SUPPORTED_SCHEMA_VERSION){
            throw new Error(`Projectsデータのスキーマバージョン${version}はサポートされていません`);
        }
    }

    if(!Array.isArray(data.games)){
        throw new Error("Projectsデータのgamesが正しくありません");
    }
}

function normalizeGames(data){
    const games = data.games || [];

    return games
        .filter(game => game && typeof game === "object")
        .map(game => ({
            id: toText(game.id),
            title: toText(game.title),
            summary: toText(game.summary),
            description: toText(game.description),
            developmentStatus: toText(game.developmentStatus),
            platform: toText(game.platform),
            genre: toText(game.genre),
            role: toText(game.role),
            url: normalizeGameUrl(game.url),
            tags: normalizeTags(game.tags || []),
            order: Number(game.order) || 0
        }))
        .filter(game => game.id)
        .sort((a, b) => a.order - b.order);
}

export function normalizeGameUrl(url){
    const normalized = String(url || "").trim();

    if(!normalized){
        return "";
    }

    try{
        const parsed = new URL(normalized);
        return parsed.protocol === "http:" || parsed.protocol === "https:"
            ? normalized
            : "";
    }catch{
        return "";
    }
}

function normalizeTags(tags){
    if(!Array.isArray(tags)){
        return [];
    }

    return tags
        .map(tag => String(tag || "").trim())
        .filter(tag => tag);
}

function toText(value){
    return String(value ?? "").trim();
}

function createEmptyState(messageText){
    const emptyState = document.createElement("div");
    emptyState.className = "game-empty-state";

    const label = document.createElement("p");
    label.className = "section-label";
    label.textContent = "Projects";

    const title = document.createElement("h3");
    title.textContent = "作品を育てているところです";

    const message = document.createElement("p");
    message.className = "game-empty-message";
    message.textContent = messageText;
    emptyState.append(label, title, message);
    return emptyState;
}

function createGameCard(game){
    const card = document.createElement("article");
    card.className = "game-card";

    const header = document.createElement("div");
    header.className = "game-card-header";

    const title = document.createElement("h3");
    title.className = "game-card-title";
    title.textContent = game.title;

    const developmentStatus = document.createElement("span");
    developmentStatus.className = `game-status ${getDevelopmentStatusClass(
        game.developmentStatus
    )}`;
    developmentStatus.textContent = getDevelopmentStatusLabel(
        game.developmentStatus
    );
    header.append(title, developmentStatus);
    card.appendChild(header);

    if(game.summary){
        const summary = document.createElement("p");
        summary.className = "game-summary";
        summary.textContent = game.summary;
        card.appendChild(summary);
    }

    if(game.description){
        const detail = document.createElement("details");
        detail.className = "game-description-detail";
        const detailLabel = document.createElement("summary");
        detailLabel.textContent = "詳しい作品紹介";
        const description = document.createElement("p");
        description.className = "game-description";
        description.textContent = game.description;
        detail.append(detailLabel, description);
        card.appendChild(detail);
    }

    const details = createGameDetails(game);

    if(details){
        card.appendChild(details);
    }

    if(game.tags.length > 0){
        card.appendChild(createGameTags(game.tags));
    }

    if(game.url){
        const linkArea = document.createElement("div");
        linkArea.className = "game-link-area";

        const link = document.createElement("a");
        link.href = game.url;
        link.className = "game-work-link";
        link.textContent = "作品ページを見る";
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        linkArea.appendChild(link);
        card.appendChild(linkArea);
    }

    return card;
}

function createGameDetails(game){
    const fields = [
        ["プラットフォーム", game.platform],
        ["ジャンル", game.genre],
        ["担当範囲", game.role]
    ].filter(([, value]) => value);

    if(fields.length === 0){
        return null;
    }

    const details = document.createElement("dl");
    details.className = "game-details";

    fields.forEach(([label, value]) => {
        const field = document.createElement("div");
        field.className = "game-detail";

        const term = document.createElement("dt");
        term.className = "game-detail-label";
        term.textContent = label;

        const description = document.createElement("dd");
        description.className = "game-detail-value";
        description.textContent = value;

        field.append(term, description);
        details.appendChild(field);
    });

    return details;
}

function createGameTags(tagValues){
    const tags = document.createElement("div");
    tags.className = "game-tags";

    tagValues.forEach(tag => {
        const tagElement = document.createElement("span");
        tagElement.className = "tag";
        tagElement.textContent = tag;
        tags.appendChild(tagElement);
    });

    return tags;
}

export function getDevelopmentStatusLabel(status){
    return DEVELOPMENT_STATUS_LABELS[toText(status)] || "ステータス未設定";
}

function getDevelopmentStatusClass(status){
    const normalized = toText(status);
    return DEVELOPMENT_STATUS_LABELS[normalized]
        ? `is-${normalized}`
        : "is-unset";
}

async function initGames(){
    const gameWorksContainer = document.getElementById("gameWorksContainer");

    if(!gameWorksContainer){
        return;
    }

    try{
        const games = await fetchPublicGames();

        if(games.length === 0){
            gameWorksContainer.replaceChildren(
                createEmptyState("公開できる形になるまで、企画や試作を少しずつ進めています。新しいプロジェクトはここに追加されます。")
            );
            return;
        }

        const gameList = document.createElement("div");
        gameList.className = "game-list";
        gameList.replaceChildren(...games.map(createGameCard));
        gameWorksContainer.replaceChildren(gameList);
    }catch(error){
        console.warn("Projectsデータの読み込みに失敗しました", error);
        gameWorksContainer.replaceChildren(
            createEmptyState("プロジェクトデータを読み込めませんでした。時間をおいてもう一度お試しください。")
        );
    }
}

if(typeof document !== "undefined"){
    initGames();
}
