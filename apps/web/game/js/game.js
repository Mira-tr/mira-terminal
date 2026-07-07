const DATA_URL = "./data/public-games.json";

const SUPPORTED_SCHEMA_VERSION = 1;

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
    const card = document.createElement("div");
    card.className = "result-item";

    const header = document.createElement("div");
    header.className = "result-header";

    const title = document.createElement("h3");
    title.textContent = game.title;

    const developmentStatus = document.createElement("span");
    developmentStatus.className = "status-badge";
    developmentStatus.textContent = game.developmentStatus;
    header.append(title, developmentStatus);
    card.appendChild(header);

    if(game.summary){
        const summary = document.createElement("p");
        summary.textContent = game.summary;
        card.appendChild(summary);
    }

    const details = document.createElement("div");
    details.className = "result-meta";

    [game.platform, game.genre, game.role]
        .filter(Boolean)
        .forEach(value => {
            const detail = document.createElement("span");
            detail.textContent = value;
            details.appendChild(detail);
        });

    if(game.tags.length > 0){
        const tags = document.createElement("div");
        tags.className = "result-tags";

        game.tags.forEach(tag => {
            const tagElement = document.createElement("span");
            tagElement.className = "tag";
            tagElement.textContent = tag;
            tags.appendChild(tagElement);
        });

        details.appendChild(tags);
    }

    card.appendChild(details);

    if(game.url){
        const link = document.createElement("a");
        link.href = game.url;
        link.className = "button button-secondary";
        link.textContent = "詳細を見る";
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        card.appendChild(link);
    }

    return card;
}

async function initGames(){
    const searchPanel = document.querySelector(".search-panel");

    if(!searchPanel){
        return;
    }

    try{
        const games = await fetchPublicGames();
        const elements = games.length > 0
            ? games.map(createGameCard)
            : [createEmptyState("公開中のゲームはまだありません")];
        searchPanel.replaceChildren(...elements);
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
