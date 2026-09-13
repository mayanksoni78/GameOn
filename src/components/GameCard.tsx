import React, { memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Image,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Href, router } from 'expo-router';
import { PremiumIcon, IconId } from './PremiumIcon';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';
import { tapLight } from '../utils/haptics';

export interface GameCardProps {
  id: IconId;
  title: string;
  route: Href;
  accentColor?: string;
  image?: any;
  cardWidth: number;
  category?: string;
  players?: string;
}

/**
 * GameCard Component
 * Refined Retro-Arcade Console Design:
 *
 * ┌───────────────────────────────┐
 * │                               │
 * │       ╭───────────────╮       │
 * │       │  GAME ARTWORK │       │  1. Dedicated Artwork Stage (Fixed 16:10)
 * │       ╰───────────────╯       │
 * │                               │
 * ├───────────────────────────────┤
 * │  GAME TITLE                   │  2. Pixel Title (Locked 22px height)
 * │  ARCADE • 1P                  │  3. Small Category / Metadata (18px)
 * │  [ PLAY ▶ ]                   │  4. Refined Tactile Action Area (34px)
 * └───────────────────────────────┘
 *
 * Guaranteed cross-card alignment:
 * - Same card dimensions & padding
 * - Same image area & aspect ratio
 * - Same title & metadata positions
 * - Action button strictly locked to the bottom across all cards
 */
export const GameCard: React.FC<GameCardProps> = memo(({
  id,
  title,
  route,
  accentColor = Colors.accent.primary,
  image,
  cardWidth,
  category = 'ARCADE',
  players = '1P',
}) => {
  const cardTranslateY = useSharedValue(0);
  const borderHighlight = useSharedValue(0);
  const buttonLighter = useSharedValue(0);

  const handleHoverIn = () => {
    cardTranslateY.value = withTiming(-3, { duration: 180, easing: Easing.out(Easing.cubic) });
    borderHighlight.value = withTiming(1, { duration: 180, easing: Easing.ease });
    buttonLighter.value = withTiming(1, { duration: 180, easing: Easing.ease });
  };

  const handleHoverOut = () => {
    cardTranslateY.value = withTiming(0, { duration: 200, easing: Easing.inOut(Easing.quad) });
    borderHighlight.value = withTiming(0, { duration: 200, easing: Easing.ease });
    buttonLighter.value = withTiming(0, { duration: 200, easing: Easing.ease });
  };

  const handlePress = () => {
    tapLight();
    router.push(route);
  };

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardTranslateY.value }],
    borderColor: borderHighlight.value > 0.5
      ? 'rgba(139, 92, 246, 0.40)'
      : 'rgba(255, 255, 255, 0.08)',
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: buttonLighter.value > 0.5 ? '#201E32' : '#191726',
    borderColor: buttonLighter.value > 0.5
      ? 'rgba(139, 92, 246, 0.50)'
      : 'rgba(255, 255, 255, 0.10)',
  }));

  return (
    <View style={[styles.cardWrapper, { width: cardWidth }]}>
      <Pressable
        onPress={handlePress}
        onHoverIn={Platform.OS === 'web' ? handleHoverIn : undefined}
        onHoverOut={Platform.OS === 'web' ? handleHoverOut : undefined}
        onPressIn={Platform.OS !== 'web' ? handleHoverIn : undefined}
        onPressOut={Platform.OS !== 'web' ? handleHoverOut : undefined}
        style={styles.pressable}
      >
        <Animated.View style={[styles.cardSurface, cardAnimatedStyle]}>
          {/* ─────────────────────────────────────────────────────────────
              1. Full-Cover Artwork Block (1:1 Native Square — Covers Fully with Zero Cutting)
          ───────────────────────────────────────────────────────────── */}
          <View style={styles.artworkStage}>
            {image ? (
              <Image
                source={image}
                style={styles.artworkImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.fallbackIconWrapper}>
                <PremiumIcon id={id} color={accentColor} size={64} />
              </View>
            )}
          </View>

          {/* ─────────────────────────────────────────────────────────────
              2. Bottom Info Section (Title, Metadata & Action Button)
          ───────────────────────────────────────────────────────────── */}
          <View style={styles.infoSection}>
            <View style={styles.titleWrapper}>
              <Text style={styles.gameTitle} numberOfLines={1}>
                {title.toUpperCase()}
              </Text>
            </View>

            <View style={styles.metaWrapper}>
              <Text style={styles.metaText} numberOfLines={1}>
                {category.toUpperCase()} • {players}
              </Text>
            </View>

            <Animated.View style={[styles.actionButton, buttonAnimatedStyle]}>
              <Text style={styles.actionButtonText}>PLAY ▶</Text>
            </Animated.View>
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
});

GameCard.displayName = 'GameCard';
export default GameCard;

const styles = StyleSheet.create({
  cardWrapper: {
    marginVertical: 4,
  },
  pressable: {
    width: '100%',
  },
  cardSurface: {
    width: '100%',
    backgroundColor: '#141320',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  // 1. Full-Cover Artwork Block — 1:1 native ratio covers block edge-to-edge without cutting
  artworkStage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#0E0D16',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  fallbackIconWrapper: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 2. Info Section
  infoSection: {
    padding: 12,
  },
  titleWrapper: {
    height: 20,
    justifyContent: 'center',
    marginBottom: 4,
  },
  gameTitle: {
    fontFamily: Fonts.pixel,
    fontSize: 10.5,
    color: '#F4F4F5',
    letterSpacing: 0.8,
  },
  metaWrapper: {
    height: 16,
    justifyContent: 'center',
    marginBottom: 10,
  },
  metaText: {
    fontFamily: Fonts.pixel,
    fontSize: 7.5,
    color: '#8E8D9F',
    letterSpacing: 0.6,
  },
  actionButton: {
    width: '100%',
    height: 34,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    backgroundColor: '#191726',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontFamily: Fonts.pixel,
    fontSize: 8.5,
    color: '#E2E8F0',
    letterSpacing: 0.8,
  },
});
