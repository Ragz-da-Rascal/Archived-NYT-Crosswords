const yearSelect = document.getElementById('year-select');
const generateBtn = document.getElementById('generate-btn');
const solveBtn = document.getElementById('solve-btn');
const checkBtn = document.getElementById('check-btn');
const crosswordContainer = document.getElementById('puzzle-container');
const cluesContainer = document.getElementById('clues-container');
const clueBar = document.getElementById('active-clue');
const donateBtn = document.getElementById('donate-btn');
const donateModal = document.getElementById('donate-modal');
const closeModal = document.getElementById('close-modal');
const confirmDonate = document.getElementById('confirm-donate');
const donateOptions = document.querySelectorAll('.donate-option');
const customAmount = document.getElementById('custom-amount');
const installButton = document.getElementById('install-btn');
const themeToggle = document.getElementById('theme-toggle');
const srAnnounce = document.getElementById('sr-announce');

let selectedAmount = null;
let puzzleStartTime = null;
let timerInterval = null;
let currentRow = 0;
let currentCol = 0;
let currentDirection = 'across';
let crosswordData = null;

function announce(msg) {
    if (srAnnounce) {
        srAnnounce.textContent = '';
        requestAnimationFrame(() => { srAnnounce.textContent = msg; });
    }
}

function addInputListeners(input, row, col) {
    input.addEventListener('input', () => {
        const val = input.value.toUpperCase().slice(-1);
        input.value = val;
        if (val) moveNextCell(row, col);
        checkIfComplete();
    });

    input.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'Backspace':
                e.preventDefault();
                if (input.value) {
                    input.value = '';
                } else {
                    movePrevCell(row, col);
                }
                break;
            case 'Enter':
            case 'Tab':
                e.preventDefault();
                toggleDirection();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                moveToNeighbor(-1, 0);
                break;
            case 'ArrowRight':
                e.preventDefault();
                moveToNeighbor(1, 0);
                break;
            case 'ArrowUp':
                e.preventDefault();
                moveToNeighbor(0, -1);
                break;
            case 'ArrowDown':
                e.preventDefault();
                moveToNeighbor(0, 1);
                break;
        }
    });
}

function moveNextCell(row, col) {
    setActiveCell(row, col, currentDirection);
    if (currentDirection === 'across') {
        let c = col + 1;
        while (c < crosswordData.size.cols && crosswordData.grid[row * crosswordData.size.cols + c] === '.') c++;
        if (c < crosswordData.size.cols) setActiveCell(row, c, currentDirection);
    } else {
        let r = row + 1;
        while (r < crosswordData.size.rows && crosswordData.grid[r * crosswordData.size.cols + col] === '.') r++;
        if (r < crosswordData.size.rows) setActiveCell(r, col, currentDirection);
    }
}

function movePrevCell(row, col) {
    if (currentDirection === 'across') {
        let c = col - 1;
        while (c >= 0 && crosswordData.grid[row * crosswordData.size.cols + c] === '.') c--;
        if (c >= 0) setActiveCell(row, c, currentDirection);
    } else {
        let r = row - 1;
        while (r >= 0 && crosswordData.grid[r * crosswordData.size.cols + col] === '.') r--;
        if (r >= 0) setActiveCell(r, col, currentDirection);
    }
}

async function generateCrossword() {
    const year = yearSelect.value;
    if (!year) { showAlert('Select a year', 'info'); return; }

    const button = document.getElementById('generate-btn');
    button.textContent = 'Loading\u2026';
    button.disabled = true;
    announce('Loading random puzzle\u2026');

    try {
        const res = await fetch('https://a-nyt-c.onrender.com/api/crosswords/' + year + '/random');
        if (!res.ok) throw new Error('Failed to fetch random puzzle');

        const { puzzle } = await res.json();
        renderTitleCard(puzzle);
        renderCrossword(puzzle);
        renderClues(puzzle);

        const first = findFirstPlayableCell(puzzle);
        if (first) setActiveCell(first.row, first.col, currentDirection);

        announce('Puzzle loaded successfully');
    } catch (err) {
        console.error(err);
        showAlert('Something went wrong fetching the puzzle. Try again.', 'danger');
        announce('Error loading puzzle');
    }

    puzzleStartTime = Date.now();

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        const elapsedMs = Date.now() - puzzleStartTime;
        document.getElementById('timer').textContent = '\u23F1 ' + formatTime(elapsedMs);
    }, 1000);

    button.textContent = 'Load Random Puzzle';
    button.disabled = false;
}

function renderTitleCard(puzzle) {
    const card = document.getElementById('title-card');

    card.classList.remove('hidden');

    card.innerHTML = ''
        + '<div class="meta-row">'
        + '<p class="meta-author"><span>Author</span> ' + escapeHtml(puzzle.author) + '</p>'
        + '<p class="meta-editor"><span>Editor</span> ' + escapeHtml(puzzle.editor) + '</p>'
        + '</div>'
        + '<p class="meta-date">' + escapeHtml(puzzle.dow) + ', ' + escapeHtml(puzzle.date) + '</p>';

    requestAnimationFrame(function () { card.classList.add('show'); });
}

function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function solvePuzzle() {
    if (!crosswordData) return;
    var confirmed = confirm('Reveal all answers? This cannot be undone.');
    if (!confirmed) return;

    var grid = crosswordData.grid;
    var size = crosswordData.size;
    for (var i = 0; i < size.rows; i++) {
        for (var j = 0; j < size.cols; j++) {
            var sol = grid[i * size.cols + j];
            if (sol === '.') continue;
            var input = getInput(i, j);
            if (input) input.value = sol.toUpperCase();
        }
    }
    announce('Puzzle answers revealed');
}

function showAlert(message, type) {
    var alertBox = document.getElementById('alert-box');
    if (!alertBox) return;

    alertBox.textContent = message;
    alertBox.className = '';
    alertBox.classList.add('show');

    switch (type) {
        case 'success':
            alertBox.style.borderLeft = '4px solid var(--color-success)';
            break;
        case 'danger':
            alertBox.style.borderLeft = '4px solid var(--color-error)';
            break;
        case 'warning':
            alertBox.style.borderLeft = '4px solid var(--color-warning)';
            break;
        default:
            alertBox.style.borderLeft = '4px solid var(--color-primary)';
    }

    announce(message);

    setTimeout(function () {
        alertBox.classList.remove('show');
    }, 2000);
}

function renderCrossword(data) {
    crosswordData = data;
    var puzzle = document.querySelector('.puzzle');
    puzzle.style.height = '100%';

    crosswordContainer.innerHTML = '';
    var grid = data.grid;
    var gridnums = data.gridnums;
    var size = data.size;

    for (let i = 0; i < size.rows; i++) {
        var rowDiv = document.createElement('div');
        rowDiv.classList.add('crossword-row');
        crosswordContainer.appendChild(rowDiv);

        for (let j = 0; j < size.cols; j++) {
            var cellDiv = document.createElement('div');
            cellDiv.classList.add('crossword-cell');
            cellDiv.dataset.row = i;
            cellDiv.dataset.col = j;
            rowDiv.appendChild(cellDiv);

            var cellValue = grid[i * size.cols + j];
            var gridnum = gridnums[i * size.cols + j];

            if (cellValue !== '.') {
                var input = document.createElement('input');
                let longPressTimer;

                input.type = 'text';
                input.maxLength = 1;
                input.setAttribute('inputmode', 'latin');
                input.setAttribute('aria-label', 'Row ' + (i + 1) + ', Column ' + (j + 1) + (gridnum ? ', clue ' + gridnum : ''));
                cellDiv.appendChild(input);
                addInputListeners(input, i, j);

                cellDiv.addEventListener('touchstart', function () {
                    longPressTimer = setTimeout(function () {
                        toggleDirection();
                    }, 500);
                });

                cellDiv.addEventListener('touchend', function () {
                    clearTimeout(longPressTimer);
                });

                cellDiv.addEventListener('click', function () { setActiveCell(i, j, currentDirection); });
                cellDiv.addEventListener('dblclick', function () { toggleDirection(); });
            } else {
                cellDiv.classList.add('black-cell');
            }

            if (gridnum !== 0) {
                var numSpan = document.createElement('span');
                numSpan.classList.add('gridnum');
                numSpan.textContent = gridnum;
                cellDiv.appendChild(numSpan);
            }
        }
    }
}

function findClueCell(gridnum, data) {
    var gridnums = data.gridnums;
    var size = data.size;
    for (var i = 0; i < size.rows; i++) {
        for (var j = 0; j < size.cols; j++) {
            if (gridnums[i * size.cols + j] === gridnum) {
                return { row: i, col: j };
            }
        }
    }
    return null;
}

function renderClues(data) {
    cluesContainer.innerHTML = '';
    var acrossCluesDiv = document.createElement('div');
    acrossCluesDiv.classList.add('across');
    var acrossHeading = document.createElement('h3');
    acrossHeading.classList.add('clue-group-heading');
    acrossHeading.textContent = 'Across';
    acrossCluesDiv.appendChild(acrossHeading);
    var acrossList = document.createElement('ul');

    data.clues.across.forEach(function (clue) {
        var li = document.createElement('li');
        li.textContent = clue;
        var num = parseInt(clue, 10);
        if (num) {
            var cell = findClueCell(num, data);
            if (cell) {
                li.classList.add('clickable');
                li.addEventListener('click', function () {
                    setActiveCell(cell.row, cell.col, 'across');
                });
            }
        }
        acrossList.appendChild(li);
    });

    acrossCluesDiv.appendChild(acrossList);

    var downCluesDiv = document.createElement('div');
    downCluesDiv.classList.add('down');
    var downHeading = document.createElement('h3');
    downHeading.classList.add('clue-group-heading');
    downHeading.textContent = 'Down';
    downCluesDiv.appendChild(downHeading);
    var downList = document.createElement('ul');
    data.clues.down.forEach(function (c) {
        var li = document.createElement('li');
        li.textContent = c;
        var num = parseInt(c, 10);
        if (num) {
            var cell = findClueCell(num, data);
            if (cell) {
                li.classList.add('clickable');
                li.addEventListener('click', function () {
                    setActiveCell(cell.row, cell.col, 'down');
                });
            }
        }
        downList.appendChild(li);
    });
    downCluesDiv.appendChild(downList);

    cluesContainer.appendChild(acrossCluesDiv);
    cluesContainer.appendChild(downCluesDiv);
}

function toggleTheme() {
    var root = document.documentElement;
    var theme = root.getAttribute('data-theme');

    root.setAttribute(
        'data-theme',
        theme === 'light' ? 'dark' : 'light'
    );

    themeToggle.textContent = theme === 'light' ? '\u263C' : '\u263E';
    announce('Theme switched to ' + (theme === 'light' ? 'dark' : 'light') + ' mode');
}

function getCell(row, col) {
    return document.querySelector(
        '.crossword-row:nth-child(' + (row + 1) + ') .crossword-cell:nth-child(' + (col + 1) + ')'
    );
}

function getInput(row, col) {
    var cell = getCell(row, col);
    return cell ? cell.querySelector('input') : null;
}

function getAcrossWordBounds(row, col, grid, size) {
    var start = col;
    while (start > 0 && grid[row * size.cols + (start - 1)] !== '.') start--;
    var end = col;
    while (end < size.cols - 1 && grid[row * size.cols + (end + 1)] !== '.') end++;
    return { start: start, end: end };
}

function getDownWordBounds(row, col, grid, size) {
    var start = row;
    while (start > 0 && grid[(start - 1) * size.cols + col] !== '.') start--;
    var end = row;
    while (end < size.rows - 1 && grid[(end + 1) * size.cols + col] !== '.') end++;
    return { start: start, end: end };
}

function highlightWord() {
    if (!crosswordData) return;
    var grid = crosswordData.grid;
    var size = crosswordData.size;

    document.querySelectorAll('.highlight').forEach(function (el) { el.classList.remove('highlight'); });
    document.querySelectorAll('.active-cell').forEach(function (el) { el.classList.remove('active-cell'); });

    if (grid[currentRow * size.cols + currentCol] === '.') return;

    if (currentDirection === 'across') {
        var bounds = getAcrossWordBounds(currentRow, currentCol, grid, size);
        for (var j = bounds.start; j <= bounds.end; j++) getCell(currentRow, j).classList.add('highlight');
    } else {
        var bounds = getDownWordBounds(currentRow, currentCol, grid, size);
        for (var i = bounds.start; i <= bounds.end; i++) getCell(i, currentCol).classList.add('highlight');
    }

    var activeCell = getCell(currentRow, currentCol);
    if (activeCell) {
        activeCell.classList.add('active-cell');
    }
}

function updateClueDisplay(row, col, direction, data) {
    if (!data) return;
    var grid = data.grid;
    var size = data.size;
    var gridnums = data.gridnums;

    var gridnum = null;

    if (direction === 'across') {
        var c = col;
        while (c > 0 && grid[row * size.cols + (c - 1)] !== '.') c--;
        gridnum = gridnums[row * size.cols + c];
    } else {
        var r = row;
        while (r > 0 && grid[(r - 1) * size.cols + col] !== '.') r--;
        gridnum = gridnums[r * size.cols + col];
    }

    if (!gridnum) {
        clueBar.textContent = '';
        return;
    }

    if (direction === 'across') {
        var idx = data.clues.across.findIndex(function (c) { return c.startsWith(gridnum + '.'); });
        clueBar.textContent = idx !== -1 ? data.clues.across[idx] : '';
    } else {
        var idx = data.clues.down.findIndex(function (c) { return c.startsWith(gridnum + '.'); });
        clueBar.textContent = idx !== -1 ? data.clues.down[idx] : '';
    }
}

function setActiveCell(row, col, direction) {
    currentRow = row;
    currentCol = col;
    currentDirection = direction;
    updateClueDisplay(row, col, direction, crosswordData);
    highlightWord();

    var input = getInput(row, col);
    if (input) {
        input.focus();
        input.select();
    }
}

function toggleDirection() {
    currentDirection = currentDirection === 'across' ? 'down' : 'across';
    updateClueDisplay(currentRow, currentCol, currentDirection, crosswordData);
    highlightWord();
    announce('Direction changed to ' + currentDirection);
}

function findFirstPlayableCell(data) {
    var grid = data.grid;
    var size = data.size;
    for (var i = 0; i < size.rows; i++) {
        for (var j = 0; j < size.cols; j++) {
            if (grid[i * size.cols + j] !== '.') return { row: i, col: j };
        }
    }
    return null;
}

function moveToNeighbor(dx, dy) {
    if (!crosswordData) return;
    var grid = crosswordData.grid;
    var size = crosswordData.size;
    var r = currentRow + dy;
    var c = currentCol + dx;

    while (r >= 0 && r < size.rows && c >= 0 && c < size.cols) {
        if (grid[r * size.cols + c] !== '.') {
            setActiveCell(r, c, currentDirection);
            return;
        }
        r += dy;
        c += dx;
    }
}

function formatTime(ms) {
    var totalSeconds = Math.floor(ms / 1000);
    var hours = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;

    return (
        hours.toString().padStart(1, '0') + ':' +
        minutes.toString().padStart(2, '0') + ':' +
        seconds.toString().padStart(2, '0')
    );
}

function onPuzzleSolved() {
    if (!puzzleStartTime) return;

    var elapsedMs = Date.now() - puzzleStartTime;

    clearInterval(timerInterval);
    timerInterval = null;

    var formattedTime = formatTime(elapsedMs);

    showAlert('Puzzle solved in ' + formattedTime + '!', 'success');
    announce('Congratulations! Puzzle solved in ' + formattedTime);

    puzzleStartTime = null;
}

function checkSolution() {
    if (!crosswordData) return;
    var grid = crosswordData.grid;
    var size = crosswordData.size;
    for (var i = 0; i < size.rows; i++) {
        for (var j = 0; j < size.cols; j++) {
            var sol = grid[i * size.cols + j];
            if (sol === '.') continue;
            var input = getInput(i, j);
            var val = (input ? input.value : '').toUpperCase();
            if (val !== sol.toUpperCase()) {
                showAlert('Not quite right. Keep trying!', 'danger');
                return;
            }
        }
    }
    onPuzzleSolved();
}

function checkIfComplete() {
    if (!crosswordData) return;
    var grid = crosswordData.grid;
    var size = crosswordData.size;

    for (var i = 0; i < size.rows; i++) {
        for (var j = 0; j < size.cols; j++) {
            var sol = grid[i * size.cols + j];
            if (sol === '.') continue;

            var input = getInput(i, j);
            if (!input || !input.value) return;
        }
    }

    checkSolution();
}

donateBtn.addEventListener('click', function () {
    donateModal.classList.remove('hidden');
});

closeModal.addEventListener('click', function () {
    donateModal.classList.add('hidden');
});

donateOptions.forEach(function (btn) {
    btn.addEventListener('click', function () {
        var value = btn.dataset.amount;

        if (btn.classList.contains('selected')) {
            btn.classList.remove('selected');
            selectedAmount = null;
            return;
        }

        document.querySelectorAll('.donate-option').forEach(function (b) { b.classList.remove('selected'); });
        btn.classList.add('selected');

        customAmount.addEventListener('click', function () {
            btn.classList.remove('selected');
            selectedAmount = null;
        });

        if (value) {
            selectedAmount = parseFloat(value);
            customAmount.value = '';
        } else {
            selectedAmount = null;
        }
    });
});

confirmDonate.addEventListener('click', function () {
    var value = +customAmount.value || selectedAmount;
    var regex = /^\d+(\.\d{1,2})?$/;

    if (!value || !regex.test(value) || parseFloat(value) <= 0) {
        showAlert('Please select or enter a valid donation amount.', 'danger');
        customAmount.focus();
        return;
    }

    fetch('https://a-nyt-c.onrender.com/api/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: value }),
    })
        .then(function (response) { return response.json(); })
        .then(function (data) {
            if (data.url) {
                window.location.href = data.url;
            } else {
                showAlert('An error occurred while processing your donation.', 'danger');
            }
        })
        .catch(function (error) {
            console.error('Error:', error);
            showAlert('An error occurred while processing your donation.', 'danger');
        });
});

generateBtn.addEventListener('click', generateCrossword);
solveBtn.addEventListener('click', solvePuzzle);
checkBtn.addEventListener('click', checkSolution);
themeToggle.addEventListener('click', toggleTheme);

window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.deferredPrompt = e;
});

installButton.addEventListener('click', function () {
    if (window.deferredPrompt) {
        window.deferredPrompt.prompt();
    }
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('./service-worker.js?v=' + Date.now())
            .then(function (reg) { console.log('SW registered:', reg); })
            .catch(function (err) { console.error('SW failed:', err); });
    });
}

window.addEventListener('DOMContentLoaded', function () {
    var params = new URLSearchParams(window.location.search);
    var status = params.get('status');

    if (status === 'success') {
        showAlert('Thank you for your donation!', 'success');
    } else if (status === 'cancel') {
        showAlert('Donation was canceled.', 'warning');
    }

    if (status) {
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});

window.addEventListener('DOMContentLoaded', function () {
    var disclaimerModal = document.getElementById('disclaimer-modal');
    var acceptBtn = document.getElementById('accept-disclaimer');

    acceptBtn.addEventListener('click', function () {
        disclaimerModal.classList.add('hidden');
    });
});
