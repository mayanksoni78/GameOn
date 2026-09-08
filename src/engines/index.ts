export * from './BaseEngine';
export * from './TicTacToeEngine';
export * from './Connect4Engine';
export * from './Game2048Engine';
export * from './SnakeEngine';
export * from './SudokuEngine';
export * from './TetrisEngine';
export * from './DinoEngine';
export * from './FlappyBirdEngine';
export * from './BlockodukoEngine';
export * from './TomAndJerryEngine';

import { TicTacToeEngine } from './TicTacToeEngine';
import { Connect4Engine } from './Connect4Engine';
import { Game2048Engine } from './Game2048Engine';
import { SnakeEngine } from './SnakeEngine';
import { SudokuEngine } from './SudokuEngine';
import { TetrisEngine } from './TetrisEngine';
import { DinoEngine } from './DinoEngine';
import { FlappyBirdEngine } from './FlappyBirdEngine';
import { BlockodukoEngine } from './BlockodukoEngine';
import { TomAndJerryEngine } from './TomAndJerryEngine';
import { BaseEngine } from './BaseEngine';

export type GameEngineId =
  | 'tictactoe'
  | 'connect4'
  | '2048'
  | 'snake'
  | 'sudoku'
  | 'tetris'
  | 'dinojump'
  | 'flappybird'
  | 'blockoduko'
  | 'tomandjerry';

/**
 * GameEngineFactory (Creational Factory Pattern)
 * Instantiates the appropriate OOP Game Engine instance dynamically.
 */
export class GameEngineFactory {
  public static createEngine(id: GameEngineId, initialHighScore: number = 0): BaseEngine<any> {
    switch (id) {
      case 'tictactoe':
        return new TicTacToeEngine();
      case 'connect4':
        return new Connect4Engine();
      case '2048':
        return new Game2048Engine(initialHighScore);
      case 'snake':
        return new SnakeEngine(20, 20, initialHighScore);
      case 'sudoku':
        return new SudokuEngine();
      case 'tetris':
        return new TetrisEngine(initialHighScore);
      case 'dinojump':
        return new DinoEngine(initialHighScore);
      case 'flappybird':
        return new FlappyBirdEngine(initialHighScore);
      case 'blockoduko':
        return new BlockodukoEngine(initialHighScore);
      case 'tomandjerry':
        return new TomAndJerryEngine(initialHighScore);
      default:
        throw new Error(`Unsupported game engine type: ${id}`);
    }
  }
}
