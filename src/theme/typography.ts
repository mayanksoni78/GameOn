import { Platform } from 'react-native';

const SANS_FONT = Platform.select({
  ios: '-apple-system',
  android: 'Roboto',
  default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
});

export const Fonts = {
  // Universal Pixel Gaming Typography across the entire app
  pixel: 'PressStart2P_400Regular',
  heading: 'PressStart2P_400Regular',
  sans: 'PressStart2P_400Regular',
  body: 'PressStart2P_400Regular',
  bodyMedium: 'PressStart2P_400Regular',
  bodySemiBold: 'PressStart2P_400Regular',
  bodyBold: 'PressStart2P_400Regular',
} as const;

export const FontSize = {
  // Calibrated scale for PressStart2P (which renders ~1.5x larger than sans-serif)
  '2xs': 6.5,
  xs: 8,
  sm: 9,
  base: 10,
  md: 11.5,
  lg: 13,
  xl: 15,
  '2xl': 18,
  '3xl': 22,
  '4xl': 26,
  '5xl': 32,

  // Explicit pixel aliases
  pixelXs: 6.5,
  pixelSm: 8,
  pixelBase: 9.5,
  pixelMd: 11,
  pixelLg: 13,
  pixelXl: 16,
  pixel2xl: 20,
  pixel3xl: 24,
} as const;

