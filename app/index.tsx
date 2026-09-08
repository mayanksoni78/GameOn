import React, { useCallback, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Href } from 'expo-router';
import { Colors } from '../src/theme/colors';
import { Fonts, FontSize } from '../src/theme/typography';
import { Spacing } from '../src/theme/spacing';
import { CyberBackground } from '../src/components/CyberBackground';
import { PremiumGameCard } from '../src/components/PremiumGameCard';
import { GameCatalogService } from '../src/services/GameCatalogService';

export default function Home() {
  const games = useMemo(() => GameCatalogService.getInstance().getAllGames(), []);
  const { width } = useWindowDimensions();

  // Responsive column logic
  const numCols = (() => {
    if (Platform.OS === 'web') {
      if (width > 1400) return 5;
      if (width > 1000) return 4;
      if (width > 680)  return 3;
      return 2;
    }
    return width > 600 ? 3 : 2; // Tablet gets 3 columns
  })();

  const isMobile = width < 480;
  const GUTTER    = isMobile ? 10 : 14;
  const SIDE_PAD  = isMobile ? 12 : 20;
  const maxW      = Math.min(width, 1400);
  const cardWidth = Math.floor((maxW - SIDE_PAD * 2 - GUTTER * (numCols - 1)) / numCols);

  return (
    <View style={styles.root}>
      <CyberBackground autoScroll />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: SIDE_PAD }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.heroSection}>
            <Text style={styles.logoText}>GameOn</Text>
            <Text style={styles.subtitleText}>ARCADE COLLECTION</Text>
          </View>

          {/* Section header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>LIBRARY</Text>
            <View style={styles.sectionLine} />
          </View>

          {/* Responsive grid */}
          <View style={[styles.grid, { gap: GUTTER }]}>
            {games.map((game, index) => (
              <PremiumGameCard
                key={game.id}
                id={game.id}
                title={game.title}
                subtitle={game.subtitle}
                route={game.route}
                accentColor={game.accent}
                delay={index * 40}
                cardWidth={cardWidth}
              />
            ))}
          </View>

          {Platform.OS === 'web' && (
            <Text style={styles.footerNote}>
              Desktop: Use Arrow Keys or WASD for supported games.
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  safe: { flex: 1 },
  scrollContent: {
    paddingBottom: Spacing[10],
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginTop: Spacing[8],
    marginBottom: Spacing[6],
  },
  logoText: {
    fontFamily: Fonts.heading,
    fontSize: FontSize['4xl'],
    color: Colors.white,
    marginBottom: Spacing[1],
  },
  subtitleText: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
    letterSpacing: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[5],
    width: '100%',
    gap: Spacing[3],
  },
  sectionTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    letterSpacing: 3,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  footerNote: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
    textAlign: 'center',
    marginTop: Spacing[8],
  },
});
