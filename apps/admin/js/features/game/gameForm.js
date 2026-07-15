import {
    getGames,
    addGame,
    updateGame,
    deleteGame,
    moveGame
} from "./gameStore.js";

import {
    showToast
} from "../common/toastService.js";

import {
    CREATOR_ROLE_LABELS,
    DEFAULT_CREATOR_ROLE_ID,
    getCreatorCollection
} from "../creators/creatorCore.js";

let editingGameId = null;

export function initGameForm(){
    renderTeamEditor([]);
    bindEvents();
    renderGameList();
}

export function refreshGameForm(){
    handleCancelEdit();
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
        showToast("入力内容を確認してください：タイトルは必須です", "warning");
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
        team: readTeamEditor(),
        url: document.getElementById("gameUrl").value.trim(),
        tags: document.getElementById("gameTags").value.trim()
    };

    const isEditing = Boolean(editingGameId);
    const saved = isEditing
        ? updateGame(editingGameId, gameData)
        : addGame(gameData);

    if(!saved){
        showToast("保存に失敗しました", "error");
        return;
    }

    showToast(isEditing ? "更新しました" : "保存しました", "success");

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
    renderTeamEditor(game.team);
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

    if(!deleteGame(gameId)){
        showToast("削除に失敗しました", "error");
        return;
    }

    if(editingGameId === gameId){
        handleCancelEdit();
    }

    renderGameList();
    showToast("削除しました", "success");
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
    renderTeamEditor([]);
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

    if(game.team?.length){
        const team = document.createElement("span");
        const creators = getCreatorCollection().creators;
        team.textContent = `Team: ${game.team.map(member =>
            creators.find(creator => creator.id === member.creatorId)?.displayName || "不明なCreator"
        ).join(", ")}`;
        details.appendChild(team);
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
    upButton.textContent = "上へ";
    upButton.addEventListener("click", () => handleMoveGame(game.id, "up"));

    const downButton = document.createElement("button");
    downButton.type = "button";
    downButton.className = "button button-secondary";
    downButton.textContent = "下へ";
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

function renderTeamEditor(team){
    const container = document.getElementById("gameTeamEditor");
    const selected = new Map(
        (Array.isArray(team) ? team : []).map(member => [member.creatorId, member])
    );
    const collection = getCreatorCollection();

    container.replaceChildren(...collection.creators
        .slice()
        .sort((a, b) => a.order - b.order)
        .map(creator => createTeamRow(creator, selected.get(creator.id))));
}

function createTeamRow(creator, member){
    const row = document.createElement("div");
    row.className = "creator-team-row";
    row.dataset.creatorId = creator.id;

    const memberLabel = document.createElement("label");
    memberLabel.className = "creator-team-member";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "creator-team-checkbox";
    checkbox.checked = Boolean(member);
    const name = document.createElement("span");
    name.textContent = creator.displayName;
    memberLabel.append(checkbox, name);

    const role = document.createElement("select");
    role.className = "creator-team-role";
    role.setAttribute("aria-label", `${creator.displayName}の役割`);
    Object.entries(CREATOR_ROLE_LABELS).forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        role.appendChild(option);
    });
    role.value = member?.roleId || DEFAULT_CREATOR_ROLE_ID;
    role.disabled = !checkbox.checked;

    const primaryLabel = document.createElement("label");
    primaryLabel.className = "creator-team-primary";
    const primary = document.createElement("input");
    primary.type = "radio";
    primary.name = "gameTeamPrimary";
    primary.checked = Boolean(member?.primary);
    primary.disabled = !checkbox.checked;
    const primaryText = document.createElement("span");
    primaryText.textContent = "Primary";
    primaryLabel.append(primary, primaryText);

    checkbox.addEventListener("change", () => {
        role.disabled = !checkbox.checked;
        primary.disabled = !checkbox.checked;
        if(!checkbox.checked) primary.checked = false;
    });

    row.append(memberLabel, role, primaryLabel);
    return row;
}

function readTeamEditor(){
    const rows = [...document.querySelectorAll(".creator-team-row")];
    const team = rows
        .filter(row => row.querySelector(".creator-team-checkbox").checked)
        .map(row => ({
            creatorId: row.dataset.creatorId,
            roleId: row.querySelector(".creator-team-role").value,
            primary: row.querySelector(".creator-team-primary input").checked
        }));

    if(team.length && !team.some(member => member.primary)) team[0].primary = true;
    return team;
}
