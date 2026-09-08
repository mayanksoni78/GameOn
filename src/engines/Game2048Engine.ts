import { BaseEngine } from './BaseEngine';

export type Direction2048 = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Game2048State {
  board: number[][];
  score: number;
  highScore: number;
  maxTile: number;
  gameOver: boolean;
  won: boolean;
  canUndo: boolean;
}

export class Game2048Engine extends BaseEngine<Game2048State> {
  public static readonly SIZE = 4;
  private board: number[][];
  private maxTile: number = 2;
  private hasWon: boolean = false;
  private history: { board: number[][]; score: number }[] = [];

  constructor(initialHighScore: number = 0) {
    super(initialHighScore);
    this.board = this.createEmptyBoard();
    this.spawnTile();
    this.spawnTile();
  }

  private createEmptyBoard(): number[][] {
    return Array.from({ length: Game2048Engine.SIZE }, () =>
      Array(Game2048Engine.SIZE).fill(0)
    );
  }

  public getState(): Game2048State {
    return {
      board: this.board.map((r) => [...r]),
      score: this.score,
      highScore: this.highScore,
      maxTile: this.maxTile,
      gameOver: this.gameOver,
      won: this.hasWon,
      canUndo: this.history.length > 0,
    };
  }

  public reset(): void {
    this.board = this.createEmptyBoard();
    this.score = 0;
    this.maxTile = 2;
    this.hasWon = false;
    this.gameOver = false;
    this.history = [];
    this.spawnTile();
    this.spawnTile();
    this.notify();
  }

  public undo(): boolean {
    if (this.history.length === 0) return false;
    const last = this.history.pop()!;
    this.board = last.board;
    this.score = last.score;
    this.gameOver = false;
    this.updateMaxTile();
    this.notify();
    return true;
  }

  public move(direction: Direction2048): boolean {
    if (this.gameOver) return false;

    // Save history snapshot
    const boardSnapshot = this.board.map((r) => [...r]);
    const scoreSnapshot = this.score;

    let moved = false;
    let pointsGained = 0;

    const rotated = this.rotateToLeft(this.board, direction);
    const newBoard: number[][] = [];

    for (let r = 0; r < Game2048Engine.SIZE; r++) {
      const row = rotated[r].filter((val) => val !== 0);
      const newRow: number[] = [];

      for (let c = 0; c < row.length; c++) {
        if (c < row.length - 1 && row[c] === row[c + 1]) {
          const merged = row[c] * 2;
          newRow.push(merged);
          pointsGained += merged;
          if (merged === 2048) this.hasWon = true;
          c++; // skip next merged tile
        } else {
          newRow.push(row[c]);
        }
      }

      while (newRow.length < Game2048Engine.SIZE) {
        newRow.push(0);
      }

      newBoard.push(newRow);
    }

    const unrotated = this.rotateBack(newBoard, direction);

    // Check if board changed
    for (let r = 0; r < Game2048Engine.SIZE; r++) {
      for (let c = 0; c < Game2048Engine.SIZE; c++) {
        if (this.board[r][c] !== unrotated[r][c]) {
          moved = true;
          break;
        }
      }
    }

    if (moved) {
      this.history.push({ board: boardSnapshot, score: scoreSnapshot });
      if (this.history.length > 5) this.history.shift();

      this.board = unrotated;
      this.addScore(pointsGained);
      this.updateMaxTile();
      this.spawnTile();

      if (!this.canMove()) {
        this.gameOver = true;
      }

      this.notify();
      return true;
    }

    return false;
  }

  private spawnTile(): void {
    const emptyCells: [number, number][] = [];
    for (let r = 0; r < Game2048Engine.SIZE; r++) {
      for (let c = 0; c < Game2048Engine.SIZE; c++) {
        if (this.board[r][c] === 0) emptyCells.push([r, c]);
      }
    }

    if (emptyCells.length > 0) {
      const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      this.board[r][c] = Math.random() < 0.9 ? 2 : 4;
    }
  }

  private updateMaxTile(): void {
    let max = 0;
    for (let r = 0; r < Game2048Engine.SIZE; r++) {
      for (let c = 0; c < Game2048Engine.SIZE; c++) {
        max = Math.max(max, this.board[r][c]);
      }
    }
    this.maxTile = max;
  }

  public canMove(): boolean {
    for (let r = 0; r < Game2048Engine.SIZE; r++) {
      for (let c = 0; c < Game2048Engine.SIZE; c++) {
        if (this.board[r][c] === 0) return true;
        if (c < Game2048Engine.SIZE - 1 && this.board[r][c] === this.board[r][c + 1]) return true;
        if (r < Game2048Engine.SIZE - 1 && this.board[r][c] === this.board[r + 1][c]) return true;
      }
    }
    return false;
  }

  private rotateToLeft(matrix: number[][], direction: Direction2048): number[][] {
    switch (direction) {
      case 'LEFT':
        return matrix;
      case 'RIGHT':
        return matrix.map((row) => [...row].reverse());
      case 'UP':
        return this.transpose(matrix);
      case 'DOWN':
        return this.transpose(matrix).map((row) => [...row].reverse());
    }
  }

  private rotateBack(matrix: number[][], direction: Direction2048): number[][] {
    switch (direction) {
      case 'LEFT':
        return matrix;
      case 'RIGHT':
        return matrix.map((row) => [...row].reverse());
      case 'UP':
        return this.transpose(matrix);
      case 'DOWN':
        return this.transpose(matrix.map((row) => [...row].reverse()));
    }
  }

  private transpose(matrix: number[][]): number[][] {
    return matrix[0].map((_, col) => matrix.map((row) => row[col]));
  }
}
