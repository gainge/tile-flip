const SIZE = 3;
const STORAGE_KEY = 'tile-flip.saves';

// true = black, false = white. Matches the favicon pattern.
let startState = [
  false, false, true,
  true,  false, false,
  true,  false, false,
];
let moves = []; // indices of tiles clicked in play mode
let cursor = 0; // how many of `moves` are applied to the board
let mode = 'setup';
let saves = loadSaves();
// Used to tell whether the current sequence would be lost by loading another one.
let savedSnapshot = snapshot();

const gridEl = document.getElementById('grid');
const hintEl = document.getElementById('hint');
const statusEl = document.getElementById('status');
const modeButtons = document.querySelectorAll('[data-mode]');
const clearBtn = document.getElementById('clear');
const firstBtn = document.getElementById('first');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const lastBtn = document.getElementById('last');
const historyEl = document.getElementById('history');
const savesEl = document.getElementById('saves');
const savesEmptyEl = document.getElementById('saves-empty');
const saveBtn = document.getElementById('save');

const tileEls = startState.map((_, i) => {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'tile';
  el.addEventListener('click', () => onTileClick(i));
  gridEl.appendChild(el);
  return el;
});

function neighborsOf(i) {
  const row = Math.floor(i / SIZE);
  const col = i % SIZE;
  const result = [i];
  if (row > 0) result.push(i - SIZE);
  if (row < SIZE - 1) result.push(i + SIZE);
  if (col > 0) result.push(i - 1);
  if (col < SIZE - 1) result.push(i + 1);
  return result;
}

function applyMove(board, i) {
  const next = [...board];
  for (const n of neighborsOf(i)) next[n] = !next[n];
  return next;
}

function boardAt(step) {
  return moves.slice(0, step).reduce(applyMove, startState);
}

function describeMove(i) {
  return `Row ${Math.floor(i / SIZE) + 1}, Col ${(i % SIZE) + 1}`;
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function snapshot() {
  return JSON.stringify({ start: startState, moves });
}

function confirmDiscardAll() {
  return moves.length === 0
    || confirm(`Changing the starting layout will discard ${plural(moves.length, 'recorded move')}. Continue?`);
}

function onTileClick(i) {
  if (mode === 'setup') {
    if (!confirmDiscardAll()) return;
    startState = [...startState];
    startState[i] = !startState[i];
    moves = [];
    cursor = 0;
  } else {
    const later = moves.length - cursor;
    if (later > 0 && !confirm(`Making a move here will discard ${plural(later, 'later move')}. Continue?`)) {
      return;
    }
    moves = [...moves.slice(0, cursor), i];
    cursor = moves.length;
  }
  render();
}

function setMode(next) {
  mode = next;
  render();
}

function goTo(step) {
  mode = 'play';
  cursor = Math.max(0, Math.min(step, moves.length));
  render();
}

function isValidSave(s) {
  return s && typeof s.id === 'string' && typeof s.name === 'string'
    && Array.isArray(s.start) && s.start.length === SIZE * SIZE
    && s.start.every((t) => typeof t === 'boolean')
    && Array.isArray(s.moves)
    && s.moves.every((m) => Number.isInteger(m) && m >= 0 && m < SIZE * SIZE);
}

function loadSaves() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(isValidSave) : [];
  } catch {
    return [];
  }
}

function writeSaves(next) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    alert('Could not save: browser storage is unavailable.');
    return false;
  }
  saves = next;
  return true;
}

function saveSequence() {
  const name = prompt('Name this sequence:', `Sequence ${saves.length + 1}`);
  if (name === null) return;
  const entry = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || `Sequence ${saves.length + 1}`,
    savedAt: Date.now(),
    start: [...startState],
    moves: [...moves],
  };
  if (writeSaves([...saves, entry])) {
    savedSnapshot = snapshot();
    render();
  }
}

function loadSequence(save) {
  const dirty = moves.length > 0 && snapshot() !== savedSnapshot;
  if (dirty && !confirm(`Loading "${save.name}" will replace your unsaved moves. Continue?`)) return;
  startState = [...save.start];
  moves = [...save.moves];
  savedSnapshot = snapshot();
  goTo(moves.length);
}

function deleteSequence(save) {
  if (!confirm(`Delete "${save.name}"?`)) return;
  if (writeSaves(saves.filter((s) => s.id !== save.id))) render();
}

function miniBoard(board) {
  const el = document.createElement('span');
  el.className = 'mini';
  el.setAttribute('aria-hidden', 'true');
  for (const black of board) {
    const cell = document.createElement('span');
    if (black) cell.className = 'black';
    el.appendChild(cell);
  }
  return el;
}

function entryButton(board, label, meta) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'entry';
  const text = document.createElement('span');
  text.textContent = label;
  if (meta) {
    const metaEl = document.createElement('span');
    metaEl.className = 'meta';
    metaEl.textContent = meta;
    text.appendChild(metaEl);
  }
  btn.append(miniBoard(board), text);
  return btn;
}

function renderHistory() {
  historyEl.replaceChildren();
  let board = startState;
  for (let step = 0; step <= moves.length; step++) {
    if (step > 0) board = applyMove(board, moves[step - 1]);
    const label = step === 0 ? 'Start' : `${step}. ${describeMove(moves[step - 1])}`;
    const btn = entryButton(board, label);
    if (step === cursor) btn.setAttribute('aria-current', 'step');
    if (step > cursor) btn.classList.add('future');
    btn.addEventListener('click', () => goTo(step));
    const li = document.createElement('li');
    li.appendChild(btn);
    historyEl.appendChild(li);
  }

  // Scrolls only the list; scrollIntoView would also scroll the page on every move.
  const current = historyEl.querySelector('[aria-current="step"]');
  if (current) {
    const top = current.offsetTop;
    const bottom = top + current.offsetHeight;
    if (top < historyEl.scrollTop) historyEl.scrollTop = top;
    else if (bottom > historyEl.scrollTop + historyEl.clientHeight) {
      historyEl.scrollTop = bottom - historyEl.clientHeight;
    }
  }
}

function renderSaves() {
  savesEl.replaceChildren();
  for (const save of saves) {
    const date = new Date(save.savedAt).toLocaleString();
    const loadBtn = entryButton(save.start, save.name, `${plural(save.moves.length, 'move')} · ${date}`);
    loadBtn.addEventListener('click', () => loadSequence(save));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete';
    deleteBtn.textContent = '✕';
    deleteBtn.setAttribute('aria-label', `Delete ${save.name}`);
    deleteBtn.addEventListener('click', () => deleteSequence(save));

    const li = document.createElement('li');
    li.append(loadBtn, deleteBtn);
    savesEl.appendChild(li);
  }
  savesEmptyEl.hidden = saves.length > 0;
}

function render() {
  const board = mode === 'setup' ? startState : boardAt(cursor);
  board.forEach((black, i) => {
    tileEls[i].classList.toggle('black', black);
    tileEls[i].setAttribute('aria-label', `Tile ${i + 1}: ${black ? 'black' : 'white'}`);
  });

  modeButtons.forEach((btn) => {
    btn.setAttribute('aria-checked', String(btn.dataset.mode === mode));
  });

  if (mode === 'setup') {
    hintEl.textContent = 'Click tiles to set the starting pattern.';
    statusEl.textContent = '';
  } else {
    hintEl.textContent = 'Clicking a tile flips it and its neighbors.';
    statusEl.textContent = `Move ${cursor} of ${moves.length}`;
  }

  clearBtn.hidden = mode === 'play';
  const atStart = mode === 'play' && cursor === 0;
  const atEnd = mode === 'play' && cursor === moves.length;
  firstBtn.disabled = atStart;
  prevBtn.disabled = atStart;
  nextBtn.disabled = atEnd;
  lastBtn.disabled = atEnd;
  saveBtn.disabled = moves.length === 0;

  renderHistory();
  renderSaves();
}

modeButtons.forEach((btn) => {
  btn.addEventListener('click', () => setMode(btn.dataset.mode));
});

firstBtn.addEventListener('click', () => goTo(0));
prevBtn.addEventListener('click', () => goTo(cursor - 1));
nextBtn.addEventListener('click', () => goTo(cursor + 1));
lastBtn.addEventListener('click', () => goTo(moves.length));
saveBtn.addEventListener('click', saveSequence);

document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return;
  // Every control is a button, so without this Space would also click whichever one has focus.
  e.preventDefault();
  if (e.repeat || mode !== 'play') return;
  // A fresh attempt, unlike « Start, which keeps the history to step through.
  moves = [];
  goTo(0);
});

clearBtn.addEventListener('click', () => {
  if (!confirmDiscardAll()) return;
  startState = Array(SIZE * SIZE).fill(false);
  moves = [];
  cursor = 0;
  render();
});

render();
