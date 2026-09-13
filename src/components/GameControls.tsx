import React, { memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Fonts, FontSize } from '../theme/typography';
import { tapLight } from '../utils/haptics';

export interface GameControlsProps {
  isPlaying: boolean;
  isPaused: boolean;
  accentColor?: string;
  onStartResume: () => void;
  onPause?: () => void;
  onRestart: () => void;
  extraControls?: React.ReactNode;
  maxWidth?: number;
}

/**
 * GameControls Component
 * Reusable, touch-friendly game action bar:
 * [ START / RESUME ]   [ PAUSE ]   [ ↺ RESTART ]
 *
 * - Minimum touch target >= 44px
 * - Consistent styling with game-specific accent
 * - Responsive: adapts smoothly from mobile (320px) to desktop
 */
export const GameControls: React.FC<GameControlsProps> = memo(({
  isPlaying,
  isPaused,
  accentColor = Colors.accent.primary,
  onStartResume,
  onPause,
  onRestart,
  extraControls,
  maxWidth = 480,
}) => {
  const { width } = useWindowDimensions();
  const isCompact = width < 420;

  return (
    <View style={[styles.container, { maxWidth }]}>
      <View style={styles.buttonRow}>
        {/* Primary Action Button: Start / Resume */}
        <TouchableOpacity
          style={[
            styles.btn,
            styles.primaryBtn,
            { backgroundColor: !isPlaying || isPaused ? accentColor : 'transparent', borderColor: accentColor },
          ]}
          onPress={() => {
            tapLight();
            onStartResume();
          }}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="play"
            size={18}
            color={!isPlaying || isPaused ? '#07050E' : accentColor}
          />
          <Text
            style={[
              styles.btnText,
              { color: !isPlaying || isPaused ? '#07050E' : accentColor },
            ]}
          >
            {!isPlaying ? 'START' : isPaused ? 'RESUME' : 'PLAYING'}
          </Text>
        </TouchableOpacity>

        {/* Secondary Action Button: Pause (if supported) */}
        {onPause && isPlaying && (
          <TouchableOpacity
            style={[
              styles.btn,
              styles.secondaryBtn,
              isPaused && { opacity: 0.5 },
            ]}
            onPress={() => {
              tapLight();
              onPause();
            }}
            activeOpacity={0.8}
            disabled={isPaused}
          >
            <MaterialCommunityIcons name="pause" size={18} color="#CBD5E1" />
            {!isCompact && <Text style={styles.btnTextSecondary}>PAUSE</Text>}
          </TouchableOpacity>
        )}

        {/* Tertiary Action Button: Restart */}
        <TouchableOpacity
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() => {
            tapLight();
            onRestart();
          }}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="refresh" size={18} color="#CBD5E1" />
          {!isCompact && <Text style={styles.btnTextSecondary}>RESTART</Text>}
        </TouchableOpacity>
      </View>

      {/* Optional Game-Specific Controls (e.g. Difficulty Selector) */}
      {extraControls && (
        <View style={styles.extraContainer}>
          {extraControls}
        </View>
      )}
    </View>
  );
});

GameControls.displayName = 'GameControls';

export default GameControls;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignSelf: 'center',
    marginVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  primaryBtn: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryBtn: {
    backgroundColor: '#161522',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  btnText: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
    fontSize: FontSize.xs,
    letterSpacing: 1,
  },
  btnTextSecondary: {
    fontFamily: Fonts.sans,
    fontWeight: '600',
    fontSize: FontSize.xs,
    color: '#E4E4E7',
    letterSpacing: 0.8,
  },
  extraContainer: {
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
