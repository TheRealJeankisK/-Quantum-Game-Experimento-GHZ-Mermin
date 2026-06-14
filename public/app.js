// ═══════════════════════════════════════════════════════════════
//  QUANTUM GAME — Client-side Logic
// ═══════════════════════════════════════════════════════════════

const socket = io({
  transports: ['polling', 'websocket'],
  upgrade: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});

// ── Client State ───────────────────────────────────────────────
let clientState = 'login'; // 'login' | 'waiting' | 'playing' | 'waitingSubmit' | 'results'

// ── DOM References ─────────────────────────────────────────────
const screens = {
  login: document.getElementById('screen-login'),
  waiting: document.getElementById('screen-waiting'),
  game: document.getElementById('screen-game'),
  waitingSubmit: document.getElementById('screen-waiting-submit'),
  results: document.getElementById('screen-results')
};

const els = {
  // Login
  nameInput: document.getElementById('player-name'),
  btnJoin: document.getElementById('btn-join'),
  errorMsg: document.getElementById('error-msg'),

  // Waiting
  playerCountText: document.getElementById('player-count-text'),
  playerList: document.getElementById('player-list'),

  // Game
  gamePlayerName: document.getElementById('game-player-name'),
  cardDisplay: document.getElementById('card-display'),
  colorChoice: document.getElementById('color-choice'),
  btnOracle: document.getElementById('btn-oracle'),
  oracleResult: document.getElementById('oracle-result'),
  oracleValue: document.getElementById('oracle-value'),
  valueChoice: document.getElementById('value-choice'),
  btnSubmit: document.getElementById('btn-submit'),

  // Waiting submit
  submitCountText: document.getElementById('submit-count-text'),

  // Results
  resultsBody: document.getElementById('results-body'),
  jointAnswer: document.getElementById('joint-answer'),
  resultBanner: document.getElementById('result-banner'),
  resultEmoji: document.getElementById('result-emoji'),
  resultText: document.getElementById('result-text'),
  btnNewGame: document.getElementById('btn-new-game')
};

// ── Screen Transitions ─────────────────────────────────────────
function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => {
    if (key === name) {
      el.classList.remove('hidden');
      el.classList.add('active');
    } else {
      el.classList.add('hidden');
      el.classList.remove('active');
    }
  });
  clientState = name;
}

// ── Particle Background ────────────────────────────────────────
function createParticles() {
  const container = document.getElementById('particles');
  const count = 30;

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';

    const size = Math.random() * 4 + 2;
    const left = Math.random() * 100;
    const duration = Math.random() * 15 + 10;
    const delay = Math.random() * 15;
    const hue = Math.random() > 0.5 ? '190' : '330'; // cyan or magenta

    particle.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${left}%;
      animation-duration: ${duration}s;
      animation-delay: ${delay}s;
      background: hsla(${hue}, 100%, 60%, 0.4);
      box-shadow: 0 0 ${size * 2}px hsla(${hue}, 100%, 60%, 0.3);
    `;

    container.appendChild(particle);
  }
}

createParticles();

// ── Login Logic ────────────────────────────────────────────────
els.nameInput.addEventListener('input', () => {
  els.btnJoin.disabled = !els.nameInput.value.trim();
  els.errorMsg.classList.add('hidden');
});

els.nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && els.nameInput.value.trim()) {
    els.btnJoin.click();
  }
});

els.btnJoin.addEventListener('click', () => {
  const name = els.nameInput.value.trim();
  if (!name) return;
  if (els.btnJoin.disabled) return;

  els.btnJoin.disabled = true;
  els.errorMsg.classList.add('hidden');
  socket.emit('join-game', { name });

  // Safety: re-enable button after 3 seconds if no response
  setTimeout(() => {
    if (clientState === 'login') {
      els.btnJoin.disabled = !els.nameInput.value.trim();
    }
  }, 3000);
});

// ── Game Controls ──────────────────────────────────────────────
els.colorChoice.addEventListener('change', () => {
  els.btnOracle.disabled = !els.colorChoice.value;
});

els.valueChoice.addEventListener('change', () => {
  els.btnSubmit.disabled = !els.valueChoice.value;
});

els.btnOracle.addEventListener('click', () => {
  if (!els.colorChoice.value) return;

  socket.emit('ask-oracle', { chosenColor: els.colorChoice.value });
  els.btnOracle.disabled = true;
  els.colorChoice.disabled = true;

  // Visual feedback
  els.btnOracle.querySelector('.btn-text').textContent = '⏳ Consultando...';
});

els.btnSubmit.addEventListener('click', () => {
  if (!els.valueChoice.value) return;

  socket.emit('submit-answer', { value: parseInt(els.valueChoice.value) });
  showScreen('waitingSubmit');
});

els.btnNewGame.addEventListener('click', () => {
  resetClientState();
  showScreen('login');
});

// ── Reset Client State ─────────────────────────────────────────
function resetClientState() {
  els.nameInput.value = '';
  els.nameInput.disabled = false;
  els.btnJoin.disabled = true;
  els.errorMsg.classList.add('hidden');

  els.colorChoice.value = '';
  els.colorChoice.disabled = false;
  els.btnOracle.disabled = true;
  els.btnOracle.querySelector('.btn-text').textContent = '🔮 Preguntar al oráculo';
  els.oracleResult.classList.add('hidden');

  els.valueChoice.value = '';
  els.btnSubmit.disabled = true;

  els.cardDisplay.className = 'card-display';
}

// ── Socket Event Handlers ──────────────────────────────────────

// Initial state on connect
socket.on('game-state', (data) => {
  if (clientState !== 'login') return; // Only handle if we're on login screen

  if (data.phase === 'playing') {
    els.errorMsg.textContent = 'Hay una partida en curso. Espera a que termine o recarga en unos minutos.';
    els.errorMsg.classList.remove('hidden');
    // Keep button enabled so user can retry
    els.btnJoin.disabled = !els.nameInput.value.trim();
  } else if (data.phase === 'finished' || data.phase === 'lobby') {
    // Game available, make sure button works
    els.errorMsg.classList.add('hidden');
    els.btnJoin.disabled = !els.nameInput.value.trim();
  }
});

// Game is full
socket.on('game-full', () => {
  els.errorMsg.textContent = 'El juego está lleno';
  els.errorMsg.classList.remove('hidden');
  els.btnJoin.disabled = false;
});

// Player joined the lobby
socket.on('player-joined', (data) => {
  // Only react if we're in login or waiting state
  if (clientState !== 'login' && clientState !== 'waiting') return;

  showScreen('waiting');
  els.playerCountText.textContent = `${data.count} / 3 jugadores`;

  // Build player list with empty slots
  let html = '';
  for (let i = 0; i < 3; i++) {
    if (i < data.names.length) {
      const initial = data.names[i].charAt(0).toUpperCase();
      html += `
        <div class="player-item">
          <div class="player-avatar">${initial}</div>
          <span class="player-item-name">${escapeHtml(data.names[i])}</span>
          <span class="player-item-status">✓ Conectado</span>
        </div>
      `;
    } else {
      html += `
        <div class="player-slot-empty">
          <div class="player-avatar">?</div>
          <span>Esperando jugador ${i + 1}...</span>
        </div>
      `;
    }
  }
  els.playerList.innerHTML = html;
});

// Game started — receive your card
socket.on('game-start', (data) => {
  showScreen('game');

  // Set card color
  els.cardDisplay.className = `card-display card-${data.card}`;
  els.cardDisplay.querySelector('.card-label').textContent =
    data.card === 'red' ? 'ROJA' : 'AZUL';

  // Show player name
  els.gamePlayerName.textContent = `Jugador ${data.playerIndex + 1}: ${escapeHtml(data.playerName)}`;
});

// Oracle response
socket.on('oracle-response', (data) => {
  els.oracleResult.classList.remove('hidden');

  const isPositive = data.value > 0;
  els.oracleValue.textContent = isPositive ? '+1' : '–1';
  els.oracleValue.className = `oracle-value ${isPositive ? 'oracle-positive' : 'oracle-negative'}`;

  els.btnOracle.querySelector('.btn-text').textContent = '🔮 Oráculo consultado';
});

// Player submitted count update
socket.on('player-submitted', (data) => {
  if (clientState === 'waitingSubmit') {
    els.submitCountText.textContent = `${data.count} / 3 han respondido`;
  }
});

// Game results
socket.on('game-results', (data) => {
  showScreen('results');

  // Build results table
  let tbody = '';
  data.players.forEach(p => {
    const cardClass = p.card === 'red' ? 'card-cell-red' : 'card-cell-blue';
    const cardText = p.card === 'red' ? 'Roja' : 'Azul';
    const valueText = p.submittedValue > 0 ? '+1' : '–1';

    tbody += `
      <tr>
        <td>${escapeHtml(p.name)}</td>
        <td class="card-cell ${cardClass}">${cardText}</td>
        <td class="value-cell">${valueText}</td>
      </tr>
    `;
  });
  els.resultsBody.innerHTML = tbody;

  // Joint answer
  const productText = data.product > 0 ? '+1' : '–1';
  els.jointAnswer.innerHTML = `
    <div class="joint-answer-label">Respuesta conjunta</div>
    <div class="joint-answer-value">${productText}</div>
  `;

  // Victory or defeat
  if (data.victory) {
    els.resultBanner.className = 'result-banner victory';
    els.resultEmoji.textContent = '🎉';
    els.resultText.textContent = '¡VICTORIA!';
  } else {
    els.resultBanner.className = 'result-banner defeat';
    els.resultEmoji.textContent = '😢';
    els.resultText.textContent = 'DERROTA :(';
  }
});

// Player disconnected during game
socket.on('player-disconnected', (data) => {
  if (clientState === 'playing' || clientState === 'waitingSubmit') {
    alert(data.message || 'Un jugador se desconectó. La partida se reinició.');
    resetClientState();
    showScreen('login');
  }
});

// ── Utility ────────────────────────────────────────────────────
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ── Reconnection Handling ──────────────────────────────────────
socket.on('connect', () => {
  console.log('Connected to server');
  // Re-enable button if we're on login screen
  if (clientState === 'login') {
    els.btnJoin.disabled = !els.nameInput.value.trim();
    els.errorMsg.classList.add('hidden');
  }
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

socket.io.on('reconnect', () => {
  console.log('Reconnected to server');
  // If we were in a game that's now lost, go back to login
  if (clientState === 'playing' || clientState === 'waitingSubmit' || clientState === 'waiting') {
    resetClientState();
    showScreen('login');
  }
  // If already on login, just re-enable the button
  if (clientState === 'login') {
    els.btnJoin.disabled = !els.nameInput.value.trim();
  }
});
