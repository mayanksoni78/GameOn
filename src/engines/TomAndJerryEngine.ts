import { BaseEngine } from './BaseEngine';

export interface MazePos {
  r: number;
  c: number;
}

export type TomAndJerryDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type TomAndJerryStatus = 'idle' | 'playing' | 'paused' | 'won' | 'lost';

export interface TomAndJerryState {
  maze: number[][];
  jerryPos: MazePos;
  tomPositions: MazePos[];
  cheeses: MazePos[];
  cheeseCount: number;
  score: number;
  highScore: number;
  difficulty: TomAndJerryDifficulty;
  status: TomAndJerryStatus;
}

export class TomAndJerryEngine extends BaseEngine<TomAndJerryState> {
  public static readonly ROWS = 21;
  public static readonly COLS = 21;

  private maze: number[][] = [];
  private jerryPos: MazePos = { r: 1, c: 1 };
  private tomPositions: MazePos[] = [];
  private cheeses: MazePos[] = [];
  private cheeseCount: number = 0;
  private difficulty: TomAndJerryDifficulty = 'EASY';
  private status: TomAndJerryStatus = 'idle';

  constructor(initialHighScore: number = 0) {
    super(initialHighScore);
    this.maze = this.generateMaze();
  }

  public getState(): TomAndJerryState {
    return {
      maze: this.maze.map((r) => [...r]),
      jerryPos: { ...this.jerryPos },
      tomPositions: this.tomPositions.map((t) => ({ ...t })),
      cheeses: this.cheeses.map((c) => ({ ...c })),
      cheeseCount: this.cheeseCount,
      score: this.score,
      highScore: this.highScore,
      difficulty: this.difficulty,
      status: this.status,
    };
  }

  public startGame(diff: TomAndJerryDifficulty = this.difficulty): void {
    this.difficulty = diff;
    this.maze = this.generateMaze();
    this.jerryPos = { r: 1, c: 1 };
    this.score = 0;
    this.cheeseCount = 0;
    this.gameOver = false;
    this.status = 'playing';

    const tomCount = diff === 'EASY' ? 1 : diff === 'MEDIUM' ? 2 : 3;
    const tomStarts: MazePos[] = [];
    const corners: MazePos[] = [
      { r: TomAndJerryEngine.ROWS - 2, c: TomAndJerryEngine.COLS - 2 },
      { r: 1, c: TomAndJerryEngine.COLS - 2 },
      { r: TomAndJerryEngine.ROWS - 2, c: 1 },
    ];

    for (let i = 0; i < tomCount; i++) {
      let target = corners[i % corners.length];
      while (this.maze[target.r]?.[target.c] !== 1 && target.r > 1 && target.c > 1) {
        target = { r: target.r - 1, c: target.c - 1 };
      }
      if (this.maze[target.r]?.[target.c] !== 1) {
        target = this.randomPathPos([this.jerryPos, ...tomStarts]);
      }
      tomStarts.push(target);
    }
    this.tomPositions = tomStarts;
    this.cheeses = this.spawnCheese(5, [this.jerryPos, ...tomStarts]);
    this.notify();
  }

  public reset(): void {
    this.startGame(this.difficulty);
  }

  public setDifficulty(diff: TomAndJerryDifficulty): void {
    this.difficulty = diff;
    this.notify();
  }

  public togglePause(): void {
    if (this.status === 'playing') {
      this.status = 'paused';
      this.notify();
    } else if (this.status === 'paused') {
      this.status = 'playing';
      this.notify();
    }
  }

  public moveJerry(dr: number, dc: number): { moved: boolean; ateCheese: boolean; caught: boolean; won: boolean } {
    if (this.status !== 'playing') {
      return { moved: false, ateCheese: false, caught: false, won: false };
    }

    const nr = this.jerryPos.r + dr;
    const nc = this.jerryPos.c + dc;

    if (nr < 0 || nr >= TomAndJerryEngine.ROWS || nc < 0 || nc >= TomAndJerryEngine.COLS || this.maze[nr][nc] !== 1) {
      return { moved: false, ateCheese: false, caught: false, won: false };
    }

    this.jerryPos = { r: nr, c: nc };

    // Check collision with Tom
    for (const tom of this.tomPositions) {
      if (tom.r === nr && tom.c === nc) {
        this.status = 'lost';
        this.gameOver = true;
        this.notify();
        return { moved: true, ateCheese: false, caught: true, won: false };
      }
    }

    // Check cheese
    const cheeseIdx = this.cheeses.findIndex((ch) => ch.r === nr && ch.c === nc);
    let ateCheese = false;
    let won = false;

    if (cheeseIdx !== -1) {
      ateCheese = true;
      this.cheeses.splice(cheeseIdx, 1);
      this.cheeseCount++;
      this.addScore(100);

      // Spawn replacement cheese
      const newCheese = this.spawnCheese(1, [this.jerryPos, ...this.tomPositions, ...this.cheeses]);
      this.cheeses.push(...newCheese);

      const targetScore = this.difficulty === 'EASY' ? 500 : this.difficulty === 'MEDIUM' ? 1000 : 1500;
      if (this.score >= targetScore) {
        this.status = 'won';
        this.gameOver = true;
        won = true;
      }
    }

    this.notify();
    return { moved: true, ateCheese, caught: false, won };
  }

  public tickToms(): boolean {
    if (this.status !== 'playing') return false;

    const newToms = this.tomPositions.map((tom) => this.bfsNextStep(tom, this.jerryPos));
    this.tomPositions = newToms;

    for (const tom of newToms) {
      if (tom.r === this.jerryPos.r && tom.c === this.jerryPos.c) {
        this.status = 'lost';
        this.gameOver = true;
        this.notify();
        return false;
      }
    }

    this.notify();
    return true;
  }

  private generateMaze(): number[][] {
    const grid: number[][] = Array.from({ length: TomAndJerryEngine.ROWS }, () =>
      Array(TomAndJerryEngine.COLS).fill(0)
    );
    const stack: [number, number][] = [];
    const start: [number, number] = [1, 1];
    grid[start[0]][start[1]] = 1;
    stack.push(start);

    while (stack.length > 0) {
      const [cr, cc] = stack[stack.length - 1];
      const neighbors: [number, number, number, number][] = [];
      for (const [dr, dc] of [
        [0, -2],
        [0, 2],
        [-2, 0],
        [2, 0],
      ]) {
        const nr = cr + dr;
        const nc = cc + dc;
        if (
          nr > 0 &&
          nr < TomAndJerryEngine.ROWS - 1 &&
          nc > 0 &&
          nc < TomAndJerryEngine.COLS - 1 &&
          grid[nr][nc] === 0
        ) {
          neighbors.push([nr, nc, cr + dr / 2, cc + dc / 2]);
        }
      }
      if (neighbors.length === 0) {
        stack.pop();
      } else {
        const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
        grid[pick[0]][pick[1]] = 1;
        grid[pick[2]][pick[3]] = 1;
        stack.push([pick[0], pick[1]]);
      }
    }

    for (let i = 0; i < Math.floor(TomAndJerryEngine.ROWS * TomAndJerryEngine.COLS * 0.05); i++) {
      const r = 2 + Math.floor(Math.random() * (TomAndJerryEngine.ROWS - 4));
      const c = 2 + Math.floor(Math.random() * (TomAndJerryEngine.COLS - 4));
      if (grid[r][c] === 0) {
        let adj = 0;
        if (grid[r - 1]?.[c] === 1) adj++;
        if (grid[r + 1]?.[c] === 1) adj++;
        if (grid[r]?.[c - 1] === 1) adj++;
        if (grid[r]?.[c + 1] === 1) adj++;
        if (adj >= 2) grid[r][c] = 1;
      }
    }
    return grid;
  }

  private bfsNextStep(from: MazePos, to: MazePos): MazePos {
    if (from.r === to.r && from.c === to.c) return from;
    const rows = TomAndJerryEngine.ROWS;
    const cols = TomAndJerryEngine.COLS;
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const parent = Array.from({ length: rows }, () => Array(cols).fill(null)) as (MazePos | null)[][];

    const queue: MazePos[] = [from];
    visited[from.r][from.c] = true;

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr.r === to.r && curr.c === to.c) {
        let step: MazePos = curr;
        while (parent[step.r][step.c] && !(parent[step.r][step.c]!.r === from.r && parent[step.r][step.c]!.c === from.c)) {
          step = parent[step.r][step.c]!;
        }
        return step;
      }
      for (const [dr, dc] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const nr = curr.r + dr;
        const nc = curr.c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc] && this.maze[nr][nc] === 1) {
          visited[nr][nc] = true;
          parent[nr][nc] = curr;
          queue.push({ r: nr, c: nc });
        }
      }
    }
    return from;
  }

  private randomPathPos(exclude: MazePos[]): MazePos {
    const paths: MazePos[] = [];
    for (let r = 0; r < TomAndJerryEngine.ROWS; r++) {
      for (let c = 0; c < TomAndJerryEngine.COLS; c++) {
        if (this.maze[r][c] === 1 && !exclude.some((e) => e.r === r && e.c === c)) {
          paths.push({ r, c });
        }
      }
    }
    return paths[Math.floor(Math.random() * paths.length)] || { r: 1, c: 1 };
  }

  private spawnCheese(count: number, exclude: MazePos[]): MazePos[] {
    const result: MazePos[] = [];
    const used = [...exclude];
    for (let i = 0; i < count; i++) {
      const pos = this.randomPathPos(used);
      result.push(pos);
      used.push(pos);
    }
    return result;
  }
}
