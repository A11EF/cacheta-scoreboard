export function createGame(names) {
  if (!Array.isArray(names) || names.length < 2) {
    throw new Error("A partida precisa de pelo menos 2 jogadores.");
  }

  const normalizedNames = names.map((name) => name.trim());
  if (normalizedNames.some((name) => !name)) {
    throw new Error("Preencha o nome de todos os jogadores.");
  }

  const uniqueNames = new Set(
    normalizedNames.map((name) => name.toLocaleLowerCase("pt-BR")),
  );
  if (uniqueNames.size !== normalizedNames.length) {
    throw new Error("Use um nome diferente para cada jogador.");
  }

  const totalPool = normalizedNames.length > 5 ? 9 : 7;

  return {
    phase: "distribution",
    totalPool,
    pool: totalPool,
    players: normalizedNames.map((name, index) => ({
      id: String(index + 1),
      name,
      score: 0,
      active: true,
    })),
    history: [],
  };
}

export function recordRound(game, winnerId, wonWithTenCards) {
  if (!game || game.phase === "finished") {
    throw new Error("A partida já terminou.");
  }
  if (typeof wonWithTenCards !== "boolean") {
    throw new Error("Selecione como o vencedor bateu.");
  }

  const winner = game.players.find((player) => player.id === winnerId);
  if (!winner || !winner.active) {
    throw new Error("Selecione um jogador ativo como vencedor.");
  }

  const points = wonWithTenCards ? 2 : 1;
  const next = {
    ...game,
    players: game.players.map((player) => ({ ...player })),
    history: [...game.history],
  };
  const nextWinner = next.players.find((player) => player.id === winnerId);
  const eventNumber = next.history.length + 1;
  const winDescription = wonWithTenCards
    ? "bateu com 10 cartas"
    : "venceu a rodada";

  if (next.phase === "distribution") {
    const awarded = Math.min(points, next.pool);
    next.pool -= awarded;
    nextWinner.score += awarded;
    let message = `${winner.name} ${winDescription} e recebeu ${awarded} ${
      awarded === 1 ? "ponto" : "pontos"
    } da mesa.`;

    if (next.pool === 0) {
      next.players.forEach((player) => {
        if (player.score === 0) {
          player.active = false;
        }
      });

      const activePlayers = next.players.filter((player) => player.active);
      next.phase = activePlayers.length > 1 ? "steal" : "finished";
      message +=
        activePlayers.length > 1
          ? " A mesa zerou: jogadores sem pontos foram eliminados. Começa a fase de roubo."
          : ` A mesa zerou: ${activePlayers[0]?.name ?? winner.name} venceu a partida.`;
    }

    next.history.push({
      number: eventNumber,
      message,
      timestamp: new Date().toISOString(),
    });
    return next;
  }

  if (next.phase !== "steal") {
    throw new Error("A fase atual da partida não é válida.");
  }

  let transferred = 0;
  const affected = [];
  next.players.forEach((player) => {
    if (player.id === winnerId || !player.active) {
      return;
    }
    const taken = Math.min(points, player.score);
    player.score -= taken;
    nextWinner.score += taken;
    transferred += taken;
    if (player.score === 0) {
      player.active = false;
      affected.push(`${player.name} foi eliminado`);
    }
  });

  const survivors = next.players.filter((player) => player.active);
  if (survivors.length === 1) {
    next.phase = "finished";
  }

  let message = `${winner.name} ${winDescription} e roubou ${transferred} ${
    transferred === 1 ? "ponto" : "pontos"
  } dos adversários.`;
  if (affected.length > 0) {
    message += ` ${affected.join("; ")}.`;
  }
  if (next.phase === "finished") {
    message += ` ${survivors[0].name} venceu a partida!`;
  }

  next.history.push({
    number: eventNumber,
    message,
    timestamp: new Date().toISOString(),
  });
  return next;
}
