export const Fonts = {
  // Use authentic 8-bit retro font for headings and arcade feel
  heading: 'PressStart2P_400Regular',
  
  // Keep Inter for readable UI components, instructions, and scores
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export const FontSize = {
  // Adjusted sizes for Press Start 2P (it renders much larger/wider than typical fonts)
  xs: 8,
  sm: 10,
  base: 12,
  md: 14,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 28,
  '5xl': 36,
} as const;
