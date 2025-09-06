function toggleTheme() {
  const root = document.documentElement;
  const theme = root.getAttribute("data-theme");
  const torch = document.getElementById("theme-toggle");

  root.setAttribute(
    "data-theme",
    theme === "light" ? "dark" : "light"
  );

  torch.textContent = theme === "light" ? "☼" : "\u263E";
}

const yearSelect = document.getElementById('year-select');
const generateBtn = document.getElementById('generate-btn');
const crosswordContainer = document.getElementById('puzzle-container');
const cluesContainer = document.getElementById('clues-container');
const clueBar = document.getElementById('active-clue');

let currentRow = 0;
let currentCol = 0;
let currentDirection = 'across';
let crosswordData = null;

generateBtn.addEventListener('click', generateCrossword);

async function generateCrossword() {
  const year = yearSelect.value;
  if (!year) { alert('Select a year'); return; }

  const button = document.getElementById("generate-btn");
  button.textContent = "Loading...";

  try {
    const res = await fetch(`http://localhost:3001/api/crosswords/${year}/random`);
    if (!res.ok) throw new Error('Failed to fetch random puzzle');

    const { puzzle } = await res.json();
    renderCrossword(puzzle);
    renderClues(puzzle);

    const first = findFirstPlayableCell(puzzle);
    if (first) setActiveCell(first.row, first.col, currentDirection);

  } catch (err) {
    console.error(err);
    alert('Something went wrong fetching the puzzle');
  }

  button.textContent = "Generate";
}


document.getElementById('solve-btn').addEventListener('click', solvePuzzle);

function solvePuzzle() {
  const { grid, size } = crosswordData;
  for (let i = 0; i < size.rows; i++) {
    for (let j = 0; j < size.cols; j++) {
      const sol = grid[i * size.cols + j];
      if (sol === '.') continue;
      const input = getInput(i, j);
      if (input) input.value = sol.toUpperCase();
    }
  }
}


function renderCrossword(data) {
  crosswordData = data;
  crosswordContainer.innerHTML = '';
  const { grid, gridnums, size } = data;

  for (let i = 0; i < size.rows; i++) {
    const rowDiv = document.createElement('div');
    rowDiv.classList.add('crossword-row');
    crosswordContainer.appendChild(rowDiv);

    for (let j = 0; j < size.cols; j++) {
      const cellDiv = document.createElement('div');
      cellDiv.classList.add('crossword-cell');
      // tag coordinates for quick lookup
      cellDiv.dataset.row = i;
      cellDiv.dataset.col = j;
      rowDiv.appendChild(cellDiv);

      const cellValue = grid[i * size.cols + j];
      const gridnum = gridnums[i * size.cols + j];

      if (cellValue !== '.') {
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 1;
        input.setAttribute('inputmode', 'latin');
        cellDiv.appendChild(input);

        // click to set active
        cellDiv.addEventListener('click', () => setActiveCell(i, j, currentDirection));

        // double-click to toggle direction
        cellDiv.addEventListener('dblclick', () => {
          toggleDirection();
        });
      } else {
        cellDiv.classList.add('black-cell');
      }

      if (gridnum !== 0) {
        const numSpan = document.createElement('span');
        numSpan.classList.add('gridnum');
        numSpan.textContent = gridnum;
        cellDiv.appendChild(numSpan);
      }
    }
  }
}

function renderClues(data) {
  cluesContainer.innerHTML = '';
  const acrossCluesDiv = document.createElement('div');
  acrossCluesDiv.classList.add('clues');
  acrossCluesDiv.innerHTML = `<h2>Across</h2>`;
  const acrossList = document.createElement('ul');
  data.clues.across.forEach(c => {
    const li = document.createElement('li');
    li.textContent = c;
    acrossList.appendChild(li);
  });
  acrossCluesDiv.appendChild(acrossList);

  const downCluesDiv = document.createElement('div');
  downCluesDiv.classList.add('clues');
  downCluesDiv.innerHTML = `<h2>Down</h2>`;
  const downList = document.createElement('ul');
  data.clues.down.forEach(c => {
    const li = document.createElement('li');
    li.textContent = c;
    downList.appendChild(li);
  });
  downCluesDiv.appendChild(downList);

  cluesContainer.appendChild(acrossCluesDiv);
  cluesContainer.appendChild(downCluesDiv);
}

// ===== navigation & highlighting =====

function getCell(row, col) {
  return document.querySelector(
    `.crossword-row:nth-child(${row + 1}) .crossword-cell:nth-child(${col + 1})`
  );
}
function getInput(row, col) {
  const cell = getCell(row, col);
  return cell ? cell.querySelector('input') : null;
}

function getAcrossWordBounds(row, col, grid, size) {
  let start = col;
  while (start > 0 && grid[row * size.cols + (start - 1)] !== '.') start--;
  let end = col;
  while (end < size.cols - 1 && grid[row * size.cols + (end + 1)] !== '.') end++;
  return { start, end };
}
function getDownWordBounds(row, col, grid, size) {
  let start = row;
  while (start > 0 && grid[(start - 1) * size.cols + col] !== '.') start--;
  let end = row;
  while (end < size.rows - 1 && grid[(end + 1) * size.cols + col] !== '.') end++;
  return { start, end };
}

function highlightWord() {
  const { grid, size } = crosswordData;

  // clear
  document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
  document.querySelectorAll('.active').forEach(el => el.classList.remove('active'));

  if (grid[currentRow * size.cols + currentCol] === '.') return;

  if (currentDirection === 'across') {
    const { start, end } = getAcrossWordBounds(currentRow, currentCol, grid, size);
    for (let j = start; j <= end; j++) getCell(currentRow, j).classList.add('highlight');
  } else {
    const { start, end } = getDownWordBounds(currentRow, currentCol, grid, size);
    for (let i = start; i <= end; i++) getCell(i, currentCol).classList.add('highlight');
  }

  // emphasize active cell
  const activeCell = getCell(currentRow, currentCol);
  if (activeCell) activeCell.classList.add('active');
}

// helpers: get clue index from gridnum
function getAcrossClue(gridnum, data) {
  // across clues are in order, so we map gridnums that start words
  let acrossStarts = data.gridnums.filter(n => n > 0); // all clue numbers
  let idx = Object.values(data.clues.across).findIndex(clue => clue.startsWith(gridnum + "."));
  if (idx !== -1) {
    return { number: gridnum, text: data.clues.across[idx] };
  }
  return null;
}

function getDownClue(gridnum, data) {
  let idx = Object.values(data.clues.down).findIndex(clue => clue.startsWith(gridnum + "."));
  if (idx !== -1) {
    return { number: gridnum, text: data.clues.down[idx] };
  }
  return null;
}

// called whenever active cell/direction changes
function updateClueDisplay(row, col, direction, data) {
  const { grid, size, gridnums } = data;

  let gridnum = null;

  if (direction === 'across') {
    // walk left until word start
    let c = col;
    while (c > 0 && grid[row * size.cols + (c - 1)] !== '.') c--;
    gridnum = gridnums[row * size.cols + c];
  } else {
    // walk up until word start
    let r = row;
    while (r > 0 && grid[(r - 1) * size.cols + col] !== '.') r--;
    gridnum = gridnums[r * size.cols + col];
  }

  if (!gridnum) {
    clueBar.textContent = '';
    return;
  }

  if (direction === 'across') {
    const idx = data.clues.across.findIndex(c => c.startsWith(gridnum + "."));
    clueBar.textContent = idx !== -1 ? data.clues.across[idx] : '';
  } else {
    const idx = data.clues.down.findIndex(c => c.startsWith(gridnum + "."));
    clueBar.textContent = idx !== -1 ? data.clues.down[idx] : '';
  }
}


function setActiveCell(row, col, direction) {
  currentRow = row;
  currentCol = col;
  updateClueDisplay(row, col, direction, crosswordData);
  highlightWord();

  const input = getInput(row, col);
  if (input) {
    input.focus();
    input.select(); // overwrite on next key
  }
}

function moveNext() {
  const { grid, size } = crosswordData;
  if (currentDirection === 'across') {
    let c = currentCol + 1;
    while (c < size.cols && grid[currentRow * size.cols + c] === '.') c++;
    if (c < size.cols) setActiveCell(currentRow, c, currentDirection);
  } else {
    let r = currentRow + 1;
    while (r < size.rows && grid[r * size.cols + currentCol] === '.') r++;
    if (r < size.rows) setActiveCell(r, currentCol, currentDirection);
  }
}
function movePrev() {
  const { grid, size } = crosswordData;
  if (currentDirection === 'across') {
    let c = currentCol - 1;
    while (c >= 0 && grid[currentRow * size.cols + c] === '.') c--;
    if (c >= 0) setActiveCell(currentRow, c, currentDirection);
  } else {
    let r = currentRow - 1;
    while (r >= 0 && grid[r * size.cols + currentCol] === '.') r--;
    if (r >= 0) setActiveCell(r, currentCol, currentDirection);
  }
}
function toggleDirection() {
  currentDirection = currentDirection === 'across' ? 'down' : 'across';
  updateClueDisplay(currentRow, currentCol, currentDirection, crosswordData);
  highlightWord();
}

function findFirstPlayableCell(data) {
  const { grid, size } = data;
  for (let i = 0; i < size.rows; i++) {
    for (let j = 0; j < size.cols; j++) {
      if (grid[i * size.cols + j] !== '.') return { row: i, col: j };
    }
  }
  return null;
}

// Global typing/navigation
document.addEventListener('keydown', (e) => {
  if (!crosswordData) return;

  const letter = e.key.length === 1 && /[a-zA-Z]/.test(e.key) ? e.key.toUpperCase() : null;
  if (letter) {
    const input = getInput(currentRow, currentCol);
    if (input) {
      input.value = letter;
      moveNext();
      e.preventDefault();
    }
    return;
  }

  switch (e.key) {
    case 'Backspace': {
      const input = getInput(currentRow, currentCol);
      if (input && input.value) {
        input.value = '';
      } else {
        movePrev();
        const prev = getInput(currentRow, currentCol);
        if (prev) prev.value = '';
      }
      e.preventDefault();
      break;
    }
    case 'ArrowLeft':
      moveToNeighbor(-1, 0);
      e.preventDefault();
      break;
    case 'ArrowRight':
      moveToNeighbor(1, 0);
      e.preventDefault();
      break;
    case 'ArrowUp':
      moveToNeighbor(0, -1);
      e.preventDefault();
      break;
    case 'ArrowDown':
      moveToNeighbor(0, 1);
      e.preventDefault();
      break;
    case ' ':
    case 'Enter':
    case 'Tab':
      toggleDirection();
      e.preventDefault();
      break;
    default:
      break;
  }
});

function moveToNeighbor(dx, dy) {
  // dx = +/-1 (cols), dy = +/-1 (rows)
  const { grid, size } = crosswordData;
  let r = currentRow + dy;
  let c = currentCol + dx;
  while (r >= 0 && r < size.rows && c >= 0 && c < size.cols) {
    if (grid[r * size.cols + c] !== '.') {
      setActiveCell(r, c, currentDirection);
      return;
    }
    r += dy;
    c += dx;
  }
}

// ===== solution checking (per-letter vs the solution grid) =====
function checkSolution() {
  const { grid, size } = crosswordData;
  for (let i = 0; i < size.rows; i++) {
    for (let j = 0; j < size.cols; j++) {
      const sol = grid[i * size.cols + j];
      if (sol === '.') continue;
      const input = getInput(i, j);
      const val = (input?.value || '').toUpperCase();
      if (val !== sol.toUpperCase()) {
        alert('Oof, not quite right. Keep trying!');
        return;
      }
    }
  }
  alert('Congratulations, you solved the crossword!');
}
