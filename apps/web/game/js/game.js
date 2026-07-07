const DATA_URL = "./data/public-games.json";

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
        throw new Error(`Gameデータの読み込みに失敗しました: ${response.status}`);
    }

    const data = await response.json();

    validateGamesPayload(data);

    return normalizeGames(data);
}

function validateGamesPayload(data){
    if(typeof data !== "object" || data === null){
        throw new Error("Gameデータの形式が正しくありません");
    }

    if(data.module !== undefined && data.module !== "game"){
        throw new Error("Gameデータのモジュールが正しくありません");
    }

    if(data.exportType !== undefined && data.exportType !== "public-games"){
        throw new Error("Gameデータのエクスポートタイプが正しくありません");
    }

    if(data.schemaVersion !== undefined){
        const version = Number(data.schemaVersion);
        if(!Number.isInteger(version) || version > SUPPORTED_SCHEMA_VERSION){
            throw new Error(`Gameデータのスキーマバージョン${version}はサポートされていません`);
        }
    }

    if(!Array.isArray(data.games)){
        throw new Error("Gameデータのgamesが正しくありません");
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
            url: normalizeURL(game.url),
            tags: normalizeTags(game.tags || []),
            order: Number(game.order) || 0
        }))
        .filter(game => game.id)
        .sort((a, b) => a.order - b.order);
}

function normalizeURL(url){
    const normalized = String(url || "").trim();

    if(!normalized){
        return "";
    }

    if(normalized.startsWith("http://") || normalized.startsWith("https://")){
        return normalized;
    }

    return "";
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
    emptyState.className = "empty-state";

    const message = document.createElement("p");
    message.className = "empty-state-message";
    message.textContent = messageText;
    emptyState.appendChild(message);
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
    developmentStatus.className = "game-status";
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
        const description = document.createElement("p");
        description.className = "game-description";
        description.textContent = game.description;
        card.appendChild(description);
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
        ["Platform", game.platform],
        ["Genre", game.genre],
        ["Role", game.role]
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

async function initGames(){
    const searchPanel = document.querySelector(".search-panel");

    if(!searchPanel){
        return;
    }

    try{
        const games = await fetchPublicGames();

        if(games.length === 0){
            searchPanel.replaceChildren(
                createEmptyState("公開中のゲームはまだありません")
            );
            return;
        }

        const gameList = document.createElement("div");
        gameList.className = "game-list";
        gameList.replaceChildren(...games.map(createGameCard));
        searchPanel.replaceChildren(gameList);
    }catch(error){
        console.warn("Gameデータの読み込みに失敗しました", error);
        searchPanel.replaceChildren(
            createEmptyState("ゲームデータの読み込みに失敗しました")
        );
    }
}

if(typeof document !== "undefined"){
    initGames();
}
