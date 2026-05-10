// Game state
let solution = [];
let board = [];
let initialBoard = [];
let selectedCell = null;
let timerInterval = null;
let secondsElapsed = 0;
let mistakes = 0;
const MAX_MISTAKES = 3;
let hintsLeft = 3;
const MAX_HINTS = 3;

// DOM Elements
const boardEl = document.getElementById('sudoku-board');
const timerEl = document.getElementById('timer');
const mistakesEl = document.getElementById('mistakes');
const difficultySelect = document.getElementById('difficulty-select');
const newGameBtn = document.getElementById('new-game-btn');
const hintBtn = document.getElementById('hint-btn');
const numBtns = document.querySelectorAll('.num-btn[data-val]');
const eraseBtn = document.getElementById('erase-btn');
const modal = document.getElementById('game-over-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalTime = document.getElementById('modal-time');
const modalNewGameBtn = document.getElementById('modal-new-game-btn');
const hintsLeftEl = document.getElementById('hints-left');
const fontSizeSelect = document.getElementById('font-size-select');

// --- Sudoku Generation ---
function generateSudoku(difficulty) {
    // 1. Generate filled valid board
    solution = Array(9).fill().map(() => Array(9).fill(0));
    fillBoard(solution);
    
    // 2. Copy to board
    board = solution.map(row => [...row]);
    
    // 3. Remove cells based on difficulty
    let cellsToRemove = 0;
    if (difficulty === 'very_easy') cellsToRemove = 20; // ~61 clues
    else if (difficulty === 'easy') cellsToRemove = 35; // ~46 clues
    else if (difficulty === 'medium') cellsToRemove = 45; // ~36 clues
    else if (difficulty === 'hard') cellsToRemove = 55; // ~26 clues
    else if (difficulty === 'expert') cellsToRemove = 62; // ~19 clues
    
    while(cellsToRemove > 0) {
        let r = Math.floor(Math.random() * 9);
        let c = Math.floor(Math.random() * 9);
        if (board[r][c] !== 0) {
            board[r][c] = 0;
            cellsToRemove--;
        }
    }
    
    // 4. Save initial state
    initialBoard = board.map(row => [...row]);
}

function fillBoard(board) {
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] === 0) {
                // Shuffle array for randomness
                nums.sort(() => Math.random() - 0.5);
                for (let num of nums) {
                    if (isValid(board, r, c, num)) {
                        board[r][c] = num;
                        if (fillBoard(board)) return true;
                        board[r][c] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function isValid(board, r, c, num) {
    for (let i = 0; i < 9; i++) {
        if (board[r][i] === num) return false;
        if (board[i][c] === num) return false;
    }
    let boxRow = Math.floor(r / 3) * 3;
    let boxCol = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[boxRow + i][boxCol + j] === num) return false;
        }
    }
    return true;
}

// --- UI Rendering ---
function renderBoard() {
    boardEl.innerHTML = '';
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.r = r;
            cell.dataset.c = c;
            
            const val = board[r][c];
            if (val !== 0) {
                cell.textContent = val;
                if (initialBoard[r][c] !== 0) {
                    cell.classList.add('fixed');
                }
            }
            
            cell.addEventListener('click', () => selectCell(r, c));
            boardEl.appendChild(cell);
        }
    }
    updateFontSize();
    updateHighlights();
}

function updateFontSize() {
    boardEl.classList.remove('font-small', 'font-medium', 'font-large');
    boardEl.classList.add(`font-${fontSizeSelect.value}`);
}

function selectCell(r, c) {
    selectedCell = {r, c};
    updateHighlights();
}

function updateHighlights() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.classList.remove('selected', 'related', 'highlight-num');
        const cr = parseInt(cell.dataset.r);
        const cc = parseInt(cell.dataset.c);

        if (selectedCell) {
            const {r, c} = selectedCell;
            
            // Highlight selected
            if (cr === r && cc === c) {
                cell.classList.add('selected');
            }
            
            // Highlight same numbers (Show this as a "hint")
            const val = cell.textContent;
            const selectedVal = board[r][c];
            if (selectedVal !== 0 && val == selectedVal && !(cr === r && cc === c)) {
                cell.classList.add('highlight-num');
            }
            // Removed crosshair highlight (row/col/box) per request
        }
    });
}

function updateCellDOM(r, c) {
    const cell = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
    if (board[r][c] === 0) {
        cell.textContent = '';
    } else {
        cell.textContent = board[r][c];
        cell.classList.add('pulse');
        setTimeout(() => cell.classList.remove('pulse'), 300);
    }
}

// --- Gameplay Interactions ---
function inputNumber(num) {
    if (!selectedCell) return;
    const {r, c} = selectedCell;
    
    // Cannot overwrite fixed cells or already correctly filled cells
    if (initialBoard[r][c] !== 0 || (board[r][c] !== 0 && board[r][c] === solution[r][c])) return;
    
    // Check if correct
    if (num === solution[r][c]) {
        board[r][c] = num;
        updateCellDOM(r, c);
        
        // Remove error class if exists
        const cell = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
        cell.classList.remove('error');
        
        updateHighlights();
        checkWin();
    } else {
        // Mistake
        mistakes++;
        mistakesEl.textContent = `錯誤: ${mistakes}/${MAX_MISTAKES}`;
        
        // Show error visually temporarily
        const cell = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
        cell.textContent = num;
        cell.classList.add('error');
        
        setTimeout(() => {
            cell.textContent = board[r][c] === 0 ? '' : board[r][c];
            cell.classList.remove('error');
        }, 1000);
        
        if (mistakes >= MAX_MISTAKES) {
            setTimeout(() => gameOver(false), 500); // Small delay to show last error
        }
    }
}

function eraseNumber() {
    if (!selectedCell) return;
    const {r, c} = selectedCell;
    // Cannot overwrite fixed cells or already correctly filled cells
    if (initialBoard[r][c] !== 0 || board[r][c] === solution[r][c]) return;
    
    board[r][c] = 0;
    updateCellDOM(r, c);
    updateHighlights();
}

function useHint() {
    if (!selectedCell || hintsLeft <= 0) return;
    const {r, c} = selectedCell;
    
    // If cell is already correct, don't waste a hint
    if (board[r][c] === solution[r][c]) return;
    
    inputNumber(solution[r][c]);
    hintsLeft--;
    hintsLeftEl.textContent = hintsLeft;
    
    if (hintsLeft === 0) {
        hintBtn.classList.add('disabled');
        hintBtn.style.opacity = '0.5';
        hintBtn.style.pointerEvents = 'none';
    }
}

function checkWin() {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] !== solution[r][c]) return;
        }
    }
    gameOver(true);
}

// --- Timer & State ---
function startTimer() {
    clearInterval(timerInterval);
    secondsElapsed = 0;
    updateTimerDOM();
    timerInterval = setInterval(() => {
        secondsElapsed++;
        updateTimerDOM();
    }, 1000);
}

function updateTimerDOM() {
    const m = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
    const s = (secondsElapsed % 60).toString().padStart(2, '0');
    timerEl.textContent = `${m}:${s}`;
}

function startNewGame() {
    mistakes = 0;
    mistakesEl.textContent = `錯誤: 0/${MAX_MISTAKES}`;
    selectedCell = null;
    modal.classList.add('hidden');
    
    generateSudoku(difficultySelect.value);
    renderBoard();
    startTimer();
    
    // Reset hints
    hintsLeft = MAX_HINTS;
    hintsLeftEl.textContent = hintsLeft;
    hintBtn.classList.remove('disabled');
    hintBtn.style.opacity = '1';
    hintBtn.style.pointerEvents = 'auto';
}

function gameOver(win) {
    clearInterval(timerInterval);
    modal.classList.remove('hidden');
    modal.classList.remove('game-over-loss');
    
    if (win) {
        modalTitle.textContent = '遊戲結束';
        modalMessage.textContent = '恭喜過關！你真棒！';
    } else {
        modal.classList.add('game-over-loss');
        modalTitle.textContent = '遊戲失敗';
        modalMessage.textContent = '錯誤次數過多，再試一次吧！';
    }
    
    const m = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
    const s = (secondsElapsed % 60).toString().padStart(2, '0');
    modalTime.querySelector('span').textContent = `${m}:${s}`;
}

// --- Event Listeners ---
newGameBtn.addEventListener('click', startNewGame);
modalNewGameBtn.addEventListener('click', startNewGame);
hintBtn.addEventListener('click', useHint);
difficultySelect.addEventListener('change', startNewGame);
fontSizeSelect.addEventListener('change', updateFontSize);

numBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Prevent focusing the button to keep focus on body for keyboard events if needed
        e.preventDefault();
        inputNumber(parseInt(btn.dataset.val));
    });
});

eraseBtn.addEventListener('click', eraseNumber);

// Keyboard support
window.addEventListener('keydown', (e) => {
    if (modal.classList.contains('hidden') === false) return;
    
    if (e.key >= '1' && e.key <= '9') {
        inputNumber(parseInt(e.key));
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
        eraseNumber();
    } else if (e.key === 'ArrowUp' && selectedCell) {
        selectCell(Math.max(0, selectedCell.r - 1), selectedCell.c);
    } else if (e.key === 'ArrowDown' && selectedCell) {
        selectCell(Math.min(8, selectedCell.r + 1), selectedCell.c);
    } else if (e.key === 'ArrowLeft' && selectedCell) {
        selectCell(selectedCell.r, Math.max(0, selectedCell.c - 1));
    } else if (e.key === 'ArrowRight' && selectedCell) {
        selectCell(selectedCell.r, Math.min(8, selectedCell.c + 1));
    }
});

// Initialize
startNewGame();
