import React, { useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, glassmorphism, elegantShadow } from '../theme/colors';
import { Fonts, FontSize } from '../theme/typography';
import { Spacing, Radius } from '../theme/spacing';

interface GameOverModalProps {
  visible: boolean;
  title?: string;
  score: number | string;
  highScore?: number | string;
  isNewHighScore?: boolean;
  accentColor?: string;
  onRestart: () => void;
  onHome: () => void;
  stats?: { label: string; value: string | number }[];
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  visible,
  title = "GAME OVER",
  score,
  highScore,
  isNewHighScore = false,
  accentColor = Colors.accent.primary,
  onRestart,
  onHome,
  stats,
}) => {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 480;
  const modalMaxWidth = isMobile ? windowWidth - 40 : 420;

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.8, { duration: 200 });
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, overlayStyle]}>
        
        <Animated.View style={[
          styles.modalContent, 
          modalStyle, 
          { 
            maxWidth: modalMaxWidth,
            borderLeftWidth: 4,
            borderLeftColor: accentColor,
            borderWidth: 1,
            borderColor: `${accentColor}4D`,
            shadowColor: accentColor,
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 10,
          }
        ]}>
          
          <Text style={[styles.title, { color: accentColor }]}>{title}</Text>
          
          <View style={styles.scoreSection}>
            <Text style={styles.scoreLabel}>FINAL SCORE</Text>
            <Text style={[styles.scoreValue, { fontSize: isMobile ? FontSize['3xl'] : FontSize['5xl'] }]}>{score}</Text>
            
            {isNewHighScore && (
              <View style={[styles.newRecordBadge, { backgroundColor: Colors.accent.warning }]}>
                <Text style={styles.newRecordText}>NEW RECORD!</Text>
              </View>
            )}
          </View>

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
                  <Text style={styles.statLabel}>{stat.label}</Text>
                  <Text style={styles.statValue}>{stat.value}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={[styles.actions, { flexDirection: isMobile ? 'column' : 'row' }]}>
            <Pressable
              onPress={onHome}
              style={({ pressed }) => [
                styles.button,
                styles.homeButton,
                { opacity: pressed ? 0.7 : 1 }
              ]}
            >
              <Ionicons name="home-outline" size={20} color={Colors.text.primary} />
              <Text style={styles.homeButtonText}>HOME</Text>
            </Pressable>

            <Pressable
              onPress={onRestart}
              style={({ pressed }) => [
                styles.button,
                styles.restartButton,
                { backgroundColor: accentColor, shadowColor: accentColor, opacity: pressed ? 0.7 : 1 }
              ]}
            >
              <Ionicons name="refresh" size={20} color={Colors.bg.primary} />
              <Text style={[styles.restartButtonText, { color: Colors.bg.primary }]}>PLAY AGAIN</Text>
            </Pressable>
          </View>

        </Animated.View>

      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.bg.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing[5],
  },
  modalContent: {
    width: '100%',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.xl,
    padding: Spacing[6],
    alignItems: 'center',
    ...elegantShadow(0.5, 20, 10),
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: FontSize['2xl'],
    letterSpacing: 2,
    marginBottom: Spacing[6],
  },
  scoreSection: {
    alignItems: 'center',
    marginBottom: Spacing[6],
  },
  scoreLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
    marginBottom: Spacing[1],
  },
  scoreValue: {
    fontFamily: Fonts.heading,
    color: Colors.text.primary,
  },
  newRecordBadge: {
    marginTop: Spacing[2],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: Radius.full,
  },
  newRecordText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSize.xs,
    color: Colors.bg.primary,
  },
  statsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[4],
    justifyContent: 'center',
    marginBottom: Spacing[8],
    paddingTop: Spacing[6],
    borderTopWidth: 1,
    borderColor: Colors.bg.glassBorder,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 100,
  },
  statLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
    marginBottom: Spacing[1],
  },
  statValue: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.md,
    color: Colors.text.secondary,
  },
  actions: {
    width: '100%',
    gap: Spacing[4],
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[4],
    borderRadius: Radius.full,
    gap: Spacing[2],
    minHeight: 48,
  },
  homeButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  homeButtonText: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
    letterSpacing: 2,
  },
  restartButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 4,
  },
  restartButtonText: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.sm,
    letterSpacing: 2,
  },
});
