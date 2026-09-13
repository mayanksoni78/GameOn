/**
 * GameOn — Premium Retro-Futuristic Gaming Design System
 * Visual reference: Deep midnight navy, electric violet atmosphere, neon magenta horizon.
 */
export const Colors = {
  // Layered Dark Backgrounds (80–90% Dark Neutral Foundation)
  bg: {
    primary: '#09080E',      // Near-black cosmos base
    secondary: '#111019',    // Deep charcoal panel surface
    tertiary: '#161522',     // Elevated panel surface
    card: '#161522',         // Standard card background
    cardHover: '#1E1C2E',    // Card hover state
    cardStage: '#111019',    // Inset artwork stage
    overlay: 'rgba(7, 6, 12, 0.90)', // Modal overlay backdrop
    subtleBorder: 'rgba(255, 255, 255, 0.07)', // Ultra-subtle neutral border
    glassBorder: 'rgba(255, 255, 255, 0.09)',  // Soft neutral stroke
    panelBorder: 'rgba(255, 255, 255, 0.12)',  // Elevated panel stroke
    accentBorder: 'rgba(139, 92, 246, 0.25)',  // Restrained muted violet stroke
  },

  // Atmospheric Accents (10–20% Muted Accents in Restraint)
  accent: {
    primary: '#8B5CF6',      // Muted Violet
    secondary: '#A78BFA',    // Soft Lavender-Violet
    violet: '#7C3AED',       // Deep Royal Violet
    magenta: '#EC4899',      // Muted Pink-Magenta
    cyan: '#06B6D4',         // Tech Cyan
    danger: '#EF4444',       // Controlled Crimson
    success: '#10B981',      // Subtle Status Green
    warning: '#F59E0B',      // Soft Amber / Gold
    purple: '#8B5CF6',       // Standard Violet
  },

  // Typography Tokens
  text: {
    primary: '#F4F4F5',      // Off-White (High Readability)
    secondary: '#94A3B8',    // Soft Slate Gray
    muted: '#64748B',        // Muted Gray
    subtle: '#475569',       // Deep Muted Gray
    accent: '#A78BFA',       // Soft Violet Highlight
    gold: '#F59E0B',         // Trophy / Highscore Gold
    green: '#10B981',        // Online / Ready Green
    cyan: '#38BDF8',         // Metric Cyan
  },

  neonCyan: '#06B6D4',
  neonPink: '#EC4899',
  electricViolet: '#8B5CF6',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

/**
 * Standard Refined Console Card Surface
 */
export const cardSurface = (accent = Colors.accent.primary, bg = Colors.bg.card) => ({
  backgroundColor: bg,
  borderWidth: 1,
  borderColor: Colors.bg.subtleBorder,
  borderRadius: 8,
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.35,
  shadowRadius: 8,
  elevation: 4,
});

/**
 * Primary Refined Arcade Action Button (No huge neon glow)
 */
export const primaryButton = (accent = Colors.accent.primary, filled = false) => ({
  backgroundColor: filled ? accent : 'rgba(255, 255, 255, 0.04)',
  borderWidth: 1,
  borderColor: filled ? accent : 'rgba(255, 255, 255, 0.12)',
  borderRadius: 6,
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
  elevation: 2,
});

/**
 * Secondary Dark Surface Button
 */
export const secondaryButton = () => ({
  backgroundColor: '#161522',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.08)',
  borderRadius: 6,
});

/**
 * Backward-compatible Pixel Panel helper
 */
export const pixelPanel = (accent = Colors.accent.primary, bg = Colors.bg.secondary) => ({
  backgroundColor: bg,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.10)',
  borderRadius: 6,
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.3,
  shadowRadius: 6,
  elevation: 3,
});

/**
 * Backward-compatible Pixel Button helper
 */
export const pixelButton = (color = Colors.accent.primary, filled = false) => ({
  backgroundColor: filled ? color : '#161522',
  borderWidth: 1,
  borderColor: filled ? color : 'rgba(255, 255, 255, 0.12)',
  borderRadius: 6,
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  elevation: 2,
});

export const glassmorphism = (opacity = 0.85) => ({
  backgroundColor: `rgba(18, 17, 26, ${opacity})`,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.08)',
  borderRadius: 8,
});

export const elegantShadow = (opacity = 0.25, radius = 8, elevation = 4, color: string = '#000000') => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: opacity,
  shadowRadius: radius,
  elevation: elevation,
});

