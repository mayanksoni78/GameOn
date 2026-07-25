/**
 * GameOn — Deep Neon Night City Theme
 */
export const Colors = {
  // Backgrounds
  bg: {
    primary: '#0B0715', // Very dark purple/navy
    secondary: '#1A102C',
    tertiary: '#2C1B4D',
    card: 'rgba(26, 16, 44, 0.6)',
    overlay: 'rgba(11, 7, 21, 0.85)',
    glassBorder: 'rgba(144, 19, 254, 0.2)', // Purple glow
  },

  // Accents (Neon City)
  accent: {
    primary: '#9013FE', // Neon Purple
    secondary: '#00E5FF', // Neon Cyan
    danger: '#FF1744', // Hot Pink/Red
    success: '#00E676', // Toxic Green
    warning: '#FFD600', // Neon Yellow
  },

  // Text
  text: {
    primary: '#FFFFFF',
    secondary: '#D0C8E0',
    muted: '#8A7B9D',
  },

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const glassmorphism = (opacity = 0.6) => ({
  backgroundColor: `rgba(26, 16, 44, ${opacity})`,
  borderWidth: 1,
  borderColor: Colors.bg.glassBorder,
});

export const elegantShadow = (opacity = 0.4, radius = 15, elevation = 10, color: string = Colors.accent.primary) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: opacity,
  shadowRadius: radius,
  elevation: elevation,
});
