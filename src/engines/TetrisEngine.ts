import { BaseEngine } from './BaseEngine';

export interface Tetromino {
  shape: number[][];
  color: string;
}

export interface TetrisPiece {
  shape: number[][];
  color: string;
  x: number;
  y: number;
}

export interface TetrisState {
  grid: string[][];
  currentPiece: TetrisPiece | null;
  nextPiece: Tetromino;
  holdPiece: Tetromino | null;
  canHold: boolean;
  score: number;
  highScore: number;
  linesCleared: number;
  level: number;
  gameOver: boolean;
  isPaused: boolean;
  gameStarted: boolean;
}

export class TetrisEngine extends BaseEngine<TetrisState> {
  public static readonly COLS = 10;
  public static readonly ROWS = 20;

  public static readonly TETROMINOES: Record<string, Tetromino> = {
    I: { shape: [[1, 1, 1, 1]], color: '#00F0FF' },
    J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#2979FF' },
    L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#FF9100' },
    O: { shape: [[1, 1], [1, 1]], color: '#FFEA00' },
    S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#00E676' },
    T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#D500F9' },
    Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#FF1744' },
  };

  private grid: string[][];
  private currentPiece: TetrisPiece | null = null;
  private nextPiece: Tetromino;
  private holdPieceData: Tetromino | null = null;
  private canHold: boolean = true;
  private linesCleared: number = 0;
  private level: number = 1;
  private isPaused: boolean = false;
  private gameStarted: boolean = false;

  constructor(initialHighScore: number = 0) {
    super(initialHighScore);
    this.grid = this.createEmptyGrid();
    this.nextPiece = this.getRandomTetromino();
    this.spawnNewPiece();
  }

  private createEmptyGrid(): string[][] {
    return Array.from({ length: TetrisEngine.ROWS }, () =>
      Array(TetrisEngine.COLS).fill('')
    );
  }

  public getState(): TetrisState {
    return {
      grid: this.grid.map((r) => [...r]),
      currentPiece: this.currentPiece
        ? {
            ...this.currentPiece,
            shape: this.currentPiece.shape.map((row) => [...row]),
          }
        : null,
      nextPiece: {
        shape: this.nextPiece.shape.map((row) => [...row]),
        color: this.nextPiece.color,
      },
      holdPiece: this.holdPieceData
        ? {
            shape: this.holdPieceData.shape.map((row) => [...row]),
            color: this.holdPieceData.color,
          }
        : null,
      canHold: this.canHold,
      score: this.score,
      highScore: this.highScore,
      linesCleared: this.linesCleared,
      level: this.level,
      gameOver: this.gameOver,
      isPaused: this.isPaused,
      gameStarted: this.gameStarted,
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
    this.grid = this.createEmptyGrid();
    this.score = 0;
    this.linesCleared = 0;
    this.level = 1;
    this.gameOver = false;
    this.isPaused = false;
    this.gameStarted = false;
    this.holdPieceData = null;
    this.canHold = true;
    this.nextPiece = this.getRandomTetromino();
    this.spawnNewPiece();
    this.notify();
  }

  public togglePause(forced?: boolean): void {
    if (this.gameStarted && !this.gameOver) {
      this.isPaused = typeof forced === 'boolean' ? forced : !this.isPaused;
      this.notify();
    }
  }

  public hold(): boolean {
    if (!this.currentPiece || !this.canHold || this.gameOver || this.isPaused || !this.gameStarted) {
      return false;
    }

    const currentTetromino: Tetromino = {
      shape: this.currentPiece.shape,
      color: this.currentPiece.color,
    };

    if (this.holdPieceData) {
      const temp = this.holdPieceData;
      this.holdPieceData = currentTetromino;
      this.spawnSpecificPiece(temp);
    } else {
      this.holdPieceData = currentTetromino;
      this.spawnNewPiece();
    }

    this.canHold = false;
    this.notify();
    return true;
  }

  private getRandomTetromino(): Tetromino {
    const keys = Object.keys(TetrisEngine.TETROMINOES);
    const key = keys[Math.floor(Math.random() * keys.length)];
    return TetrisEngine.TETROMINOES[key];
  }

  private spawnSpecificPiece(t: Tetromino): void {
    this.currentPiece = {
      shape: t.shape,
      color: t.color,
      x: Math.floor(TetrisEngine.COLS / 2) - Math.floor(t.shape[0].length / 2),
      y: 0,
    };

    if (this.checkCollision(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y)) {
      this.gameOver = true;
      this.gameStarted = false;
    }
  }

  private spawnNewPiece(): void {
    const t = this.nextPiece;
    this.nextPiece = this.getRandomTetromino();
    this.spawnSpecificPiece(t);
    this.canHold = true;
  }

  private checkCollision(shape: number[][], x: number, y: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          const newX = x + c;
          const newY = y + r;
          if (
            newX < 0 ||
            newX >= TetrisEngine.COLS ||
            newY >= TetrisEngine.ROWS ||
            (newY >= 0 && this.grid[newY][newX] !== '')
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  public moveLeft(): boolean {
    if (!this.currentPiece || this.gameOver || this.isPaused) return false;
    if (!this.checkCollision(this.currentPiece.shape, this.currentPiece.x - 1, this.currentPiece.y)) {
      this.currentPiece.x--;
      this.notify();
      return true;
    }
    return false;
  }

  public moveRight(): boolean {
    if (!this.currentPiece || this.gameOver || this.isPaused) return false;
    if (!this.checkCollision(this.currentPiece.shape, this.currentPiece.x + 1, this.currentPiece.y)) {
      this.currentPiece.x++;
      this.notify();
      return true;
    }
    return false;
  }

  public rotate(): boolean {
    if (!this.currentPiece || this.gameOver || this.isPaused) return false;
    // Rotate matrix 90 deg clockwise
    const rotated = this.currentPiece.shape[0].map((_, index) =>
      this.currentPiece!.shape.map((row) => row[index]).reverse()
    );

    if (!this.checkCollision(rotated, this.currentPiece.x, this.currentPiece.y)) {
      this.currentPiece.shape = rotated;
      this.notify();
      return true;
    }
    return false;
  }

  public hardDrop(): void {
    if (!this.currentPiece || this.gameOver || this.isPaused) return;
    while (!this.checkCollision(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y + 1)) {
      this.currentPiece.y++;
      this.addScore(2);
    }
    this.lockPiece();
    this.notify();
  }

  public moveDown(): boolean {
    return this.tick();
  }

  public getGhostY(): number {
    if (!this.currentPiece) return 0;
    let ghostY = this.currentPiece.y;
    while (!this.checkCollision(this.currentPiece.shape, this.currentPiece.x, ghostY + 1)) {
      ghostY++;
    }
    return ghostY;
  }

  public tick(): boolean {
    if (!this.currentPiece || this.gameOver || this.isPaused || !this.gameStarted) return false;

    if (!this.checkCollision(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y + 1)) {
      this.currentPiece.y++;
      this.notify();
      return true;
    } else {
      this.lockPiece();
      this.notify();
      return false;
    }
  }

  private lockPiece(): void {
    if (!this.currentPiece) return;

    for (let r = 0; r < this.currentPiece.shape.length; r++) {
      for (let c = 0; c < this.currentPiece.shape[r].length; c++) {
        if (this.currentPiece.shape[r][c] !== 0) {
          const py = this.currentPiece.y + r;
          const px = this.currentPiece.x + c;
          if (py >= 0 && py < TetrisEngine.ROWS && px >= 0 && px < TetrisEngine.COLS) {
            this.grid[py][px] = this.currentPiece.color;
          }
        }
      }
    }

    this.clearFullLines();
    this.spawnNewPiece();
  }

  private clearFullLines(): void {
    let lines = 0;
    for (let r = TetrisEngine.ROWS - 1; r >= 0; r--) {
      if (this.grid[r].every((cell) => cell !== '')) {
        this.grid.splice(r, 1);
        this.grid.unshift(Array(TetrisEngine.COLS).fill(''));
        lines++;
        r++; // Re-check current row index
      }
    }

    if (lines > 0) {
      this.linesCleared += lines;
      const pointValues = [0, 100, 300, 500, 800];
      this.addScore((pointValues[lines] || 100) * this.level);
      this.level = Math.floor(this.linesCleared / 10) + 1;
    }
  }
}
