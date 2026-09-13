import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseHeader, BaseHeaderProps } from './BaseComponent';
import { Colors } from '../theme/colors';
import { Fonts, FontSize } from '../theme/typography';
import { HowToPlayModal } from './HowToPlayModal';

export interface GameHeaderProps extends BaseHeaderProps {
  score?: number | string;
  highScore?: number | string;
  scoreLabel?: string;
  highScoreLabel?: string;
  category?: string;
  rightContent?: React.ReactNode;
}

interface GameHeaderState {
  windowWidth: number;
  windowHeight: number;
  isHelpOpen: boolean;
}

/**
 * GameHeader Component
 * Redesigned for premier commercial gaming elegance:
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  [← LOBBY] [? GUIDE]   ◈ TETRIS [PUZZLE]    SCORE 120  [↺]  │
 * └─────────────────────────────────────────────────────────────┘
 *
 * - Perfectly balanced 3-column layout (Left, strictly centered Center, Right)
 * - Built-in [? GUIDE] action opening comprehensive How To Play & Controls modal
 * - Glassmorphic dark surface with subtle violet border
 * - Glowing game title with category micro-badge
 * - Sleek score chips with gold star record highlight
 * - Touch-friendly >= 44px back, help, and action targets
 */
export class GameHeader extends BaseHeader<GameHeaderProps, GameHeaderState> {
  constructor(props: GameHeaderProps) {
    super(props);
    this.state = {
      ...this.state,
      isHelpOpen: false,
    };
  }

  private openHelp = () => {
    this.safeSetState({ isHelpOpen: true });
  };

  private closeHelp = () => {
    this.safeSetState({ isHelpOpen: false });
  };

  protected renderScoreChip(
    label: string,
    value: number | string,
    isHighScore = false
  ): React.ReactNode {
    return (
      <View
        style={[
          styles.scoreChip,
          isHighScore && styles.highScoreChip,
        ]}
      >
        <Text style={[styles.scoreLabel, isHighScore && styles.highScoreLabel]}>
          {isHighScore ? '★ ' : ''}{label}
        </Text>
        <Text
          style={[
            styles.scoreValue,
            { color: isHighScore ? '#FBBF24' : '#FFFFFF' },
            isHighScore
              ? { textShadowColor: 'rgba(251, 191, 36, 0.45)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 0 } }
              : undefined,
          ]}
        >
          {value}
        </Text>
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
      category,
      accentColor = '#8B5CF6',
      rightContent,
      style,
    } = this.props;

    const isMobile = this.isMobile();
    const hasScores = score !== undefined || highScore !== undefined;

    return (
      <View style={[styles.outerContainer, style]} pointerEvents="box-none">
        <View style={styles.innerContainer} pointerEvents="box-none">
          {/* Left Column: Lobby Action Button + How To Play Button */}
          <View style={styles.leftSection}>
            <Pressable
              onPress={this.handleBackPress}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={13} color="#CBD5E1" />
              <Text style={styles.backButtonText}>LOBBY</Text>
            </Pressable>

            <Pressable
              onPress={this.openHelp}
              style={({ pressed }) => [
                styles.helpButton,
                pressed && styles.helpButtonPressed,
              ]}
              hitSlop={8}
            >
              <Ionicons name="help-circle-outline" size={14} color="#A78BFA" />
              {!isMobile && <Text style={styles.helpButtonText}>GUIDE</Text>}
            </Pressable>
          </View>

          {/* Center Column: Game Title & Category Badge (Strictly Centered & Unified) */}
          <View style={styles.centerSection} pointerEvents="box-none">
            <View style={styles.titleBadge}>
              <View style={styles.statusLed} />
              <Text style={styles.titleText} numberOfLines={1}>
                {title.toUpperCase()}
              </Text>

              {category && !isMobile && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>
                    {category.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Right Column: Unified Score Chips / Controls */}
          <View style={styles.rightSection} pointerEvents="box-none">
            {hasScores && !isMobile && (
              <View style={styles.scoreRow}>
                {score !== undefined &&
                  this.renderScoreChip(scoreLabel, score, false)}
                {highScore !== undefined &&
                  this.renderScoreChip(highScoreLabel, highScore, true)}
              </View>
            )}

            {rightContent}
          </View>
        </View>

        {/* Mobile Sub-Score Ribbon */}
        {hasScores && isMobile && (
          <View style={styles.mobileScoreRow}>
            {score !== undefined &&
              this.renderScoreChip(scoreLabel, score, false)}
            {highScore !== undefined &&
              this.renderScoreChip(highScoreLabel, highScore, true)}
          </View>
        )}

        {/* Built-In Universal How To Play & Controls Modal */}
        <HowToPlayModal
          visible={this.state.isHelpOpen}
          onClose={this.closeHelp}
          gameKey={title}
          accentColor={accentColor}
        />
      </View>
    );
  }
}

export default GameHeader;

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#0E0D16',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 14,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  innerContainer: {
    width: '100%',
    maxWidth: 1200,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // ── Left: Lobby Button & Help/Guide Button ────────────────────────────────────
  leftSection: {
    minWidth: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: '#141320',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderTopColor: 'rgba(255, 255, 255, 0.20)',
    borderBottomColor: 'rgba(0, 0, 0, 0.6)',
    gap: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  backButtonPressed: {
    opacity: 0.8,
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  backButtonText: {
    fontFamily: Fonts.pixel,
    fontSize: 9,
    color: '#CBD5E1',
    letterSpacing: 1,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#141320',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.30)',
    borderTopColor: 'rgba(139, 92, 246, 0.45)',
    borderBottomColor: 'rgba(0, 0, 0, 0.6)',
    gap: 5,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  helpButtonPressed: {
    opacity: 0.75,
    borderColor: 'rgba(139, 92, 246, 0.7)',
  },
  helpButtonText: {
    fontFamily: Fonts.pixel,
    fontSize: 8,
    color: '#C4B5FD',
    letterSpacing: 0.8,
  },
  // ── Center: Title & Category Badge ──────────────────────────────────────────
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#141320',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderTopColor: 'rgba(255, 255, 255, 0.20)',
    borderBottomColor: 'rgba(0, 0, 0, 0.6)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  statusLed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    shadowOpacity: 0.9,
  },
  titleText: {
    fontFamily: Fonts.pixel,
    fontSize: 14.5,
    color: '#FFFFFF',
    letterSpacing: 1.8,
    textShadowColor: 'rgba(167, 139, 250, 0.60)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  categoryBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  categoryText: {
    fontFamily: Fonts.pixel,
    fontSize: 7.5,
    color: '#C4B5FD',
    letterSpacing: 0.8,
  },
  // ── Right: Scores & Actions ─────────────────────────────────────────────────
  rightSection: {
    minWidth: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141320',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 11,
    paddingVertical: 7,
    gap: 7,
  },
  highScoreChip: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  scoreLabel: {
    fontFamily: Fonts.pixel,
    fontSize: 7.5,
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  highScoreLabel: {
    color: '#FBBF24',
  },
  scoreValue: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  // ── Mobile Score Row ────────────────────────────────────────────────────────
  mobileScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 16,
    width: '100%',
  },
});
