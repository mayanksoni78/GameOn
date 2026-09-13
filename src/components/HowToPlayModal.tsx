import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '../theme/typography';
import { GAME_GUIDES, GameGuide } from '../utils/gameGuides';

export interface HowToPlayModalProps {
  visible: boolean;
  onClose: () => void;
  gameKey: string;
  accentColor?: string;
}

interface HowToPlayModalState {
  fadeAnim: Animated.Value;
  scaleAnim: Animated.Value;
}

export class HowToPlayModal extends React.Component<HowToPlayModalProps, HowToPlayModalState> {
  constructor(props: HowToPlayModalProps) {
    super(props);
    this.state = {
      fadeAnim: new Animated.Value(props.visible ? 1 : 0),
      scaleAnim: new Animated.Value(props.visible ? 1 : 0.92),
    };
  }

  componentDidUpdate(prevProps: HowToPlayModalProps): void {
    if (prevProps.visible !== this.props.visible) {
      if (this.props.visible) {
        Animated.parallel([
          Animated.timing(this.state.fadeAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.spring(this.state.scaleAnim, {
            toValue: 1,
            friction: 7,
            tension: 90,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.timing(this.state.fadeAnim, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }).start();
      }
    }
  }

  private resolveGuide(): GameGuide {
    const { gameKey } = this.props;
    const upperKey = gameKey.toUpperCase().trim();
    if (GAME_GUIDES[upperKey]) {
      return GAME_GUIDES[upperKey];
    }
    // Partial search match
    for (const k of Object.keys(GAME_GUIDES)) {
      if (upperKey.includes(k) || k.includes(upperKey)) {
        return GAME_GUIDES[k];
      }
    }
    // Fallback default guide
    return {
      title: upperKey,
      category: 'ARCADE',
      objective: [
        'Master the controls to beat the high score.',
        'Avoid hazards and survive as long as possible!'
      ],
      controls: [
        { action: 'Move / Action', input: 'Arrows / WASD / Tap' },
        { action: 'Pause / Resume', input: 'Enter / Space' },
      ],
      tips: ['Practice timing to achieve highest combos!']
    };
  }

  public render(): React.ReactNode {
    const { visible, onClose, accentColor = '#8B5CF6' } = this.props;
    const { fadeAnim, scaleAnim } = this.state;
    if (!visible) return null;

    const guide = this.resolveGuide();

    return (
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={onClose}
      >
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

          <Animated.View
            style={[
              styles.dialogCard,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Top Modal Header Bar */}
            <View style={styles.headerBar}>
              <View style={styles.headerTitleRow}>
                <Ionicons name="game-controller" size={16} color={accentColor} />
                <Text style={styles.dialogTitle}>
                  {guide.title} GUIDE
                </Text>
                <View style={[styles.catPill, { borderColor: `${accentColor}50` }]}>
                  <Text style={[styles.catText, { color: accentColor }]}>
                    {guide.category}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  styles.closeBtn,
                  pressed && styles.closeBtnPressed,
                ]}
                hitSlop={8}
              >
                <Ionicons name="close" size={18} color="#CBD5E1" />
              </Pressable>
            </View>

            {/* Scrollable Body */}
            <ScrollView
              style={styles.bodyScroll}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Section 1: Objective */}
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionBadge}>01</Text>
                  <Text style={[styles.sectionTitle, { color: accentColor }]}>
                    HOW TO PLAY
                  </Text>
                </View>
                <View style={styles.objectiveCard}>
                  {guide.objective.map((rule, idx) => (
                    <View key={idx} style={styles.ruleRow}>
                      <Text style={[styles.ruleBullet, { color: accentColor }]}>▶</Text>
                      <Text style={styles.ruleText}>{rule}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Section 2: Controls */}
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionBadge}>02</Text>
                  <Text style={[styles.sectionTitle, { color: accentColor }]}>
                    CONTROLS
                  </Text>
                </View>
                <View style={styles.controlsGrid}>
                  {guide.controls.map((ctrl, idx) => (
                    <View key={idx} style={styles.controlItem}>
                      <View style={[styles.keyCap, { borderColor: `${accentColor}40` }]}>
                        <Text style={styles.keyText}>{ctrl.input}</Text>
                      </View>
                      <Text style={styles.actionText}>{ctrl.action}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Section 3: Pro Tips (if available) */}
              {guide.tips && guide.tips.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionBadge}>03</Text>
                    <Text style={[styles.sectionTitle, { color: '#FBBF24' }]}>
                      PRO TIPS
                    </Text>
                  </View>
                  <View style={styles.tipCard}>
                    {guide.tips.map((tip, idx) => (
                      <View key={idx} style={styles.ruleRow}>
                        <Text style={styles.tipBullet}>★</Text>
                        <Text style={styles.tipText}>{tip}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Bottom Dismiss Button */}
            <View style={styles.footer}>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  styles.dismissBtn,
                  { backgroundColor: accentColor },
                  pressed && styles.dismissBtnPressed,
                ]}
              >
                <Text style={styles.dismissBtnText}>GOT IT • LET'S PLAY</Text>
              </Pressable>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 2, 12, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 9999,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '85%',
    backgroundColor: '#12111D',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderTopColor: 'rgba(255, 255, 255, 0.22)',
    borderBottomColor: 'rgba(0, 0, 0, 0.7)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 10,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#0E0D16',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dialogTitle: {
    fontFamily: Fonts.pixel,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  catPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  catText: {
    fontFamily: Fonts.pixel,
    fontSize: 7,
    letterSpacing: 0.8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#181624',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnPressed: {
    opacity: 0.7,
  },
  bodyScroll: {
    flexGrow: 0,
  },
  bodyContent: {
    padding: 18,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionBadge: {
    fontFamily: Fonts.pixel,
    fontSize: 7.5,
    color: '#64748B',
    letterSpacing: 0.8,
  },
  sectionTitle: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  objectiveCard: {
    backgroundColor: '#171524',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    gap: 8,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  ruleBullet: {
    fontFamily: Fonts.pixel,
    fontSize: 7,
    marginTop: 4,
  },
  ruleText: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    color: '#E2E8F0',
    lineHeight: 18,
  },
  controlsGrid: {
    gap: 8,
  },
  controlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#171524',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  keyCap: {
    backgroundColor: '#0E0D16',
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 90,
    alignItems: 'center',
  },
  keyText: {
    fontFamily: Fonts.pixel,
    fontSize: 8,
    color: '#CBD5E1',
    letterSpacing: 0.6,
  },
  actionText: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    color: '#F1F5F9',
    textAlign: 'right',
  },
  tipCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    padding: 12,
    gap: 8,
  },
  tipBullet: {
    fontFamily: Fonts.pixel,
    fontSize: 8,
    color: '#FBBF24',
    marginTop: 3,
  },
  tipText: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: '#FDE68A',
    lineHeight: 17,
  },
  footer: {
    padding: 14,
    backgroundColor: '#0E0D16',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  dismissBtn: {
    paddingVertical: 11,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  dismissBtnPressed: {
    opacity: 0.85,
  },
  dismissBtnText: {
    fontFamily: Fonts.pixel,
    fontSize: 9.5,
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
});
