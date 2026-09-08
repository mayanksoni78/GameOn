import { BaseEngine } from './BaseEngine';

export interface Point {
  x: number;
  y: number;
}

export type SnakeDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface SnakeState {
  snake: Point[];
  food: Point;
  foodType: number;
  direction: SnakeDirection;
  score: number;
  highScore: number;
  gameOver: boolean;
  gameStarted: boolean;
  isPaused: boolean;
  isEating: boolean;
}

export class SnakeEngine extends BaseEngine<SnakeState> {
  public readonly gridWidth: number;
  public readonly gridHeight: number;

  private snake: Point[] = [];
  private food: Point = { x: 5, y: 5 };
  private foodType: number = 0;
  private direction: SnakeDirection = 'RIGHT';
  private nextDirection: SnakeDirection = 'RIGHT';
  private isPaused: boolean = false;
  private gameStarted: boolean = false;
  private isEating: boolean = false;
  private onEatCallback?: (food: Point, foodType: number) => void;

  constructor(gridWidth: number = 20, gridHeight: number = 20, initialHighScore: number = 0) {
    super(initialHighScore);
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.initSnake();
    this.spawnFood();
  }

  public setOnEat(cb: (food: Point, foodType: number) => void): void {
    this.onEatCallback = cb;
  }

  private initSnake(): void {
    const midX = Math.floor(this.gridWidth / 2);
    const midY = Math.floor(this.gridHeight / 2);
    this.snake = [{ x: midX, y: midY }];
    this.direction = 'RIGHT';
    this.nextDirection = 'RIGHT';
  }

  public getState(): SnakeState {
    return {
      snake: this.snake.map((p) => ({ ...p })),
      food: { ...this.food },
      foodType: this.foodType,
      direction: this.direction,
      score: this.score,
      highScore: this.highScore,
      gameOver: this.gameOver,
      gameStarted: this.gameStarted,
      isPaused: this.isPaused,
      isEating: this.isEating,
    };
  }

  public startGame(): void {
    if (!this.gameStarted) {
      this.gameStarted = true;
      this.isPaused = false;
      this.notify();
    }
  }

  public reset(): void {
    this.score = 0;
    this.gameOver = false;
    this.isPaused = false;
    this.gameStarted = false;
    this.isEating = false;
    this.initSnake();
    this.spawnFood();
    this.notify();
  }

  public togglePause(): void {
    if (this.gameStarted && !this.gameOver) {
      this.isPaused = !this.isPaused;
      this.notify();
    }
  }

  public setDirection(newDir: SnakeDirection): void {
    if (this.isPaused || !this.gameStarted) return;
    // Prevent 180-degree instant turns
    const opposites: Record<SnakeDirection, SnakeDirection> = {
      UP: 'DOWN',
      DOWN: 'UP',
      LEFT: 'RIGHT',
      RIGHT: 'LEFT',
    };

    if (opposites[newDir] !== this.direction) {
      this.nextDirection = newDir;
    }
  }

  public tick(): boolean {
    if (this.gameOver || this.isPaused || !this.gameStarted) return false;

    this.direction = this.nextDirection;
    const head = this.snake[0];
    let nextX = head.x;
    let nextY = head.y;

    switch (this.direction) {
      case 'UP':
        nextY--;
        break;
      case 'DOWN':
        nextY++;
        break;
      case 'LEFT':
        nextX--;
        break;
      case 'RIGHT':
        nextX++;
        break;
    }

    // Check wall collision
    if (nextX < 0 || nextX >= this.gridWidth || nextY < 0 || nextY >= this.gridHeight) {
      this.gameOver = true;
      this.gameStarted = false;
      this.isPaused = false;
      this.notify();
      return false;
    }

    // Check self collision (ignoring tail tip which moves)
    for (let i = 0; i < this.snake.length - 1; i++) {
      if (this.snake[i].x === nextX && this.snake[i].y === nextY) {
        this.gameOver = true;
        this.gameStarted = false;
        this.isPaused = false;
        this.notify();
        return false;
      }
    }

    const newHead: Point = { x: nextX, y: nextY };
    this.snake.unshift(newHead);

    // Check food eaten
    if (nextX === this.food.x && nextY === this.food.y) {
      const points = this.foodType === 1 ? 2 : 1;
      this.addScore(points);
      this.isEating = true;
      if (this.onEatCallback) {
        this.onEatCallback(this.food, this.foodType);
      }
      this.spawnFood();
    } else {
      this.isEating = false;
      this.snake.pop();
    }

    this.notify();
    return true;
  }

  private spawnFood(): void {
    let newFood: Point;
    let collision: boolean;
    do {
      newFood = {
        x: Math.floor(Math.random() * this.gridWidth),
        y: Math.floor(Math.random() * this.gridHeight),
      };
      collision = this.snake.some((p) => p.x === newFood.x && p.y === newFood.y);
    } while (collision);

    this.food = newFood;
    this.foodType = Math.random() > 0.5 ? 1 : 0;
  }
}
