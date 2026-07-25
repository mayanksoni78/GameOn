import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, glassmorphism } from '../theme/colors';
import { Fonts, FontSize } from '../theme/typography';
import { Spacing, Radius } from '../theme/spacing';

interface GameHeaderProps {
  title: string;
  score?: number;
  highScore?: number;
  onBack: () => void;
  accentColor?: string;
  rightContent?: React.ReactNode;
  style?: ViewStyle;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  title,
  score,
  highScore,
  onBack,
  accentColor = Colors.accent.primary,
  rightContent,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Back Button */}
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [
          styles.backButton,
          { opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Ionicons name="chevron-back" size={24} color={Colors.text.primary} />
      </Pressable>

      {/* Center Content: Title & Stats */}
      <View style={styles.centerContainer}>
        <Text style={[
          styles.title, 
          { 
            textShadowColor: accentColor, 
            textShadowOffset: { width: 0, height: 0 }, 
            textShadowRadius: 15 
          }
        ]}>
          {title}
        </Text>
        
        {(score !== undefined || highScore !== undefined) && (
          <View style={styles.statsContainer}>
            {score !== undefined && (
              <View style={[styles.statBadge, glassmorphism()]}>
                <Text style={styles.statLabel}>SCORE</Text>
                <Text style={[styles.statValue, { color: accentColor }]}>
                  {score}
                </Text>
              </View>
            )}
            
            {highScore !== undefined && (
              <View style={[styles.statBadge, glassmorphism()]}>
                <Text style={styles.statLabel}>BEST</Text>
                <Text style={[styles.statValue, { color: Colors.text.secondary }]}>
                  {highScore}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Right Content (e.g., Restart Button, Settings) */}
      <View style={styles.rightContainer}>
        {rightContent || <View style={{ width: 44 }} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.bg.glassBorder,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.xl,
    color: Colors.white,
    letterSpacing: 2,
    marginBottom: Spacing[2],
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: Radius.full,
    gap: Spacing[2],
  },
  statLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  statValue: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.sm,
  },
  rightContainer: {
    minWidth: 44,
    alignItems: 'flex-end',
  },
});
