import React, { memo } from 'react';
import { StyleSheet, View, useWindowDimensions, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedGameBackground } from './AnimatedGameBackground';

export interface GamePageProps {
  children: React.ReactNode;
  maxWidth?: number;
  style?: ViewStyle;
}

/**
 * GamePage Component
 * Reusable top-level scaffolding for every game in GameOn:
 * - GPU-accelerated AnimatedGameBackground (calmed game variant)
 * - Safe area padding
 * - Centered responsive container (maxWidth: 760 or custom)
 * - Prevents horizontal overflow across all device widths (320px to 1440px+)
 */
export const GamePage: React.FC<GamePageProps> = memo(({
  children,
  maxWidth = 760,
  style,
}) => {
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 480 ? 8 : 16;

  return (
    <View style={styles.root}>
      <AnimatedGameBackground variant="game" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={[styles.contentContainer, { maxWidth, paddingHorizontal: horizontalPadding }, style]}>
          {children}
        </View>
      </SafeAreaView>
    </View>
  );
});

GamePage.displayName = 'GamePage';

export default GamePage;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070514',
  },
  safe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },
  contentContainer: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
});
