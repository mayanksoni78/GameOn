/**
 * ============================================================================
 * GAME ON - CORE OOP ENGINE ARCHITECTURE
 * ============================================================================
 * Demonstrating the 4 Pillars of Object-Oriented Programming in Game Logic:
 * 1. Abstraction: IGameEngine interface and abstract BaseEngine class.
 * 2. Encapsulation: Private board state, scores, moves, validation, and observers.
 * 3. Inheritance: BaseEngine -> Concrete Game Engines.
 * 4. Polymorphism: Polymorphic move execution, scoring, and AI evaluation.
 * 
 * Design Patterns Applied:
 * - Observer Pattern: State subscription for decoupled UI reactive updates.
 * - Strategy Pattern: Configurable AI difficulty levels (Easy, Medium, Minimax).
 * - Factory Pattern: GameEngineFactory for instantiating engines by game identifier.
 * ============================================================================
 */

import { useState, useEffect, useRef } from 'react';

export interface IGameEngine<TState> {
  getState(): TState;
  reset(): void;
  getScore(): number;
  getHighScore(): number;
  isGameOver(): boolean;
  subscribe(listener: (state: TState) => void): () => void;
}

/**
 * useEngine: React Hook to bridge OOP BaseEngine instances with reactive component state.
 * Uses the Observer Pattern to subscribe to engine changes.
 */
export function useEngine<TEngine extends { getState(): any; subscribe(cb: (s: any) => void): () => void }>(
  engineFactory: () => TEngine
): [ReturnType<TEngine['getState']>, TEngine] {
  const engineRef = useRef<TEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = engineFactory();
  }
  const engine = engineRef.current;
  const [state, setState] = useState<ReturnType<TEngine['getState']>>(() => engine.getState());

  useEffect(() => {
    const unsubscribe = engine.subscribe((newState) => {
      setState(newState);
    });
    return () => {
      unsubscribe();
    };
  }, [engine]);

  return [state, engine];
}

export abstract class BaseEngine<TState> implements IGameEngine<TState> {
  protected score: number = 0;
  protected highScore: number = 0;
  protected gameOver: boolean = false;
  private listeners: Array<(state: TState) => void> = [];

  constructor(initialHighScore: number = 0) {
    this.highScore = initialHighScore;
  }

  public abstract getState(): TState;
  public abstract reset(): void;

  public getScore(): number {
    return this.score;
  }

  public getHighScore(): number {
    return this.highScore;
  }

  public isGameOver(): boolean {
    return this.gameOver;
  }

  protected setScore(score: number): void {
    this.score = score;
    if (this.score > this.highScore) {
      this.highScore = this.score;
    }
  }

  protected addScore(points: number): void {
    this.setScore(this.score + points);
  }

  public setHighScore(highScore: number): void {
    this.highScore = Math.max(this.highScore, highScore);
  }

  /**
   * Observer Pattern: Subscribe to engine state updates.
   * Returns an unsubscribe function.
   */
  public subscribe(listener: (state: TState) => void): () => void {
    this.listeners.push(listener);
    // Initial emit
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify all registered observers of state change.
   */
  protected notify(): void {
    const currentState = this.getState();
    for (const listener of this.listeners) {
      listener(currentState);
    }
  }
}
