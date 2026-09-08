import { BaseEngine } from './BaseEngine';

export type PlayerSymbol = 'X' | 'O' | null;
export type GameMode = 'PvP' | 'PvE';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface WinnerInfo {
  winner: PlayerSymbol;
  line: number[];
}

export interface TicTacToeState {
  board: PlayerSymbol[];
  currentPlayer: 'X' | 'O';
  winnerInfo: WinnerInfo | null;
  isDraw: boolean;
  gameMode: GameMode;
  difficulty: Difficulty;
  xScore: number;
  oScore: number;
  draws: number;
  streak: number;
}

export class TicTacToeEngine extends BaseEngine<TicTacToeState> {
  private static readonly WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  private board: PlayerSymbol[] = Array(9).fill(null);
  private currentPlayer: 'X' | 'O' = 'X';
  private winnerInfo: WinnerInfo | null = null;
  private isDrawMatch: boolean = false;
  private gameMode: GameMode = 'PvE';
  private difficulty: Difficulty = 'MEDIUM';
  private xScore: number = 0;
  private oScore: number = 0;
  private draws: number = 0;
  private streak: number = 0;

  constructor() {
    super(0);
  }

  public getState(): TicTacToeState {
    return {
      board: [...this.board],
      currentPlayer: this.currentPlayer,
      winnerInfo: this.winnerInfo,
      isDraw: this.isDrawMatch,
      gameMode: this.gameMode,
      difficulty: this.difficulty,
      xScore: this.xScore,
      oScore: this.oScore,
      draws: this.draws,
      streak: this.streak,
    };
  }

  public reset(): void {
    this.board = Array(9).fill(null);
    this.currentPlayer = 'X';
    this.winnerInfo = null;
    this.isDrawMatch = false;
    this.gameOver = false;
    this.notify();
  }

  public resetAll(): void {
    this.xScore = 0;
    this.oScore = 0;
    this.draws = 0;
    this.streak = 0;
    this.reset();
  }

  public setGameMode(mode: GameMode): void {
    this.gameMode = mode;
    this.reset();
  }

  public setDifficulty(diff: Difficulty): void {
    this.difficulty = diff;
    this.reset();
  }

  public makeMove(index: number): boolean {
    if (this.gameOver || this.board[index] !== null || index < 0 || index >= 9) {
      return false;
    }

    this.board[index] = this.currentPlayer;
    const win = this.checkWinner(this.board);

    if (win) {
      this.winnerInfo = win;
      this.gameOver = true;
      if (win.winner === 'X') {
        this.xScore++;
        this.streak++;
        this.addScore(100);
      } else {
        this.oScore++;
        this.streak = 0;
      }
      this.notify();
      return true;
    }

    if (this.checkDraw(this.board)) {
      this.isDrawMatch = true;
      this.gameOver = true;
      this.draws++;
      this.notify();
      return true;
    }

    this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    this.notify();

    // Trigger AI move if in PvE and it's O's turn
    if (this.gameMode === 'PvE' && this.currentPlayer === 'O' && !this.gameOver) {
      setTimeout(() => {
        this.makeAIMove();
      }, 350);
    }

    return true;
  }

  private makeAIMove(): void {
    if (this.gameOver) return;
    const move = this.getAIMove();
    if (move !== -1) {
      this.makeMove(move);
    }
  }

  private getAIMove(): number {
    switch (this.difficulty) {
      case 'EASY':
        return this.getRandomMove();
      case 'MEDIUM':
        return this.getMediumMove();
      case 'HARD':
        return this.getBestMoveMinimax();
    }
  }

  private checkWinner(sq: PlayerSymbol[]): WinnerInfo | null {
    for (const line of TicTacToeEngine.WIN_LINES) {
      const [a, b, c] = line;
      if (sq[a] && sq[a] === sq[b] && sq[a] === sq[c]) {
        return { winner: sq[a], line };
      }
    }
    return null;
  }

  private checkDraw(sq: PlayerSymbol[]): boolean {
    return !sq.includes(null) && !this.checkWinner(sq);
  }

  private getRandomMove(): number {
    const empty: number[] = [];
    this.board.forEach((val, i) => {
      if (!val) empty.push(i);
    });
    return empty.length ? empty[Math.floor(Math.random() * empty.length)] : -1;
  }

  private getMediumMove(): number {
    // Check if AI can win
    for (let i = 0; i < 9; i++) {
      if (!this.board[i]) {
        this.board[i] = 'O';
        const win = this.checkWinner(this.board);
        this.board[i] = null;
        if (win) return i;
      }
    }
    // Block opponent win
    for (let i = 0; i < 9; i++) {
      if (!this.board[i]) {
        this.board[i] = 'X';
        const win = this.checkWinner(this.board);
        this.board[i] = null;
        if (win) return i;
      }
    }
    // Center control
    if (!this.board[4]) return 4;
    return this.getRandomMove();
  }

  private minimax(b: PlayerSymbol[], depth: number, isMaximizing: boolean): number {
    const win = this.checkWinner(b);
    if (win?.winner === 'O') return 10 - depth;
    if (win?.winner === 'X') return depth - 10;
    if (this.checkDraw(b)) return 0;

    if (isMaximizing) {
      let best = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (!b[i]) {
          b[i] = 'O';
          best = Math.max(best, this.minimax(b, depth + 1, false));
          b[i] = null;
        }
      }
      return best;
    } else {
      let best = Infinity;
      for (let i = 0; i < 9; i++) {
        if (!b[i]) {
          b[i] = 'X';
          best = Math.min(best, this.minimax(b, depth + 1, true));
          b[i] = null;
        }
      }
      return best;
    }
  }

  private getBestMoveMinimax(): number {
    let bestScore = -Infinity;
    let bestMove = -1;

    for (let i = 0; i < 9; i++) {
      if (!this.board[i]) {
        this.board[i] = 'O';
        const score = this.minimax(this.board, 0, false);
        this.board[i] = null;
        if (score > bestScore) {
          bestScore = score;
          bestMove = i;
        }
      }
    }
    return bestMove;
  }
}
