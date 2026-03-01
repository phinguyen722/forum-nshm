import { useState } from 'react';
import { Gamepad2, Grid3x3, Crown } from 'lucide-react';
import SnakeGame from './games/SnakeGame';
import TicTacToe from './games/TicTacToe';
import SudokuGame from './games/SudokuGame';

export default function GamesView() {
  const [activeGame, setActiveGame] = useState<'snake' | 'tictactoe' | 'sudoku'>('snake');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full flex items-center justify-center">
          <Gamepad2 size={20} />
        </div>
        <h2 className="text-2xl font-bold text-[#141414] dark:text-[#E5E5E5]">Khu vực Giải trí</h2>
      </div>

      <div className="flex space-x-2 border-b border-[#E5E5E5] dark:border-[#333333] mb-6 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveGame('snake')}
          className={`py-3 px-4 text-sm font-bold uppercase tracking-wide transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeGame === 'snake' 
              ? 'text-purple-600 border-b-2 border-purple-600' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Gamepad2 size={18} />
          Rắn săn mồi
        </button>
        <button
          onClick={() => setActiveGame('tictactoe')}
          className={`py-3 px-4 text-sm font-bold uppercase tracking-wide transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeGame === 'tictactoe' 
              ? 'text-purple-600 border-b-2 border-purple-600' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Grid3x3 size={18} />
          Cờ Caro
        </button>
        <button
          onClick={() => setActiveGame('sudoku')}
          className={`py-3 px-4 text-sm font-bold uppercase tracking-wide transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeGame === 'sudoku' 
              ? 'text-purple-600 border-b-2 border-purple-600' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Crown size={18} />
          Sudoku
        </button>
      </div>

      <div className="bg-white dark:bg-[#1E1E1E] rounded shadow-sm border border-[#E5E5E5] dark:border-[#333333] p-6">
        {activeGame === 'snake' && <SnakeGame />}
        {activeGame === 'tictactoe' && <TicTacToe />}
        {activeGame === 'sudoku' && <SudokuGame />}
      </div>
    </div>
  );
}
