# Placar de Cacheta

Marcador de partida mobile-first para a regra combinada na mesa:

- Até 5 jogadores: distribui 7 pontos na primeira fase; acima de 5: distribui 9.
- Na primeira fase, uma vitória normal recebe 1 ponto da mesa; bater com 10 cartas recebe 2. Ao acabar a mesa, participantes com zero pontos são eliminados.
- Na segunda fase, cada vitória tira 1 ponto de cada adversário ativo; bater com 10 cartas tira 2 de cada. Se um adversário tiver menos pontos, transfere apenas os que restam.
- Vence o último participante ativo.

O placar e o histórico são guardados no armazenamento local do navegador. Para executar localmente, sirva esta pasta por HTTP, por exemplo com `python -m http.server 8000`, e acesse `http://localhost:8000`. Para instalar como PWA no celular e usar offline, publique a pasta em um endereço HTTPS e escolha **Adicionar à tela inicial** no navegador.
