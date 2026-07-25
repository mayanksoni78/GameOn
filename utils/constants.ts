export const GRID_SIZE = 20; // 20x20 grid
export type Difficulty = 'EASY' | 'NORMAL' | 'HARD';

export const DIFFICULTY_SETTINGS: Record<Difficulty, { initialSpeed: number, minSpeed: number, speedDecrement: number }> = {
  EASY: { initialSpeed: 300, minSpeed: 150, speedDecrement: 3 },
  NORMAL: { initialSpeed: 150, minSpeed: 60, speedDecrement: 5 },
  HARD: { initialSpeed: 80, minSpeed: 40, speedDecrement: 8 },
};

export type Position = { x: number; y: number };
export type Direction = { x: number; y: number };

export const DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

export type GameStatus = 'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type FoodItem = {
  position: Position;
  type: 'NORMAL' | 'BONUS';
  id: string; // for React keys/animations
};
