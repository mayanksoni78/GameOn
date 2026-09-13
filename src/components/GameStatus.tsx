import React, { memo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Colors } from '../theme/colors';
import { Fonts, FontSize } from '../theme/typography';

export interface GameStatusItem {
  label: string;
  value: string | number;
  color?: string;
  icon?: string;
}

export interface GameStatusProps {
  items: GameStatusItem[];
  accentColor?: string;
  maxWidth?: number;
}

/**
 * GameStatus Component
 * Reusable, minimalist HUD status ribbon for in-game metrics:
 *
 * ┌────────────┬────────────┬────────────┐
 * │   SCORE    │    BEST    │   LEVEL    │
 * │    120     │    450     │     4      │
 * └────────────┴────────────┴────────────┘
 *
 * - High-contrast primary values
 * - Clean, muted labels
 * - Responsive: horizontal ribbon on tablet/desktop, compact layout on mobile
 * - Dark layered surface complementing the retro-futuristic theme
 */
export const GameStatus: React.FC<GameStatusProps> = memo(({
  items,
  accentColor = Colors.accent.primary,
  maxWidth = 480,
}) => {
  const { width } = useWindowDimensions();
  const isCompact = width < 420;

  return (
    <View style={[styles.container, { maxWidth }]}>
      <View style={styles.surface}>
        {items.map((item, index) => {
          const valColor = item.color || '#FFFFFF';
          const isLast = index === items.length - 1;

          return (
            <React.Fragment key={`status-${index}`}>
              <View style={[styles.itemBlock, isCompact && styles.itemBlockCompact]}>
                <Text style={styles.labelText} numberOfLines={1}>
                  {item.icon ? `${item.icon} ` : ''}{item.label.toUpperCase()}
                </Text>
                <Text
                  style={[
                    styles.valueText,
                    { color: valColor },
                    item.color ? { textShadowColor: `${item.color}80`, textShadowRadius: 6, textShadowOffset: { width: 0, height: 0 } } : undefined,
                  ]}
                  numberOfLines={1}
                >
                  {item.value}
                </Text>
              </View>
              {!isLast && <View style={styles.divider} />}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
});

GameStatus.displayName = 'GameStatus';

export default GameStatus;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignSelf: 'center',
    marginVertical: 8,
    paddingHorizontal: 12,
  },
  surface: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    backgroundColor: '#12111A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  itemBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  itemBlockCompact: {
    paddingHorizontal: 2,
  },
  labelText: {
    fontFamily: Fonts.sans,
    fontWeight: '600',
    fontSize: 9.5,
    color: '#71717A',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  valueText: {
    fontFamily: Fonts.pixel,
    fontSize: FontSize.xs,
    color: '#F4F4F5',
    letterSpacing: 1,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});
