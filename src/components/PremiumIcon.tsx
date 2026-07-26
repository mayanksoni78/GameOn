import React, { useEffect } from 'react';
import { View, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

export type IconId = 'snake' | 'tetris' | '2048' | 'tictactoe' | 'flappybird' | 'connect4' | 'bingo' | 'sudoku' | 'dinojump' | 'blockoduko';

interface PremiumIconProps {
  id: IconId;
  color: string;
  size?: number;
}

// Map each game to its custom-generated cartoon icon asset
const ICON_IMAGES: Record<IconId, ImageSourcePropType> = {
  snake:      require('../../assets/images/icon_snake.jpg'),
  tetris:     require('../../assets/images/icon_tetris.jpg'),
  '2048':     require('../../assets/images/icon_game2048.jpg'),
  tictactoe:  require('../../assets/images/icon_tictactoe.jpg'),
  flappybird: require('../../assets/images/icon_flappybird.jpg'),
  connect4:   require('../../assets/images/icon_connect4.jpg'),
  bingo:      require('../../assets/images/icon_pacman.jpg'),
  sudoku:     require('../../assets/images/icon_sudoku.jpg'),
  dinojump:   require('../../assets/images/icon_dinojump.jpg'),
  blockoduko: require('../../assets/images/icon_blockoduko.jpg'),
};

export const PremiumIcon: React.FC<PremiumIconProps> = ({ id, color, size = 40 }) => {
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

  const imageSource = ICON_IMAGES[id];

  return (
    <Animated.View style={[styles.container, floatingStyle, { width: size, height: size }]}>
      {/* Glow Effect behind the icon */}
      <View style={[
          StyleSheet.absoluteFillObject, 
          styles.glow,
          { shadowColor: color, shadowRadius: size * 0.4 }
      ]} />
      
      {/* The premium generated cartoon icon */}
      <Image 
          source={imageSource}
          style={{ 
            width: size * 0.85, 
            height: size * 0.85, 
            borderRadius: size * 0.2,
          }}
          resizeMode="cover"
      />
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
