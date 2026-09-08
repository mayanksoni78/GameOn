import { BaseEngine } from './BaseEngine';

export interface BlockodukoPiece {
  id: string;
  cells: [number, number][];
  color: string;
}

export type BlockodukoBoard = (string | null)[][];

export interface BlockodukoState {
  grid: BlockodukoBoard;
  dockPieces: (BlockodukoPiece | null)[];
  score: number;
  highScore: number;
  combo: number;
  gameOver: boolean;
}

export class BlockodukoEngine extends BaseEngine<BlockodukoState> {
  public static readonly SIZE = 10;

  private static readonly SHAPE_DEFS: { cells: [number, number][]; color: string }[] = [
    { cells: [[0, 0]], color: '#A855F7' },
    { cells: [[0, 0], [0, 1]], color: '#3B82F6' },
    { cells: [[0, 0], [1, 0]], color: '#3B82F6' },
    { cells: [[0, 0], [0, 1], [0, 2]], color: '#00E5FF' },
    { cells: [[0, 0], [1, 0], [2, 0]], color: '#00E5FF' },
    { cells: [[0, 0], [0, 1], [1, 0], [1, 1]], color: '#FFD600' },
    { cells: [[0, 0], [1, 0], [1, 1]], color: '#EC4899' },
    { cells: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]], color: '#F97316' },
    { cells: [[0, 0], [0, 1], [1, 1], [1, 2]], color: '#10B981' },
    { cells: [[0, 0], [0, 1], [0, 2], [1, 1]], color: '#8B5CF6' },
  ];

  private grid: BlockodukoBoard;
  private dockPieces: (BlockodukoPiece | null)[] = [];
  private combo: number = 0;

  constructor(initialHighScore: number = 0) {
    super(initialHighScore);
    this.grid = this.createEmptyGrid();
    this.refillDock();
  }

  private createEmptyGrid(): BlockodukoBoard {
    return Array.from({ length: BlockodukoEngine.SIZE }, () =>
      Array(BlockodukoEngine.SIZE).fill(null)
    );
  }

  public getState(): BlockodukoState {
    return {
      grid: this.grid.map((r) => [...r]),
      dockPieces: this.dockPieces.map((p) => (p ? { ...p, cells: p.cells.map((c) => [...c]) } : null)),
      score: this.score,
      highScore: this.highScore,
      combo: this.combo,
      gameOver: this.gameOver,
    };
  }

  public reset(): void {
    this.grid = this.createEmptyGrid();
    this.score = 0;
    this.combo = 0;
    this.gameOver = false;
    this.refillDock();
    this.notify();
  }

  private refillDock(): void {
    this.dockPieces = [0, 1, 2].map(() => {
      const def = BlockodukoEngine.SHAPE_DEFS[
        Math.floor(Math.random() * BlockodukoEngine.SHAPE_DEFS.length)
      ];
      return {
        id: Math.random().toString(36),
        cells: def.cells.map((c) => [...c] as [number, number]),
        color: def.color,
      };
    });
  }

  public canPlace(cells: [number, number][], r: number, c: number): boolean {
    for (const [dr, dc] of cells) {
      const tr = r + dr;
      const tc = c + dc;
      if (
        tr < 0 ||
        tr >= BlockodukoEngine.SIZE ||
        tc < 0 ||
        tc >= BlockodukoEngine.SIZE ||
        this.grid[tr][tc] !== null
      ) {
        return false;
      }
    }
    return true;
  }

  public placePiece(dockIndex: number, r: number, c: number): boolean {
    if (this.gameOver || dockIndex < 0 || dockIndex >= this.dockPieces.length) {
      return false;
    }

    const piece = this.dockPieces[dockIndex];
    if (!piece || !this.canPlace(piece.cells, r, c)) {
      return false;
    }

    let placed = 0;
    for (const [dr, dc] of piece.cells) {
      this.grid[r + dr][c + dc] = piece.color;
      placed++;
    }

    this.dockPieces[dockIndex] = null;
    const cleared = this.clearCompletedLines();

    const gained = placed * 10 + cleared * 10;
    this.addScore(gained);

    if (this.dockPieces.every((p) => p === null)) {
      this.refillDock();
    }

    if (!this.hasValidMoves()) {
      this.gameOver = true;
    }

    this.notify();
    return true;
  }

  private clearCompletedLines(): number {
    const toClear = new Set<string>();

    for (let r = 0; r < BlockodukoEngine.SIZE; r++) {
      if (this.grid[r].every((c) => c !== null)) {
        for (let c = 0; c < BlockodukoEngine.SIZE; c++) toClear.add(`${r}-${c}`);
      }
    }

    for (let c = 0; c < BlockodukoEngine.SIZE; c++) {
      let full = true;
      for (let r = 0; r < BlockodukoEngine.SIZE; r++) {
        if (this.grid[r][c] === null) {
          full = false;
          break;
        }
      }
      if (full) {
        for (let r = 0; r < BlockodukoEngine.SIZE; r++) toClear.add(`${r}-${c}`);
      }
    }

    for (const key of toClear) {
      const [r, c] = key.split('-').map(Number);
      this.grid[r][c] = null;
    }
    return toClear.size;
  }

  private hasValidMoves(): boolean {
    for (const piece of this.dockPieces) {
      if (piece) {
        for (let r = 0; r < BlockodukoEngine.SIZE; r++) {
          for (let c = 0; c < BlockodukoEngine.SIZE; c++) {
            if (this.canPlace(piece.cells, r, c)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }
}
