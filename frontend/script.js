const yearSelect = document.getElementById('year-select');
const generateBtn = document.getElementById('generate-btn');
const solveBtn = document.getElementById('solve-btn');
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

let selectedAmount = null;
let puzzleStartTime = null;
let timerInterval = null;
let currentRow = 0;
let currentCol = 0;
let currentDirection = 'across';
let crosswordData = null;

// ===== Input Handling =====
function addInputListeners(input, row, col) {
	// Letter entry auto-advance
	input.addEventListener('input', () => {
		const val = input.value.toUpperCase().slice(-1); // keep last char
		input.value = val;

		if (val) moveNextCell(row, col);
		checkIfComplete();
	});

	// Navigation keys
	input.addEventListener('keydown', (e) => {
		switch (e.key) {
			case 'Backspace': {
				e.preventDefault();
				if (input.value) {
					input.value = '';
				} else {
					movePrevCell(row, col);
				}
				break;
			}
			case 'Enter':
				e.preventDefault();
				moveNextCell(row, col);
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

// ===== Cell Navigation Helpers =====
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
	if (!year) { showAlert('Select a year', "info"); return; }

	puzzleStartTime = Date.now();


	// clear any old timer
	if (timerInterval) clearInterval(timerInterval);

	const button = document.getElementById("generate-btn");
	button.textContent = "Loading...";

	try {
		const res = await fetch(`https://a-nyt-c.onrender.com/api/crosswords/${year}/random`);
		if (!res.ok) throw new Error('Failed to fetch random puzzle');

		const { puzzle } = await res.json();
		renderTitleCard(puzzle);
		renderCrossword(puzzle);
		renderClues(puzzle);

		const first = findFirstPlayableCell(puzzle);
		if (first) setActiveCell(first.row, first.col, currentDirection);

		// update every second
		timerInterval = setInterval(() => {
			const elapsedMs = Date.now() - puzzleStartTime;
			document.getElementById("timer").textContent = "⏱ " + formatTime(elapsedMs);
		}, 1000);

	} catch (err) {
		console.error(err);
		showAlert('Something went wrong fetching the puzzle. Try again.', "danger");
	}

	button.textContent = "Generate";
}

function renderTitleCard(puzzle) {
	const card = document.getElementById("title-card");

	card.classList.remove("hidden");

	card.innerHTML = `
		<div>
			<h5>Author: ${puzzle.author}</h5>
			<h5>Editor: ${puzzle.editor}</h5>
		</div>
		<p>${puzzle.dow}, ${puzzle.date}</p>
    `;

	// trigger the transition
	requestAnimationFrame(() => card.classList.add("show"));
}


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

function showAlert(message, type = "info") {
	const alertBox = document.getElementById("alert-box");

	alertBox.textContent = message;
	alertBox.className = ""; // reset
	alertBox.classList.add("show");

	// apply color variations
	switch (type) {
		case "success":
			alertBox.style.color = "var(--success)";
			alertBox.style.border = "5px solid var(--success)";
			break;
		case "danger":
			alertBox.style.color = "var(--danger)";
			alertBox.style.border = "5px solid var(--danger)";
			break;
		case "warning":
			alertBox.style.color = "var(--warning)";
			alertBox.style.border = "5px solid var(--warning)";
			break;
		default:
			alertBox.style.color = "var(--info)";
			alertBox.style.border = "5px solid var(--info)";
	}

	setTimeout(() => {
		alertBox.classList.remove("show");
	}, 1500);
}


function renderCrossword(data) {
	crosswordData = data;
	const puzzle = document.querySelector('.puzzle');
	puzzle.style.height = '100%'; // keep puzzle filling parent

	crosswordContainer.innerHTML = '';
	const { grid, gridnums, size } = data;

	for (let i = 0; i < size.rows; i++) {
		const rowDiv = document.createElement('div');
		rowDiv.classList.add('crossword-row');
		crosswordContainer.appendChild(rowDiv);

		for (let j = 0; j < size.cols; j++) {
			const cellDiv = document.createElement('div');
			cellDiv.classList.add('crossword-cell');
			cellDiv.dataset.row = i;
			cellDiv.dataset.col = j;
			rowDiv.appendChild(cellDiv);

			const cellValue = grid[i * size.cols + j];
			const gridnum = gridnums[i * size.cols + j];

			if (cellValue !== '.') {
				const input = document.createElement('input');
				let longPressTimer;

				input.type = 'text';
				input.maxLength = 1;
				input.setAttribute('inputmode', 'latin');
				cellDiv.appendChild(input);
				addInputListeners(input, i, j);

				// mobile long press toggles direction
				cellDiv.addEventListener("touchstart", () => {
					longPressTimer = setTimeout(() => {
						toggleDirection();
					}, 500);
				});

				cellDiv.addEventListener("touchend", () => {
					clearTimeout(longPressTimer);
				});

				// click to set active cell
				cellDiv.addEventListener('click', () => setActiveCell(i, j, currentDirection));

				// double-click to toggle direction
				cellDiv.addEventListener('dblclick', () => toggleDirection());
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
	acrossCluesDiv.classList.add('clues', 'across');
	acrossCluesDiv.innerHTML = `<h2>Across</h2>`;
	const acrossList = document.createElement('ul');

	data.clues.across.forEach(clue => {
		const li = document.createElement('li');
		li.textContent = clue;
		acrossList.appendChild(li);
	});

	acrossCluesDiv.appendChild(acrossList);

	const downCluesDiv = document.createElement('div');
	downCluesDiv.classList.add('clues', 'down');
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
}

// helpers: get clue index from gridnum
function getAcrossClue(gridnum, data) {
	// across clues are in order, so we map gridnums that start words
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

function moveToNeighbor(dx, dy) {
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

function formatTime(ms) {
	const totalSeconds = Math.floor(ms / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	return (
		hours.toString().padStart(1, "0") + ":" +
		minutes.toString().padStart(2, "0") + ":" +
		seconds.toString().padStart(2, "0")
	);
}


function onPuzzleSolved() {
	if (!puzzleStartTime) return;

	const elapsedMs = Date.now() - puzzleStartTime;

	// Stop timer
	clearInterval(timerInterval);
	timerInterval = null;

	// Format time as H:MM:SS
	const formattedTime = formatTime(elapsedMs);

	// Show success message
	showAlert(`🎉 Puzzle solved in ${formattedTime}!`, "success");

	// Reset puzzle timer
	puzzleStartTime = null;
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
				showAlert('Oof, not quite right. Keep trying!', 'danger');
				return;
			}
		}
	}
	onPuzzleSolved();
}

function checkIfComplete() {
	const { grid, size } = crosswordData;

	for (let i = 0; i < size.rows; i++) {
		for (let j = 0; j < size.cols; j++) {
			const sol = grid[i * size.cols + j];
			if (sol === '.') continue;

			const input = getInput(i, j);
			if (!input?.value) return; // still empty, not complete
		}
	}

	// If we reach here, all squares are filled → run full check
	checkSolution();
}

donateBtn.addEventListener('click', () => {
	donateModal.classList.remove('hidden');
});

closeModal.addEventListener('click', () => {
	donateModal.classList.add('hidden');
});

const customInput = document.getElementById("custom-amount");

donateOptions.forEach(btn => {
	btn.addEventListener("click", () => {
		const value = btn.dataset.amount;

		// If this button is already selected → deselect & focus custom input
		if (btn.classList.contains("selected")) {
			btn.classList.remove("selected");
			selectedAmount = null;
			return;
		}

		// Otherwise: clear all selections, then select this one
		document.querySelectorAll(".donate-option").forEach(btn => btn.classList.remove("selected"));
		btn.classList.add("selected");

		customInput.addEventListener("click", () => {
			btn.classList.remove("selected");
			selectedAmount = null;
		});

		if (value) {
			selectedAmount = parseFloat(value);
			customInput.value = ""; // clear custom if preset chosen
		} else {
			selectedAmount = null;
		}
	});
});


confirmDonate.addEventListener("click", () => {
	const value = +customInput.value || selectedAmount;
	const regex = /^\d+(\.\d{1,2})?$/;

	if (!value || !regex.test(value) || parseFloat(value) <= 0) {
		showAlert("Please select or enter a valid donation amount.", "danger");
		customInput.focus();
		return;
	}

	// 🔗 Here you’d call Stripe or your backend to handle payment

	fetch("https://a-nyt-c.onrender.com/api/donate", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ value }),
	})
		.then(response => response.json())
		.then(data => {
			if (data.url) {
				window.location.href = data.url;
			} else {
				showAlert("An error occurred while processing your donation.", "danger");
			}
		})
		.catch(error => {
			console.error("Error:", error);
			showAlert("An error occurred while processing your donation.", "danger");
		});
});

generateBtn.addEventListener('click', generateCrossword);
solveBtn.addEventListener('click', solvePuzzle);

// handle the beforeinstallprompt event 
window.addEventListener('beforeinstallprompt', e => {
	// prevent the install dialog from appearing too early
	e.preventDefault();

	// store the event for later use
	window.deferredPrompt = e;
});

// event listener for the install button click
installButton.addEventListener('click', () => {
	if (window.deferredPrompt) {
		window.deferredPrompt.prompt();
	}
}
);

if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('./service-worker.js')
			.then(reg => console.log('SW registered:', reg))
			.catch(err => console.error('SW failed:', err));
	});
}

window.addEventListener("DOMContentLoaded", () => {
	const params = new URLSearchParams(window.location.search);
	const status = params.get("status");

	if (status === "success") {
		showAlert("🎉 Thank you for your donation!", "success");
	} else if (status === "cancel") {
		showAlert("❌ Donation was canceled.", "warning");
	}

	// ✅ Clean the URL (so it doesn’t stay like ?status=success)
	if (status) {
		window.history.replaceState({}, document.title, window.location.pathname);
	}
});

window.addEventListener("DOMContentLoaded", () => {
	const disclaimerModal = document.getElementById("disclaimer-modal");
	const acceptBtn = document.getElementById("accept-disclaimer");

	// Close modal on click
	acceptBtn.addEventListener("click", () => {
		disclaimerModal.classList.add("hidden");
	});
});
