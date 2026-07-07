import {
    getGames,
    addGame,
    updateGame,
    deleteGame,
    moveGame
} from "./gameStore.js";

let editingGameId = null;

export function initGameForm(){
    bindEvents();
    renderGameList();
}

function bindEvents(){
    document.getElementById("addGameBtn")
        .addEventListener("click", handleAddGame);

    document.getElementById("saveGameBtn")
        .addEventListener("click", handleSaveGame);

    document.getElementById("cancelEditBtn")
        .addEventListener("click", handleCancelEdit);
}

function handleAddGame(){
    editingGameId = null;
    clearForm();
    document.getElementById("formTitle").textContent = "新規ゲーム追加";
    document.getElementById("saveGameBtn").textContent = "追加";
    document.getElementById("cancelEditBtn").style.display = "inline-block";
}

function handleSaveGame(){
    const title = document.getElementById("gameTitleInput").value.trim();

    if(!title){
        alert("タイトルは必須です");
        return;
    }

    const gameData = {
        title: title,
        summary: document.getElementById("gameSummary").value.trim(),
        description: document.getElementById("gameDescription").value.trim(),
        status: document.getElementById("gameStatus").value,
        developmentStatus: document.getElementById("gameDevelopmentStatus").value,
        platform: document.getElementById("gamePlatform").value.trim(),
        genre: document.getElementById("gameGenre").value.trim(),
        role: document.getElementById("gameRole").value.trim(),
        url: document.getElementById("gameUrl").value.trim(),
        tags: document.getElementById("gameTags").value.trim()
    };

    if(editingGameId){
        updateGame(editingGameId, gameData);
        alert("ゲームを更新しました");
    }else{
        addGame(gameData);
        alert("ゲームを追加しました");
    }

    clearForm();
    editingGameId = null;
    document.getElementById("formTitle").textContent = "新規ゲーム追加";
    document.getElementById("saveGameBtn").textContent = "追加";
    document.getElementById("cancelEditBtn").style.display = "none";

    renderGameList();
}

function handleCancelEdit(){
    clearForm();
    editingGameId = null;
    document.getElementById("formTitle").textContent = "新規ゲーム追加";
    document.getElementById("saveGameBtn").textContent = "追加";
    document.getElementById("cancelEditBtn").style.display = "none";
}

function handleEditGame(gameId){
    const games = getGames();
    const game = games.games.find(g => g.id === gameId);

    if(!game){
        return;
    }

    editingGameId = gameId;

    document.getElementById("gameTitleInput").value = game.title;
    document.getElementById("gameSummary").value = game.summary;
    document.getElementById("gameDescription").value = game.description;
    document.getElementById("gameStatus").value = game.status;
    document.getElementById("gameDevelopmentStatus").value = game.developmentStatus;
    document.getElementById("gamePlatform").value = game.platform;
    document.getElementById("gameGenre").value = game.genre;
    document.getElementById("gameRole").value = game.role;
    document.getElementById("gameUrl").value = game.url;
    document.getElementById("gameTags").value = game.tags.join("\n");

    document.getElementById("formTitle").textContent = "ゲーム編集";
    document.getElementById("saveGameBtn").textContent = "更新";
    document.getElementById("cancelEditBtn").style.display = "inline-block";
}

function handleDeleteGame(gameId){
    if(!confirm("このゲームを削除しますか？")){
        return;
    }

    deleteGame(gameId);

    if(editingGameId === gameId){
        handleCancelEdit();
    }

    renderGameList();
}

function handleMoveGame(gameId, direction){
    moveGame(gameId, direction);
    renderGameList();
}

function clearForm(){
    document.getElementById("gameTitleInput").value = "";
    document.getElementById("gameSummary").value = "";
    document.getElementById("gameDescription").value = "";
    document.getElementById("gameStatus").value = "draft";
    document.getElementById("gameDevelopmentStatus").value = "planning";
    document.getElementById("gamePlatform").value = "";
    document.getElementById("gameGenre").value = "";
    document.getElementById("gameRole").value = "";
    document.getElementById("gameUrl").value = "";
    document.getElementById("gameTags").value = "";
}

function renderGameList(){
    const games = getGames();
    const container = document.getElementById("gamesList");

    container.replaceChildren();

    games.games.sort((a, b) => a.order - b.order);

    if(games.games.length === 0){
        const empty = document.createElement("p");
        empty.className = "panel-note";
        empty.textContent = "ゲームはまだ登録されていません";
        container.appendChild(empty);
        return;
    }

    games.games.forEach(game => {
        const item = createGameItem(game);
        container.appendChild(item);
    });
}

function createGameItem(game){
    const item = document.createElement("div");
    item.className = "game-item";

    const header = document.createElement("div");
    header.className = "game-item-header";

    const title = document.createElement("h3");
    title.textContent = game.title;

    const statusBadge = document.createElement("span");
    statusBadge.className = "status-badge";
    statusBadge.textContent = game.status;

    const devBadge = document.createElement("span");
    devBadge.className = "dev-badge";
    devBadge.textContent = game.developmentStatus;

    header.appendChild(title);
    header.appendChild(statusBadge);
    header.appendChild(devBadge);

    const info = document.createElement("div");
    info.className = "game-item-info";

    if(game.summary){
        const summary = document.createElement("p");
        summary.textContent = game.summary;
        info.appendChild(summary);
    }

    const details = document.createElement("div");
    details.className = "game-item-details";

    if(game.platform){
        const platform = document.createElement("span");
        platform.textContent = `Platform: ${game.platform}`;
        details.appendChild(platform);
    }

    if(game.genre){
        const genre = document.createElement("span");
        genre.textContent = `Genre: ${game.genre}`;
        details.appendChild(genre);
    }

    if(game.role){
        const role = document.createElement("span");
        role.textContent = `Role: ${game.role}`;
        details.appendChild(role);
    }

    info.appendChild(details);

    const actions = document.createElement("div");
    actions.className = "game-item-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "button button-secondary";
    editButton.textContent = "編集";
    editButton.addEventListener("click", () => handleEditGame(game.id));

    const upButton = document.createElement("button");
    upButton.type = "button";
    upButton.className = "button button-secondary";
    upButton.textContent = "↑";
    upButton.addEventListener("click", () => handleMoveGame(game.id, "up"));

    const downButton = document.createElement("button");
    downButton.type = "button";
    downButton.className = "button button-secondary";
    downButton.textContent = "↓";
    downButton.addEventListener("click", () => handleMoveGame(game.id, "down"));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "button button-secondary";
    deleteButton.textContent = "削除";
    deleteButton.addEventListener("click", () => handleDeleteGame(game.id));

    actions.appendChild(editButton);
    actions.appendChild(upButton);
    actions.appendChild(downButton);
    actions.appendChild(deleteButton);

    item.appendChild(header);
    item.appendChild(info);
    item.appendChild(actions);

    return item;
}
