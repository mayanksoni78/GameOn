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
  fullBleed?: boolean;
}

// Map each game to its custom-generated cartoon icon asset
const ICON_IMAGES: Record<IconId, ImageSourcePropType> = {
  snake:      require('../../assets/images/icon_snake.png'),
  tetris:     require('../../assets/images/icon_tetris.png'),
  '2048':     require('../../assets/images/icon_2048.png'),
  tictactoe:  require('../../assets/images/icon_tictactoe.png'),
  flappybird: require('../../assets/images/icon_flappybird.png'),
  connect4:   require('../../assets/images/icon_connect4.png'),
  bingo:      require('../../assets/images/icon_tomandjerry.png'),
  sudoku:     require('../../assets/images/icon_sudoku.png'),
  dinojump:   require('../../assets/images/icon_dinojump.png'),
  blockoduko: require('../../assets/images/icon_blockoduko.png'),
};

export const PremiumIcon: React.FC<PremiumIconProps> = ({ id, color, size = 40, fullBleed = false }) => {
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (fullBleed) return;
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
  }, [fullBleed]);

  const floatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const imageSource = ICON_IMAGES[id];

  return (
    <Animated.View style={[styles.container, fullBleed ? {} : floatingStyle, { width: size, height: size }]}>
      {/* Glow Effect behind the icon (disabled in full bleed) */}
      {!fullBleed && (
        <View style={[
            StyleSheet.absoluteFillObject, 
            styles.glow,
            { shadowColor: color, shadowRadius: size * 0.4 }
        ]} />
      )}
      
      {/* The premium generated cartoon icon */}
      <Image 
          source={imageSource}
          style={{ 
            width: fullBleed ? '100%' : size * 0.85, 
            height: fullBleed ? '100%' : size * 0.85, 
            borderRadius: fullBleed ? 0 : size * 0.2,
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
