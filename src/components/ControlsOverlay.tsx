import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, glassmorphism, elegantShadow } from '../theme/colors';
import { Fonts, FontSize } from '../theme/typography';
import { Spacing, Radius } from '../theme/spacing';

interface ControlsOverlayProps {
  instructions: string[];
  controls: { action: string; input: string }[];
}

export const ControlsOverlay: React.FC<ControlsOverlayProps> = ({ instructions, controls }) => {
  const [isOpen, setIsOpen] = useState(false);
  const animation = useSharedValue(0); // 0 = closed, 1 = open

  const toggle = () => {
    setIsOpen(!isOpen);
    animation.value = withTiming(isOpen ? 0 : 1, {
      duration: 300,
      easing: Easing.out(Easing.exp),
    });
  };

  const containerStyle = useAnimatedStyle(() => {
    const height = interpolate(animation.value, [0, 1], [0, 200]); // Max height estimation
    const opacity = interpolate(animation.value, [0, 0.2, 1], [0, 0, 1]);
    return {
      maxHeight: height,
      opacity,
      marginTop: animation.value > 0 ? Spacing[4] : 0,
    };
  });

  const iconStyle = useAnimatedStyle(() => {
    const rotate = interpolate(animation.value, [0, 1], [0, 180]);
    return {
      transform: [{ rotate: `${rotate}deg` }],
    };
  });

  return (
    <View style={styles.container}>
      <Pressable
        onPress={toggle}
        style={({ pressed }) => [
          styles.header,
          { opacity: pressed ? 0.7 : 1 }
        ]}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="game-controller-outline" size={18} color={Colors.text.primary} />
          <Text style={styles.headerText}>How to Play & Controls</Text>
        </View>
        <Animated.View style={iconStyle}>
          <Ionicons name="chevron-down" size={18} color={Colors.text.muted} />
        </Animated.View>
      </Pressable>

      <Animated.View style={[styles.content, containerStyle]}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OBJECTIVE</Text>
          {instructions.map((inst, i) => (
            <Text key={i} style={styles.instructionText}>• {inst}</Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONTROLS</Text>
          <View style={styles.controlsGrid}>
            {controls.map((ctrl, i) => (
              <View key={i} style={styles.controlItem}>
                <View style={styles.keyBadge}>
                  <Text style={styles.keyText}>{ctrl.input}</Text>
                </View>
                <Text style={styles.actionText}>{ctrl.action}</Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing[5],
    marginBottom: Spacing[4],
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.bg.glassBorder,
    overflow: 'hidden',
    ...elegantShadow(0.2, 10, 4),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing[4],
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  headerText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
  },
  content: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[4],
  },
  section: {
    marginBottom: Spacing[4],
  },
  sectionTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
    marginBottom: Spacing[2],
    letterSpacing: 1,
  },
  instructionText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing[1],
    lineHeight: 20,
  },
  controlsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[3],
  },
  controlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.bg.secondary,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.md,
  },
  keyBadge: {
    backgroundColor: Colors.bg.primary,
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.bg.glassBorder,
  },
  keyText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSize.xs,
    color: Colors.text.primary,
  },
  actionText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
  },
});
