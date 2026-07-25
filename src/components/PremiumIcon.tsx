import React, { useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

export type IconId = 'snake' | 'tetris' | '2048' | 'tictactoe' | 'flappybird' | 'connect4' | 'bingo' | 'sudoku' | 'dinojump' | 'blockoduko';

interface PremiumIconProps {
  id: IconId;
  color: string;
  size?: number;
}

const ICON_MAP: Record<IconId, any> = {
  snake: 'snake',
  tetris: 'apps', // Classic block look
  '2048': 'grid',
  tictactoe: 'close-box-outline',
  flappybird: 'bird',
  connect4: 'dots-grid',
  bingo: 'ticket', // Alternatively bullseye
  sudoku: 'grid-large',
  dinojump: 'dinosaur-pixel', // Perfect fit
  blockoduko: 'puzzle-outline',
};

export const PremiumIcon: React.FC<PremiumIconProps> = ({ id, color, size = 40 }) => {
  const iconName = ICON_MAP[id];
  const translateY = useSharedValue(0);

  useEffect(() => {
    // Add a random delay so they don't all float synchronously
    const delay = Math.random() * 1000;
    setTimeout(() => {
        translateY.value = withRepeat(
            withSequence(
                withTiming(-4, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
    }, delay);
  }, []);

  const floatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.container, floatingStyle, { width: size, height: size }]}>
      {/* Glow Effect behind the icon */}
      <View style={[
          StyleSheet.absoluteFillObject, 
          styles.glow,
          { shadowColor: color, shadowRadius: size * 0.4 }
      ]} />
      
      {/* The crisp vector icon itself or custom image */}
      {id === 'dinojump' ? (
          <Image 
              source={require('../../assets/images/dino_logo.jpg')}
              style={{ width: size * 0.8, height: size * 0.8, borderRadius: size * 0.15 }}
          />
      ) : (
          <MaterialCommunityIcons 
              name={iconName} 
              size={size * 0.75} // Scale down slightly to fit inside container
              color={color} 
          />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    backgroundColor: 'transparent',
    elevation: 5, // Android glow
  }
});
