import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/** Current screen width */
export const screenWidth = SCREEN_W;

/** Current screen height */
export const screenHeight = SCREEN_H;

/** Viewport-width percentage (e.g. vw(50) = 50% of screen width) */
export const vw = (pct: number) => SCREEN_W * (pct / 100);

/** Viewport-height percentage (e.g. vh(50) = 50% of screen height) */
export const vh = (pct: number) => SCREEN_H * (pct / 100);

/** Scale a size relative to a 375-point (iPhone X) baseline */
export const scale = (size: number) => (SCREEN_W / 375) * size;

/** Scale a vertical size relative to a 812-point baseline */
export const vScale = (size: number) => (SCREEN_H / 812) * size;

/** Moderate scale (less aggressive) */
export const mScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;

/** True if the device is a tablet (screen width > 600dp) */
export const isTablet = SCREEN_W >= 600;

/** True if the platform is web */
export const isWeb = Platform.OS === 'web';

/**
 * Calculate the largest square game board size that fits the screen
 * with given horizontal and vertical padding.
 */
export function squareBoardSize(
  hPad = 32,
  vPad = 200,
  maxSize = 500
): number {
  const available = Math.min(SCREEN_W - hPad * 2, SCREEN_H - vPad);
  return Math.min(available, maxSize);
}

/**
 * Calculate a cell size for a grid of `cols` columns inside a board of
 * `boardSize` pixels with `gap` pixel gaps between cells.
 */
export function cellSize(boardSize: number, cols: number, gap = 2): number {
  return Math.floor((boardSize - gap * (cols + 1)) / cols);
}
