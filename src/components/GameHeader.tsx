import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseHeader, BaseHeaderProps } from './BaseComponent';
import { Colors, glassmorphism } from '../theme/colors';
import { Fonts, FontSize } from '../theme/typography';
import { Spacing, Radius } from '../theme/spacing';

export interface GameHeaderProps extends BaseHeaderProps {
  score?: number | string;
  highScore?: number | string;
  scoreLabel?: string;
  highScoreLabel?: string;
  rightContent?: React.ReactNode;
}

/**
 * GameHeader Component
 * Implements OOP BaseHeader abstraction with encapsulated responsive metrics
 * and polymorphic stat formatting.
 */
export class GameHeader extends BaseHeader<GameHeaderProps> {
  protected renderScoreBadge(
    label: string, 
    value: number | string, 
    badgeColor: string, 
    isMobile: boolean
  ): React.ReactNode {
    return (
      <View
        style={[
          styles.statBadge,
          glassmorphism(),
          {
            borderColor: badgeColor,
            borderWidth: 1,
            paddingHorizontal: isMobile ? Spacing[2] : Spacing[3],
            paddingVertical: isMobile ? 1 : Spacing[1],
            gap: isMobile ? Spacing[1] : Spacing[2],
          },
        ]}
      >
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color: badgeColor }]}>{value}</Text>
      </View>
    );
  }

  public renderContent(): React.ReactNode {
    const {
      title,
      score,
      highScore,
      scoreLabel = 'SCORE',
      highScoreLabel = 'BEST',
      accentColor = Colors.accent.primary,
      rightContent,
      style,
    } = this.props;

    const isMobile = this.isMobile();

    return (
      <View style={[styles.container, style]} pointerEvents="box-none">
        {/* Back Button */}
        <Pressable
          onPress={this.handleBackPress}
          style={({ pressed }) => [
            styles.backButton,
            {
              width: isMobile ? 40 : 44,
              height: isMobile ? 40 : 44,
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <Ionicons name="chevron-back" size={isMobile ? 20 : 24} color={Colors.text.primary} />
        </Pressable>

        {/* Center Content: Title & Stats */}
        <View style={styles.centerContainer} pointerEvents="box-none">
          {!isMobile && (
            <Text
              style={[
                styles.title,
                {
                  fontSize: isMobile ? FontSize.md : FontSize.xl,
                  textShadowColor: accentColor,
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 15,
                },
              ]}
            >
              {title}
            </Text>
          )}

          {(score !== undefined || highScore !== undefined) && (
            <View style={styles.statsContainer} pointerEvents="box-none">
              {score !== undefined &&
                this.renderScoreBadge(scoreLabel, score, accentColor, isMobile)}

              {highScore !== undefined &&
                this.renderScoreBadge(highScoreLabel, highScore, Colors.text.secondary, isMobile)}
            </View>
          )}
        </View>

        {/* Right Content (e.g., Restart Button, Settings) */}
        <View style={styles.rightContainer} pointerEvents="box-none">
          {rightContent || <View style={{ width: isMobile ? 40 : 44 }} />}
        </View>
      </View>
    );
  }
}

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
    borderRadius: Radius.full,
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
    alignItems: 'flex-end',
  },
});
