import { BaseEngine } from './BaseEngine';

export interface SudokuCell {
  val: number;
  isGiven: boolean;
  notes: number[];
  isError: boolean;
}

export type SudokuDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface SudokuState {
  board: SudokuCell[][];
  selectedRow: number | null;
  selectedCol: number | null;
  difficulty: SudokuDifficulty;
  mistakes: number;
  maxMistakes: number;
  isNotesMode: boolean;
  gameOver: boolean;
  isComplete: boolean;
  timerSeconds: number;
  hints: number;
  canUndo: boolean;
  canRedo: boolean;
  isPaused: boolean;
}

export class SudokuEngine extends BaseEngine<SudokuState> {
  public static readonly SIZE = 9;
  private static readonly SEED_BOARD = [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9],
  ];

  private board: SudokuCell[][] = [];
  private solution: number[][] = [];
  private history: SudokuCell[][][] = [];
  private future: SudokuCell[][][] = [];
  private selectedRow: number | null = null;
  private selectedCol: number | null = null;
  private difficulty: SudokuDifficulty = 'EASY';
  private mistakes: number = 0;
  private readonly maxMistakes: number = 3;
  private hints: number = 3;
  private isNotesMode: boolean = false;
  private isComplete: boolean = false;
  private isPaused: boolean = false;
  private timerSeconds: number = 0;

  constructor() {
    super(0);
    this.initGame(this.difficulty);
  }

  private cloneBoard(b: SudokuCell[][]): SudokuCell[][] {
    return b.map((row) =>
      row.map((c) => ({
        ...c,
        notes: [...c.notes],
      }))
    );
  }

  public initGame(diff: SudokuDifficulty): void {
    this.difficulty = diff;
    let sol = SudokuEngine.SEED_BOARD.map((row) => [...row]);
    const numMap = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
    sol = sol.map((row) => row.map((val) => numMap[val - 1]));
    this.solution = sol;

    const toRemove = diff === 'EASY' ? 30 : diff === 'MEDIUM' ? 45 : 60;
    const b: SudokuCell[][] = sol.map((row) =>
      row.map((val) => ({
        val,
        isGiven: true,
        notes: [],
        isError: false,
      }))
    );

    let removed = 0;
    while (removed < toRemove) {
      const r = Math.floor(Math.random() * 9);
      const c = Math.floor(Math.random() * 9);
      if (b[r][c].val !== 0) {
        b[r][c].val = 0;
        b[r][c].isGiven = false;
        removed++;
      }
    }

    this.board = b;
    this.history = [this.cloneBoard(b)];
    this.future = [];
    this.selectedRow = null;
    this.selectedCol = null;
    this.mistakes = 0;
    this.hints = 3;
    this.isComplete = false;
    this.gameOver = false;
    this.isPaused = false;
    this.timerSeconds = 0;
    this.notify();
  }

  public getState(): SudokuState {
    return {
      board: this.cloneBoard(this.board),
      selectedRow: this.selectedRow,
      selectedCol: this.selectedCol,
      difficulty: this.difficulty,
      mistakes: this.mistakes,
      maxMistakes: this.maxMistakes,
      isNotesMode: this.isNotesMode,
      gameOver: this.gameOver,
      isComplete: this.isComplete,
      timerSeconds: this.timerSeconds,
      hints: this.hints,
      canUndo: this.history.length > 1,
      canRedo: this.future.length > 0,
      isPaused: this.isPaused,
    };
  }

  public reset(): void {
    this.initGame(this.difficulty);
  }

  public togglePause(forced?: boolean): void {
    if (this.gameOver || this.isComplete) return;
    this.isPaused = typeof forced === 'boolean' ? forced : !this.isPaused;
    this.notify();
  }

  public setDifficulty(diff: SudokuDifficulty): void {
    this.initGame(diff);
  }

  public selectCell(r: number, c: number): void {
    if (this.isPaused) return;
    this.selectedRow = r;
    this.selectedCol = c;
    this.notify();
  }

  public toggleNotesMode(): void {
    this.isNotesMode = !this.isNotesMode;
    this.notify();
  }

  private saveHistory(): void {
    this.history.push(this.cloneBoard(this.board));
    if (this.history.length > 25) {
      this.history.shift();
    }
    this.future = [];
  }

  public enterNumber(num: number): boolean {
    if (
      this.gameOver ||
      this.isComplete ||
      this.isPaused ||
      this.selectedRow === null ||
      this.selectedCol === null
    ) {
      return false;
    }

    const r = this.selectedRow;
    const c = this.selectedCol;
    const cell = this.board[r][c];

    if (cell.isGiven) return false;

    if (num === 0) {
      cell.val = 0;
      cell.isError = false;
      cell.notes = [];
      this.saveHistory();
      this.notify();
      return true;
    }

    if (this.isNotesMode) {
      const idx = cell.notes.indexOf(num);
      if (idx !== -1) {
        cell.notes.splice(idx, 1);
      } else {
        cell.notes.push(num);
      }
      this.notify();
      return true;
    }

    const correct = this.solution[r][c] === num;
    cell.val = num;
    cell.notes = [];
    cell.isError = !correct;

    if (correct) {
      this.addScore(20);
      this.checkCompletion();
    } else {
      this.mistakes++;
      if (this.mistakes >= this.maxMistakes) {
        this.gameOver = true;
      }
    }

    this.saveHistory();
    this.notify();
    return correct;
  }

  public erase(): void {
    this.enterNumber(0);
  }

  public useHint(): boolean {
    if (
      this.gameOver ||
      this.isComplete ||
      this.isPaused ||
      this.hints <= 0 ||
      this.selectedRow === null ||
      this.selectedCol === null
    ) {
      return false;
    }

    const r = this.selectedRow;
    const c = this.selectedCol;
    const cell = this.board[r][c];

    if (cell.isGiven || cell.val === this.solution[r][c]) return false;

    cell.val = this.solution[r][c];
    cell.isError = false;
    cell.notes = [];
    this.hints--;
    this.saveHistory();
    this.checkCompletion();
    this.notify();
    return true;
  }

  public undo(): void {
    if (this.history.length <= 1 || this.isPaused) return;
    const curr = this.history.pop()!;
    this.future.push(curr);
    this.board = this.cloneBoard(this.history[this.history.length - 1]);
    this.notify();
  }

  public redo(): void {
    if (this.future.length === 0 || this.isPaused) return;
    const next = this.future.pop()!;
    this.board = this.cloneBoard(next);
    this.history.push(this.cloneBoard(next));
    this.notify();
  }

  public tickTimer(): void {
    if (!this.gameOver && !this.isComplete && !this.isPaused) {
      this.timerSeconds++;
      this.notify();
    }
  }

  private checkCompletion(): void {
    let full = true;
    for (let r = 0; r < SudokuEngine.SIZE; r++) {
      for (let c = 0; c < SudokuEngine.SIZE; c++) {
        if (this.board[r][c].val !== this.solution[r][c]) {
          full = false;
          break;
        }
      }
      if (!full) break;
    }
    if (full) {
      this.isComplete = true;
      this.addScore(500);
    }
  }
}
