import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';
import { PremiumIcon, IconId } from './PremiumIcon';
import { Colors } from '../theme/colors';
import { Fonts, FontSize } from '../theme/typography';
import { Radius } from '../theme/spacing';
import { LinearGradient } from 'expo-linear-gradient';
import { Href, router } from 'expo-router';
import { tapLight } from '../utils/haptics';

interface PremiumGameCardProps {
  id: IconId;
  title: string;
  subtitle: string;
  route: Href;
  accentColor: string;
  delay?: number;
  cardWidth: number;
}

export const PremiumGameCard: React.FC<PremiumGameCardProps> = ({
  id,
  title,
  subtitle,
  route,
  accentColor,
  delay = 0,
  cardWidth,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 480;

  const scale        = useSharedValue(1);
  const glowOpacity  = useSharedValue(0);

  const onPressIn  = () => {
    scale.value       = withSpring(0.95, { damping: 14, stiffness: 260 });
    glowOpacity.value = withTiming(1, { duration: 120 });
  };
  const onPressOut = () => {
    scale.value       = withSpring(1, { damping: 14, stiffness: 260 });
    glowOpacity.value = withTiming(0, { duration: 220 });
  };
  const onPress    = () => { tapLight(); router.push(route); };

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

  // Responsive card proportions
  const cardHeight = Math.round(cardWidth * 1.18);
  const imageAreaHeight = Math.round(cardHeight * 0.65);
  const iconSize = Math.round(cardWidth * 0.78);
  const borderRadius = isMobile ? 14 : 18;
  const titleSize = isMobile ? FontSize.sm : FontSize.md;

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(18)}
      style={[styles.card, animStyle, { width: cardWidth, height: cardHeight, borderRadius }]}
    >
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        style={[styles.pressable, { borderColor: `${accentColor}50`, borderRadius }]}
      >
        {/* ── Dark base gradient ── */}
        <LinearGradient
          colors={['#0E0C30', '#130F3A', '#180D40']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* ── Accent corner glow (top-left + bottom-right) ── */}
        <LinearGradient
          colors={[`${accentColor}25`, 'transparent', `${accentColor}08`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* ── Image area with proper containment ── */}
        <View style={[styles.imageArea, { height: imageAreaHeight }]}>
          <PremiumIcon id={id} color={accentColor} size={iconSize} fullBleed={true} />
        </View>

        {/* ── Gradient fade from image into text ── */}
        <LinearGradient
          colors={['transparent', 'rgba(14,10,48,0.5)', 'rgba(14,10,48,0.95)', '#0E0A30']}
          style={[styles.imageFade, { top: imageAreaHeight - 50, height: 70 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        {/* ── Text content at bottom ── */}
        <View style={styles.textZone}>
          <Text style={[styles.title, { fontSize: titleSize }]} numberOfLines={1}>{title}</Text>
          <Text style={[styles.subtitle, { color: `${accentColor}AA` }]} numberOfLines={2}>{subtitle}</Text>
        </View>

        {/* ── Hover glow pulse ── */}
        <Animated.View style={[StyleSheet.absoluteFill, glowStyle]} pointerEvents="none">
          <LinearGradient
            colors={[`${accentColor}20`, 'transparent', `${accentColor}10`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* ── Accent bottom bar with gradient ── */}
        <LinearGradient
          colors={['transparent', `${accentColor}BB`, accentColor]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.bottomBar}
        />

        {/* ── Inner top highlight for depth ── */}
        <View style={styles.innerTopHighlight} />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  pressable: {
    flex: 1,
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  imageArea: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imageFade: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  textZone: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 2,
  },
  title: {
    fontFamily: Fonts.heading,
    color: Colors.white,
    marginBottom: 4,
    letterSpacing: 1,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 11,
    lineHeight: 15,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  innerTopHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});