import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BaseBackground, BaseBackgroundProps, BaseComponentState } from './BaseComponent';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ── Enhanced Elegant Theme Colors ─────────────────────────────────────────
const SKY_TOP    = '#020208'; // Pitch black / deep space
const SKY_MID    = '#0A0625'; // Deep cosmic blue
const SKY_BOTTOM = '#1D1242'; // Rich twilight purple
const MOUNTAIN_1 = '#090516'; // Far mountains (darkest purple)
const MOUNTAIN_M = '#0E0820'; // Mid mountains (deep purple)
const MOUNTAIN_2 = '#160E2A'; // Near mountains (dark indigo)

// ── Twinkling Star / Spark Component ──
const TwinklingStar = React.memo(
  ({
    x,
    y,
    size,
    minOpacity,
    maxOpacity,
    duration,
  }: {
    x: number;
    y: number;
    size: number;
    minOpacity: number;
    maxOpacity: number;
    duration: number;
  }) => {
    const opacity = useSharedValue(minOpacity);

    useEffect(() => {
      opacity.value = withRepeat(
        withTiming(maxOpacity, { duration, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }, [maxOpacity, duration, minOpacity, opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
    }));

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
            borderRadius: size,
            shadowColor: '#FFF',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: size,
          },
          animatedStyle,
        ]}
      />
    );
  }
);

// ── Realistic Pure CSS Cloud ──
const CloudShape = ({ scale = 1, baseOpacity = 1 }: { scale?: number; baseOpacity?: number }) => (
  <View
    style={{
      transform: [{ scale }],
      opacity: baseOpacity,
      width: 160,
      height: 70,
      justifyContent: 'center',
    }}
  >
    <View
      style={[
        styles.cloudPuff,
        { width: 75, height: 75, top: -20, left: 15, backgroundColor: 'rgba(200, 200, 255, 0.04)' },
      ]}
    />
    <View
      style={[
        styles.cloudPuff,
        { width: 95, height: 95, top: -45, left: 45, backgroundColor: 'rgba(200, 200, 255, 0.05)' },
      ]}
    />
    <View
      style={[
        styles.cloudPuff,
        { width: 65, height: 65, top: -15, left: 105, backgroundColor: 'rgba(200, 200, 255, 0.04)' },
      ]}
    />
    <View
      style={[
        styles.cloudPuff,
        { width: 60, height: 60, top: -10, left: 25, backgroundColor: 'rgba(220, 220, 255, 0.06)' },
      ]}
    />
    <View
      style={[
        styles.cloudPuff,
        { width: 80, height: 80, top: -30, left: 55, backgroundColor: 'rgba(220, 220, 255, 0.07)' },
      ]}
    />
    <View
      style={[
        styles.cloudPuff,
        { width: 50, height: 50, top: -5, left: 110, backgroundColor: 'rgba(220, 220, 255, 0.06)' },
      ]}
    />
    <View
      style={[
        styles.cloudBase,
        { width: 140, height: 45, top: 15, left: 10, backgroundColor: 'rgba(200, 200, 255, 0.08)' },
      ]}
    />
  </View>
);

export interface CyberBackgroundProps extends BaseBackgroundProps {
  scrollOffset?: SharedValue<number>;
}

interface StarData {
  x: number;
  y: number;
  size: number;
  minOpacity: number;
  maxOpacity: number;
  duration: number;
}

/**
 * CyberBackground Component
 * Implements OOP BaseBackground abstraction with encapsulated starfield,
 * layered parallax mountains, CSS clouds, and gradient horizons.
 */
export class CyberBackground extends BaseBackground<CyberBackgroundProps, BaseComponentState> {
  private stars: StarData[] = [];

  constructor(props: CyberBackgroundProps) {
    super(props);
    this.initializeStars();
  }

  private initializeStars(): void {
    const regularStars: StarData[] = Array.from({ length: 40 }).map(() => {
      const isBright = Math.random() > 0.8;
      return {
        x: Math.random() * 100,
        y: Math.random() * 55,
        size: Math.random() * 1.5 + (isBright ? 1 : 0.5),
        minOpacity: Math.random() * 0.1 + 0.05,
        maxOpacity: Math.random() * 0.4 + 0.2 + (isBright ? 0.3 : 0),
        duration: Math.random() * 3000 + 2000,
      };
    });

    const dimSparks: StarData[] = Array.from({ length: 80 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 85,
      size: Math.random() * 0.8 + 0.2,
      minOpacity: 0.01,
      maxOpacity: Math.random() * 0.15 + 0.05,
      duration: Math.random() * 1200 + 600,
    }));

    this.stars = [...regularStars, ...dimSparks];
  }

  protected renderClouds(
    yOffset: number,
    scaleRange: number[],
    count: number,
    opacity: number = 1
  ): React.ReactNode {
    const clouds = Array.from({ length: count }).map((_, i) => ({
      x: i * (100 / count) + (Math.random() * 15 - 7.5),
      scale: Math.random() * (scaleRange[1] - scaleRange[0]) + scaleRange[0],
      yOffset: Math.random() * 40 - 20,
    }));

    return (
      <View style={[StyleSheet.absoluteFill, { top: yOffset, height: 180, zIndex: 1 }]}>
        <View style={{ width: screenWidth * 2, height: '100%', flexDirection: 'row' }}>
          {clouds.map((c, i) => (
            <View
              key={`c1-${i}`}
              style={{ position: 'absolute', left: `${c.x}%`, top: c.yOffset }}
            >
              <CloudShape scale={c.scale} baseOpacity={opacity} />
            </View>
          ))}
          {clouds.map((c, i) => (
            <View
              key={`c2-${i}`}
              style={{ position: 'absolute', left: `${c.x + 100}%`, top: c.yOffset }}
            >
              <CloudShape scale={c.scale} baseOpacity={opacity} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  protected renderMountains(
    color: string,
    yOffset: number,
    scaleY: number,
    count: number,
    extraOffset: number = 0
  ): React.ReactNode {
    const peaks = Array.from({ length: count }).map((_, i) => ({
      x: i * (120 / count) - 10,
      w: Math.random() * 160 + 120,
    }));

    return (
      <View style={[StyleSheet.absoluteFill, { top: yOffset, overflow: 'hidden', zIndex: 2 }]}>
        <View style={{ width: screenWidth * 2, height: '100%', flexDirection: 'row' }}>
          {peaks.map((p, i) => (
            <View
              key={`p1-${i}`}
              style={{
                position: 'absolute',
                left: `${p.x}%`,
                bottom: -50 + extraOffset,
                width: p.w,
                height: p.w,
                backgroundColor: color,
                transform: [{ rotate: '45deg' }, { scaleY }],
                borderRadius: 20,
              }}
            />
          ))}
          {peaks.map((p, i) => (
            <View
              key={`p2-${i}`}
              style={{
                position: 'absolute',
                left: `${p.x + 100}%`,
                bottom: -50 + extraOffset,
                width: p.w,
                height: p.w,
                backgroundColor: color,
                transform: [{ rotate: '45deg' }, { scaleY }],
                borderRadius: 20,
              }}
            />
          ))}
        </View>
      </View>
    );
  }

  public renderContent(): React.ReactNode {
    return (
      <View style={styles.container}>
        {/* Sky Gradient */}
        <LinearGradient
          colors={[SKY_TOP, SKY_MID, SKY_BOTTOM]}
          style={StyleSheet.absoluteFill}
        />

        {/* Twinkling Stars and Dim Sparks */}
        {this.stars.map((s, i) => (
          <TwinklingStar
            key={`star-${i}`}
            x={s.x}
            y={s.y}
            size={s.size}
            minOpacity={s.minOpacity}
            maxOpacity={s.maxOpacity}
            duration={s.duration}
          />
        ))}

        {/* Clouds Layer 1 */}
        {this.renderClouds(screenHeight * 0.12, [0.3, 0.5], 6, 0.5)}

        {/* Mountains Layer 1 */}
        {this.renderMountains(MOUNTAIN_1, screenHeight * 0.2, 1.3, 7, 10)}

        {/* Mountains Layer 2 */}
        {this.renderMountains(MOUNTAIN_M, screenHeight * 0.3, 1.1, 9, 0)}

        {/* Clouds Layer 2 */}
        {this.renderClouds(screenHeight * 0.35, [0.5, 0.8], 5, 0.8)}

        {/* Mountains Layer 3 */}
        {this.renderMountains(MOUNTAIN_2, screenHeight * 0.42, 0.85, 12, -10)}

        {/* Ground Gradient */}
        <LinearGradient
          colors={['transparent', MOUNTAIN_2, '#080512']}
          style={[StyleSheet.absoluteFill, { top: '65%', zIndex: 3 }]}
        />
      </View>
    );
  }
}

export default CyberBackground;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SKY_TOP,
    zIndex: -1,
  },
  cloudPuff: {
    position: 'absolute',
    borderRadius: 100,
  },
  cloudBase: {
    position: 'absolute',
    borderRadius: 50,
  },
});