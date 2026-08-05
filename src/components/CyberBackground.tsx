import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ── Enhanced Elegant Theme Colors ─────────────────────────────────────────
const SKY_TOP    = '#020208'; // Pitch black / deep space
const SKY_MID    = '#0A0625'; // Deep cosmic blue
const SKY_BOTTOM = '#1D1242'; // Rich twilight purple
const MOUNTAIN_1 = '#090516'; // Far mountains (darkest purple)
const MOUNTAIN_M = '#0E0820'; // Mid mountains (deep purple)
const MOUNTAIN_2 = '#160E2A'; // Near mountains (dark indigo)

// ── Twinkling Star / Spark Component ──
const TwinklingStar = React.memo(({ x, y, size, minOpacity, maxOpacity, duration }: { x: number, y: number, size: number, minOpacity: number, maxOpacity: number, duration: number }) => {
  const opacity = useSharedValue(minOpacity);
  
  useEffect(() => {
    // Yo-yo effect: animate to maxOpacity, then reverse back to minOpacity infinitely
    opacity.value = withRepeat(
      withTiming(maxOpacity, { duration, easing: Easing.inOut(Easing.ease) }),
      -1,
      true 
    );
  }, [maxOpacity, duration, minOpacity, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
  }));

  return (
    <Animated.View style={[{
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
    }, animatedStyle]} />
  );
});

// ── Improved Realistic Pure CSS Cloud ──
const CloudShape = ({ scale = 1, baseOpacity = 1 }) => (
  <View style={{ transform: [{ scale }], opacity: baseOpacity, width: 160, height: 70, justifyContent: 'center' }}>
    {/* Background softer layer for depth */}
    <View style={[styles.cloudPuff, { width: 75, height: 75, top: -20, left: 15, backgroundColor: 'rgba(200, 200, 255, 0.04)' }]} />
    <View style={[styles.cloudPuff, { width: 95, height: 95, top: -45, left: 45, backgroundColor: 'rgba(200, 200, 255, 0.05)' }]} />
    <View style={[styles.cloudPuff, { width: 65, height: 65, top: -15, left: 105, backgroundColor: 'rgba(200, 200, 255, 0.04)' }]} />
    
    {/* Foreground slightly brighter layer */}
    <View style={[styles.cloudPuff, { width: 60, height: 60, top: -10, left: 25, backgroundColor: 'rgba(220, 220, 255, 0.06)' }]} />
    <View style={[styles.cloudPuff, { width: 80, height: 80, top: -30, left: 55, backgroundColor: 'rgba(220, 220, 255, 0.07)' }]} />
    <View style={[styles.cloudPuff, { width: 50, height: 50, top: -5, left: 110, backgroundColor: 'rgba(220, 220, 255, 0.06)' }]} />
    
    {/* Soft Base */}
    <View style={[styles.cloudBase, { width: 140, height: 45, top: 15, left: 10, backgroundColor: 'rgba(200, 200, 255, 0.08)' }]} />
  </View>
);

interface CyberBackgroundProps {
  scrollOffset?: Animated.SharedValue<number>;
  autoScroll?: boolean;
}

export const CyberBackground = React.memo(({ scrollOffset, autoScroll = false }: CyberBackgroundProps) => {
  
  const localScroll = useSharedValue(0);
  useEffect(() => {
    if (autoScroll && !scrollOffset) {
      localScroll.value = withRepeat(
        withTiming(1000, { duration: 30000, easing: Easing.linear }),
        -1, false
      );
    }
  }, [autoScroll, scrollOffset, localScroll]);

  const activeScroll = scrollOffset || localScroll;

  // ── Stars & Dim Sparks Initialization ──
  const stars = useMemo(() => {
    // 1. Regular beautiful twinkling stars
    const regularStars = Array.from({ length: 40 }).map(() => {
      const isBright = Math.random() > 0.8; 
      return {
        x: Math.random() * 100,
        y: Math.random() * 55, // Keep mainly in the sky
        size: Math.random() * 1.5 + (isBright ? 1 : 0.5),
        minOpacity: Math.random() * 0.1 + 0.05,
        maxOpacity: Math.random() * 0.4 + 0.2 + (isBright ? 0.3 : 0),
        duration: Math.random() * 3000 + 2000, // Slow twinkle
      };
    });

    // 2. Fast, dim, tiny sparks scattered lower too
    const dimSparks = Array.from({ length: 80 }).map(() => {
      return {
        x: Math.random() * 100,
        y: Math.random() * 85, // Scatter a bit behind the mountains too
        size: Math.random() * 0.8 + 0.2, // Very tiny
        minOpacity: 0.01,
        maxOpacity: Math.random() * 0.15 + 0.05, // Very dim
        duration: Math.random() * 1200 + 600, // Fast sparkling speed
      };
    });

    return [...regularStars, ...dimSparks];
  }, []);

  // ── Clouds ──
  const renderClouds = (yOffset: number, scaleRange: number[], count: number, speedMultiplier: number, opacity: number = 1) => {
    const clouds = useMemo(() => Array.from({ length: count }).map((_, i) => ({
      x: (i * (100 / count)) + (Math.random() * 15 - 7.5),
      scale: Math.random() * (scaleRange[1] - scaleRange[0]) + scaleRange[0],
      yOffset: Math.random() * 40 - 20,
    })), [count, scaleRange]);

    const animatedStyle = useAnimatedStyle(() => {
      const translation = (activeScroll.value * speedMultiplier) % screenWidth;
      return {
        transform: [{ translateX: -translation }]
      };
    });

    return (
      <View style={[StyleSheet.absoluteFill, { top: yOffset, height: 180, zIndex: 1 }]}>
        <Animated.View style={[{ width: screenWidth * 2, height: '100%', flexDirection: 'row' }, animatedStyle]}>
           {clouds.map((c, i) => (
              <View key={`c1-${i}`} style={{ position: 'absolute', left: `${c.x}%`, top: c.yOffset }}>
                <CloudShape scale={c.scale} baseOpacity={opacity} />
              </View>
           ))}
           {/* Duplicate for seamless looping */}
           {clouds.map((c, i) => (
              <View key={`c2-${i}`} style={{ position: 'absolute', left: `${c.x + 100}%`, top: c.yOffset }}>
                <CloudShape scale={c.scale} baseOpacity={opacity} />
              </View>
           ))}
        </Animated.View>
      </View>
    );
  };

  // ── Mountains ──
  const renderMountains = (color: string, yOffset: number, scaleY: number, count: number, speedMultiplier: number, extraOffset: number = 0) => {
    const peaks = useMemo(() => Array.from({ length: count }).map((_, i) => ({
      x: (i * (120 / count)) - 10,
      w: Math.random() * 160 + 120, 
    })), [count]);

    const animatedStyle = useAnimatedStyle(() => {
      const translation = (activeScroll.value * speedMultiplier) % screenWidth;
      return {
        transform: [{ translateX: -translation }]
      };
    });

    return (
      <View style={[StyleSheet.absoluteFill, { top: yOffset, overflow: 'hidden', zIndex: 2 }]}>
        <Animated.View style={[{ width: screenWidth * 2, height: '100%', flexDirection: 'row' }, animatedStyle]}>
           {peaks.map((p, i) => (
              <View key={`p1-${i}`} style={{
                position: 'absolute',
                left: `${p.x}%`,
                bottom: -50 + extraOffset, 
                width: p.w,
                height: p.w,
                backgroundColor: color,
                transform: [{ rotate: '45deg' }, { scaleY }],
                borderRadius: 20, 
              }} />
           ))}
           {/* Duplicate for seamless looping */}
           {peaks.map((p, i) => (
              <View key={`p2-${i}`} style={{
                position: 'absolute',
                left: `${p.x + 100}%`,
                bottom: -50 + extraOffset,
                width: p.w,
                height: p.w,
                backgroundColor: color,
                transform: [{ rotate: '45deg' }, { scaleY }],
                borderRadius: 20,
              }} />
           ))}
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Sky Gradient */}
      <LinearGradient colors={[SKY_TOP, SKY_MID, SKY_BOTTOM]} style={StyleSheet.absoluteFill} />

      {/* Twinkling Stars and Dim Sparks */}
      {stars.map((s, i) => (
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

      {/* Clouds Layer 1 (Significantly smaller sizes: 0.3 to 0.5) */}
      {renderClouds(screenHeight * 0.12, [0.3, 0.5], 6, 0.015, 0.5)}

      {/* Mountains Layer 1 */}
      {renderMountains(MOUNTAIN_1, screenHeight * 0.20, 1.3, 7, 0.02, 10)}
      
      {/* Mountains Layer 2 */}
      {renderMountains(MOUNTAIN_M, screenHeight * 0.30, 1.1, 9, 0.04, 0)}
      
      {/* Clouds Layer 2 (Significantly smaller sizes: 0.5 to 0.8) */}
      {renderClouds(screenHeight * 0.35, [0.5, 0.8], 5, 0.06, 0.8)}

      {/* Mountains Layer 3 */}
      {renderMountains(MOUNTAIN_2, screenHeight * 0.42, 0.85, 12, 0.08, -10)}

      {/* Ground Gradient */}
      <LinearGradient 
        colors={['transparent', MOUNTAIN_2, '#080512']} 
        style={[StyleSheet.absoluteFill, { top: '65%', zIndex: 3 }]} 
      />
    </View>
  );
});

// DEFAULT EXPORT TO PREVENT COMPONENT CRASHES
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
  }
});