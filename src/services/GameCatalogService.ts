import { Href } from 'expo-router';
import { IconId } from '../components/PremiumIcon';

export interface GameDefinition {
  id: IconId;
  title: string;
  subtitle: string;
  route: Href;
  accent: string;
  category: 'arcade' | 'puzzle' | 'board' | 'action';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  players: '1P' | '2P' | '1P / 2P';
  highScoreKey: string;
  image: any;
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
      {
        id: 'snake',
        title: 'Snake',
        subtitle: 'Guide the serpent, devour apples, survive the maze.',
        route: '/snake',
        accent: '#10B981',
        category: 'arcade',
        difficulty: 'MEDIUM',
        players: '1P',
        highScoreKey: 'snake_high_score',
        image: require('../../assets/images/icon_snake.png'),
      },
      {
        id: 'tetris',
        title: 'Tetris',
        subtitle: 'Arrange falling tetrominoes, clear rows and stack lines.',
        route: '/tetris',
        accent: '#8B5CF6',
        category: 'puzzle',
        difficulty: 'HARD',
        players: '1P',
        highScoreKey: 'tetris_high_score',
        image: require('../../assets/images/icon_tetris.png'),
      },
      {
        id: '2048',
        title: '2048',
        subtitle: 'Slide and combine numbers to build the 2048 tile.',
        route: '/game2048',
        accent: '#F59E0B',
        category: 'puzzle',
        difficulty: 'MEDIUM',
        players: '1P',
        highScoreKey: '2048_high_score',
        image: require('../../assets/images/icon_2048.png'),
      },
      {
        id: 'tictactoe',
        title: 'Tic Tac Toe',
        subtitle: 'Classic tactical 3x3 showdown with smart AI.',
        route: '/tictactoe',
        accent: '#EC4899',
        category: 'board',
        difficulty: 'EASY',
        players: '1P / 2P',
        highScoreKey: 'tictactoe_high_score',
        image: require('../../assets/images/icon_tictactoe.png'),
      },
      {
        id: 'flappybird',
        title: 'Flappy Bird',
        subtitle: 'Flap through perilous neon pipe corridors.',
        route: '/flappybird',
        accent: '#F43F5E',
        category: 'arcade',
        difficulty: 'HARD',
        players: '1P',
        highScoreKey: 'flappy_high_score',
        image: require('../../assets/images/icon_flappybird.png'),
      },
      {
        id: 'connect4',
        title: 'Connect 4',
        subtitle: 'Drop colored discs to connect 4 in a vertical grid.',
        route: '/connect4',
        accent: '#06B6D4',
        category: 'board',
        difficulty: 'MEDIUM',
        players: '2P',
        highScoreKey: 'connect4_high_score',
        image: require('../../assets/images/icon_connect4.png'),
      },
      {
        id: 'bingo',
        title: 'Tom & Jerry',
        subtitle: 'Gather cheese and outmaneuver Tom in the mansion.',
        route: '/tomandjerry',
        accent: '#A855F7',
        category: 'action',
        difficulty: 'HARD',
        players: '1P',
        highScoreKey: 'jerry_tom_hs',
        image: require('../../assets/images/icon_tomandjerry.png'),
      },
      {
        id: 'sudoku',
        title: 'Sudoku',
        subtitle: 'Logic-driven 9x9 number puzzle challenge.',
        route: '/sudoku',
        accent: '#3B82F6',
        category: 'puzzle',
        difficulty: 'HARD',
        players: '1P',
        highScoreKey: 'sudoku_high_score',
        image: require('../../assets/images/icon_sudoku.png'),
      },
      {
        id: 'dinojump',
        title: 'Dino Jump',
        subtitle: 'Endless desert sprint over obstacles and pterodactyls.',
        route: '/dinojump',
        accent: '#10B981',
        category: 'arcade',
        difficulty: 'MEDIUM',
        players: '1P',
        highScoreKey: 'dino_high_score',
        image: require('../../assets/images/icon_dinojump.png'),
      },
      {
        id: 'blockoduko',
        title: 'Blockodoku',
        subtitle: 'Strategically place block shapes onto a 9x9 matrix.',
        route: '/blockoduko',
        accent: '#D946EF',
        category: 'puzzle',
        difficulty: 'MEDIUM',
        players: '1P',
        highScoreKey: 'blockoduko_high_score',
        image: require('../../assets/images/icon_blockoduko.png'),
      },
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
