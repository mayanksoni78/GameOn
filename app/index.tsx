import React, { useState, useEffect, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/theme/colors';
import { Fonts, FontSize } from '../src/theme/typography';
import { ThemedGameBackground } from '../src/components/ThemedGameBackground';
import { GameCard } from '../src/components/GameCard';
import { GameCatalogService, GameDefinition } from '../src/services/GameCatalogService';
import { LinearGradient } from 'expo-linear-gradient';

const CATEGORIES = ['ALL', 'ARCADE', 'PUZZLE', 'BOARD', 'ACTION'] as const;
type CategoryTab = typeof CATEGORIES[number];

const CONTENT_MAX_W = 1200;

export default function Home() {
  const allGames = useMemo(() => GameCatalogService.getInstance().getAllGames(), []);
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('ALL');
  const [highScores, setHighScores] = useState<Record<string, number>>({});
  const { width } = useWindowDimensions();

  // Load persistent high scores
  useEffect(() => {
    const fetchScores = async () => {
      try {
        const keys = allGames.map((g) => g.highScoreKey);
        const pairs = await AsyncStorage.multiGet(keys);
        const scores: Record<string, number> = {};
        pairs.forEach(([k, v]) => {
          if (v) scores[k] = parseInt(v, 10) || 0;
        });
        setHighScores(scores);
      } catch (e) {
        // Safe fallback
      }
    };
    fetchScores();
  }, [allGames]);

  // Filter games by category
  const filteredGames = useMemo(() => {
    if (activeCategory === 'ALL') return allGames;
    return allGames.filter((g) => g.category.toUpperCase() === activeCategory);
  }, [allGames, activeCategory]);

  const isMobile = width < 560;
  const isTabletOrDesktop = width >= 768;
  const HORIZONTAL_PAD = isMobile ? 12 : 24;
  const GUTTER = isMobile ? 12 : 16;
  const contentWidth = Math.min(width - HORIZONTAL_PAD * 2, CONTENT_MAX_W);

  // Balanced column calculation matching compact game cards
  const numCols = (() => {
    if (contentWidth >= 1040) return 4; // ~270-290px wide cards
    if (contentWidth >= 760) return 3;  // ~230-250px wide cards
    if (contentWidth >= 500) return 2;  // ~220-240px wide cards
    return 1;                           // Mobile full-width
  })();

  const cardWidth = Math.floor((contentWidth - GUTTER * (numCols - 1)) / numCols);

  return (
    <View style={styles.root}>
      <ThemedGameBackground theme="arcade" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Top Navbar — Pure Centered GAMEON Marquee */}
        <View style={[styles.navbarOuter, { paddingHorizontal: HORIZONTAL_PAD }]}>
          <View style={[styles.navbarInner, { maxWidth: CONTENT_MAX_W }]}>
            <View style={styles.brandGroup}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoText}>GAMEON</Text>
              </View>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: HORIZONTAL_PAD, alignItems: 'center' }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: contentWidth }}>
            {/* Crazy-but-Elegant Arcade Launcher Hero Marquee */}
            <View style={styles.heroBanner}>
              {/* Corner Rivet Accents */}
              <View style={[styles.cornerRivet, styles.cornerTopLeft]}><Text style={styles.cornerRivetText}>+</Text></View>
              <View style={[styles.cornerRivet, styles.cornerTopRight]}><Text style={styles.cornerRivetText}>+</Text></View>
              <View style={[styles.cornerRivet, styles.cornerBottomLeft]}><Text style={styles.cornerRivetText}>+</Text></View>
              <View style={[styles.cornerRivet, styles.cornerBottomRight]}><Text style={styles.cornerRivetText}>+</Text></View>

              <View style={styles.heroContent}>
                {/* Micro Header Row */}
                <View style={styles.heroMicroHeader}>
                  <View style={styles.heroStatusTag}>
                    <Text style={styles.heroStatusTagText}>[ CARTRIDGE SYSTEM ]</Text>
                  </View>
                  <Text style={styles.heroCreditText}>CREDIT: 02</Text>
                </View>

                {/* Hero Title in High-Contrast Pixel Typography */}
                <Text style={styles.heroTitle}>
                  CLASSIC ARCADE <Text style={styles.heroTitleAccent}>REIMAGINED</Text>
                </Text>

                {/* Punchy Arcade Subtitle Prompt */}
                <View style={styles.heroSubtitleRow}>
                  <Text style={styles.heroSubtitleText}>
                    SELECT A CARTRIDGE • INSERT COIN [ 25¢ ]
                  </Text>
                </View>
              </View>
            </View>

            {/* Symmetrical Category Navigation */}
            <View style={styles.categorySection}>
              <View style={styles.categoryTabs}>
                {CATEGORIES.map((cat) => {
                  const isActive = activeCategory === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setActiveCategory(cat)}
                      style={[
                        styles.catTab,
                        isActive && styles.catTabActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.catTabText,
                          isActive && styles.catTabTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.gameCountNotice}>
                CATALOG: {filteredGames.length}/{allGames.length}
              </Text>
            </View>

            {/* Symmetrical Grid of Game Cards */}
            <View style={[styles.grid, { gap: GUTTER }]}>
              {filteredGames.map((game) => (
                <GameCard
                  key={game.id}
                  id={game.id}
                  title={game.title}
                  route={game.route}
                  accentColor={game.accent}
                  image={game.image}
                  cardWidth={cardWidth}
                  category={game.category}
                  players={game.players}
                />
              ))}
            </View>

          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  safe: {
    flex: 1,
  },
  // ── Header Navbar ─────────────────────────────────────────────────────────────
  navbarOuter: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#0E0D16',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 14,
    zIndex: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  navbarInner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141320',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderTopColor: 'rgba(255, 255, 255, 0.20)',
    borderBottomColor: 'rgba(0, 0, 0, 0.6)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  blinkingDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    shadowOpacity: 0.9,
  },
  logoText: {
    fontFamily: Fonts.pixel,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: 2.5,
    textShadowColor: 'rgba(167, 139, 250, 0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  navStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141320',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  statusLed: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    opacity: 0.9,
  },
  statusText: {
    fontFamily: Fonts.pixel,
    fontSize: 8,
    color: '#CBD5E1',
    letterSpacing: 0.8,
  },
  // ── Scroll Content ────────────────────────────────────────────────────────────
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 48,
  },
  // ── Hero Arcade Launcher Banner ───────────────────────────────────────────────
  heroBanner: {
    width: '100%',
    backgroundColor: '#11101A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    borderTopColor: 'rgba(255, 255, 255, 0.14)',
    borderBottomColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 18,
    paddingHorizontal: 22,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
  cornerRivet: {
    position: 'absolute',
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    opacity: 0.35,
  },
  cornerTopLeft: { top: 4, left: 6 },
  cornerTopRight: { top: 4, right: 6 },
  cornerBottomLeft: { bottom: 4, left: 6 },
  cornerBottomRight: { bottom: 4, right: 6 },
  cornerRivetText: {
    fontFamily: Fonts.pixel,
    fontSize: 8,
    color: '#A1A1AA',
  },
  heroContent: {
    flex: 1,
    zIndex: 2,
    justifyContent: 'center',
  },
  heroMicroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  heroStatusTag: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.28)',
  },
  heroStatusTagText: {
    fontFamily: Fonts.pixel,
    fontSize: 7.5,
    color: '#C4B5FD',
    letterSpacing: 0.8,
  },
  heroCreditText: {
    fontFamily: Fonts.pixel,
    fontSize: 7.5,
    color: '#FBBF24',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontFamily: Fonts.pixel,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 1.2,
    lineHeight: 22,
    marginBottom: 8,
  },
  heroTitleAccent: {
    color: '#A78BFA',
  },
  heroSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroSubtitleText: {
    fontFamily: Fonts.pixel,
    fontSize: 8.5,
    color: '#94A3B8',
    letterSpacing: 0.8,
    lineHeight: 14,
  },
  // ── Arcade Control Cluster (Right Side Accent) ────────────────────────────────
  arcadeCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingLeft: 18,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.08)',
  },
  dpadBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadUp: {
    width: 18,
    height: 14,
    backgroundColor: '#1F1D2C',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dpadMid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dpadCore: {
    width: 14,
    height: 14,
    backgroundColor: '#181622',
  },
  dpadDown: {
    width: 18,
    height: 14,
    backgroundColor: '#1F1D2C',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dpadIcon: {
    fontFamily: Fonts.pixel,
    fontSize: 6,
    color: '#71717A',
  },
  arcadeBtnGroup: {
    gap: 6,
  },
  arcadeBtnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  arcadeBtn: {
    width: 12,
    height: 12,
    borderRadius: 6,
    opacity: 0.85,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  // ── Categories ────────────────────────────────────────────────────────────────
  categorySection: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  catTab: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 5,
    backgroundColor: '#141320',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  catTabActive: {
    backgroundColor: '#222035',
    borderColor: 'rgba(139, 92, 246, 0.60)',
  },
  catTabText: {
    fontFamily: Fonts.pixel,
    fontSize: 8,
    color: '#71717A',
    letterSpacing: 0.6,
  },
  catTabTextActive: {
    color: '#FFFFFF',
  },
  gameCountNotice: {
    fontFamily: Fonts.pixel,
    fontSize: 7.5,
    color: '#71717A',
    letterSpacing: 0.8,
  },
  // ── Grid & Footer ─────────────────────────────────────────────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
});

