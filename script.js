const SIZE = 3;

// true = black, false = white. Matches the favicon pattern.
let startState = [
  false, false, true,
  true,  false, false,
  true,  false, false,
];
let tiles = [...startState];
let mode = 'setup';
let moves = 0;

const gridEl = document.getElementById('grid');
const hintEl = document.getElementById('hint');
const statusEl = document.getElementById('status');
const modeButtons = document.querySelectorAll('[data-mode]');
const resetBtn = document.getElementById('reset');
const clearBtn = document.getElementById('clear');

const tileEls = tiles.map((_, i) => {
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

function onTileClick(i) {
  if (mode === 'setup') {
    tiles[i] = !tiles[i];
    startState = [...tiles];
  } else {
    for (const n of neighborsOf(i)) tiles[n] = !tiles[n];
    moves++;
  }
  render();
}

function setMode(next) {
  mode = next;
  // Entering play always begins from the configured start so the move count is meaningful.
  tiles = [...startState];
  moves = 0;
  render();
}

function render() {
  tiles.forEach((black, i) => {
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
    statusEl.textContent = `Moves: ${moves}`;
  }

  resetBtn.hidden = mode === 'setup';
  clearBtn.hidden = mode === 'play';
}

modeButtons.forEach((btn) => {
  btn.addEventListener('click', () => setMode(btn.dataset.mode));
});

resetBtn.addEventListener('click', () => setMode('play'));

document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return;
  // Every control is a button, so without this Space would also click whichever one has focus.
  e.preventDefault();
  if (!e.repeat) setMode(mode);
});

clearBtn.addEventListener('click', () => {
  startState = Array(SIZE * SIZE).fill(false);
  tiles = [...startState];
  render();
});

render();
