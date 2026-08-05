import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

export type KeyboardKey = 
  | 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'
  | 'w' | 'a' | 's' | 'd'
  | 'W' | 'A' | 'S' | 'D'
  | ' ' | 'Enter' | 'Escape' | 'Shift' | 'Backspace' | 'Delete' | 'Tab' | string;

export interface UseKeyboardOptions {
  disableRepeat?: boolean;
  preventDefault?: boolean;
}

/**
 * A hook to listen for keyboard events, primarily for Web builds.
 * On native mobile, this silently does nothing (we use gestures instead).
 */
export function useKeyboard(
  onKeyDown: (key: KeyboardKey) => void,
  options?: UseKeyboardOptions | any[], // legacy support for any[]
) {
  const savedCallback = useRef(onKeyDown);
  
  // Parse options, handling legacy dependencies array
  const opts: UseKeyboardOptions = {
    disableRepeat: true,
    preventDefault: true,
  };
  
  if (options && !Array.isArray(options)) {
    if (options.disableRepeat !== undefined) opts.disableRepeat = options.disableRepeat;
    if (options.preventDefault !== undefined) opts.preventDefault = options.preventDefault;
  }

  useEffect(() => {
    savedCallback.current = onKeyDown;
  }, [onKeyDown]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent rapid firing when holding a key down if requested
      if (opts.disableRepeat && e.repeat) return;

      // Prevent default scrolling and form actions for game controls
      if (opts.preventDefault && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab', 'Enter'].includes(e.key)) {
        e.preventDefault();
      }
      
      if (savedCallback.current) {
        savedCallback.current(e.key as KeyboardKey);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [opts.disableRepeat, opts.preventDefault]);
}
