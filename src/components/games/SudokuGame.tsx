import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Check, HelpCircle } from 'lucide-react';

type Difficulty = 'easy' | 'medium' | 'hard';

// Helper to check if a number can be placed in a cell
const isValid = (board: number[][], row: number, col: number, num: number) => {
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === num) return false;
    if (board[i][col] === num) return false;
  }
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[startRow + i][startCol + j] === num) return false;
    }
  }
  return true;
};

// Solve the board using backtracking
const solveBoard = (board: number[][]): boolean => {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        for (let num = 1; num <= 9; num++) {
          if (isValid(board, row, col, num)) {
            board[row][col] = num;
            if (solveBoard(board)) return true;
            board[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
};

// Generate a full valid board
const generateFullBoard = (): number[][] => {
  const board = Array(9).fill(0).map(() => Array(9).fill(0));
  
  // Fill diagonal 3x3 boxes first (independent)
  for (let i = 0; i < 9; i += 3) {
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
    let idx = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        board[i + r][i + c] = nums[idx++];
      }
    }
  }
  
  solveBoard(board);
  return board;
};

const generatePuzzle = (difficulty: Difficulty) => {
  const solution = generateFullBoard();
  const puzzle = solution.map(row => [...row]);
  
  let cellsToRemove = 40;
  if (difficulty === 'medium') cellsToRemove = 50;
  if (difficulty === 'hard') cellsToRemove = 60;
  
  while (cellsToRemove > 0) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);
    if (puzzle[row][col] !== 0) {
      puzzle[row][col] = 0;
      cellsToRemove--;
    }
  }
  
  return { puzzle, solution };
};

export default function SudokuGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [board, setBoard] = useState<number[][]>(Array(9).fill(0).map(() => Array(9).fill(0)));
  const [initialBoard, setInitialBoard] = useState<number[][]>(Array(9).fill(0).map(() => Array(9).fill(0)));
  const [solution, setSolution] = useState<number[][]>(Array(9).fill(0).map(() => Array(9).fill(0)));
  const [selectedCell, setSelectedCell] = useState<{r: number, c: number} | null>(null);
  const [errors, setErrors] = useState<{r: number, c: number}[]>([]);
  const [isWon, setIsWon] = useState(false);

  const initGame = useCallback(() => {
    const { puzzle, solution: sol } = generatePuzzle(difficulty);
    setBoard(puzzle.map(row => [...row]));
    setInitialBoard(puzzle.map(row => [...row]));
    setSolution(sol);
    setSelectedCell(null);
    setErrors([]);
    setIsWon(false);
  }, [difficulty]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const handleCellClick = (r: number, c: number) => {
    if (initialBoard[r][c] === 0 && !isWon) {
      setSelectedCell({ r, c });
    } else {
      setSelectedCell(null);
    }
  };

  const handleNumberInput = (num: number) => {
    if (!selectedCell || isWon) return;
    
    const { r, c } = selectedCell;
    const newBoard = [...board];
    newBoard[r][c] = num;
    setBoard(newBoard);
    
    // Check if correct
    if (num !== 0 && num !== solution[r][c]) {
      if (!errors.some(e => e.r === r && e.c === c)) {
        setErrors([...errors, { r, c }]);
      }
    } else {
      setErrors(errors.filter(e => !(e.r === r && e.c === c)));
    }
    
    // Check win
    let won = true;
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (newBoard[i][j] !== solution[i][j]) {
          won = false;
          break;
        }
      }
    }
    if (won) setIsWon(true);
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '9') {
        handleNumberInput(parseInt(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleNumberInput(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, board, errors, isWon]);

  const getCellClass = (r: number, c: number) => {
    let classes = "w-8 h-8 sm:w-10 sm:h-10 sm:text-lg flex items-center justify-center border cursor-pointer transition-colors ";
    
    // Borders for 3x3 grids
    if (c % 3 === 2 && c !== 8) classes += "border-r-2 border-r-gray-800 dark:border-r-gray-300 ";
    else classes += "border-r-gray-300 dark:border-r-gray-600 ";
    
    if (r % 3 === 2 && r !== 8) classes += "border-b-2 border-b-gray-800 dark:border-b-gray-300 ";
    else classes += "border-b-gray-300 dark:border-b-gray-600 ";
    
    if (c === 0) classes += "border-l-2 border-l-gray-800 dark:border-l-gray-300 ";
    if (r === 0) classes += "border-t-2 border-t-gray-800 dark:border-t-gray-300 ";
    if (c === 8) classes += "border-r-2 border-r-gray-800 dark:border-r-gray-300 ";
    if (r === 8) classes += "border-b-2 border-b-gray-800 dark:border-b-gray-300 ";

    // Backgrounds
    if (selectedCell?.r === r && selectedCell?.c === c) {
      classes += "bg-blue-200 dark:bg-blue-800 ";
    } else if (initialBoard[r][c] !== 0) {
      classes += "bg-gray-100 dark:bg-[#2A2A2A] font-bold text-gray-800 dark:text-gray-200 ";
    } else {
      classes += "bg-white dark:bg-[#1E1E1E] text-blue-600 dark:text-blue-400 ";
    }
    
    // Highlight same numbers
    if (board[r][c] !== 0 && selectedCell && board[selectedCell.r][selectedCell.c] === board[r][c] && !(selectedCell.r === r && selectedCell.c === c)) {
      classes += "bg-blue-100 dark:bg-blue-900/50 ";
    }

    // Errors
    if (errors.some(e => e.r === r && e.c === c)) {
      classes += "text-red-500 bg-red-50 dark:bg-red-900/20 ";
    }

    return classes;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="mb-6 flex gap-2 bg-gray-100 dark:bg-[#252525] p-1 rounded-lg">
        <button 
          onClick={() => setDifficulty('easy')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${difficulty === 'easy' ? 'bg-white dark:bg-[#333333] text-[#E08F24] shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
        >
          Dễ
        </button>
        <button 
          onClick={() => setDifficulty('medium')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${difficulty === 'medium' ? 'bg-white dark:bg-[#333333] text-[#E08F24] shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
        >
          Trung bình
        </button>
        <button 
          onClick={() => setDifficulty('hard')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${difficulty === 'hard' ? 'bg-white dark:bg-[#333333] text-[#E08F24] shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
        >
          Khó
        </button>
      </div>

      {isWon && (
        <div className="mb-6 px-6 py-3 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full font-bold flex items-center gap-2">
          <Check size={20} />
          Chúc mừng! Bạn đã giải thành công.
        </div>
      )}

      <div className="mb-6 inline-block border-2 border-gray-800 dark:border-gray-300 bg-gray-300 dark:bg-gray-600 gap-[1px]">
        {board.map((row, r) => (
          <div key={r} className="flex">
            {row.map((cell, c) => (
              <div 
                key={`${r}-${c}`} 
                className={getCellClass(r, c)}
                onClick={() => handleCellClick(r, c)}
              >
                {cell !== 0 ? cell : ''}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-9 gap-2 mb-8">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            onClick={() => handleNumberInput(num)}
            disabled={!selectedCell || isWon}
            className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 hover:bg-gray-200 dark:bg-[#2A2A2A] dark:hover:bg-[#333333] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold text-lg text-gray-800 dark:text-gray-200 transition-colors"
          >
            {num}
          </button>
        ))}
        <button
          onClick={() => handleNumberInput(0)}
          disabled={!selectedCell || isWon}
          className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold text-red-600 dark:text-red-400 transition-colors flex items-center justify-center"
          title="Xóa"
        >
          X
        </button>
      </div>

      <div className="flex gap-4">
        <button
          onClick={initGame}
          className="bg-[#E08F24] hover:bg-[#c77a1e] text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-transform hover:scale-105"
        >
          <RotateCcw size={20} />
          Chơi ván mới
        </button>
        <button
          onClick={() => {
            if (selectedCell && !isWon) {
              handleNumberInput(solution[selectedCell.r][selectedCell.c]);
            }
          }}
          disabled={!selectedCell || isWon}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-transform hover:scale-105"
        >
          <HelpCircle size={20} />
          Gợi ý
        </button>
      </div>
    </div>
  );
}
