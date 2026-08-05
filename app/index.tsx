import React, { useCallback } from 'react';
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
import { IconId } from '../src/components/PremiumIcon';

const GAMES: {
  id: IconId;
  title: string;
  subtitle: string;
  route: Href;
  accent: string;
}[] = [
  { id: 'snake',      title: 'Snake',      subtitle: 'Classic directional eating game.',   route: '/snake',       accent: '#00E676' },
  { id: 'tetris',     title: 'Tetris',     subtitle: 'Block puzzle masterpiece.',          route: '/tetris',      accent: '#B300FF' },
  { id: '2048',       title: '2048',       subtitle: 'Combine tiles to reach 2048.',       route: '/game2048',    accent: '#FFB300' },
  { id: 'tictactoe',  title: 'Tic Tac',   subtitle: 'Strategic X and O battles.',         route: '/tictactoe',   accent: '#00E5FF' },
  { id: 'flappybird', title: 'Flappy',     subtitle: 'Navigate through the obstacles.',    route: '/flappybird',  accent: '#FF4081' },
  { id: 'connect4',   title: 'Connect 4',  subtitle: 'Drop pieces to form a line of 4.',  route: '/connect4',    accent: '#FF3D71' },
  { id: 'bingo',      title: 'Tom & Jerry',subtitle: 'Collect cheese, dodge Tom!',         route: '/tomandjerry', accent: '#3DD6D0' },
  { id: 'sudoku',     title: 'Sudoku',     subtitle: 'Classic logic-based number puzzle.', route: '/sudoku',      accent: '#2979FF' },
  { id: 'dinojump',   title: 'Dino Jump',  subtitle: 'Endless runner survival.',           route: '/dinojump',    accent: '#69FF47' },
  { id: 'blockoduko', title: 'Block',      subtitle: 'Wood block puzzle logic.',           route: '/blockoduko',  accent: '#7C3AED' },
];

export default function Home() {
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
            {GAMES.map((game, index) => (
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
