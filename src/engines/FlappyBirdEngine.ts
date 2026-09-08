import { BaseEngine } from './BaseEngine';

export interface PipePair {
  id: number;
  x: number;
  topHeight: number;
  bottomHeight: number;
  passed: boolean;
}

export interface FlappyBirdState {
  birdY: number;
  velocity: number;
  pipes: PipePair[];
  score: number;
  highScore: number;
  gameOver: boolean;
  isPlaying: boolean;
}

export class FlappyBirdEngine extends BaseEngine<FlappyBirdState> {
  private static readonly GRAVITY = 0.45;
  private static readonly FLAP_STRENGTH = -8.5;
  private static readonly PIPE_GAP = 140;
  private static readonly PIPE_SPEED = 2.5;

  private birdY: number = 250;
  private velocity: number = 0;
  private pipes: PipePair[] = [];
  private isPlaying: boolean = false;
  private pipeIdCounter: number = 0;

  constructor(initialHighScore: number = 0) {
    super(initialHighScore);
  }

  public getState(): FlappyBirdState {
    return {
      birdY: this.birdY,
      velocity: this.velocity,
      pipes: this.pipes.map((p) => ({ ...p })),
      score: this.score,
      highScore: this.highScore,
      gameOver: this.gameOver,
      isPlaying: this.isPlaying,
    };
  }

  public reset(): void {
    this.birdY = 250;
    this.velocity = 0;
    this.pipes = [];
    this.score = 0;
    this.gameOver = false;
    this.isPlaying = false;
    this.notify();
  }

  public flap(): void {
    if (this.gameOver) return;
    if (!this.isPlaying) {
      this.isPlaying = true;
    }
    this.velocity = FlappyBirdEngine.FLAP_STRENGTH;
    this.notify();
  }

  public tick(screenHeight: number = 600, screenWidth: number = 360): void {
    if (!this.isPlaying || this.gameOver) return;

    // Apply gravity
    this.velocity += FlappyBirdEngine.GRAVITY;
    this.birdY += this.velocity;

    // Ground or ceiling collision
    if (this.birdY <= 0 || this.birdY >= screenHeight - 40) {
      this.gameOver = true;
      this.notify();
      return;
    }

    // Move pipes
    for (const pipe of this.pipes) {
      pipe.x -= FlappyBirdEngine.PIPE_SPEED;

      // Score point when passing bird (bird x = 80)
      if (!pipe.passed && pipe.x < 80) {
        pipe.passed = true;
        this.addScore(1);
      }
    }

    // Remove offscreen pipes
    this.pipes = this.pipes.filter((pipe) => pipe.x > -60);

    // Spawn new pipes
    if (
      this.pipes.length === 0 ||
      this.pipes[this.pipes.length - 1].x < screenWidth - 180
    ) {
      const minTop = 60;
      const maxTop = screenHeight - FlappyBirdEngine.PIPE_GAP - 120;
      const topHeight = Math.floor(Math.random() * (maxTop - minTop) + minTop);
      const bottomHeight = screenHeight - topHeight - FlappyBirdEngine.PIPE_GAP;

      this.pipes.push({
        id: ++this.pipeIdCounter,
        x: screenWidth + 20,
        topHeight,
        bottomHeight,
        passed: false,
      });
    }

    // Collision check
    const birdBox = { x: 80, y: this.birdY, size: 28 };
    for (const pipe of this.pipes) {
      if (
        pipe.x < birdBox.x + birdBox.size &&
        pipe.x + 52 > birdBox.x
      ) {
        // In column horizontal range
        if (birdBox.y < pipe.topHeight || birdBox.y + birdBox.size > screenHeight - pipe.bottomHeight) {
          this.gameOver = true;
          this.notify();
          return;
        }
      }
    }

    this.notify();
  }
}
