const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  transports: ['polling', 'websocket'],
  allowUpgrades: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(express.static(path.join(__dirname, 'public')));

// ─── Game State ──────────────────────────────────────────────
let game = {
  phase: 'lobby',       // 'lobby' | 'playing' | 'finished'
  players: [],           // max 3
  scenario: null,        // 'A' | 'B' | 'C' | 'D'
  oracleCount: 0         // how many players have consulted the oracle
};

function resetGame() {
  game = {
    phase: 'lobby',
    players: [],
    scenario: null,
    oracleCount: 0
  };
}

// ─── Card Assignment ─────────────────────────────────────────
// Scenarios (each with probability 1/4):
//   A) All three get RED
//   B) Player 0 RED, Players 1 & 2 BLUE
//   C) Player 1 RED, Players 0 & 2 BLUE
//   D) Player 2 RED, Players 0 & 1 BLUE
function assignCards() {
  const scenarios = ['A', 'B', 'C', 'D'];
  game.scenario = scenarios[Math.floor(Math.random() * 4)];

  const assignments = {
    A: ['red', 'red', 'red'],
    B: ['red', 'blue', 'blue'],
    C: ['blue', 'red', 'blue'],
    D: ['blue', 'blue', 'red']
  };

  const cards = assignments[game.scenario];
  game.players.forEach((player, i) => {
    player.card = cards[i];
  });

  console.log(`[Game] Scenario ${game.scenario} selected → Cards: ${cards.join(', ')}`);
}

// ─── Socket.IO ───────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Connect] ${socket.id}`);

  // Tell the new connection about the current game state
  socket.emit('game-state', {
    phase: game.phase,
    playerCount: game.players.length
  });

  // ── Join Game ────────────────────────────────────────────
  socket.on('join-game', (data) => {
    const name = (data.name || '').trim();
    if (!name) return;

    // If last game finished, auto-reset for new players
    if (game.phase === 'finished') {
      resetGame();
      console.log('[Game] Auto-reset after finished game');
    }

    if (game.phase !== 'lobby') {
      socket.emit('game-full');
      return;
    }

    if (game.players.length >= 3) {
      socket.emit('game-full');
      return;
    }

    // Check if this socket already joined
    if (game.players.some(p => p.id === socket.id)) {
      return;
    }

    const player = {
      id: socket.id,
      name: name,
      card: null,
      chosenColor: null,   // color chosen in dropdown when asking oracle
      oracleValue: null,    // +1 or -1 response from oracle
      oracleOrder: null,    // 1, 2, or 3
      submittedValue: null, // +1 or -1 final answer
      submitted: false
    };

    game.players.push(player);
    console.log(`[Join] "${name}" joined as Player ${game.players.length} (${socket.id})`);

    // Notify ONLY game players about the updated player list
    game.players.forEach(p => {
      io.to(p.id).emit('player-joined', {
        count: game.players.length,
        names: game.players.map(p2 => p2.name)
      });
    });

    // If we have 3 players, start the game!
    if (game.players.length === 3) {
      assignCards();
      game.phase = 'playing';

      // Send each player ONLY their own card (not the others')
      game.players.forEach((p, i) => {
        io.to(p.id).emit('game-start', {
          card: p.card,
          playerIndex: i,
          playerName: p.name
        });
      });

      console.log('[Game] Game started!');
    }
  });

  // ── Ask Oracle ───────────────────────────────────────────
  socket.on('ask-oracle', (data) => {
    if (game.phase !== 'playing') return;

    const playerIndex = game.players.findIndex(p => p.id === socket.id);
    if (playerIndex === -1) return;

    const player = game.players[playerIndex];

    // Only one consultation per player
    if (player.oracleValue !== null) return;

    // Store the chosen color from the dropdown
    player.chosenColor = data.chosenColor; // 'red' or 'blue'

    // Increment oracle counter and record this player's order
    game.oracleCount++;
    player.oracleOrder = game.oracleCount;

    let oracleValue;

    if (game.oracleCount <= 2) {
      // 1st or 2nd player to consult: random +1 or -1 (prob 1/2 each)
      oracleValue = Math.random() < 0.5 ? 1 : -1;
      console.log(`[Oracle] Player "${player.name}" is #${game.oracleCount} to consult → random value: ${oracleValue}`);
    } else {
      // 3rd player to consult: calculated value
      // Find the other two players who already consulted the oracle
      const otherConsulted = game.players.filter(
        (p, i) => i !== playerIndex && p.oracleValue !== null
      );

      if (otherConsulted.length < 2) {
        // Safety check: shouldn't happen since oracleCount is 3
        oracleValue = Math.random() < 0.5 ? 1 : -1;
      } else {
        // P = product of the oracle values of the other two
        const P = otherConsulted[0].oracleValue * otherConsulted[1].oracleValue;

        // Check the CHOSEN COLORS (from dropdown) of the other two
        const anyChoseBlue = otherConsulted.some(p => p.chosenColor === 'blue');

        if (anyChoseBlue) {
          oracleValue = -1 * P;
        } else {
          oracleValue = P;
        }

        console.log(`[Oracle] Player "${player.name}" is #3 to consult → P=${P}, anyBlue=${anyChoseBlue} → value: ${oracleValue}`);
      }
    }

    player.oracleValue = oracleValue;

    // Send the oracle response ONLY to this player
    socket.emit('oracle-response', { value: oracleValue });
  });

  // ── Submit Answer ────────────────────────────────────────
  socket.on('submit-answer', (data) => {
    if (game.phase !== 'playing') return;

    const playerIndex = game.players.findIndex(p => p.id === socket.id);
    if (playerIndex === -1) return;

    const player = game.players[playerIndex];
    if (player.submitted) return;

    player.submittedValue = parseInt(data.value);
    player.submitted = true;

    const submittedCount = game.players.filter(p => p.submitted).length;
    console.log(`[Submit] "${player.name}" submitted ${player.submittedValue} (${submittedCount}/3)`);

    // Notify all game players about submission count
    game.players.forEach(p => {
      io.to(p.id).emit('player-submitted', { count: submittedCount });
    });

    // If all 3 submitted, compute and show results
    if (submittedCount === 3) {
      const product = game.players.reduce((acc, p) => acc * p.submittedValue, 1);
      const allRed = game.players.every(p => p.card === 'red');
      const anyBlue = game.players.some(p => p.card === 'blue');

      let victory = false;
      if (product === 1 && allRed) victory = true;
      if (product === -1 && anyBlue) victory = true;

      console.log(`[Results] Product=${product}, AllRed=${allRed}, AnyBlue=${anyBlue} → ${victory ? 'VICTORY' : 'DEFEAT'}`);

      game.phase = 'finished';

      const resultsData = {
        players: game.players.map(p => ({
          name: p.name,
          card: p.card,
          submittedValue: p.submittedValue
        })),
        product,
        victory
      };

      // Send results to all game players
      game.players.forEach(p => {
        io.to(p.id).emit('game-results', resultsData);
      });
    }
  });

  // ── Disconnect ───────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[Disconnect] ${socket.id}`);

    if (game.phase === 'lobby') {
      // Remove from lobby
      const removed = game.players.find(p => p.id === socket.id);
      game.players = game.players.filter(p => p.id !== socket.id);

      if (removed) {
        console.log(`[Lobby] "${removed.name}" left the lobby`);
        // Only notify remaining game players
        game.players.forEach(p => {
          io.to(p.id).emit('player-joined', {
            count: game.players.length,
            names: game.players.map(p2 => p2.name)
          });
        });
      }
    } else if (game.phase === 'playing') {
      // If a player disconnects during an active game, reset everything
      const wasInGame = game.players.some(p => p.id === socket.id);
      if (wasInGame) {
        const disconnectedName = game.players.find(p => p.id === socket.id)?.name;
        // Save other players' IDs before resetting
        const otherPlayerIds = game.players.filter(p => p.id !== socket.id).map(p => p.id);
        console.log(`[Game] "${disconnectedName}" disconnected during game. Resetting.`);
        resetGame();

        // Notify ONLY the other game players (not everyone)
        otherPlayerIds.forEach(id => {
          io.to(id).emit('player-disconnected', {
            message: `${disconnectedName} se desconectó. La partida se reinició.`
          });
        });
      }
    }
    // If game.phase === 'finished', disconnection doesn't affect anything
  });
});

// ─── Start Server ────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🔮 Quantum Game server running on port ${PORT}`);
  console.log(`   Open http://localhost:${PORT} in your browser\n`);
});
