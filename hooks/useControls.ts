import { useEffect } from 'react';
import { DIRECTIONS } from '../utils/constants';
import type { Direction, GameStatus } from '../utils/constants';

interface UseControlsProps {
  status: GameStatus;
  changeDirection: (dir: Direction) => void;
  pauseGame: () => void;
  startGame: () => void;
  toggleMute?: () => void;
}

export function useControls({ status, changeDirection, pauseGame, startGame, toggleMute }: UseControlsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for game controls
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(e.key)) {
        e.preventDefault();
      }

      // Enter key: Start game when idle/game-over, pause/unpause when playing
      if (e.key === 'Enter') {
        if (status === 'IDLE' || status === 'GAME_OVER') {
          startGame();
          return;
        }
        if (status === 'PLAYING' || status === 'PAUSED') {
          pauseGame();
          return;
        }
      }

      // Space: Start if idle/gameover, otherwise pause/unpause
      if (e.key === ' ') {
        if (status === 'IDLE' || status === 'GAME_OVER') {
          startGame();
          return;
        }
        pauseGame();
        return;
      }

      // Escape: pause only
      if (e.key === 'Escape') {
        pauseGame();
        return;
      }
      
      // R: Restart anytime
      if (e.key === 'r' || e.key === 'R') {
        startGame();
        return;
      }

      // M: Mute toggle
      if (e.key === 'm' || e.key === 'M') {
        toggleMute?.();
        return;
      }

      // Movement controls — also starts game if idle
      let dir: Direction | null = null;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          dir = DIRECTIONS.UP;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          dir = DIRECTIONS.DOWN;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          dir = DIRECTIONS.LEFT;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          dir = DIRECTIONS.RIGHT;
          break;
      }

      if (dir) {
        if (status === 'IDLE' || status === 'GAME_OVER') {
          startGame();
        }
        if (status === 'PLAYING' || status === 'IDLE') {
          changeDirection(dir);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, changeDirection, pauseGame, startGame, toggleMute]);
}
