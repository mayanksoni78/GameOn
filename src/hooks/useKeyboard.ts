import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

export type KeyboardKey = 
  | 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'
  | 'w' | 'a' | 's' | 'd'
  | 'W' | 'A' | 'S' | 'D'
  | ' ' | 'Enter' | 'Escape' | 'Shift' | 'Backspace' | 'Delete' | 'Tab' | string;

/**
 * A hook to listen for keyboard events, primarily for Web builds.
 * On native mobile, this silently does nothing (we use gestures instead).
 */
export function useKeyboard(
  onKeyDown: (key: KeyboardKey) => void,
  dependencies: any[] = []
) {
  const savedCallback = useRef(onKeyDown);

  useEffect(() => {
    savedCallback.current = onKeyDown;
  }, [onKeyDown]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent rapid firing when holding a key down
      if (e.repeat) return;

      // Prevent default scrolling and form actions for game controls
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab', 'Enter'].includes(e.key)) {
        e.preventDefault();
      }
      savedCallback.current(e.key as KeyboardKey);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, dependencies);
}
