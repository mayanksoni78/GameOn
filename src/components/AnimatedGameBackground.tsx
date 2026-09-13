import React, { useEffect, useMemo, memo } from 'react';
import { View, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

// ── Palette Tokens (Harmonized with User Reference) ──────────────────────────
const DEEP_SPACE_TOP    = '#07060B'; // Near-black cosmic base
const DEEP_SPACE_MID    = '#0A0912'; // Deep charcoal cosmos
const DEEP_SPACE_LOWER  = '#0E0D18'; // Charcoal-violet base
const HORIZON_PURPLE    = '#131120'; // Muted twilight base
const HORIZON_GLOW_CORE = '#1D1830'; // Soft muted ambient
const HORIZON_MAGENTA   = '#241D3B'; // Restrained atmospheric violet
const MOUNTAIN_FAR      = '#0C0B14'; // Distant dark mountain ridge
const MOUNTAIN_NEAR     = '#08070E'; // Foreground near-black mountain ridge
const HORIZON_LINE      = 'rgba(139, 92, 246, 0.20)'; // Subtle 1px horizon line

export interface AnimatedGameBackgroundProps {
  /**
   * 'dashboard' for home/lobby (full atmospheric richness)
   * 'game' for active gameplay (calmed particles, reduced glow, maximum focus)
   */
  variant?: 'dashboard' | 'game';
  autoScroll?: boolean;
  scrollOffset?: SharedValue<number>;
  opacity?: number;
}

// ── Star Data Types ──────────────────────────────────────────────────────────
type StarBehavior = 'drift' | 'spring' | 'twinkle';

interface StarConfig {
  x: number;          // Horizontal % (0 - 100)
  y: number;          // Vertical % (0 - 75)
  size: number;       // Star width/height in px
  color?: string;     // Color override (default: soft lavender/white)
  glowColor?: string; // Optional subtle shadow glow
  behavior: StarBehavior;
  duration: number;   // Duration in ms
  delay?: number;     // Delay before starting
}

// ── Curated Star Distribution (Natural celestial spread, not a grid) ────────
const DASHBOARD_STARS: StarConfig[] = [
  // Upper Cosmos (0% - 25% height)
  { x: 5,  y: 6,  size: 2.0, behavior: 'drift',   duration: 9000,  delay: 200 },
  { x: 14, y: 12, size: 1.5, behavior: 'twinkle', duration: 3200,  delay: 400 },
  { x: 22, y: 4,  size: 3.0, behavior: 'spring',  duration: 4500,  delay: 1000, glowColor: '#F472B6' },
  { x: 31, y: 16, size: 1.5, behavior: 'drift',   duration: 11000, delay: 600 },
  { x: 38, y: 8,  size: 2.5, behavior: 'twinkle', duration: 4200,  delay: 100 },
  { x: 47, y: 5,  size: 2.0, behavior: 'spring',  duration: 5000,  delay: 1800 },
  { x: 54, y: 14, size: 1.5, behavior: 'drift',   duration: 12000, delay: 900 },
  { x: 63, y: 7,  size: 3.0, behavior: 'spring',  duration: 4800,  delay: 2400, glowColor: '#C084FC' },
  { x: 72, y: 11, size: 2.0, behavior: 'twinkle', duration: 3600,  delay: 500 },
  { x: 81, y: 5,  size: 2.5, behavior: 'drift',   duration: 10500, delay: 300 },
  { x: 89, y: 15, size: 1.5, behavior: 'twinkle', duration: 2800,  delay: 800 },
  { x: 95, y: 8,  size: 2.0, behavior: 'spring',  duration: 5200,  delay: 1400 },

  // Mid Sky (26% - 50% height)
  { x: 8,  y: 28, size: 2.0, behavior: 'spring',  duration: 4600,  delay: 1200, glowColor: '#E879F9' },
  { x: 18, y: 35, size: 1.5, behavior: 'drift',   duration: 13000, delay: 700 },
  { x: 27, y: 26, size: 2.5, behavior: 'twinkle', duration: 3900,  delay: 1100 },
  { x: 36, y: 40, size: 1.5, behavior: 'drift',   duration: 10000, delay: 300 },
  { x: 44, y: 31, size: 2.0, behavior: 'spring',  duration: 4900,  delay: 2000 },
  { x: 52, y: 27, size: 3.0, behavior: 'twinkle', duration: 4400,  delay: 1500, glowColor: '#F472B6' },
  { x: 61, y: 36, size: 1.5, behavior: 'drift',   duration: 11500, delay: 500 },
  { x: 69, y: 30, size: 2.0, behavior: 'spring',  duration: 5100,  delay: 1600 },
  { x: 78, y: 42, size: 1.5, behavior: 'twinkle', duration: 3400,  delay: 900 },
  { x: 86, y: 29, size: 2.5, behavior: 'drift',   duration: 9800,  delay: 400 },
  { x: 93, y: 38, size: 2.0, behavior: 'spring',  duration: 4700,  delay: 2200 },

  // Lower Horizon Atmosphere (51% - 68% height)
  { x: 12, y: 52, size: 1.5, behavior: 'drift',   duration: 12500, delay: 600 },
  { x: 24, y: 58, size: 2.0, behavior: 'twinkle', duration: 3800,  delay: 1300 },
  { x: 41, y: 54, size: 1.5, behavior: 'drift',   duration: 10800, delay: 800 },
  { x: 57, y: 61, size: 2.0, behavior: 'spring',  duration: 5300,  delay: 2500, glowColor: '#E879F9' },
  { x: 74, y: 56, size: 1.5, behavior: 'drift',   duration: 11200, delay: 400 },
  { x: 88, y: 63, size: 2.0, behavior: 'twinkle', duration: 3600,  delay: 1000 },
];

const GAMEPLAY_STARS: StarConfig[] = [
  // Calmed subset for active gameplay (lower density, softer presence)
  { x: 7,  y: 8,  size: 1.5, behavior: 'drift',   duration: 12000, delay: 200 },
  { x: 23, y: 14, size: 2.0, behavior: 'twinkle', duration: 4000,  delay: 500 },
  { x: 39, y: 6,  size: 2.0, behavior: 'spring',  duration: 5500,  delay: 1500 },
  { x: 56, y: 18, size: 1.5, behavior: 'drift',   duration: 14000, delay: 800 },
  { x: 71, y: 10, size: 2.0, behavior: 'twinkle', duration: 4200,  delay: 300 },
  { x: 87, y: 7,  size: 2.0, behavior: 'spring',  duration: 5800,  delay: 1800 },
  { x: 16, y: 32, size: 1.5, behavior: 'drift',   duration: 13000, delay: 700 },
  { x: 34, y: 28, size: 2.0, behavior: 'twinkle', duration: 4500,  delay: 1200 },
  { x: 66, y: 35, size: 1.5, behavior: 'drift',   duration: 11000, delay: 400 },
  { x: 83, y: 30, size: 2.0, behavior: 'spring',  duration: 5400,  delay: 2000 },
  { x: 48, y: 50, size: 1.5, behavior: 'drift',   duration: 13500, delay: 900 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Star Sub-Components (GPU-accelerated transforms & opacity only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Type 1: Drifting Star
 * Slow, natural floating movement in 2D space with subtle breathing opacity.
 */
const DriftStar = memo(({ config }: { config: StarConfig }) => {
  const transX = useSharedValue(0);
  const transY = useSharedValue(0);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    const dur = config.duration;
    const del = config.delay || 0;

    transX.value = withDelay(
      del,
      withRepeat(
        withSequence(
          withTiming(4, { duration: dur * 0.5, easing: Easing.inOut(Easing.sin) }),
          withTiming(-4, { duration: dur * 0.5, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );

    transY.value = withDelay(
      del + 200,
      withRepeat(
        withSequence(
          withTiming(-5, { duration: dur * 0.45, easing: Easing.inOut(Easing.sin) }),
          withTiming(5, { duration: dur * 0.55, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );

    opacity.value = withDelay(
      del,
      withRepeat(
        withSequence(
          withTiming(0.85, { duration: dur * 0.5, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.35, { duration: dur * 0.5, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, [config]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: transX.value }, { translateY: transY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.starBase,
        {
          left: `${config.x}%`,
          top: `${config.y}%`,
          width: config.size,
          height: config.size,
          backgroundColor: config.color || '#F3E8FF',
          shadowColor: config.glowColor || '#D8B4FE',
          shadowOpacity: config.glowColor ? 0.6 : 0.2,
          shadowRadius: config.size * 1.5,
        },
        style,
      ]}
    />
  );
});
DriftStar.displayName = 'DriftStar';

/**
 * Type 2: Springing Star
 * Exactly follows the user's requested cycle:
 * star -> slightly moves -> soft spring -> returns to position -> wait -> subtle twinkle -> repeat
 */
const SpringStar = memo(({ config }: { config: StarConfig }) => {
  const transY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    const dur = config.duration;
    const del = config.delay || 0;

    // Movement: upward float, spring settle back down, pause/wait
    transY.value = withDelay(
      del,
      withRepeat(
        withSequence(
          // 1. Slightly moves upward
          withTiming(-8, { duration: 1200, easing: Easing.out(Easing.cubic) }),
          // 2. Soft spring eases back down to original position
          withSpring(0, { damping: 12, stiffness: 120, mass: 0.8 }),
          // 3. Wait / rest phase
          withTiming(0, { duration: dur - 2000 })
        ),
        -1,
        false
      )
    );

    // Scale: expands during spring, relaxes, subtle twinkle pop, relaxes
    scale.value = withDelay(
      del,
      withRepeat(
        withSequence(
          // Scale during upward movement
          withTiming(1.25, { duration: 1200, easing: Easing.out(Easing.ease) }),
          withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          // Twinkle pulse after waiting
          withDelay(
            dur - 2800,
            withSequence(
              withTiming(1.4, { duration: 250, easing: Easing.ease }),
              withTiming(1.0, { duration: 350, easing: Easing.ease })
            )
          )
        ),
        -1,
        false
      )
    );

    // Opacity: brightens during movement, soft during wait, subtle flash during twinkle
    opacity.value = withDelay(
      del,
      withRepeat(
        withSequence(
          withTiming(0.9, { duration: 1200, easing: Easing.ease }),
          withTiming(0.4, { duration: 800, easing: Easing.ease }),
          withDelay(
            dur - 2800,
            withSequence(
              withTiming(1.0, { duration: 250, easing: Easing.ease }),
              withTiming(0.45, { duration: 350, easing: Easing.ease })
            )
          )
        ),
        -1,
        false
      )
    );
  }, [config]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: transY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.starBase,
        {
          left: `${config.x}%`,
          top: `${config.y}%`,
          width: config.size,
          height: config.size,
          backgroundColor: config.color || '#FDF4FF',
          shadowColor: config.glowColor || '#EC4899',
          shadowOpacity: 0.7,
          shadowRadius: config.size * 2,
        },
        style,
      ]}
    />
  );
});
SpringStar.displayName = 'SpringStar';

/**
 * Type 3: Twinkling Star
 * Soft, elegant celestial pulsing without harsh blinking.
 */
const TwinkleStar = memo(({ config }: { config: StarConfig }) => {
  const opacity = useSharedValue(0.2);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    const dur = config.duration;
    const del = config.delay || 0;

    opacity.value = withDelay(
      del,
      withRepeat(
        withSequence(
          withTiming(0.95, { duration: dur * 0.5, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.25, { duration: dur * 0.5, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );

    scale.value = withDelay(
      del,
      withRepeat(
        withSequence(
          withTiming(1.15, { duration: dur * 0.5, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.85, { duration: dur * 0.5, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, [config]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.starBase,
        {
          left: `${config.x}%`,
          top: `${config.y}%`,
          width: config.size,
          height: config.size,
          backgroundColor: config.color || '#F1F5F9',
          shadowColor: '#E9D5FF',
          shadowOpacity: 0.5,
          shadowRadius: config.size,
        },
        style,
      ]}
    />
  );
});
TwinkleStar.displayName = 'TwinkleStar';

// ─────────────────────────────────────────────────────────────────────────────
// Layer 2: Slow-Moving Atmospheric Horizon Glow
// ─────────────────────────────────────────────────────────────────────────────
const AtmosphericHorizonGlow = memo(({ isGame }: { isGame: boolean }) => {
  const translateY = useSharedValue(0);
  const scaleY = useSharedValue(1);
  const opacity = useSharedValue(isGame ? 0.45 : 0.75);

  useEffect(() => {
    // Ultra-calm 16-second breathing cycle
    translateY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 8000, easing: Easing.inOut(Easing.sin) }),
        withTiming(6, { duration: 8000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    scaleY.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.96, { duration: 8000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    const baseOp = isGame ? 0.35 : 0.65;
    const peakOp = isGame ? 0.55 : 0.90;
    opacity.value = withRepeat(
      withSequence(
        withTiming(peakOp, { duration: 9000, easing: Easing.inOut(Easing.sin) }),
        withTiming(baseOp, { duration: 9000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [isGame]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scaleY: scaleY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.horizonGlowContainer, animatedStyle]}>
      <LinearGradient
        colors={[
          'transparent',
          'rgba(29, 24, 48, 0.20)',  // Soft muted purple haze
          'rgba(36, 29, 59, 0.28)',  // Restrained twilight bloom
          'rgba(45, 34, 75, 0.18)',  // Subtle horizon crest
          'transparent',
        ]}
        locations={[0, 0.35, 0.70, 0.88, 1.0]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
});
AtmosphericHorizonGlow.displayName = 'AtmosphericHorizonGlow';

// ─────────────────────────────────────────────────────────────────────────────
// Layer 3: Distant Pixel Mountain Landscape & Parallax Silhouette
// ─────────────────────────────────────────────────────────────────────────────
const PixelLandscape = memo(({ isGame }: { isGame: boolean }) => {
  const farParallax = useSharedValue(0);
  const nearParallax = useSharedValue(0);

  useEffect(() => {
    // Distant mountains: very slow horizontal drift
    farParallax.value = withRepeat(
      withSequence(
        withTiming(12, { duration: 24000, easing: Easing.inOut(Easing.sin) }),
        withTiming(-12, { duration: 24000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    // Nearer mountains: slightly faster parallax drift creating depth
    nearParallax.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 18000, easing: Easing.inOut(Easing.sin) }),
        withTiming(8, { duration: 18000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const farStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: farParallax.value }],
  }));

  const nearStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: nearParallax.value }],
  }));

  return (
    <View style={styles.landscapeContainer}>
      {/* 3A: Far Mountain Silhouettes */}
      <Animated.View style={[styles.mountainLayer, farStyle]}>
        <View style={styles.mountainRidgeFar} />
      </Animated.View>

      {/* 3B: Near Mountain Silhouettes (Darker, sharper pixel ridges) */}
      <Animated.View style={[styles.mountainLayer, nearStyle]}>
        <View style={styles.mountainRidgeNear} />
      </Animated.View>

      {/* 3C: Laser-sharp 1px Retro Horizon Line with Magenta Bloom */}
      <View style={styles.horizonLineWrapper}>
        <View style={styles.horizonLine} />
      </View>

      {/* 3D: Subtle Horizontal Synthwave Scan / Water Lines */}
      <View style={styles.waterScanLines}>
        <View style={[styles.scanLine, { height: 1.5, opacity: 0.35, marginBottom: 4 }]} />
        <View style={[styles.scanLine, { height: 1.2, opacity: 0.25, marginBottom: 8 }]} />
        <View style={[styles.scanLine, { height: 1.0, opacity: 0.18, marginBottom: 14 }]} />
        <View style={[styles.scanLine, { height: 1.0, opacity: 0.10 }]} />
      </View>
    </View>
  );
});
PixelLandscape.displayName = 'PixelLandscape';

// ─────────────────────────────────────────────────────────────────────────────
// Main Reusable Component: AnimatedGameBackground
// ─────────────────────────────────────────────────────────────────────────────
export const AnimatedGameBackground: React.FC<AnimatedGameBackgroundProps> = ({
  variant = 'dashboard',
  opacity = 1,
}) => {
  const isGame = variant === 'game';
  const stars = useMemo(() => (isGame ? GAMEPLAY_STARS : DASHBOARD_STARS), [isGame]);

  return (
    <View pointerEvents="none" style={[styles.rootContainer, { opacity }]}>
      {/* ──────────────────────────────────────────────────────────────────
          Layer 1 — Deep Space Cosmos
          Dark navy/purple base covering the entire application.
      ────────────────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={[
          DEEP_SPACE_TOP,
          DEEP_SPACE_MID,
          DEEP_SPACE_LOWER,
          HORIZON_PURPLE,
          '#07060B',
        ]}
        locations={[0, 0.30, 0.60, 0.85, 1.0]}
        style={StyleSheet.absoluteFill}
      />

      {/* ──────────────────────────────────────────────────────────────────
          Layer 2 — Atmospheric Horizon Glow
          Subtle purple/magenta glow around the lower/horizon portion.
          Soft and slow-moving.
      ────────────────────────────────────────────────────────────────── */}
      <AtmosphericHorizonGlow isGame={isGame} />

      {/* ──────────────────────────────────────────────────────────────────
          Layer 3 — Distant Pixel Landscape
          Dark/purple mountain silhouettes and retro horizon scan lines.
      ────────────────────────────────────────────────────────────────── */}
      <PixelLandscape isGame={isGame} />

      {/* ──────────────────────────────────────────────────────────────────
          Layer 4 — Animated Stars
          Varied sizes, brightness levels, slow drifting, gentle springs,
          and occasional subtle twinkles.
      ────────────────────────────────────────────────────────────────── */}
      <View style={StyleSheet.absoluteFill}>
        {stars.map((s, idx) => {
          if (s.behavior === 'spring') {
            return <SpringStar key={`star-spring-${idx}`} config={s} />;
          }
          if (s.behavior === 'drift') {
            return <DriftStar key={`star-drift-${idx}`} config={s} />;
          }
          return <TwinkleStar key={`star-twinkle-${idx}`} config={s} />;
        })}
      </View>

      {/* ──────────────────────────────────────────────────────────────────
          Layer 5 — Dark Contrast & Readability Vignette
          Protects gameplay, cards, and text from glare with 100% legibility.
      ────────────────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={[
          'rgba(3, 1, 10, 0.25)',
          'rgba(3, 1, 10, 0.35)',
          isGame ? 'rgba(7, 4, 18, 0.72)' : 'rgba(7, 4, 18, 0.55)',
          isGame ? 'rgba(7, 5, 20, 0.92)' : 'rgba(7, 5, 20, 0.78)',
        ]}
        locations={[0, 0.40, 0.78, 1.0]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
};

export default memo(AnimatedGameBackground);

// ─────────────────────────────────────────────────────────────────────────────
// Stylesheet
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  rootContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DEEP_SPACE_TOP,
    zIndex: -1,
    overflow: 'hidden',
  },
  starBase: {
    position: 'absolute',
    borderRadius: 1, // Crisp pixel star
  },
  horizonGlowContainer: {
    position: 'absolute',
    bottom: 0,
    left: '-20%',
    right: '-20%',
    height: '52%',
  },
  landscapeContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '42%',
    overflow: 'hidden',
  },
  mountainLayer: {
    position: 'absolute',
    bottom: 0,
    left: '-15%',
    right: '-15%',
    height: '100%',
  },
  // Distant mountain silhouette: geometric stepped ridges inspired by reference
  mountainRidgeFar: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: MOUNTAIN_FAR,
    opacity: 0.65,
    ...(Platform.OS === 'web'
      ? {
          clipPath:
            'polygon(0% 100%, 0% 72%, 6% 62%, 12% 70%, 18% 54%, 25% 64%, 32% 42%, 40% 58%, 48% 36%, 56% 50%, 65% 32%, 73% 48%, 81% 38%, 90% 55%, 96% 45%, 100% 68%, 100% 100%)',
        }
      : {}),
  },
  // Near mountain silhouette: darker, sharper peaks sitting in front
  mountainRidgeNear: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    height: 110,
    backgroundColor: MOUNTAIN_NEAR,
    opacity: 0.9,
    ...(Platform.OS === 'web'
      ? {
          clipPath:
            'polygon(0% 100%, 0% 82%, 8% 66%, 15% 76%, 22% 52%, 29% 68%, 38% 46%, 45% 60%, 54% 38%, 62% 54%, 70% 40%, 79% 62%, 87% 48%, 94% 64%, 100% 56%, 100% 100%)',
        }
      : {}),
  },
  horizonLineWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    height: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizonLine: {
    width: '100%',
    height: 1.5,
    backgroundColor: HORIZON_LINE,
    shadowColor: HORIZON_LINE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 8,
    opacity: 0.55,
  },
  waterScanLines: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 24,
    justifyContent: 'flex-start',
    paddingTop: 3,
  },
  scanLine: {
    width: '100%',
    backgroundColor: HORIZON_LINE,
  },
});
