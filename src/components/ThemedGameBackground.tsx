import React, { memo, useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

export type GameTheme =
  | 'arcade'
  | 'snake'
  | 'flappy'
  | 'dino'
  | 'sudoku'
  | 'blockudoku'
  | 'tetris'
  | '2048'
  | 'tictactoe'
  | 'connect4'
  | 'tomandjerry';

export interface ThemedGameBackgroundProps {
  theme?: GameTheme;
  opacity?: number;
}

// =============================================================================
// BLINKING PIXEL STARS (Authentic Retro-Arcade Twinkle)
// =============================================================================

interface BlinkingStarProps {
  x: number;
  y: number;
  size?: number;
  blinkType?: 'pulse' | 'sharp_blink' | 'cross';
  delay?: number;
  duration?: number;
}

const BlinkingStar = memo(({
  x,
  y,
  size = 2,
  blinkType = 'pulse',
  delay = 0,
  duration = 3000,
}: BlinkingStarProps) => {
  const opacity = useSharedValue(0.2);

  useEffect(() => {
    if (blinkType === 'sharp_blink') {
      opacity.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(0.85, { duration: duration * 0.4, easing: Easing.inOut(Easing.sin) }),
            withTiming(0.05, { duration: 90, easing: Easing.linear }),
            withTiming(1, { duration: 140, easing: Easing.linear }),
            withTiming(0.25, { duration: duration * 0.45, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          true
        )
      );
    } else {
      opacity.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(0.9, { duration: duration / 2, easing: Easing.inOut(Easing.sin) }),
            withTiming(0.15, { duration: duration / 2, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          true
        )
      );
    }
  }, [delay, duration, blinkType]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (blinkType === 'cross') {
    return (
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            width: 5,
            height: 5,
            alignItems: 'center',
            justifyContent: 'center',
          },
          style,
        ]}
        pointerEvents="none"
      >
        <View style={{ position: 'absolute', width: 5, height: 1, backgroundColor: '#FFFFFF' }} />
        <View style={{ position: 'absolute', width: 1, height: 5, backgroundColor: '#FFFFFF' }} />
        <View style={{ width: 1, height: 1, backgroundColor: '#FFFFFF' }} />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: `${x}%`,
          top: `${y}%`,
          width: size,
          height: size,
          backgroundColor: '#FFFFFF',
          borderRadius: size > 2 ? 1 : 0,
        },
        style,
      ]}
      pointerEvents="none"
    />
  );
});
BlinkingStar.displayName = 'BlinkingStar';

const BLINKING_STARS_DATA: BlinkingStarProps[] = [
  // Upper sky stars
  { x: 4, y: 5, size: 2, blinkType: 'sharp_blink', delay: 200, duration: 2800 },
  { x: 11, y: 12, size: 1.5, blinkType: 'pulse', delay: 900, duration: 3400 },
  { x: 17, y: 4, size: 2, blinkType: 'cross', delay: 400, duration: 4200 },
  { x: 23, y: 18, size: 1.5, blinkType: 'pulse', delay: 1500, duration: 3100 },
  { x: 30, y: 9, size: 2.5, blinkType: 'sharp_blink', delay: 100, duration: 2600 },
  { x: 37, y: 3, size: 2, blinkType: 'pulse', delay: 1800, duration: 3800 },
  { x: 44, y: 15, size: 1.5, blinkType: 'cross', delay: 600, duration: 4500 },
  { x: 51, y: 7, size: 2, blinkType: 'sharp_blink', delay: 1200, duration: 2900 },
  { x: 57, y: 20, size: 1.5, blinkType: 'pulse', delay: 2200, duration: 3300 },
  { x: 64, y: 5, size: 2.5, blinkType: 'sharp_blink', delay: 500, duration: 2700 },
  { x: 71, y: 13, size: 2, blinkType: 'pulse', delay: 1300, duration: 3600 },
  { x: 77, y: 4, size: 1.5, blinkType: 'cross', delay: 800, duration: 4100 },
  { x: 83, y: 17, size: 2, blinkType: 'sharp_blink', delay: 1700, duration: 3000 },
  { x: 90, y: 8, size: 1.5, blinkType: 'pulse', delay: 300, duration: 3500 },
  { x: 95, y: 22, size: 2, blinkType: 'pulse', delay: 1900, duration: 3200 },
  // Mid sky stars
  { x: 7, y: 28, size: 1.5, blinkType: 'pulse', delay: 1100, duration: 3900 },
  { x: 14, y: 36, size: 2, blinkType: 'sharp_blink', delay: 700, duration: 2500 },
  { x: 21, y: 30, size: 1.5, blinkType: 'cross', delay: 1600, duration: 4300 },
  { x: 28, y: 42, size: 2, blinkType: 'pulse', delay: 2400, duration: 3100 },
  { x: 35, y: 33, size: 1.5, blinkType: 'sharp_blink', delay: 400, duration: 2800 },
  { x: 42, y: 39, size: 2, blinkType: 'pulse', delay: 1400, duration: 3700 },
  { x: 49, y: 27, size: 2, blinkType: 'sharp_blink', delay: 800, duration: 2600 },
  { x: 56, y: 40, size: 1.5, blinkType: 'pulse', delay: 2000, duration: 3400 },
  { x: 63, y: 31, size: 2, blinkType: 'cross', delay: 950, duration: 4400 },
  { x: 70, y: 38, size: 1.5, blinkType: 'sharp_blink', delay: 350, duration: 2900 },
  { x: 78, y: 29, size: 2, blinkType: 'pulse', delay: 1750, duration: 3500 },
  { x: 85, y: 37, size: 1.5, blinkType: 'pulse', delay: 1250, duration: 3800 },
  { x: 92, y: 33, size: 2, blinkType: 'sharp_blink', delay: 650, duration: 2700 },
  // Horizon-adjacent pixel stars (as seen in the reference artwork)
  { x: 5, y: 52, size: 1.5, blinkType: 'pulse', delay: 850, duration: 3200 },
  { x: 18, y: 56, size: 2, blinkType: 'sharp_blink', delay: 1400, duration: 2600 },
  { x: 31, y: 48, size: 1.5, blinkType: 'cross', delay: 550, duration: 4100 },
  { x: 46, y: 54, size: 2, blinkType: 'pulse', delay: 1900, duration: 3600 },
  { x: 59, y: 50, size: 1.5, blinkType: 'sharp_blink', delay: 1100, duration: 2800 },
  { x: 74, y: 55, size: 2, blinkType: 'cross', delay: 750, duration: 4300 },
  { x: 88, y: 51, size: 1.5, blinkType: 'pulse', delay: 1650, duration: 3400 },
  { x: 96, y: 58, size: 2, blinkType: 'sharp_blink', delay: 450, duration: 2900 },
];

const BlinkingStarField = memo(() => (
  <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
    {BLINKING_STARS_DATA.map((star, i) => (
      <BlinkingStar
        key={`bstar-${i}`}
        x={star.x}
        y={star.y}
        size={star.size}
        blinkType={star.blinkType}
        delay={star.delay}
        duration={star.duration}
      />
    ))}
  </View>
));
BlinkingStarField.displayName = 'BlinkingStarField';

/** Rising Stardust Particle (Drifting gently up from the magenta horizon) */
const RisingStardust = memo(({ x, startY, size = 2, delay = 0, duration = 6000 }: {
  x: number; startY: number; size?: number; delay?: number; duration?: number;
}) => {
  const transY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    transY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-60, { duration, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 0 })
        ),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.7, { duration: duration * 0.35, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: duration * 0.65, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
  }, [delay, duration]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: transY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: `${x}%`,
          top: `${startY}%`,
          width: size,
          height: size,
          backgroundColor: '#E879F9',
          borderRadius: 1,
        },
        style,
      ]}
      pointerEvents="none"
    />
  );
});
RisingStardust.displayName = 'RisingStardust';

// =============================================================================
// PROCEDURAL RETRO PIXEL LANDSCAPE (100% Vector/Animated — Zero Static Images)
// =============================================================================

const RetroPixelLandscape = memo(() => {
  // Breathing horizon glow
  const glowOpacity = useSharedValue(0.7);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.65, { duration: 3200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {/* 1. Deep Midnight Cosmic Sky Gradient */}
      <LinearGradient
        colors={['#04020C', '#09041A', '#160833', '#33084C', '#580A64']}
        locations={[0, 0.25, 0.55, 0.78, 0.94]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* 2. Pulsing Neon Magenta Atmospheric Horizon Glow */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: '12%',
            height: '24%',
          },
          glowStyle,
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(192, 38, 211, 0.35)', 'rgba(236, 72, 153, 0.25)', 'transparent']}
          locations={[0, 0.45, 0.65, 1]}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* 3. Drifting Night Pixel Clouds / Mist */}
      <PixelCloud topPercent={16} width={140} height={28} duration={48000} delay={0} opacity={0.12} />
      <PixelCloud topPercent={32} width={190} height={32} duration={62000} delay={15000} opacity={0.10} />
      <PixelCloud topPercent={48} width={160} height={26} duration={52000} delay={8000} opacity={0.09} />

      {/* 4. Blinking Star Field (Across the full sky) */}
      <BlinkingStarField />

      {/* 5. Rising Stardust Sparks (Drifting up from the neon horizon) */}
      <RisingStardust x={10} startY={72} size={2.5} delay={0} duration={6500} />
      <RisingStardust x={22} startY={75} size={2} delay={1800} duration={5800} />
      <RisingStardust x={36} startY={73} size={2.5} delay={3200} duration={7000} />
      <RisingStardust x={52} startY={76} size={2} delay={900} duration={6200} />
      <RisingStardust x={67} startY={74} size={2.5} delay={2400} duration={6800} />
      <RisingStardust x={81} startY={75} size={2} delay={1200} duration={5900} />
      <RisingStardust x={94} startY={72} size={2.5} delay={2900} duration={6400} />

      {/* 6. Multi-Layer Retro Pixel Mountains (Pure Procedural Geometry - Zero Images!) */}
      {/* 6A. Distant Mountain Ridge (Deep Violet Silhouettes) */}
      <View style={[styles.mountainLayer, { bottom: '5%', height: '22%' }]}>
        <View style={[styles.mountainPeak, { left: '-5%', width: 180, height: 180, backgroundColor: '#1A0B33', transform: [{ rotate: '45deg' }, { scaleY: 1.3 }] }]} />
        <View style={[styles.mountainPeak, { left: '10%', width: 140, height: 140, backgroundColor: '#180A2E', transform: [{ rotate: '45deg' }, { scaleY: 1.2 }] }]} />
        <View style={[styles.mountainPeak, { left: '22%', width: 110, height: 110, backgroundColor: '#1E0D3A', transform: [{ rotate: '45deg' }, { scaleY: 1.1 }] }]} />
        <View style={[styles.mountainPeak, { left: '38%', width: 95, height: 95, backgroundColor: '#16092B', transform: [{ rotate: '45deg' }, { scaleY: 1.0 }] }]} />
        <View style={[styles.mountainPeak, { left: '48%', width: 105, height: 105, backgroundColor: '#190A30', transform: [{ rotate: '45deg' }, { scaleY: 1.05 }] }]} />
        <View style={[styles.mountainPeak, { left: '60%', width: 150, height: 150, backgroundColor: '#1B0C35', transform: [{ rotate: '45deg' }, { scaleY: 1.25 }] }]} />
        <View style={[styles.mountainPeak, { left: '72%', width: 190, height: 190, backgroundColor: '#1E0D3A', transform: [{ rotate: '45deg' }, { scaleY: 1.4 }] }]} />
        <View style={[styles.mountainPeak, { left: '86%', width: 160, height: 160, backgroundColor: '#17092F', transform: [{ rotate: '45deg' }, { scaleY: 1.3 }] }]} />
      </View>

      {/* 6B. Mid Mountain Ridge (Darker Indigo with Violet Edge Highlights) */}
      <View style={[styles.mountainLayer, { bottom: '2%', height: '18%' }]}>
        <View style={[styles.mountainPeak, { left: '-2%', width: 160, height: 160, backgroundColor: '#120724', transform: [{ rotate: '45deg' }, { scaleY: 1.2 }] }]} />
        <View style={[styles.mountainPeak, { left: '8%', width: 130, height: 130, backgroundColor: '#0F051F', transform: [{ rotate: '45deg' }, { scaleY: 1.15 }] }]} />
        <View style={[styles.mountainPeak, { left: '28%', width: 90, height: 90, backgroundColor: '#0D041A', transform: [{ rotate: '45deg' }, { scaleY: 0.95 }] }]} />
        <View style={[styles.mountainPeak, { left: '42%', width: 85, height: 85, backgroundColor: '#100520', transform: [{ rotate: '45deg' }, { scaleY: 0.9 }] }]} />
        <View style={[styles.mountainPeak, { left: '55%', width: 110, height: 110, backgroundColor: '#0E041C', transform: [{ rotate: '45deg' }, { scaleY: 1.1 }] }]} />
        <View style={[styles.mountainPeak, { left: '68%', width: 175, height: 175, backgroundColor: '#130726', transform: [{ rotate: '45deg' }, { scaleY: 1.35 }] }]} />
        <View style={[styles.mountainPeak, { left: '82%', width: 145, height: 145, backgroundColor: '#100520', transform: [{ rotate: '45deg' }, { scaleY: 1.2 }] }]} />
      </View>

      {/* 6C. Foreground Base & Retro Horizontal Scanline Ground */}
      <View style={[styles.mountainLayer, { bottom: 0, height: '8%' }]}>
        <LinearGradient
          colors={['transparent', '#080312', '#05020B']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={{ position: 'absolute', bottom: 18, left: 0, right: 0, height: 1, backgroundColor: 'rgba(192, 38, 211, 0.18)' }} />
        <View style={{ position: 'absolute', bottom: 12, left: 0, right: 0, height: 1, backgroundColor: 'rgba(168, 85, 247, 0.14)' }} />
        <View style={{ position: 'absolute', bottom: 6, left: 0, right: 0, height: 2, backgroundColor: 'rgba(147, 51, 234, 0.22)' }} />
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: '#05020B' }} />
      </View>
    </View>
  );
});
RetroPixelLandscape.displayName = 'RetroPixelLandscape';

// =============================================================================
// SUB-ANIMATION PRIMITIVES FOR GAME-SPECIFIC FLAVOR
// =============================================================================

/** Drifting Pixel Node (Used in Snake & Particles) */
const DriftingPixelNode = memo(({ startX, startY, size, color, speedX, speedY, duration }: {
  startX: number; startY: number; size: number; color: string; speedX: number; speedY: number; duration: number;
}) => {
  const transX = useSharedValue(0);
  const transY = useSharedValue(0);
  const opacity = useSharedValue(0.12);

  useEffect(() => {
    transX.value = withRepeat(
      withSequence(
        withTiming(speedX, { duration, easing: Easing.linear }),
        withTiming(0, { duration: 0 })
      ),
      -1,
      false
    );
    transY.value = withRepeat(
      withSequence(
        withTiming(speedY, { duration, easing: Easing.linear }),
        withTiming(0, { duration: 0 })
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.35, { duration: duration / 2, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.1, { duration: duration / 2, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [duration, speedX, speedY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: transX.value }, { translateY: transY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: `${startX}%`,
          top: `${startY}%`,
          width: size,
          height: size,
          backgroundColor: color,
        },
        style,
      ]}
      pointerEvents="none"
    />
  );
});
DriftingPixelNode.displayName = 'DriftingPixelNode';

/** Drifting Pixel Cloud (Flappy Bird & Dino) */
const PixelCloud = memo(({ topPercent, width, height, duration, delay, opacity: maxOp = 0.12 }: {
  topPercent: number; width: number; height: number; duration: number; delay: number; opacity?: number;
}) => {
  const { width: winW } = useWindowDimensions();
  const transX = useSharedValue(winW + 50);

  useEffect(() => {
    transX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-width - 80, { duration, easing: Easing.linear }),
          withTiming(winW + 50, { duration: 0 })
        ),
        -1,
        false
      )
    );
  }, [winW, duration, delay, width]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: transX.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: `${topPercent}%`,
          width,
          height,
          opacity: maxOp,
        },
        style,
      ]}
      pointerEvents="none"
    >
      <View style={{ position: 'absolute', bottom: 0, left: 0, width: width * 0.7, height: height * 0.6, backgroundColor: '#818CF8' }} />
      <View style={{ position: 'absolute', bottom: 0, left: width * 0.25, width: width * 0.6, height, backgroundColor: '#C084FC' }} />
      <View style={{ position: 'absolute', bottom: 0, right: 0, width: width * 0.45, height: height * 0.75, backgroundColor: '#6366F1' }} />
    </Animated.View>
  );
});
PixelCloud.displayName = 'PixelCloud';

/** Floating Glyph / Number (Sudoku & 2048 & TicTacToe & TomJerry) */
const FloatingGlyph = memo(({ glyph, startX, startY, size, color, floatY, duration, delay }: {
  glyph: string; startX: number; startY: number; size: number; color: string; floatY: number; duration: number; delay: number;
}) => {
  const transY = useSharedValue(0);
  const rot = useSharedValue(0);
  const opacity = useSharedValue(0.06);

  useEffect(() => {
    transY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(floatY, { duration, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    );
    rot.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(15, { duration: duration * 0.8, easing: Easing.inOut(Easing.sin) }),
          withTiming(-15, { duration: duration * 0.8, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.18, { duration: duration / 2, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.05, { duration: duration / 2, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    );
  }, [duration, delay, floatY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: transY.value }, { rotate: `${rot.value}deg` }],
  }));

  return (
    <Animated.Text
      style={[
        {
          position: 'absolute',
          left: `${startX}%`,
          top: `${startY}%`,
          fontSize: size,
          fontWeight: '900',
          color,
          fontFamily: 'monospace',
          letterSpacing: 1,
        },
        style,
      ]}
      pointerEvents="none"
    >
      {glyph}
    </Animated.Text>
  );
});
FloatingGlyph.displayName = 'FloatingGlyph';

/** Falling Tetromino / Polyomino Silhouette (Tetris & Blockudoku) */
const FallingShape = memo(({ pattern, startX, color, fallDistance, duration, delay }: {
  pattern: number[][]; startX: number; color: string; fallDistance: number; duration: number; delay: number;
}) => {
  const transY = useSharedValue(-80);
  const opacity = useSharedValue(0);

  useEffect(() => {
    transY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(fallDistance + 100, { duration, easing: Easing.linear }),
          withTiming(-80, { duration: 0 })
        ),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.16, { duration: duration * 0.2, easing: Easing.quad }),
          withTiming(0.16, { duration: duration * 0.6 }),
          withTiming(0, { duration: duration * 0.2, easing: Easing.quad })
        ),
        -1,
        false
      )
    );
  }, [delay, duration, fallDistance]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: transY.value }],
  }));

  const blockSize = 9;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: `${startX}%`,
          top: 0,
        },
        style,
      ]}
      pointerEvents="none"
    >
      {pattern.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {row.map((cell, c) => (
            <View
              key={c}
              style={{
                width: blockSize,
                height: blockSize,
                margin: 1,
                borderWidth: cell ? 1 : 0,
                borderColor: color,
                backgroundColor: cell ? `${color}35` : 'transparent',
              }}
            />
          ))}
        </View>
      ))}
    </Animated.View>
  );
});
FallingShape.displayName = 'FallingShape';

/** Falling Circular Token Slot (Connect 4) */
const DescendingToken = memo(({ startX, color, duration, delay, winH }: {
  startX: number; color: string; duration: number; delay: number; winH: number;
}) => {
  const transY = useSharedValue(-40);
  const opacity = useSharedValue(0);

  useEffect(() => {
    transY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(winH + 40, { duration, easing: Easing.linear }),
          withTiming(-40, { duration: 0 })
        ),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.15, { duration: duration * 0.15 }),
          withTiming(0.15, { duration: duration * 0.7 }),
          withTiming(0, { duration: duration * 0.15 })
        ),
        -1,
        false
      )
    );
  }, [delay, duration, winH]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: transY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: `${startX}%`,
          top: 0,
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 1.5,
          borderColor: color,
          backgroundColor: `${color}25`,
        },
        style,
      ]}
      pointerEvents="none"
    />
  );
});
DescendingToken.displayName = 'DescendingToken';

// =============================================================================
// THEMED GAME BACKGROUND COMPONENT
// =============================================================================

export const ThemedGameBackground: React.FC<ThemedGameBackgroundProps> = memo(({
  theme = 'arcade',
  opacity = 1,
}) => {
  const { width: winW, height: winH } = useWindowDimensions();

  // Render game-specific visual layers
  const renderThemeLayers = () => {
    switch (theme) {
      // -----------------------------------------------------------------------
      // 1. SNAKE — Retro Pixel Sky + Subtle Emerald Grid & Crawling Nodes
      // -----------------------------------------------------------------------
      case 'snake':
        return (
          <>
            <RetroPixelLandscape />
            <LinearGradient
              colors={['rgba(7, 10, 8, 0.45)', 'rgba(10, 20, 14, 0.35)', 'rgba(7, 10, 8, 0.75)']}
              style={StyleSheet.absoluteFillObject}
            />
            <BlinkingStarField />
            <View style={[StyleSheet.absoluteFillObject, styles.snakeGridOverlay]} />
            <DriftingPixelNode startX={12} startY={22} size={4} color="#10B981" speedX={45} speedY={0} duration={8000} />
            <DriftingPixelNode startX={78} startY={35} size={3} color="#34D399" speedX={-35} speedY={0} duration={9500} />
            <DriftingPixelNode startX={45} startY={68} size={4} color="#F59E0B" speedX={0} speedY={-40} duration={8500} />
            <DriftingPixelNode startX={25} startY={80} size={3} color="#10B981" speedX={30} speedY={0} duration={11000} />
            <DriftingPixelNode startX={85} startY={15} size={4} color="#10B981" speedX={0} speedY={35} duration={10000} />
            <DriftingPixelNode startX={62} startY={52} size={3} color="#6EE7B7" speedX={-40} speedY={0} duration={9000} />
            <DriftingPixelNode startX={32} startY={40} size={3} color="#F59E0B" speedX={0} speedY={-30} duration={12000} />
          </>
        );

      // -----------------------------------------------------------------------
      // 2. FLAPPY BIRD — Retro Pixel Sky + Parallax Pixel Clouds
      // -----------------------------------------------------------------------
      case 'flappy':
        return (
          <>
            <RetroPixelLandscape />
            <LinearGradient
              colors={['rgba(6, 7, 18, 0.4)', 'rgba(9, 13, 32, 0.3)', 'rgba(7, 9, 20, 0.75)']}
              style={StyleSheet.absoluteFillObject}
            />
            <BlinkingStarField />
            <PixelCloud topPercent={14} width={130} height={32} duration={38000} delay={0} opacity={0.16} />
            <PixelCloud topPercent={26} width={180} height={40} duration={48000} delay={12000} opacity={0.14} />
            <PixelCloud topPercent={8} width={110} height={26} duration={32000} delay={20000} opacity={0.12} />
            <PixelCloud topPercent={38} width={150} height={34} duration={44000} delay={6000} opacity={0.13} />
          </>
        );

      // -----------------------------------------------------------------------
      // 3. DINO JUMP — Retro Pixel Sky + Blowing Prehistoric Dust
      // -----------------------------------------------------------------------
      case 'dino':
        return (
          <>
            <RetroPixelLandscape />
            <LinearGradient
              colors={['rgba(11, 9, 14, 0.4)', 'rgba(19, 15, 24, 0.3)', 'rgba(12, 10, 14, 0.75)']}
              style={StyleSheet.absoluteFillObject}
            />
            <BlinkingStarField />
            <DriftingPixelNode startX={15} startY={62} size={3} color="#D97706" speedX={60} speedY={-8} duration={7000} />
            <DriftingPixelNode startX={48} startY={72} size={2} color="#F59E0B" speedX={75} speedY={-12} duration={6200} />
            <DriftingPixelNode startX={72} startY={66} size={3} color="#B45309" speedX={50} speedY={-6} duration={8200} />
            <DriftingPixelNode startX={28} startY={78} size={2} color="#D97706" speedX={68} speedY={-10} duration={6800} />
          </>
        );

      // -----------------------------------------------------------------------
      // 4. SUDOKU — Retro Pixel Sky + Matrix Grid & Floating Digits
      // -----------------------------------------------------------------------
      case 'sudoku':
        return (
          <>
            <RetroPixelLandscape />
            <LinearGradient
              colors={['rgba(8, 7, 17, 0.5)', 'rgba(13, 12, 25, 0.4)', 'rgba(8, 7, 17, 0.8)']}
              style={StyleSheet.absoluteFillObject}
            />
            <BlinkingStarField />
            <View style={[StyleSheet.absoluteFillObject, styles.sudokuGridOverlay]} />
            <FloatingGlyph glyph="3" startX={10} startY={25} size={24} color="#8B5CF6" floatY={-25} duration={7000} delay={0} />
            <FloatingGlyph glyph="7" startX={82} startY={30} size={28} color="#C084FC" floatY={-30} duration={8500} delay={1200} />
            <FloatingGlyph glyph="9" startX={22} startY={72} size={26} color="#8B5CF6" floatY={-24} duration={7800} delay={2400} />
            <FloatingGlyph glyph="4" startX={74} startY={78} size={22} color="#A855F7" floatY={-26} duration={9200} delay={800} />
            <FloatingGlyph glyph="1" startX={48} startY={16} size={20} color="#8B5CF6" floatY={-20} duration={8000} delay={3000} />
            <FloatingGlyph glyph="5" startX={88} startY={62} size={24} color="#C084FC" floatY={-28} duration={7500} delay={1600} />
            <FloatingGlyph glyph="8" startX={16} startY={50} size={22} color="#8B5CF6" floatY={-22} duration={8800} delay={600} />
          </>
        );

      // -----------------------------------------------------------------------
      // 5. BLOCKUDOKU — Retro Pixel Sky + Drifting Polyomino Wireframes
      // -----------------------------------------------------------------------
      case 'blockudoku':
        return (
          <>
            <RetroPixelLandscape />
            <LinearGradient
              colors={['rgba(7, 8, 19, 0.5)', 'rgba(11, 14, 30, 0.4)', 'rgba(7, 8, 20, 0.8)']}
              style={StyleSheet.absoluteFillObject}
            />
            <BlinkingStarField />
            <View style={[StyleSheet.absoluteFillObject, styles.blockGridOverlay]} />
            <FallingShape pattern={[[1, 1], [1, 1]]} startX={14} color="#818CF8" fallDistance={winH} duration={26000} delay={0} />
            <FallingShape pattern={[[1, 1, 1], [0, 1, 0]]} startX={76} color="#A78BFA" fallDistance={winH} duration={32000} delay={7000} />
            <FallingShape pattern={[[1, 0], [1, 0], [1, 1]]} startX={42} color="#38BDF8" fallDistance={winH} duration={29000} delay={14000} />
            <FallingShape pattern={[[1, 1, 1, 1]]} startX={88} color="#818CF8" fallDistance={winH} duration={35000} delay={3000} />
            <FallingShape pattern={[[0, 1, 1], [1, 1, 0]]} startX={28} color="#A78BFA" fallDistance={winH} duration={28000} delay={18000} />
          </>
        );

      // -----------------------------------------------------------------------
      // 6. TETRIS — Retro Pixel Sky + Falling Outline Tetrominoes
      // -----------------------------------------------------------------------
      case 'tetris':
        return (
          <>
            <RetroPixelLandscape />
            <LinearGradient
              colors={['rgba(8, 6, 19, 0.5)', 'rgba(14, 11, 31, 0.4)', 'rgba(8, 6, 19, 0.8)']}
              style={StyleSheet.absoluteFillObject}
            />
            <BlinkingStarField />
            <View style={[StyleSheet.absoluteFillObject, styles.tetrisGridOverlay]} />
            <FallingShape pattern={[[1, 1, 1, 1]]} startX={18} color="#06B6D4" fallDistance={winH} duration={22000} delay={0} />
            <FallingShape pattern={[[1, 1], [1, 1]]} startX={82} color="#FBBF24" fallDistance={winH} duration={25000} delay={5000} />
            <FallingShape pattern={[[0, 1, 0], [1, 1, 1]]} startX={48} color="#C084FC" fallDistance={winH} duration={28000} delay={11000} />
            <FallingShape pattern={[[1, 0, 0], [1, 1, 1]]} startX={32} color="#F97316" fallDistance={winH} duration={24000} delay={17000} />
            <FallingShape pattern={[[0, 1, 1], [1, 1, 0]]} startX={68} color="#10B981" fallDistance={winH} duration={26000} delay={8000} />
          </>
        );

      // -----------------------------------------------------------------------
      // 7. 2048 — Retro Pixel Sky + Floating Power-of-2 Outlines
      // -----------------------------------------------------------------------
      case '2048':
        return (
          <>
            <RetroPixelLandscape />
            <LinearGradient
              colors={['rgba(12, 10, 8, 0.5)', 'rgba(19, 15, 12, 0.4)', 'rgba(12, 9, 8, 0.8)']}
              style={StyleSheet.absoluteFillObject}
            />
            <BlinkingStarField />
            <View style={[StyleSheet.absoluteFillObject, styles.game2048GridOverlay]} />
            <FloatingGlyph glyph="2" startX={14} startY={22} size={22} color="#F59E0B" floatY={-22} duration={7500} delay={0} />
            <FloatingGlyph glyph="4" startX={80} startY={32} size={24} color="#D97706" floatY={-28} duration={8200} delay={1500} />
            <FloatingGlyph glyph="8" startX={25} startY={65} size={26} color="#F59E0B" floatY={-24} duration={7800} delay={3000} />
            <FloatingGlyph glyph="16" startX={72} startY={72} size={20} color="#EA580C" floatY={-20} duration={8600} delay={900} />
            <FloatingGlyph glyph="64" startX={52} startY={18} size={22} color="#F59E0B" floatY={-25} duration={9000} delay={2200} />
            <FloatingGlyph glyph="2048" startX={40} startY={82} size={18} color="#FBBF24" floatY={-18} duration={10000} delay={4000} />
          </>
        );

      // -----------------------------------------------------------------------
      // 8. TIC TAC TOE — Retro Pixel Sky + Floating 'X' and 'O' Glyphs
      // -----------------------------------------------------------------------
      case 'tictactoe':
        return (
          <>
            <RetroPixelLandscape />
            <LinearGradient
              colors={['rgba(7, 7, 16, 0.5)', 'rgba(11, 12, 24, 0.4)', 'rgba(7, 7, 16, 0.8)']}
              style={StyleSheet.absoluteFillObject}
            />
            <BlinkingStarField />
            <FloatingGlyph glyph="✕" startX={16} startY={24} size={24} color="#06B6D4" floatY={-24} duration={7200} delay={0} />
            <FloatingGlyph glyph="◯" startX={78} startY={28} size={26} color="#F43F5E" floatY={-28} duration={8400} delay={1200} />
            <FloatingGlyph glyph="◯" startX={24} startY={68} size={24} color="#F43F5E" floatY={-26} duration={7600} delay={2500} />
            <FloatingGlyph glyph="✕" startX={82} startY={72} size={26} color="#06B6D4" floatY={-25} duration={8800} delay={800} />
            <FloatingGlyph glyph="✕" startX={50} startY={15} size={20} color="#06B6D4" floatY={-20} duration={8000} delay={3200} />
            <FloatingGlyph glyph="◯" startX={46} startY={82} size={22} color="#F43F5E" floatY={-22} duration={9200} delay={1800} />
          </>
        );

      // -----------------------------------------------------------------------
      // 9. CONNECT 4 — Retro Pixel Sky + Descending Token Silhouettes
      // -----------------------------------------------------------------------
      case 'connect4':
        return (
          <>
            <RetroPixelLandscape />
            <LinearGradient
              colors={['rgba(5, 8, 19, 0.5)', 'rgba(8, 14, 32, 0.4)', 'rgba(5, 8, 20, 0.8)']}
              style={StyleSheet.absoluteFillObject}
            />
            <BlinkingStarField />
            <View style={[StyleSheet.absoluteFillObject, styles.connect4ColumnOverlay]} />
            <DescendingToken startX={15} color="#EF4444" duration={22000} delay={0} winH={winH} />
            <DescendingToken startX={75} color="#F59E0B" duration={25000} delay={4500} winH={winH} />
            <DescendingToken startX={45} color="#EF4444" duration={28000} delay={9000} winH={winH} />
            <DescendingToken startX={88} color="#EF4444" duration={24000} delay={13500} winH={winH} />
            <DescendingToken startX={28} color="#F59E0B" duration={27000} delay={18000} winH={winH} />
          </>
        );

      // -----------------------------------------------------------------------
      // 10. TOM & JERRY — Retro Pixel Sky + Stealth Blueprint & Symbols
      // -----------------------------------------------------------------------
      case 'tomandjerry':
        return (
          <>
            <RetroPixelLandscape />
            <LinearGradient
              colors={['rgba(8, 7, 16, 0.5)', 'rgba(13, 12, 25, 0.4)', 'rgba(8, 7, 16, 0.8)']}
              style={StyleSheet.absoluteFillObject}
            />
            <BlinkingStarField />
            <View style={[StyleSheet.absoluteFillObject, styles.mazeBlueprintOverlay]} />
            <FloatingGlyph glyph="🧀" startX={18} startY={25} size={18} color="#F59E0B" floatY={-22} duration={7800} delay={0} />
            <FloatingGlyph glyph="🐾" startX={78} startY={32} size={18} color="#C084FC" floatY={-26} duration={8500} delay={1500} />
            <FloatingGlyph glyph="🐾" startX={25} startY={72} size={18} color="#C084FC" floatY={-24} duration={7200} delay={2800} />
            <FloatingGlyph glyph="🧀" startX={72} startY={76} size={18} color="#F59E0B" floatY={-24} duration={9000} delay={800} />
            <FloatingGlyph glyph="🐾" startX={52} startY={16} size={16} color="#C084FC" floatY={-18} duration={8200} delay={3600} />
          </>
        );

      // -----------------------------------------------------------------------
      // 11. ARCADE (DEFAULT / HOME LOBBY) — Living Procedural Retro Pixel Landscape
      // -----------------------------------------------------------------------
      case 'arcade':
      default:
        return <RetroPixelLandscape />;
    }
  };

  return (
    <View style={[styles.container, { opacity }]} pointerEvents="none">
      {/* 1. Theme-Specific Retro-Pixel Visuals */}
      {renderThemeLayers()}

      {/* 2. Universal Dark Contrast Vignette (Keeps UI readable while letting magenta landscape shine) */}
      <LinearGradient
        colors={['rgba(9, 8, 14, 0.25)', 'transparent', 'rgba(9, 8, 14, 0.35)']}
        locations={[0, 0.40, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
    </View>
  );
});

ThemedGameBackground.displayName = 'ThemedGameBackground';

export default ThemedGameBackground;

const styles = StyleSheet.create({
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    ...(Platform.OS === 'web' ? ({
      objectPosition: 'center bottom',
      backgroundPosition: 'center bottom',
      backgroundSize: 'cover',
    } as any) : {}),
  },
  container: {
    position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: Platform.OS === 'web' ? ('100vw' as any) : '100%',
    height: Platform.OS === 'web' ? ('100vh' as any) : '100%',
    backgroundColor: '#09080E',
    zIndex: -1,
    overflow: 'hidden',
  },
  mountainLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  mountainPeak: {
    position: 'absolute',
    bottom: -60,
    borderRadius: 4,
  },
  // ── Overlay Patterns ──
  snakeGridOverlay: {
    opacity: 0.04,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    backgroundImage: Platform.OS === 'web' 
      ? 'radial-gradient(rgba(16, 185, 129, 0.4) 1px, transparent 1px)'
      : undefined,
    backgroundSize: Platform.OS === 'web' ? ('28px 28px' as any) : undefined,
  },
  sudokuGridOverlay: {
    opacity: 0.035,
    backgroundImage: Platform.OS === 'web'
      ? 'linear-gradient(rgba(139, 92, 246, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.4) 1px, transparent 1px)'
      : undefined,
    backgroundSize: Platform.OS === 'web' ? ('64px 64px' as any) : undefined,
  },
  blockGridOverlay: {
    opacity: 0.04,
    backgroundImage: Platform.OS === 'web'
      ? 'linear-gradient(rgba(99, 102, 241, 0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.35) 1px, transparent 1px)'
      : undefined,
    backgroundSize: Platform.OS === 'web' ? ('36px 36px' as any) : undefined,
  },
  tetrisGridOverlay: {
    opacity: 0.03,
    backgroundImage: Platform.OS === 'web'
      ? 'linear-gradient(rgba(168, 85, 247, 0.35) 1px, transparent 1px)'
      : undefined,
    backgroundSize: Platform.OS === 'web' ? ('100% 24px' as any) : undefined,
  },
  game2048GridOverlay: {
    opacity: 0.03,
    backgroundImage: Platform.OS === 'web'
      ? 'linear-gradient(rgba(245, 158, 11, 0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(245, 158, 11, 0.35) 1px, transparent 1px)'
      : undefined,
    backgroundSize: Platform.OS === 'web' ? ('54px 54px' as any) : undefined,
  },
  connect4ColumnOverlay: {
    opacity: 0.035,
    backgroundImage: Platform.OS === 'web'
      ? 'linear-gradient(90deg, rgba(56, 189, 248, 0.3) 1px, transparent 1px)'
      : undefined,
    backgroundSize: Platform.OS === 'web' ? ('48px 100%' as any) : undefined,
  },
  mazeBlueprintOverlay: {
    opacity: 0.03,
    backgroundImage: Platform.OS === 'web'
      ? 'linear-gradient(rgba(168, 85, 247, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(168, 85, 247, 0.3) 1px, transparent 1px)'
      : undefined,
    backgroundSize: Platform.OS === 'web' ? ('42px 42px' as any) : undefined,
  },
});
