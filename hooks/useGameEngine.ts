import { useState, useEffect, useCallback, useRef } from 'react';
import { GRID_SIZE, DIRECTIONS, DIFFICULTY_SETTINGS } from '../utils/constants';
import type { Position, Direction, GameStatus, FoodItem, Difficulty } from '../utils/constants';

const getInitialSnake = (): Position[] => [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];

const getRandomPosition = (exclude: Position[] = []): Position => {
  let pos: Position;
  let isOccupied = true;
  while (isOccupied) {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    isOccupied = exclude.some((p) => p.x === pos.x && p.y === pos.y);
  }
  return pos!;
};

export function useGameEngine(difficulty: Difficulty = 'NORMAL') {
  const settings = DIFFICULTY_SETTINGS[difficulty];

  const [snake, setSnake] = useState<Position[]>(getInitialSnake());
  const [direction, setDirection] = useState<Direction>(DIRECTIONS.UP);
  const [food, setFood] = useState<FoodItem | null>(null);
  const [status, setStatus] = useState<GameStatus>('IDLE');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [speed, setSpeed] = useState(settings.initialSpeed);

  const directionRef = useRef(direction);
  const nextDirectionRef = useRef(direction);
  const lastTickTime = useRef(0);
  const requestRef = useRef<number>(0);

  // Sound Refs (we'll implement audio later)
  const onEat = useRef<(() => void) | null>(null);
  const onGameOver = useRef<(() => void) | null>(null);

  useEffect(() => {
    const savedScore = localStorage.getItem('synthwave_snake_highscore');
    if (savedScore) setHighScore(parseInt(savedScore, 10));
    setFood({ position: getRandomPosition(getInitialSnake()), type: 'NORMAL', id: Date.now().toString() });
  }, []);

  useEffect(() => {
    if (status === 'GAME_OVER' && score > highScore) {
      setHighScore(score);
      localStorage.setItem('synthwave_snake_highscore', score.toString());
    }
  }, [status, score, highScore]);

  const startGame = useCallback(() => {
    setSnake(getInitialSnake());
    setDirection(DIRECTIONS.UP);
    directionRef.current = DIRECTIONS.UP;
    nextDirectionRef.current = DIRECTIONS.UP;
    setScore(0);
    setLevel(1);
    setSpeed(DIFFICULTY_SETTINGS[difficulty].initialSpeed);
    setStatus('PLAYING');
    setFood({ position: getRandomPosition(getInitialSnake()), type: 'NORMAL', id: Date.now().toString() });
  }, [difficulty]);

  const pauseGame = useCallback(() => {
    if (status === 'PLAYING') setStatus('PAUSED');
    else if (status === 'PAUSED') setStatus('PLAYING');
  }, [status]);

  const changeDirection = useCallback((newDir: Direction) => {
    const current = directionRef.current;
    // Prevent 180-degree turns
    if (newDir.x !== -current.x || newDir.y !== -current.y) {
      nextDirectionRef.current = newDir;
    }
  }, []);

  // Update speed when difficulty changes if we are idle
  useEffect(() => {
    if (status === 'IDLE') {
      setSpeed(DIFFICULTY_SETTINGS[difficulty].initialSpeed);
    }
  }, [difficulty, status]);

  const gameTick = useCallback((time: number) => {
    if (status !== 'PLAYING') return;

    if (time - lastTickTime.current > speed) {
      lastTickTime.current = time;

      setSnake((prevSnake) => {
        const currentDir = nextDirectionRef.current;
        directionRef.current = currentDir;
        setDirection(currentDir);

        const head = prevSnake[0];
        const newHead = {
          x: head.x + currentDir.x,
          y: head.y + currentDir.y,
        };

        // Wall collision
        if (
          newHead.x < 0 ||
          newHead.x >= GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= GRID_SIZE
        ) {
          setStatus('GAME_OVER');
          onGameOver.current?.();
          return prevSnake;
        }

        // Self collision
        if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
          setStatus('GAME_OVER');
          onGameOver.current?.();
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Food collision
        if (food && newHead.x === food.position.x && newHead.y === food.position.y) {
          // Ate food! (Snake grows - we don't pop the tail)
          onEat.current?.();
          
          const points = food.type === 'BONUS' ? 5 : 1;
          setScore((s) => {
            const newScore = s + points;
            setLevel(Math.floor(newScore / 10) + 1);
            setSpeed(() => Math.max(DIFFICULTY_SETTINGS[difficulty].minSpeed, DIFFICULTY_SETTINGS[difficulty].initialSpeed - Math.floor(newScore / 5) * DIFFICULTY_SETTINGS[difficulty].speedDecrement));
            return newScore;
          });

          const isBonus = Math.random() < 0.2; // 20% chance for bonus
          setFood({
            position: getRandomPosition(newSnake),
            type: isBonus ? 'BONUS' : 'NORMAL',
            id: Date.now().toString()
          });
        } else {
          // Did not eat food, pop the tail to maintain length
          newSnake.pop();
        }

        return newSnake;
      });
    }

    requestRef.current = requestAnimationFrame(gameTick);
  }, [status, speed, food, difficulty]);

  useEffect(() => {
    if (status === 'PLAYING') {
      requestRef.current = requestAnimationFrame(gameTick);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [status, gameTick]);

  return {
    snake,
    direction,
    food,
    status,
    score,
    highScore,
    level,
    startGame,
    pauseGame,
    changeDirection,
    onEatRef: onEat,
    onGameOverRef: onGameOver
  };
}
