import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Href } from 'expo-router';
import { Colors } from '../src/theme/colors';
import { Fonts, FontSize } from '../src/theme/typography';
import { Spacing } from '../src/theme/spacing';
import { AnimatedBackground } from '../src/components/AnimatedBackground';
import { PremiumGameCard } from '../src/components/PremiumGameCard';
import { IconId } from '../src/components/PremiumIcon';

const GAMES: {
  id: IconId;
  title: string;
  subtitle: string;
  route: Href;
  accent: string;
}[] = [
  { id: 'snake', title: 'Snake', subtitle: 'Classic directional eating game.', route: '/snake', accent: Colors.accent.success },
  { id: 'tetris', title: 'Tetris', subtitle: 'Block puzzle masterpiece.', route: '/tetris', accent: Colors.accent.secondary },
  { id: '2048', title: '2048', subtitle: 'Combine tiles to reach 2048.', route: '/game2048', accent: Colors.accent.warning },
  { id: 'tictactoe', title: 'Tic Tac', subtitle: 'Strategic X and O battles.', route: '/tictactoe', accent: Colors.accent.primary },
  { id: 'flappybird', title: 'Flappy', subtitle: 'Navigate through the obstacles.', route: '/flappybird', accent: Colors.accent.danger },
  { id: 'connect4', title: 'Connect 4', subtitle: 'Drop pieces to form a line of 4.', route: '/connect4', accent: '#FF3D71' },
  { id: 'bingo', title: 'Bingo', subtitle: 'Race against time to clear lines.', route: '/bingo', accent: '#D500F9' },
  { id: 'sudoku', title: 'Sudoku', subtitle: 'Classic logic-based number puzzle.', route: '/sudoku', accent: '#2979FF' },
  { id: 'dinojump', title: 'Dino Jump', subtitle: 'Endless runner survival.', route: '/dinojump', accent: '#00E676' },
  { id: 'blockoduko', title: 'Block', subtitle: 'Wood block puzzle logic.', route: '/blockoduko', accent: '#7C3AED' },
];

export default function Home() {
  return (
    <View style={styles.root}>
      <AnimatedBackground />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Text style={styles.logoText}>GameOn</Text>
            <Text style={styles.subtitleText}>ARCADE COLLECTION</Text>
          </View>

          {/* Featured Label */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>LIBRARY</Text>
            <View style={styles.sectionLine} />
          </View>

          {/* Game List */}
          <View style={styles.grid}>
            {GAMES.map((game, index) => (
              <View key={game.id} style={styles.gridItem}>
                <PremiumGameCard
                  id={game.id}
                  title={game.title}
                  subtitle={game.subtitle}
                  route={game.route}
                  accentColor={game.accent}
                  delay={index * 50}
                />
              </View>
            ))}
          </View>

          {Platform.OS === 'web' && (
             <Text style={styles.footerNote}>
               Desktop mode: Use Arrow Keys or WASD for supported games.
             </Text>
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  safe: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing[5],
    paddingBottom: Spacing[10],
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: Spacing[10],
  },
  logoText: {
      fontFamily: Fonts.heading,
      fontSize: FontSize['4xl'],
      color: Colors.white,
      marginBottom: Spacing[2],
  },
  subtitleText: {
      fontFamily: Fonts.heading,
      fontSize: FontSize.xs,
      color: Colors.text.muted,
      letterSpacing: 2,
  },
  
  // Sections
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[6],
    gap: Spacing[4],
  },
  sectionTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    letterSpacing: 2,
  },
  sectionLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.bg.glassBorder,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginHorizontal: 'auto',
    maxWidth: 800,
  },
  gridItem: {
    width: Platform.OS === 'web' && Dimensions.get('window').width > 600 ? '48%' : '100%',
    marginBottom: Spacing[4],
  },
  footerNote: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
    textAlign: 'center',
    marginTop: Spacing[8],
  }
});