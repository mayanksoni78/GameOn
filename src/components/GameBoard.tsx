import React, { memo } from 'react';
import { StyleSheet, View, ViewStyle, DimensionValue } from 'react-native';
import { Colors } from '../theme/colors';

export interface GameBoardProps {
  children: React.ReactNode;
  accentColor?: string;
  width?: DimensionValue;
  height?: DimensionValue;
  aspectRatio?: number;
  style?: ViewStyle;
}

/**
 * GameBoard Component
 * Standardized gameplay area frame across all games:
 * - Dark premium surface (#080416 / #0C0720)
 * - Subtle 1.5px border with game-specific accent glow
 * - Soft depth shadow
 * - Consistent rounded corners
 * - Responsive centering
 */
export const GameBoard: React.FC<GameBoardProps> = memo(({
  children,
  accentColor = Colors.accent.primary,
  width,
  height,
  aspectRatio,
  style,
}) => {
  return (
    <View
      style={[
        styles.boardWrapper,
        {
          borderColor: accentColor ? `${accentColor}35` : 'rgba(255, 255, 255, 0.08)',
        },
        width !== undefined ? { width } : undefined,
        height !== undefined ? { height } : undefined,
        aspectRatio !== undefined ? { aspectRatio } : undefined,
        style,
      ]}
    >
      {children}
    </View>
  );
});

GameBoard.displayName = 'GameBoard';

export default GameBoard;

const styles = StyleSheet.create({
  boardWrapper: {
    backgroundColor: '#0E0D16',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
});
