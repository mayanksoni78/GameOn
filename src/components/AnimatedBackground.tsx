import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BaseBackground, BaseBackgroundProps, BaseComponentState } from './BaseComponent';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Deep navy / purple theme constants
const SKY_TOP = '#090518';
const SKY_BOTTOM = '#1F0B40';

const Cloud = ({ width, height, startY, speed, opacity, scale }: any) => {
  const translateX = useSharedValue(SCREEN_WIDTH + 100);

  useEffect(() => {
    translateX.value = withRepeat(
      withSequence(
        withTiming(-width - 100, { duration: speed, easing: Easing.linear }),
        withTiming(SCREEN_WIDTH + 100, { duration: 0 })
      ),
      -1,
      false
    );
  }, [speed, width]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: startY,
          opacity: opacity,
        },
        animStyle,
      ]}
    >
      <View
        style={{
          width: width * 0.7,
          height: height * 0.8,
          backgroundColor: '#BCAEEB',
          borderRadius: height / 2,
          position: 'absolute',
          bottom: 0,
          left: 0,
        }}
      />
      <View
        style={{
          width: width * 0.6,
          height,
          backgroundColor: '#BCAEEB',
          borderRadius: height / 2,
          position: 'absolute',
          bottom: 0,
          left: width * 0.2,
        }}
      />
      <View
        style={{
          width: width * 0.5,
          height: height * 0.7,
          backgroundColor: '#BCAEEB',
          borderRadius: height / 2,
          position: 'absolute',
          bottom: 0,
          right: 0,
        }}
      />
    </Animated.View>
  );
};

const Star = ({ startX, startY, size, delayTime, duration }: any) => {
  const opacity = useSharedValue(0.1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withDelay(
          delayTime,
          withTiming(0.9, { duration: duration / 2, easing: Easing.inOut(Easing.ease) })
        ),
        withTiming(0.1, { duration: duration / 2, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [delayTime, duration]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: startX,
          top: startY,
          width: size,
          height: size,
          backgroundColor: '#FFF',
          borderRadius: size / 2,
          shadowColor: '#FFF',
          shadowOpacity: 1,
          shadowRadius: size * 2,
        },
        animStyle,
      ]}
    />
  );
};

const WindowFlicker = ({ x, y, color, delayTime }: any) => {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withDelay(delayTime, withTiming(0.8, { duration: 50 })),
        withDelay(Math.random() * 200 + 50, withTiming(0, { duration: 100 })),
        withDelay(Math.random() * 4000 + 2000, withTiming(0, { duration: 0 }))
      ),
      -1,
      true
    );
  }, [delayTime]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          bottom: y,
          width: 2,
          height: 2,
          backgroundColor: color,
          shadowColor: color,
          shadowOpacity: 1,
          shadowRadius: 4,
        },
        animStyle,
      ]}
    />
  );
};

const DustParticle = ({ startX, startY, size, speed, delayTime }: any) => {
  const translateY = useSharedValue(SCREEN_HEIGHT + 100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delayTime,
      withRepeat(
        withSequence(
          withTiming(-100, { duration: speed, easing: Easing.linear }),
          withTiming(SCREEN_HEIGHT + 100, { duration: 0 })
        ),
        -1,
        false
      )
    );

    opacity.value = withDelay(
      delayTime,
      withRepeat(
        withSequence(
          withTiming(0.3, { duration: speed / 2, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: speed / 2, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, [delayTime, speed]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: startX,
          top: startY,
          width: size,
          height: size,
          backgroundColor: '#8AB4F8',
          borderRadius: size / 2,
          shadowColor: '#8AB4F8',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: size,
        },
        animStyle,
      ]}
    />
  );
};

export interface AnimatedBackgroundProps extends BaseBackgroundProps {}

interface BuildingData {
  height: string;
  width: string;
  left: string;
  color: string;
  hasFlicker?: boolean;
  flickerColor?: string;
}

/**
 * AnimatedBackground Component
 * Implements OOP BaseBackground abstraction with encapsulated building generation,
 * parallax clouds, and ambient skyline particles.
 */
export class AnimatedBackground extends BaseBackground<AnimatedBackgroundProps, BaseComponentState> {
  private buildingsBG: BuildingData[] = [];
  private buildingsFG: BuildingData[] = [];

  constructor(props: AnimatedBackgroundProps) {
    super(props);
    this.generateCityscape();
  }

  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  private generateCityscape(): void {
    this.buildingsBG = Array.from({ length: 30 }).map((_, i) => ({
      height: `${this.seededRandom(i * 10) * 15 + 10}%`,
      width: `${this.seededRandom(i * 11) * 8 + 4}%`,
      left: `${i * 3.5}%`,
      color: this.seededRandom(i * 12) > 0.5 ? '#0A051C' : '#0F0829',
    }));

    const colors = ['#00E676', '#FF4081', '#2979FF', '#FFEA00', '#00E5FF'];
    this.buildingsFG = Array.from({ length: 25 }).map((_, i) => ({
      height: `${this.seededRandom(i * 20) * 10 + 5}%`,
      width: `${this.seededRandom(i * 21) * 10 + 5}%`,
      left: `${i * 4.5}%`,
      color: this.seededRandom(i * 22) > 0.5 ? '#150A33' : '#1A0E40',
      hasFlicker: this.seededRandom(i * 23) > 0.4,
      flickerColor: colors[Math.floor(this.seededRandom(i * 24) * 5)],
    }));
  }

  public renderContent(): React.ReactNode {
    return (
      <View style={[StyleSheet.absoluteFillObject, styles.fixedContainer]}>
        <LinearGradient
          colors={[SKY_TOP, SKY_BOTTOM]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Animated Stars */}
        <Star startX="10%" startY="10%" size={1.5} delayTime={0} duration={1500} />
        <Star startX="25%" startY="15%" size={1} delayTime={300} duration={2000} />
        <Star startX="40%" startY="5%" size={2} delayTime={600} duration={2500} />
        <Star startX="60%" startY="20%" size={1.5} delayTime={900} duration={1800} />
        <Star startX="80%" startY="10%" size={1.5} delayTime={1200} duration={2200} />
        <Star startX="90%" startY="25%" size={1} delayTime={1500} duration={1700} />
        <Star startX="15%" startY="30%" size={1.5} delayTime={1800} duration={2400} />
        <Star startX="50%" startY="35%" size={1} delayTime={2100} duration={1900} />
        <Star startX="75%" startY="28%" size={2} delayTime={2400} duration={2600} />
        <Star startX="35%" startY="22%" size={1} delayTime={2700} duration={1600} />

        {/* Ambient Animated Clouds */}
        <Cloud width={120} height={30} startY="15%" speed={50000} opacity={0.15} scale={0.8} />
        <Cloud width={200} height={40} startY="25%" speed={70000} opacity={0.1} scale={1.2} />
        <Cloud width={150} height={35} startY="10%" speed={60000} opacity={0.12} scale={1.0} />

        {/* Background Buildings */}
        {this.buildingsBG.map((b, i) => (
          <View
            key={`bg-${i}`}
            style={{
              position: 'absolute',
              bottom: 0,
              left: b.left as any,
              width: b.width as any,
              height: b.height as any,
              backgroundColor: b.color,
            }}
          />
        ))}

        {/* Foreground Buildings */}
        {this.buildingsFG.map((b, i) => (
          <View
            key={`fg-${i}`}
            style={{
              position: 'absolute',
              bottom: 0,
              left: b.left as any,
              width: b.width as any,
              height: b.height as any,
              backgroundColor: b.color,
            }}
          >
            {b.hasFlicker && (
              <WindowFlicker
                x="50%"
                y="50%"
                color={b.flickerColor}
                delayTime={i * 300}
              />
            )}
          </View>
        ))}

        {/* Subtle Haze over city */}
        <LinearGradient
          colors={['transparent', 'rgba(10, 5, 28, 0.4)', '#06021A']}
          style={{ position: 'absolute', bottom: 0, width: '100%', height: '30%' }}
          pointerEvents="none"
        />

        {/* Floating Dust Particles */}
        <DustParticle startX="15%" startY={0} size={2} speed={15000} delayTime={0} />
        <DustParticle startX="45%" startY={0} size={3} speed={20000} delayTime={5000} />
        <DustParticle startX="75%" startY={0} size={1.5} speed={12000} delayTime={2000} />
        <DustParticle startX="85%" startY={0} size={2.5} speed={18000} delayTime={8000} />
        <DustParticle startX="35%" startY={0} size={2} speed={22000} delayTime={3000} />
      </View>
    );
  }
}

export default AnimatedBackground;

const styles = StyleSheet.create({
  fixedContainer: {
    position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    backgroundColor: '#090518',
    zIndex: -1,
  },
});
