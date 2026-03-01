import { useState, useEffect } from 'react';
import { RotateCcw, Bot, User } from 'lucide-react';

type Player = 'X' | 'O' | null;

export default function TicTacToe() {
  const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [gameMode, setGameMode] = useState<'pvp' | 'pve'>('pve');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isComputerThinking, setIsComputerThinking] = useState(false);

  const calculateWinner = (squares: Player[]) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: lines[i] };
      }
    }
    return null;
  };

  const handleClick = (i: number) => {
    if (calculateWinner(board) || board[i] || isComputerThinking) {
      return;
    }
    const newBoard = [...board];
    newBoard[i] = xIsNext ? 'X' : 'O';
    setBoard(newBoard);
    setXIsNext(!xIsNext);
  };

  // AI Logic
  useEffect(() => {
    if (gameMode === 'pve' && !xIsNext && !calculateWinner(board) && board.includes(null)) {
      setIsComputerThinking(true);
      
      setTimeout(() => {
        let move = -1;
        const availableMoves = board.map((val, idx) => val === null ? idx : null).filter(val => val !== null) as number[];
        
        if (difficulty === 'easy') {
          // Random move
          move = availableMoves[Math.floor(Math.random() * availableMoves.length)];
        } else if (difficulty === 'medium') {
          // 50% chance to make best move, 50% random
          if (Math.random() > 0.5) {
            move = getBestMove(board, 'O');
          } else {
            move = availableMoves[Math.floor(Math.random() * availableMoves.length)];
          }
        } else {
          // Hard: always best move
          move = getBestMove(board, 'O');
        }

        if (move !== -1) {
          const newBoard = [...board];
          newBoard[move] = 'O';
          setBoard(newBoard);
          setXIsNext(true);
        }
        setIsComputerThinking(false);
      }, 500); // Small delay to feel like "thinking"
    }
  }, [xIsNext, board, gameMode, difficulty]);

  // Minimax algorithm for Tic-Tac-Toe
  const getBestMove = (currentBoard: Player[], player: Player): number => {
    let bestScore = -Infinity;
    let move = -1;
    
    for (let i = 0; i < 9; i++) {
      if (currentBoard[i] === null) {
        currentBoard[i] = player;
        let score = minimax(currentBoard, 0, false);
        currentBoard[i] = null;
        if (score > bestScore) {
          bestScore = score;
          move = i;
        }
      }
    }
    return move;
  };

  const minimax = (currentBoard: Player[], depth: number, isMaximizing: boolean): number => {
    const winInfo = calculateWinner(currentBoard);
    if (winInfo?.winner === 'O') return 10 - depth;
    if (winInfo?.winner === 'X') return depth - 10;
    if (!currentBoard.includes(null)) return 0;

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (currentBoard[i] === null) {
          currentBoard[i] = 'O';
          let score = minimax(currentBoard, depth + 1, false);
          currentBoard[i] = null;
          bestScore = Math.max(score, bestScore);
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (currentBoard[i] === null) {
          currentBoard[i] = 'X';
          let score = minimax(currentBoard, depth + 1, true);
          currentBoard[i] = null;
          bestScore = Math.min(score, bestScore);
        }
      }
      return bestScore;
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setXIsNext(true);
  };

  const winInfo = calculateWinner(board);
  const winner = winInfo?.winner;
  const winningLine = winInfo?.line || [];
  const isDraw = !winner && board.every((square) => square !== null);

  let status;
  if (winner) {
    status = `Người chiến thắng: ${winner}`;
  } else if (isDraw) {
    status = 'Hòa!';
  } else {
    status = `Lượt tiếp theo: ${xIsNext ? 'X' : 'O'}`;
  }

  return (
    <div className="flex flex-col items-center">
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex bg-gray-100 dark:bg-[#252525] p-1 rounded-lg">
          <button 
            onClick={() => { setGameMode('pve'); resetGame(); }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${gameMode === 'pve' ? 'bg-white dark:bg-[#333333] text-[#E08F24] shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          >
            <Bot size={16} />
            Chơi với Máy
          </button>
          <button 
            onClick={() => { setGameMode('pvp'); resetGame(); }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${gameMode === 'pvp' ? 'bg-white dark:bg-[#333333] text-[#E08F24] shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          >
            <User size={16} />
            2 Người chơi
          </button>
        </div>

        {gameMode === 'pve' && (
          <div className="flex gap-2 bg-gray-100 dark:bg-[#252525] p-1 rounded-lg">
            <button 
              onClick={() => { setDifficulty('easy'); resetGame(); }}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${difficulty === 'easy' ? 'bg-white dark:bg-[#333333] text-[#E08F24] shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            >
              Dễ
            </button>
            <button 
              onClick={() => { setDifficulty('medium'); resetGame(); }}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${difficulty === 'medium' ? 'bg-white dark:bg-[#333333] text-[#E08F24] shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            >
              Trung bình
            </button>
            <button 
              onClick={() => { setDifficulty('hard'); resetGame(); }}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${difficulty === 'hard' ? 'bg-white dark:bg-[#333333] text-[#E08F24] shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            >
              Khó
            </button>
          </div>
        )}
      </div>

      <div className="mb-6 text-xl font-bold text-center">
        <div className={`px-6 py-3 rounded-full ${
          winner 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
            : isDraw 
              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
        }`}>
          {status}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 bg-gray-300 dark:bg-gray-700 p-2 rounded-xl">
        {board.map((square, i) => {
          const isWinningSquare = winningLine.includes(i);
          return (
            <button
              key={i}
              className={`w-24 h-24 sm:w-32 sm:h-32 bg-white dark:bg-[#1E1E1E] rounded-lg text-5xl sm:text-6xl font-bold flex items-center justify-center transition-colors ${
                isWinningSquare ? 'bg-green-50 dark:bg-green-900/20' : 'hover:bg-gray-50 dark:hover:bg-[#252525]'
              } ${
                square === 'X' ? 'text-blue-500' : 'text-red-500'
              }`}
              onClick={() => handleClick(i)}
            >
              {square}
            </button>
          );
        })}
      </div>

      <button
        onClick={resetGame}
        className="mt-8 bg-[#E08F24] hover:bg-[#c77a1e] text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-transform hover:scale-105"
      >
        <RotateCcw size={20} />
        Chơi lại
      </button>
    </div>
  );
}
