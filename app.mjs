import { createGame, recordRound } from "./game-logic.mjs";

const STORAGE_KEY = "cacheta-scoreboard-state-v1";
const setupScreen = document.querySelector("#setup-screen");
const gameScreen = document.querySelector("#game-screen");
const playerList = document.querySelector("#player-list");
const setupForm = document.querySelector("#setup-form");
const setupError = document.querySelector("#setup-error");
const roundForm = document.querySelector("#round-form");
const roundError = document.querySelector("#round-error");
const notice = document.querySelector("#notice");
const roundWinner = document.querySelector("#round-winner");
const scoreboard = document.querySelector("#scoreboard");
const roundHistory = document.querySelector("#round-history");
const undoButton = document.querySelector("#undo-round");

let game = null;
let pastStates = [];

function showError(element, message) {
  element.textContent = message;
  element.hidden = false;
}

function clearError(element) {
  element.textContent = "";
  element.hidden = true;
}

function showNotice(message) {
  notice.textContent = message;
  notice.hidden = false;
}

function hideNotice() {
  notice.textContent = "";
  notice.hidden = true;
}

function saveState() {
  try {
    if (game) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ game, pastStates }),
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    showNotice(
      "Não foi possível salvar a partida neste aparelho. Evite fechar ou atualizar esta página.",
    );
    return false;
  }
  return true;
}

function loadState() {
  let saved;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    saved = JSON.parse(raw);
  } catch {
    showNotice(
      "Não foi possível ler a partida salva. Seus dados continuam no aparelho; você pode iniciar uma nova partida.",
    );
    return;
  }

  if (
    !saved ||
    !saved.game ||
    !Array.isArray(saved.game.players) ||
    !Array.isArray(saved.game.history) ||
    !Array.isArray(saved.pastStates) ||
    !["distribution", "steal", "finished"].includes(saved.game.phase)
  ) {
    showNotice(
      "Os dados salvos da partida estão inválidos. Inicie uma nova partida para continuar.",
    );
    return;
  }
  game = saved.game;
  pastStates = saved.pastStates;
}

function createPlayerInput(name, index) {
  const row = document.createElement("div");
  row.className = "player-input-row";

  const input = document.createElement("input");
  input.type = "text";
  input.name = "player-name";
  input.value = name;
  input.maxLength = 30;
  input.autocomplete = "off";
  input.setAttribute("aria-label", `Nome do jogador ${index + 1}`);
  input.placeholder = `Jogador ${index + 1}`;

  const remove = document.createElement("button");
  remove.className = "remove-player";
  remove.type = "button";
  remove.textContent = "×";
  remove.setAttribute("aria-label", `Remover jogador ${index + 1}`);
  remove.addEventListener("click", () => {
    if (playerList.children.length <= 2) {
      showError(setupError, "A partida precisa de pelo menos 2 jogadores.");
      return;
    }
    row.remove();
    refreshPlayerInputs();
  });

  row.append(input, remove);
  return row;
}

function refreshPlayerInputs() {
  [...playerList.children].forEach((row, index) => {
    const input = row.querySelector("input");
    const remove = row.querySelector("button");
    input.setAttribute("aria-label", `Nome do jogador ${index + 1}`);
    input.placeholder = `Jogador ${index + 1}`;
    remove.setAttribute("aria-label", `Remover jogador ${index + 1}`);
  });
}

function appendPlayerInput(name = "") {
  playerList.append(createPlayerInput(name, playerList.children.length));
  refreshPlayerInputs();
  playerList.lastElementChild.querySelector("input").focus();
  clearError(setupError);
}

function addSelectOption(select, value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  select.append(option);
}

function renderScoreboard() {
  scoreboard.replaceChildren();
  game.players.forEach((player) => {
    const card = document.createElement("article");
    card.className = `score-card${player.active ? "" : " is-eliminated"}`;

    const initial = document.createElement("span");
    initial.className = "player-initial";
    initial.setAttribute("aria-hidden", "true");
    initial.textContent = player.name.trim().charAt(0).toLocaleUpperCase("pt-BR");

    const info = document.createElement("div");
    info.className = "player-info";
    const name = document.createElement("p");
    name.className = "player-name";
    name.textContent = player.name;
    const status = document.createElement("p");
    status.className = "player-status";
    status.textContent = player.active ? "Na mesa" : "Eliminado";
    info.append(name, status);

    const scoreWrap = document.createElement("div");
    const score = document.createElement("div");
    score.className = "score-value";
    score.textContent = String(player.score);
    const unit = document.createElement("span");
    unit.className = "score-unit";
    unit.textContent = player.score === 1 ? "ponto" : "pontos";
    scoreWrap.append(score, unit);

    card.append(initial, info, scoreWrap);
    scoreboard.append(card);
  });
}

function renderHistory() {
  roundHistory.replaceChildren();
  game.history
    .slice()
    .reverse()
    .forEach((entry) => {
      const item = document.createElement("li");
      item.className = "history-entry";
      const number = document.createElement("span");
      number.className = "history-number";
      number.textContent = `#${entry.number}`;
      const content = document.createElement("div");
      content.textContent = entry.message;
      const time = document.createElement("time");
      time.dateTime = entry.timestamp;
      time.textContent = new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(entry.timestamp));
      content.append(time);
      item.append(number, content);
      roundHistory.append(item);
    });

  document.querySelector("#empty-history").hidden = game.history.length > 0;
}

function renderGame() {
  if (!game) {
    setupScreen.hidden = false;
    gameScreen.hidden = true;
    return;
  }

  setupScreen.hidden = true;
  gameScreen.hidden = false;

  const activePlayers = game.players.filter((player) => player.active);
  document.querySelector("#active-count").textContent =
    `${activePlayers.length} ${activePlayers.length === 1 ? "ativo" : "ativos"}`;

  const phaseLabel = document.querySelector("#phase-label");
  const phaseTitle = document.querySelector("#phase-title");
  const phaseDescription = document.querySelector("#phase-description");
  const phaseSymbol = document.querySelector("#phase-symbol");
  const poolCounter = document.querySelector("#pool-counter");
  const phaseTwo = game.phase === "steal";

  if (game.phase === "distribution") {
    phaseLabel.textContent = "FASE 1 · DISTRIBUIÇÃO";
    phaseTitle.textContent = "Conquiste seus pontos";
    phaseDescription.textContent =
      "Cada vitória dá 1 ponto; bater com 10 cartas dá 2. Quando a mesa zerar, quem não pontuou sai.";
    phaseSymbol.textContent = "✦";
    poolCounter.hidden = false;
    poolCounter.replaceChildren();
    const remaining = document.createElement("strong");
    remaining.textContent = String(game.pool);
    poolCounter.append(remaining, document.createTextNode("na mesa"));
  } else if (phaseTwo) {
    phaseLabel.textContent = "FASE 2 · SOBREVIVÊNCIA";
    phaseTitle.textContent = "Roube pontos dos adversários";
    phaseDescription.textContent =
      "Cada vitória tira 1 ponto de cada adversário ativo; com 10 cartas, tira 2 de cada.";
    phaseSymbol.textContent = "♠";
    poolCounter.hidden = true;
  } else {
    phaseLabel.textContent = "PARTIDA ENCERRADA";
    phaseTitle.textContent = `${activePlayers[0]?.name ?? "Ninguém"} venceu!`;
    phaseDescription.textContent =
      "A partida terminou. Comece uma nova quando quiser jogar de novo.";
    phaseSymbol.textContent = "♛";
    poolCounter.hidden = true;
  }

  renderScoreboard();
  renderHistory();
  undoButton.disabled = pastStates.length === 0;
  undoButton.setAttribute(
    "aria-label",
    pastStates.length > 0 ? "Desfazer última rodada" : "Nenhuma rodada para desfazer",
  );

  roundWinner.replaceChildren();
  activePlayers.forEach((player) => {
    addSelectOption(roundWinner, player.id, player.name);
  });
  roundForm.hidden = game.phase === "finished";
  document.querySelector("#win-type-options").hidden = !phaseTwo &&
    game.phase !== "distribution";
  document.querySelector("#record-round").textContent = phaseTwo
    ? "Registrar vitória e roubar pontos"
    : "Registrar vitória";
}

document.querySelector("#add-player").addEventListener("click", () => {
  appendPlayerInput();
});

setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  clearError(setupError);
  try {
    const names = [...playerList.querySelectorAll("input")]
        .map((input) => input.value);
    game = createGame(names);
    pastStates = [];
    hideNotice();
    saveState();
    renderGame();
  } catch (error) {
    showError(setupError, error.message);
  }
});

roundForm.addEventListener("submit", (event) => {
  event.preventDefault();
  clearError(roundError);
  if (!game) {
    return;
  }

  const formData = new FormData(roundForm);
  const winnerId = String(formData.get("winner") ?? "");
  const wonWithTenCards = formData.get("win-type") === "ten-cards";
  pastStates.push(structuredClone(game));

  try {
    game = recordRound(game, winnerId, wonWithTenCards);
    hideNotice();
    saveState();
    renderGame();
  } catch (error) {
    pastStates.pop();
    showError(roundError, error.message);
  }
});

undoButton.addEventListener("click", () => {
  const previous = pastStates.pop();
  if (!previous) {
    return;
  }
  game = previous;
  hideNotice();
  saveState();
  renderGame();
});

document.querySelector("#new-game").addEventListener("click", () => {
  if (!window.confirm("Começar uma nova partida? O placar atual será apagado.")) {
    return;
  }
  game = null;
  pastStates = [];
  saveState();
  playerList.replaceChildren();
  appendPlayerInput();
  appendPlayerInput();
  clearError(setupError);
  hideNotice();
  renderGame();
});

loadState();
if (!game) {
  appendPlayerInput();
  appendPlayerInput();
}
renderGame();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch((error) => {
    console.error("Não foi possível ativar o modo instalável/offline.", error);
  });
}
