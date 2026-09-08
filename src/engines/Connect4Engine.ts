import { BaseEngine } from './BaseEngine';

export type Connect4Player = 1 | 2;
export type Connect4Cell = 0 | 1 | 2;

export interface Connect4WinningPos {
  row: number;
  col: number;
}

export interface Connect4State {
  board: Connect4Cell[][];
  currentPlayer: Connect4Player;
  winner: Connect4Player | null;
  isDraw: boolean;
  winningPositions: Connect4WinningPos[];
  p1Score: number;
  p2Score: number;
  gameMode: 'PvP' | 'PvE';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export class Connect4Engine extends BaseEngine<Connect4State> {
  public static readonly ROWS = 6;
  public static readonly COLS = 7;

  private board: Connect4Cell[][];
  private currentPlayer: Connect4Player = 1;
  private winner: Connect4Player | null = null;
  private isDrawMatch: boolean = false;
  private winningPositions: Connect4WinningPos[] = [];
  private p1Score: number = 0;
  private p2Score: number = 0;
  private gameMode: 'PvP' | 'PvE' = 'PvE';
  private difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM';

  constructor() {
    super(0);
    this.board = this.createEmptyBoard();
  }

  private createEmptyBoard(): Connect4Cell[][] {
    return Array.from({ length: Connect4Engine.ROWS }, () =>
      Array(Connect4Engine.COLS).fill(0)
    );
  }

  public getState(): Connect4State {
    return {
      board: this.board.map((r) => [...r]),
      currentPlayer: this.currentPlayer,
      winner: this.winner,
      isDraw: this.isDrawMatch,
      winningPositions: [...this.winningPositions],
      p1Score: this.p1Score,
      p2Score: this.p2Score,
      gameMode: this.gameMode,
      difficulty: this.difficulty,
    };
  }

  public reset(): void {
    this.board = this.createEmptyBoard();
    this.currentPlayer = 1;
    this.winner = null;
    this.isDrawMatch = false;
    this.winningPositions = [];
    this.gameOver = false;
    this.notify();
  }

  public setGameMode(mode: 'PvP' | 'PvE'): void {
    this.gameMode = mode;
    this.reset();
  }

  public setDifficulty(diff: 'EASY' | 'MEDIUM' | 'HARD'): void {
    this.difficulty = diff;
    this.reset();
  }

  public dropPiece(col: number): { row: number; col: number } | null {
    if (this.gameOver || col < 0 || col >= Connect4Engine.COLS || this.board[0][col] !== 0) {
      return null;
    }

    // Find lowest open row
    let targetRow = -1;
    for (let r = Connect4Engine.ROWS - 1; r >= 0; r--) {
      if (this.board[r][col] === 0) {
        targetRow = r;
        break;
      }
    }

    if (targetRow === -1) return null;

    this.board[targetRow][col] = this.currentPlayer;
    const winPos = this.checkWin(this.board, targetRow, col, this.currentPlayer);

    if (winPos) {
      this.winner = this.currentPlayer;
      this.winningPositions = winPos;
      this.gameOver = true;
      if (this.currentPlayer === 1) {
        this.p1Score++;
        this.addScore(100);
      } else {
        this.p2Score++;
      }
      this.notify();
      return { row: targetRow, col };
    }

    if (this.checkFull(this.board)) {
      this.isDrawMatch = true;
      this.gameOver = true;
      this.notify();
      return { row: targetRow, col };
    }

    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    this.notify();

    // Trigger AI move if PvE
    if (this.gameMode === 'PvE' && this.currentPlayer === 2 && !this.gameOver) {
      setTimeout(() => {
        this.makeAIMove();
      }, 400);
    }

    return { row: targetRow, col };
  }

  private makeAIMove(): void {
    if (this.gameOver) return;
    const depth = this.difficulty === 'EASY' ? 2 : this.difficulty === 'MEDIUM' ? 3 : 5;
    const bestCol = this.findBestColumn(depth);
    if (bestCol !== -1) {
      this.dropPiece(bestCol);
    }
  }

  private findBestColumn(depth: number): number {
    const validCols = this.getValidColumns(this.board);
    if (validCols.length === 0) return -1;

    // Direct win check
    for (const col of validCols) {
      const b = this.cloneBoard(this.board);
      const r = this.simulateDrop(b, col, 2);
      if (this.checkWin(b, r, col, 2)) return col;
    }

    // Direct block check
    for (const col of validCols) {
      const b = this.cloneBoard(this.board);
      const r = this.simulateDrop(b, col, 1);
      if (this.checkWin(b, r, col, 1)) return col;
    }

    // Prefer center
    if (validCols.includes(3)) return 3;

    return validCols[Math.floor(Math.random() * validCols.length)];
  }

  private getValidColumns(b: Connect4Cell[][]): number[] {
    const valid: number[] = [];
    for (let c = 0; c < Connect4Engine.COLS; c++) {
      if (b[0][c] === 0) valid.push(c);
    }
    return valid;
  }

  private cloneBoard(b: Connect4Cell[][]): Connect4Cell[][] {
    return b.map((r) => [...r]);
  }

  private simulateDrop(b: Connect4Cell[][], col: number, player: Connect4Cell): number {
    for (let r = Connect4Engine.ROWS - 1; r >= 0; r--) {
      if (b[r][col] === 0) {
        b[r][col] = player;
        return r;
      }
    }
    return -1;
  }

  private checkWin(
    b: Connect4Cell[][],
    r: number,
    c: number,
    p: Connect4Player
  ): Connect4WinningPos[] | null {
    const directions = [
      [0, 1],  // Horizontal
      [1, 0],  // Vertical
      [1, 1],  // Diagonal /
      [1, -1], // Diagonal \
    ];

    for (const [dr, dc] of directions) {
      const line: Connect4WinningPos[] = [{ row: r, col: c }];

      // Forward
      for (let step = 1; step < 4; step++) {
        const nr = r + dr * step;
        const nc = c + dc * step;
        if (
          nr >= 0 &&
          nr < Connect4Engine.ROWS &&
          nc >= 0 &&
          nc < Connect4Engine.COLS &&
          b[nr][nc] === p
        ) {
          line.push({ row: nr, col: nc });
        } else {
          break;
        }
      }

      // Backward
      for (let step = 1; step < 4; step++) {
        const nr = r - dr * step;
        const nc = c - dc * step;
        if (
          nr >= 0 &&
          nr < Connect4Engine.ROWS &&
          nc >= 0 &&
          nc < Connect4Engine.COLS &&
          b[nr][nc] === p
        ) {
          line.push({ row: nr, col: nc });
        } else {
          break;
        }
      }

      if (line.length >= 4) {
        return line;
      }
    }
    return null;
  }

  private checkFull(b: Connect4Cell[][]): boolean {
    return b[0].every((cell) => cell !== 0);
  }
}
