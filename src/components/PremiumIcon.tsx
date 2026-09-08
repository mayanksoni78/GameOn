import React from 'react';
import {
  View,
  StyleSheet,
  Image,
  ImageSourcePropType,
  Animated,
  Easing,
} from 'react-native';
import { BaseComponent, BaseComponentState } from './BaseComponent';

export type IconId =
  | 'snake'
  | 'tetris'
  | '2048'
  | 'tictactoe'
  | 'flappybird'
  | 'connect4'
  | 'bingo'
  | 'sudoku'
  | 'dinojump'
  | 'blockoduko';

export interface PremiumIconProps {
  id: IconId;
  color: string;
  size?: number;
  fullBleed?: boolean;
}

// Map each game to its custom-generated cartoon icon asset
const ICON_IMAGES: Record<IconId, ImageSourcePropType> = {
  snake: require('../../assets/images/icon_snake.png'),
  tetris: require('../../assets/images/icon_tetris.png'),
  '2048': require('../../assets/images/icon_2048.png'),
  tictactoe: require('../../assets/images/icon_tictactoe.png'),
  flappybird: require('../../assets/images/icon_flappybird.png'),
  connect4: require('../../assets/images/icon_connect4.png'),
  bingo: require('../../assets/images/icon_tomandjerry.png'),
  sudoku: require('../../assets/images/icon_sudoku.png'),
  dinojump: require('../../assets/images/icon_dinojump.png'),
  blockoduko: require('../../assets/images/icon_blockoduko.png'),
};

/**
 * PremiumIcon Component
 * Implements OOP BaseComponent with encapsulated floating animation loop,
 * cleanup on unmount, and dynamic asset resolution.
 */
export class PremiumIcon extends BaseComponent<PremiumIconProps, BaseComponentState> {
  private translateY: Animated.Value;
  private floatingAnim: Animated.CompositeAnimation | null = null;
  private timerId: any = null;

  constructor(props: PremiumIconProps) {
    super(props);
    this.translateY = new Animated.Value(0);
  }

  protected override onComponentMounted(): void {
    if (this.props.fullBleed) return;

    const delay = Math.random() * 1000;
    this.timerId = setTimeout(() => {
      if (this.isComponentMounted) {
        this.floatingAnim = Animated.loop(
          Animated.sequence([
            Animated.timing(this.translateY, {
              toValue: -4,
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(this.translateY, {
              toValue: 0,
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        );
        this.floatingAnim.start();
      }
    }, delay);
  }

  protected override onComponentWillUnmount(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
    }
    if (this.floatingAnim) {
      this.floatingAnim.stop();
    }
  }

  public renderContent(): React.ReactNode {
    const { id, color, size = 40, fullBleed = false } = this.props;
    const imageSource = ICON_IMAGES[id];

    return (
      <Animated.View
        style={[
          styles.container,
          fullBleed ? {} : { transform: [{ translateY: this.translateY }] },
          { width: size, height: size },
        ]}
      >
        {/* Glow Effect behind the icon (disabled in full bleed) */}
        {!fullBleed && (
          <View
            style={[
              StyleSheet.absoluteFillObject,
              styles.glow,
              { shadowColor: color, shadowRadius: size * 0.4 },
            ]}
          />
        )}

        {/* Cartoon Icon */}
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
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    backgroundColor: 'transparent',
    elevation: 5,
  },
});
