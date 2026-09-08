import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseComponent, BaseComponentState } from './BaseComponent';
import { Colors, elegantShadow } from '../theme/colors';
import { Fonts, FontSize } from '../theme/typography';
import { Spacing, Radius } from '../theme/spacing';

export interface ControlsOverlayProps {
  instructions: string[];
  controls: { action: string; input: string }[];
}

export interface ControlsOverlayState extends BaseComponentState {
  isOpen: boolean;
}

/**
 * ControlsOverlay Component
 * Implements OOP BaseComponent with encapsulated expand/collapse state,
 * animated drawer interpolation, and responsive control badges.
 */
export class ControlsOverlay extends BaseComponent<ControlsOverlayProps, ControlsOverlayState> {
  private animationValue: Animated.Value;

  constructor(props: ControlsOverlayProps) {
    super(props);
    this.animationValue = new Animated.Value(0);
    this.state = {
      ...this.state,
      isOpen: false,
    };
  }

  private toggle = (): void => {
    const nextIsOpen = !this.state.isOpen;
    this.safeSetState({ isOpen: nextIsOpen }, () => {
      Animated.timing(this.animationValue, {
        toValue: nextIsOpen ? 1 : 0,
        duration: 300,
        easing: Easing.out(Easing.exp),
        useNativeDriver: false,
      }).start();
    });
  };

  public renderContent(): React.ReactNode {
    const { instructions, controls } = this.props;
    const isMobile = this.isMobile();

    const maxHeight = this.animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 320],
    });

    const opacity = this.animationValue.interpolate({
      inputRange: [0, 0.2, 1],
      outputRange: [0, 0, 1],
    });

    const marginTop = this.animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, Spacing[4]],
    });

    const rotate = this.animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '180deg'],
    });

    return (
      <View
        style={[
          styles.container,
          { marginHorizontal: isMobile ? Spacing[3] : Spacing[5] },
        ]}
      >
        <Pressable
          onPress={this.toggle}
          style={({ pressed }) => [
            styles.header,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <View style={styles.headerLeft}>
            <Ionicons name="game-controller-outline" size={18} color={Colors.text.primary} />
            <Text style={styles.headerText}>How to Play & Controls</Text>
          </View>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Ionicons name="chevron-down" size={18} color={Colors.text.muted} />
          </Animated.View>
        </Pressable>

        <Animated.View
          style={[
            styles.content,
            {
              maxHeight,
              opacity,
              marginTop,
            },
          ]}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>OBJECTIVE</Text>
            {instructions.map((inst, i) => (
              <Text key={i} style={styles.instructionText}>
                • {inst}
              </Text>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CONTROLS</Text>
            <View
              style={[
                styles.controlsGrid,
                { flexDirection: isMobile ? 'column' : 'row' },
              ]}
            >
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
  }
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing[4],
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.15)',
    overflow: 'hidden',
    zIndex: 30,
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
