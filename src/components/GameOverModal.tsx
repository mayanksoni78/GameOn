import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseModal, BaseModalProps, BaseModalState } from './BaseComponent';
import { Colors } from '../theme/colors';
import { Fonts, FontSize } from '../theme/typography';
import { Spacing } from '../theme/spacing';

export interface GameOverModalProps extends BaseModalProps {
  score: number | string;
  highScore?: number | string;
  isNewHighScore?: boolean;
  accentColor?: string;
  onRestart: () => void;
  onHome: () => void;
  stats?: { label: string; value: string | number }[];
}

export interface GameOverModalState extends BaseModalState {}

/**
 * GameOverModal Component
 * Commercial-grade game-over dialog:
 * - Refined dark surface with violet/magenta accent glow
 * - Score vs Best breakdown with New Record celebration
 * - Symmetrical action buttons with dual typography
 */
export class GameOverModal extends BaseModal<GameOverModalProps, GameOverModalState> {
  private opacityAnim: Animated.Value;
  private scaleAnim: Animated.Value;

  constructor(props: GameOverModalProps) {
    super(props);
    this.opacityAnim = new Animated.Value(props.visible ? 1 : 0);
    this.scaleAnim = new Animated.Value(props.visible ? 1 : 0.85);
  }

  protected override onVisibilityChanged(visible: boolean): void {
    super.onVisibilityChanged(visible);
    if (visible) {
      Animated.parallel([
        Animated.timing(this.opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(this.scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(this.opacityAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(this.scaleAnim, {
          toValue: 0.85,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }

  public renderContent(): React.ReactNode {
    const {
      visible,
      title = 'GAME OVER',
      score,
      highScore,
      isNewHighScore = false,
      accentColor = Colors.accent.primary,
      onRestart,
      onHome,
      stats,
    } = this.props;

    if (!visible) return null;

    const isMobile = this.isMobile();
    const modalMaxWidth = isMobile ? this.getWindowWidth() - 36 : 420;

    return (
      <Modal visible={visible} transparent animationType="none">
        <Animated.View style={[styles.overlay, { opacity: this.opacityAnim }]}>
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ scale: this.scaleAnim }],
                maxWidth: modalMaxWidth,
                borderColor: `${accentColor}40`,
                shadowColor: accentColor,
              },
            ]}
          >
            {/* Top Accent Strip */}
            <View style={[styles.topStrip, { backgroundColor: accentColor }]} />

            {/* Title */}
            <Text style={[styles.title, { color: accentColor }]}>{title}</Text>

            {/* Final Score Display */}
            <View style={styles.scoreSection}>
              <Text style={styles.scoreLabel}>FINAL SCORE</Text>
              <Text
                style={[
                  styles.scoreValue,
                  { fontSize: isMobile ? 28 : 36 },
                ]}
              >
                {score}
              </Text>

              {isNewHighScore && (
                <View style={styles.newRecordBadge}>
                  <Text style={styles.newRecordText}>★ NEW RECORD! ★</Text>
                </View>
              )}
            </View>

            {/* Additional Stats / Best Score */}
            {(highScore !== undefined || stats) && (
              <View style={styles.statsGrid}>
                {highScore !== undefined && (
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>BEST SCORE</Text>
                    <Text style={styles.statValue}>{highScore}</Text>
                  </View>
                )}
                {stats?.map((stat, i) => (
                  <View key={i} style={styles.statItem}>
                    <Text style={styles.statLabel}>{stat.label.toUpperCase()}</Text>
                    <Text style={styles.statValue}>{stat.value}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Actions */}
            <View style={[styles.actions, { flexDirection: isMobile ? 'column' : 'row' }]}>
              <Pressable
                onPress={onHome}
                style={({ pressed }) => [
                  styles.button,
                  styles.homeButton,
                  { opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <Ionicons name="home-outline" size={16} color="#CBD5E1" />
                <Text style={styles.homeButtonText}>LOBBY</Text>
              </Pressable>

              <Pressable
                onPress={onRestart}
                style={({ pressed }) => [
                  styles.button,
                  styles.restartButton,
                  {
                    backgroundColor: accentColor,
                    borderColor: accentColor,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Ionicons name="refresh" size={16} color={Colors.white} />
                <Text style={styles.restartButtonText}>PLAY AGAIN</Text>
              </Pressable>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 6, 12, 0.90)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 1000,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#12111A',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  topStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    letterSpacing: 1.5,
    marginBottom: 20,
    marginTop: 6,
  },
  scoreSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreLabel: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 6,
  },
  scoreValue: {
    fontFamily: Fonts.pixel,
    color: Colors.white,
    letterSpacing: 1.5,
  },
  newRecordBadge: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  newRecordText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    color: '#FBBF24',
    letterSpacing: 0.8,
  },
  statsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statItem: {
    alignItems: 'center',
    minWidth: 85,
  },
  statLabel: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  statValue: {
    fontFamily: Fonts.pixel,
    fontSize: 11,
    color: '#E2E8F0',
    letterSpacing: 0.5,
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 6,
    gap: 6,
    minHeight: 42,
  },
  homeButton: {
    backgroundColor: '#161522',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  homeButtonText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
    letterSpacing: 0.8,
  },
  restartButton: {
    backgroundColor: '#222035',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  restartButtonText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.8,
  },
});

