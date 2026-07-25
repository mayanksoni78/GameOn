import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { PremiumIcon, IconId } from './PremiumIcon';
import { Colors, elegantShadow } from '../theme/colors';
import { Fonts, FontSize } from '../theme/typography';
import { Spacing, Radius, GlassBorder } from '../theme/spacing';
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
}

export const PremiumGameCard: React.FC<PremiumGameCardProps> = ({
  id,
  title,
  subtitle,
  route,
  accentColor,
  delay = 0,
}) => {
  const scale = useSharedValue(1);
  const hoverOpacity = useSharedValue(0);

  const onPressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 200 });
    hoverOpacity.value = withTiming(0.1, { duration: 150 });
  };

  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
    hoverOpacity.value = withTiming(0, { duration: 300 });
  };

  const onPress = () => {
    tapLight();
    router.push(route);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: hoverOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        style={styles.pressable}
      >
        <LinearGradient
          colors={[Colors.bg.card, Colors.bg.secondary]}
          style={styles.background}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        {/* Hover Glow */}
        <Animated.View style={[styles.hoverGlow, glowStyle, { backgroundColor: accentColor }]} />

        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: `${accentColor}1A`, borderColor: `${accentColor}40` }]}>
            <PremiumIcon id={id} color={accentColor} size={40} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.text.muted} />
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: Spacing[4],
    ...elegantShadow(0.3, 10, 5),
  },
  pressable: {
    overflow: 'hidden',
    ...GlassBorder,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  hoverGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[5],
    gap: Spacing[4],
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  gameImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
  },
  emoji: {
      fontSize: 32, // Large graphical emoji
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    marginBottom: Spacing[2],
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
});
