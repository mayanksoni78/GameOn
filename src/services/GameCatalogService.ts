import { Href } from 'expo-router';
import { IconId } from '../components/PremiumIcon';

export interface GameDefinition {
  id: IconId;
  title: string;
  subtitle: string;
  route: Href;
  accent: string;
  category?: 'arcade' | 'puzzle' | 'board' | 'action';
}

/**
 * GameCatalogService
 * OOP Singleton service implementing the Registry / Repository pattern
 * Encapsulates game discovery, filtering, and route resolution.
 */
export class GameCatalogService {
  private static instance: GameCatalogService | null = null;
  private readonly catalog: Map<string, GameDefinition> = new Map();

  private constructor() {
    this.registerDefaults();
  }

  public static getInstance(): GameCatalogService {
    if (!GameCatalogService.instance) {
      GameCatalogService.instance = new GameCatalogService();
    }
    return GameCatalogService.instance;
  }

  private registerDefaults(): void {
    const defaultGames: GameDefinition[] = [
      { id: 'snake',      title: 'Snake',       subtitle: 'Classic directional eating game.',   route: '/snake',       accent: '#00E676', category: 'arcade' },
      { id: 'tetris',     title: 'Tetris',      subtitle: 'Block puzzle masterpiece.',          route: '/tetris',      accent: '#B300FF', category: 'puzzle' },
      { id: '2048',       title: '2048',        subtitle: 'Combine tiles to reach 2048.',       route: '/game2048',    accent: '#FFB300', category: 'puzzle' },
      { id: 'tictactoe',  title: 'Tic Tac',     subtitle: 'Strategic X and O battles.',         route: '/tictactoe',   accent: '#00E5FF', category: 'board' },
      { id: 'flappybird', title: 'Flappy',      subtitle: 'Navigate through the obstacles.',    route: '/flappybird',  accent: '#FF4081', category: 'arcade' },
      { id: 'connect4',   title: 'Connect 4',   subtitle: 'Drop pieces to form a line of 4.',   route: '/connect4',    accent: '#FF3D71', category: 'board' },
      { id: 'bingo',      title: 'Tom & Jerry', subtitle: 'Collect cheese, dodge Tom!',         route: '/tomandjerry', accent: '#3DD6D0', category: 'action' },
      { id: 'sudoku',     title: 'Sudoku',      subtitle: 'Classic logic-based number puzzle.', route: '/sudoku',      accent: '#2979FF', category: 'puzzle' },
      { id: 'dinojump',   title: 'Dino Jump',   subtitle: 'Endless runner survival.',           route: '/dinojump',    accent: '#69FF47', category: 'arcade' },
      { id: 'blockoduko', title: 'Block',       subtitle: 'Wood block puzzle logic.',           route: '/blockoduko',  accent: '#7C3AED', category: 'puzzle' },
    ];

    defaultGames.forEach((g) => this.catalog.set(g.id, g));
  }

  public getAllGames(): GameDefinition[] {
    return Array.from(this.catalog.values());
  }

  public getGameById(id: IconId): GameDefinition | undefined {
    return this.catalog.get(id);
  }

  public getGamesByCategory(category: GameDefinition['category']): GameDefinition[] {
    return this.getAllGames().filter((g) => g.category === category);
  }

  public searchGames(query: string): GameDefinition[] {
    const q = query.toLowerCase().trim();
    return this.getAllGames().filter(
      (g) => g.title.toLowerCase().includes(q) || g.subtitle.toLowerCase().includes(q)
    );
  }
}
