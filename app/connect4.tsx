import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors, glassmorphism, elegantShadow } from '../src/theme/colors';
import { Fonts, FontSize } from '../src/theme/typography';
import { Spacing, Radius } from '../src/theme/spacing';
import { CyberBackground } from '../src/components/CyberBackground';
import { GameHeader } from '../src/components/GameHeader';
import { GameOverModal } from '../src/components/GameOverModal';
import { tapLight, tapMedium, notifySuccess, notifyError } from '../src/utils/haptics';

// ── Constants ─────────────────────────────────────────────────────────────────
const ROWS = 6;
const COLS = 7;
const ACCENT     = '#00E5FF'; // Neon Cyan
const P1_COLOR   = '#FF1744';  // Neon Red
const P2_COLOR   = '#FFD600';  // Electric Yellow
const BOARD_PAD  = 48;

type Player     = 1 | 2;
type Board      = (Player | null)[][];
type GameMode   = 'PvP' | 'PvE';
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

import { useEngine, Connect4Engine, Connect4Player, Connect4Cell } from '../src/engines';


// ── Animated Disc ─────────────────────────────────────────────────────────────
const AnimatedDisc = ({ player, isWinCell, discSize }: { player: Player | null; isWinCell: boolean; discSize: number }) => {
  const translateY = useSharedValue(-400);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (player) {
      translateY.value = withSpring(0, { damping: 14, stiffness: 150, mass: 0.9 });
    } else {
      translateY.value = -400;
    }
  }, [player]);

  useEffect(() => {
    if (isWinCell) {
      glow.value = withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1, true);
    }
  }, [isWinCell]);

  const dropStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: isWinCell ? 0.4 + glow.value * 0.5 : 0.4,
    shadowRadius: isWinCell ? 6 + glow.value * 10 : 6,
  }));

  if (!player) return null;

  const color = player === 1 ? P1_COLOR : P2_COLOR;

  return (
    <Animated.View style={[styles.disc, dropStyle, glowStyle, {
      width: discSize,
      height: discSize,
      backgroundColor: color,
      shadowColor: color,
      shadowOffset: { width: 0, height: 2 },
      borderColor: isWinCell ? '#FFD700' : `${color}80`,
    }]}>
      {/* 3D highlight */}
      <View style={{ position: 'absolute', top: 3, left: 4, width: '40%', height: '30%', backgroundColor: 'rgba(255,255,255,0.45)', borderRadius: 20 }} />
    </Animated.View>
  );
};

// ── Segment Control ─────────────────────────────────────────────────────────
function Seg<T extends string>({ options, labels, value, onChange, color }: {
  options: T[]; labels: string[]; value: T; onChange: (v: T) => void; color: string;
}) {
  return (
    <View style={styles.seg}>
      {options.map((o, i) => {
        const active = value === o;
        return (
          <TouchableOpacity 
            key={o} 
            style={[
              styles.segItem, 
              active && { 
                backgroundColor: `${color}20`, 
                borderColor: color,
                shadowColor: color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 8,
                elevation: 4,
              }
            ]}
            onPress={() => { tapLight(); onChange(o); }} 
            activeOpacity={0.7}
          >
            <Text 
              style={[styles.segText, active && { color, textShadowColor: color, textShadowRadius: 10 }]}
            >
              {labels[i]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Connect4() {
  const [gameState, engine] = useEngine(() => new Connect4Engine());
  const { width } = useWindowDimensions();

  const maxBoardWidth = Math.min(width - BOARD_PAD, 480);
  const cellSize = Math.floor(maxBoardWidth / COLS);
  const discSize = cellSize - 8;

  const {
    board,
    currentPlayer,
    winner,
    isDraw,
    winningPositions,
    p1Score,
    p2Score,
    gameMode,
    difficulty,
  } = gameState;

  const gameOver = engine.isGameOver();

  const resetBoard = () => {
    tapMedium();
    engine.reset();
  };

  const fullReset = () => {
    tapMedium();
    engine.resetAll();
  };

  const handleDrop = (col: number) => {
    if (gameOver) return;
    if (gameMode === 'PvE' && currentPlayer === 2) return;

    tapLight();
    const dropped = engine.dropPiece(col);
    if (dropped) {
      if (engine.getState().winner) {
        notifySuccess();
      } else if (engine.getState().isDraw) {
        notifyError();
      }
    }
  };

  // Winning cells set
  const winCells = new Set<string>();
  for (const pos of winningPositions) {
    winCells.add(`${pos.row}-${pos.col}`);
  }

  const turnColor = currentPlayer === 1 ? P1_COLOR : P2_COLOR;
  const resultTitle = winner
    ? gameMode === 'PvE'
      ? winner === 1 ? 'YOU WIN!' : 'CPU WINS!'
      : `PLAYER ${winner} WINS!`
    : isDraw
      ? "IT'S A DRAW!"
      : '';

  const turnLabel = gameOver
    ? resultTitle
    : `${gameMode === 'PvE' && currentPlayer === 1 ? 'YOUR' : `P${currentPlayer}'S`} TURN`;


  return (
    <View style={styles.root}>
      <CyberBackground theme="connect4" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

        <GameHeader
          title="CONNECT 4"
          category="BOARD"
          score={p1Score}
          scoreLabel={gameMode === 'PvE' ? 'YOU (P1)' : 'PLAYER 1'}
          highScore={p2Score}
          highScoreLabel={gameMode === 'PvE' ? `CPU` : 'PLAYER 2'}
          accentColor={ACCENT}
          onBack={() => router.replace('/')}
          rightContent={
            <TouchableOpacity
              style={[styles.midBtn, glassmorphism(), { width: 44, height: 44 }]}
              onPress={resetBoard}
              activeOpacity={0.8}
            >
              <Text style={styles.midBtnText}>↺</Text>
            </TouchableOpacity>
          }
        />

        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          bounces={false}
        >

          {/* ── Settings Panel ──────────────────────────────────── */}
          <View style={[styles.settingsPanel, glassmorphism()]}>
            <View style={styles.settingGroup}>
              <Text style={styles.settingLabel}>GAME MODE</Text>
              <Seg options={['PvP','PvE'] as GameMode[]} labels={['👤 1v1','🤖 1v CPU']} value={gameMode} onChange={m => engine.setGameMode(m)} color={ACCENT} />
            </View>
            
            {gameMode === 'PvE' && (
              <View style={[styles.settingGroup, { marginTop: Spacing[4] }]}>
                <Text style={styles.settingLabel}>CPU DIFFICULTY</Text>
                <Seg options={['EASY','MEDIUM','HARD'] as Difficulty[]} labels={['EASY','MEDIUM','HARD']} value={difficulty} onChange={d => engine.setDifficulty(d)} color={ACCENT} />
              </View>
            )}
          </View>

          {/* ── Turn Indicator ─── */}
          <View style={styles.turnRow}>
            <View style={[styles.turnDot, { backgroundColor: turnColor }]} />
            <Text style={[styles.turnText, { color: turnColor, textShadowColor: turnColor }]}>{turnLabel}</Text>
          </View>

          {/* ── Board ─── */}
          <View style={[styles.boardFrame, glassmorphism()]}>
            <View style={styles.boardGrid}>
              {Array.from({ length: COLS }).map((_, c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.column, { width: cellSize }]}
                  onPress={() => handleDrop(c)}
                  disabled={gameOver || (gameMode === 'PvE' && currentPlayer === 2)}
                  activeOpacity={0.85}
                >
                  {board.map((row, r) => (
                    <View key={`${r}-${c}`} style={[styles.cellOuter, { width: cellSize, height: cellSize }]}>
                      <View style={[styles.cellHole, winCells.has(`${r}-${c}`) && { borderColor: '#FFD70080' }]}>
                        <AnimatedDisc player={row[c] === 0 ? null : (row[c] as Player)} isWinCell={winCells.has(`${r}-${c}`)} discSize={discSize} />
                      </View>
                    </View>
                  ))}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Reset Scores ─── */}
          <TouchableOpacity style={[styles.resetBtn, glassmorphism()]} onPress={fullReset} activeOpacity={0.8}>
            <Text style={styles.resetBtnText}>RESET SCORES</Text>
          </TouchableOpacity>

        </ScrollView>

        <GameOverModal
          visible={gameOver}
          title={resultTitle || 'GAME OVER'}
          score={isDraw ? '—' : '+1'}
          accentColor={turnColor}
          onRestart={resetBoard}
          onHome={() => { fullReset(); router.replace('/'); }}
        />
      </SafeAreaView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  safe: { flex: 1 },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[10],
    gap: Spacing[3],
  },

  // Settings Panel
  settingsPanel: {
    width: '100%',
    padding: Spacing[4],
    borderRadius: 8,
    backgroundColor: '#12111A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  settingGroup: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing[2],
  },
  settingLabel: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.xs,
    color: '#94A3B8',
    letterSpacing: 2,
    marginBottom: Spacing[1],
  },
  seg: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing[2],
  },
  segItem: {
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    backgroundColor: '#161522',
  },
  segText: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.xs,
    color: '#94A3B8',
    letterSpacing: 0.5,
  },

  // Score
  scoreRow: { flexDirection: 'row', width: '100%', gap: Spacing[3], alignItems: 'center' },
  scoreCard: { flex: 1, paddingVertical: Spacing[3], paddingHorizontal: Spacing[2], borderRadius: Radius.md, alignItems: 'center', borderWidth: 1.5 },
  scoreLabel: { fontFamily: Fonts.heading, fontSize: 9, marginBottom: 2, letterSpacing: 1 },
  scoreNum: { fontFamily: Fonts.heading, fontSize: FontSize['2xl'], textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
  midBtn: {
    width: 44,
    height: 44,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: '#161522',
  },
  midBtnText: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.lg,
    color: '#F4F4F5',
  },

  // Turn
  turnRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], height: 24 },
  turnDot: { width: 10, height: 10, borderRadius: 5 },
  turnText: { fontFamily: Fonts.heading, fontSize: FontSize.sm, letterSpacing: 2 },

  // Board
  boardFrame: {
    padding: Spacing[2],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    backgroundColor: '#12111A',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  boardGrid: {
    flexDirection: 'row',
    backgroundColor: '#161522',
    borderRadius: 6,
    padding: 4,
    overflow: 'hidden',
  },
  column: {
    alignItems: 'center',
  },
  cellOuter: {
    padding: 3,
  },
  cellHole: {
    flex: 1,
    borderRadius: 100,
    backgroundColor: '#09080E',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  disc: {
    borderRadius: 100,
    borderWidth: 2,
  },

  // Reset
  resetBtn: {
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[6],
    borderRadius: 6,
    backgroundColor: '#161522',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  resetBtnText: {
    fontFamily: Fonts.heading,
    fontSize: FontSize['2xs'],
    color: ACCENT,
    letterSpacing: 2,
    textShadowColor: ACCENT,
    textShadowRadius: 6,
  },
});
