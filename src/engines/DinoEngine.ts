import { BaseEngine } from './BaseEngine';

export interface DinoObstacle {
  id: number;
  x: number;
  width: number;
  height: number;
  type: 'cactus' | 'bird';
}

export interface DinoState {
  dinoY: number;
  isJumping: boolean;
  isDucking: boolean;
  obstacles: DinoObstacle[];
  score: number;
  highScore: number;
  speed: number;
  gameOver: boolean;
}

export class DinoEngine extends BaseEngine<DinoState> {
  private static readonly GROUND_Y = 0;
  private static readonly GRAVITY = -0.8;
  private static readonly JUMP_FORCE = 15;

  private dinoY: number = 0;
  private velocity: number = 0;
  private isJumping: boolean = false;
  private isDucking: boolean = false;
  private obstacles: DinoObstacle[] = [];
  private speed: number = 6;
  private obstacleIdCounter: number = 0;

  constructor(initialHighScore: number = 0) {
    super(initialHighScore);
  }

  public getState(): DinoState {
    return {
      dinoY: this.dinoY,
      isJumping: this.isJumping,
      isDucking: this.isDucking,
      obstacles: this.obstacles.map((o) => ({ ...o })),
      score: this.score,
      highScore: this.highScore,
      speed: this.speed,
      gameOver: this.gameOver,
    };
  }

  public reset(): void {
    this.dinoY = 0;
    this.velocity = 0;
    this.isJumping = false;
    this.isDucking = false;
    this.obstacles = [];
    this.speed = 6;
    this.score = 0;
    this.gameOver = false;
    this.notify();
  }

  public jump(): boolean {
    if (this.gameOver) return false;
    if (!this.isJumping) {
      this.isJumping = true;
      this.velocity = DinoEngine.JUMP_FORCE;
      this.notify();
      return true;
    }
    return false;
  }

  public setDucking(ducking: boolean): void {
    if (this.gameOver) return;
    this.isDucking = ducking;
    this.notify();
  }

  public tick(screenWidth: number = 360): void {
    if (this.gameOver) return;

    // Apply physics to Dino
    if (this.isJumping) {
      this.dinoY += this.velocity;
      this.velocity += DinoEngine.GRAVITY;

      if (this.dinoY <= DinoEngine.GROUND_Y) {
        this.dinoY = DinoEngine.GROUND_Y;
        this.velocity = 0;
        this.isJumping = false;
      }
    }

    // Move obstacles
    for (const obs of this.obstacles) {
      obs.x -= this.speed;
    }

    // Remove offscreen obstacles
    this.obstacles = this.obstacles.filter((obs) => obs.x + obs.width > -20);

    // Spawn new obstacles
    if (
      this.obstacles.length === 0 ||
      this.obstacles[this.obstacles.length - 1].x < screenWidth - (Math.random() * 150 + 200)
    ) {
      this.obstacles.push({
        id: ++this.obstacleIdCounter,
        x: screenWidth + 20,
        width: 24,
        height: 40,
        type: Math.random() > 0.7 ? 'bird' : 'cactus',
      });
    }

    // Collision check
    const dinoBox = {
      x: 40,
      y: this.dinoY,
      width: 36,
      height: this.isDucking ? 24 : 44,
    };

    for (const obs of this.obstacles) {
      if (
        dinoBox.x < obs.x + obs.width &&
        dinoBox.x + dinoBox.width > obs.x &&
        dinoBox.y < obs.height &&
        dinoBox.y + dinoBox.height > 0
      ) {
        this.gameOver = true;
        this.notify();
        return;
      }
    }

    // Score and speed increment
    this.addScore(1);
    this.speed = 6 + Math.floor(this.score / 100) * 0.5;
    this.notify();
  }
}
