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
import { Colors } from '../theme/colors';
import { Fonts, FontSize } from '../theme/typography';
import { Spacing } from '../theme/spacing';

export interface ControlsOverlayProps {
  instructions: string[];
  controls: { action: string; input: string }[];
}

export interface ControlsOverlayState extends BaseComponentState {
  isOpen: boolean;
}

/**
 * ControlsOverlay Component
 * Commercial-grade expandable drawer:
 * - Clear modern typography for instructions & key labels
 * - High-contrast keycap pills
 * - Smooth collapse/expand animation
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
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });
  };

  public renderContent(): React.ReactNode {
    const { instructions, controls } = this.props;
    const isMobile = this.isMobile();

    const maxHeight = this.animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 360],
    });

    const opacity = this.animationValue.interpolate({
      inputRange: [0, 0.3, 1],
      outputRange: [0, 0.4, 1],
    });

    const marginTop = this.animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 12],
    });

    const rotate = this.animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '180deg'],
    });

    return (
      <View
        style={[
          styles.container,
          { marginHorizontal: isMobile ? 12 : 24 },
        ]}
      >
        <Pressable
          onPress={this.toggle}
          style={({ pressed }) => [
            styles.header,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <View style={styles.headerLeft}>
            <Ionicons name="game-controller-outline" size={17} color={Colors.accent.primary} />
            <Text style={styles.headerText}>HOW TO PLAY & CONTROLS</Text>
          </View>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Ionicons name="chevron-down" size={16} color="#94A3B8" />
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
    marginBottom: 12,
    backgroundColor: '#12111A',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    zIndex: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#161522',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
    letterSpacing: 0.5,
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: Fonts.heading,
    fontSize: 9,
    color: '#A78BFA',
    marginBottom: 6,
    letterSpacing: 0.8,
  },
  instructionText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#CBD5E1',
    marginBottom: 4,
    lineHeight: 18,
  },
  controlsGrid: {
    flexWrap: 'wrap',
    gap: 8,
  },
  controlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#161522',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  keyBadge: {
    backgroundColor: '#0E0D16',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  keyText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  actionText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: '#F1F5F9',
  },
});

