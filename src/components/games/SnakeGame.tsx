import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, RotateCcw, Trophy } from 'lucide-react';

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SPEED = 150;

type Point = { x: number; y: number };

export default function SnakeGame() {
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Point>({ x: 15, y: 10 });
  const [direction, setDirection] = useState<Point>({ x: 1, y: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const directionRef = useRef(direction);
  
  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  const generateFood = useCallback((currentSnake: Point[]) => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      // Check if food is on snake
      const isOnSnake = currentSnake.some(
        (segment) => segment.x === newFood.x && segment.y === newFood.y
      );
      if (!isOnSnake) break;
    }
    return newFood;
  }, []);

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setDirection({ x: 1, y: 0 });
    setFood(generateFood([{ x: 10, y: 10 }]));
    setGameOver(false);
    setScore(0);
    setIsPlaying(true);
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Prevent default scrolling for arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }

      if (!isPlaying || gameOver) return;
      
      const currentDir = directionRef.current;
      
      switch (e.key) {
        case 'ArrowUp':
          if (currentDir.y !== 1) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
          if (currentDir.y !== -1) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
          if (currentDir.x !== 1) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
          if (currentDir.x !== -1) setDirection({ x: 1, y: 0 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, gameOver]);

  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const moveSnake = () => {
      setSnake((prevSnake) => {
        const head = prevSnake[0];
        const currentDir = directionRef.current;
        const newHead = {
          x: head.x + currentDir.x,
          y: head.y + currentDir.y,
        };

        // Check wall collision
        if (
          newHead.x < 0 ||
          newHead.x >= GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= GRID_SIZE
        ) {
          setGameOver(true);
          setIsPlaying(false);
          if (score > highScore) setHighScore(score);
          return prevSnake;
        }

        // Check self collision
        if (
          prevSnake.some(
            (segment) => segment.x === newHead.x && segment.y === newHead.y
          )
        ) {
          setGameOver(true);
          setIsPlaying(false);
          if (score > highScore) setHighScore(score);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Check food collision
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore((s) => s + 10);
          setFood(generateFood(newSnake));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    };

    const baseSpeed = difficulty === 'easy' ? 200 : difficulty === 'medium' ? 120 : 60;
    const speed = Math.max(30, baseSpeed - Math.floor(score / 50) * 10);
    const gameLoop = setInterval(moveSnake, speed);

    return () => clearInterval(gameLoop);
  }, [isPlaying, gameOver, food, score, highScore, generateFood, difficulty]);

  return (
    <div className="flex flex-col items-center">
      {!isPlaying && !gameOver && (
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
      )}

      <div className="flex items-center justify-between w-full max-w-md mb-6">
        <div className="bg-gray-100 dark:bg-[#252525] px-4 py-2 rounded-lg text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Điểm số</div>
          <div className="text-2xl font-bold text-[#E08F24]">{score}</div>
        </div>
        <div className="bg-gray-100 dark:bg-[#252525] px-4 py-2 rounded-lg text-center flex items-center gap-2">
          <Trophy className="text-yellow-500" size={20} />
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Kỷ lục</div>
            <div className="text-xl font-bold text-[#141414] dark:text-[#E5E5E5]">{highScore}</div>
          </div>
        </div>
      </div>

      <div 
        className="relative bg-gray-100 dark:bg-[#252525] border-2 border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden"
        style={{ 
          width: GRID_SIZE * CELL_SIZE, 
          height: GRID_SIZE * CELL_SIZE 
        }}
      >
        {/* Food */}
        <div
          className="absolute bg-red-500 rounded-full"
          style={{
            width: CELL_SIZE - 2,
            height: CELL_SIZE - 2,
            left: food.x * CELL_SIZE + 1,
            top: food.y * CELL_SIZE + 1,
          }}
        />

        {/* Snake */}
        {snake.map((segment, index) => (
          <div
            key={index}
            className={`absolute rounded-sm ${index === 0 ? 'bg-green-600 dark:bg-green-500' : 'bg-green-500 dark:bg-green-400'}`}
            style={{
              width: CELL_SIZE - 2,
              height: CELL_SIZE - 2,
              left: segment.x * CELL_SIZE + 1,
              top: segment.y * CELL_SIZE + 1,
            }}
          />
        ))}

        {/* Overlays */}
        {!isPlaying && !gameOver && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <button
              onClick={resetGame}
              className="bg-[#E08F24] hover:bg-[#c77a1e] text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-transform hover:scale-105"
            >
              <Play size={20} />
              Bắt đầu chơi
            </button>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
            <h3 className="text-3xl font-bold mb-2 text-red-500">Game Over!</h3>
            <p className="mb-6 text-lg">Điểm của bạn: {score}</p>
            <button
              onClick={resetGame}
              className="bg-[#E08F24] hover:bg-[#c77a1e] text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-transform hover:scale-105"
            >
              <RotateCcw size={20} />
              Chơi lại
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center">
        Sử dụng các phím mũi tên <kbd className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded mx-1">↑</kbd><kbd className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded mx-1">↓</kbd><kbd className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded mx-1">←</kbd><kbd className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded mx-1">→</kbd> để di chuyển.
      </div>
    </div>
  );
}
