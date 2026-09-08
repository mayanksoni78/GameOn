import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
} from 'react-native-reanimated';
import { Colors, glassmorphism, elegantShadow } from '../src/theme/colors';
import { Fonts, FontSize } from '../src/theme/typography';
import { Spacing, Radius } from '../src/theme/spacing';
import { CyberBackground } from '../src/components/CyberBackground';
import { GameHeader } from '../src/components/GameHeader';
import { GameOverModal } from '../src/components/GameOverModal';
import { screenWidth } from '../src/utils/dimensions';
import { tapLight, tapMedium, notifySuccess, notifyError } from '../src/utils/haptics';

// ─── Theme ────────────────────────────────────────────────────────────────────
const ACCENT    = '#00E5FF'; // Neon Cyan
const X_COLOR   = '#00E5FF'; // Neon Cyan
const O_COLOR   = '#A855F7'; // Deep Violet
const WIN_COLOR = '#0070FF'; // Electric Blue

// ─── Sizing (account for board border so cells fit exactly) ───────────────────
const BOARD_BORDER = 2;
const MAX_BOARD    = Math.min(screenWidth - 48, 396);           // outer
const BOARD_INNER  = MAX_BOARD - BOARD_BORDER * 2;              // inner content
const CELL_GAP     = 2;                                         // gap between cells
const CELL_SIZE    = Math.floor((BOARD_INNER - CELL_GAP * 2) / 3); // exact fit
const GRID_SIZE    = CELL_SIZE * 3 + CELL_GAP * 2;             // actual grid px

import { useEngine, TicTacToeEngine, PlayerSymbol, GameMode, Difficulty } from '../src/engines';

// ─── AnimatedCell ─────────────────────────────────────────────────────────────
const AnimatedCell = ({
  value, onPress, disabled, isWinCell,
}: {
  value: PlayerSymbol; onPress: () => void; disabled: boolean; isWinCell: boolean;
}) => {
  const scale   = useSharedValue(0);
  const opacity = useSharedValue(0);
  const glow    = useSharedValue(0);

  useEffect(() => {
    if (value) {
      scale.value   = withSpring(1, { damping: 10, stiffness: 220, mass: 0.7 });
      opacity.value = withTiming(1, { duration: 180 });
    } else {
      scale.value   = 0;
      opacity.value = 0;
      glow.value    = 0;
    }
  }, [value]);

  useEffect(() => {
    if (isWinCell) {
      glow.value = withRepeat(
        withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })),
        -1, true,
      );
    }
  }, [isWinCell]);

  const symbolStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const glowBg = useAnimatedStyle(() => ({
    backgroundColor: `rgba(255,215,0,${0.15 * glow.value})`,
  }));

  const color = value === 'X' ? X_COLOR : O_COLOR;

  return (
    <TouchableOpacity
      style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}
      onPress={onPress}
      disabled={disabled || !!value}
      activeOpacity={0.7}
    >
      {isWinCell && <Animated.View style={[StyleSheet.absoluteFill, glowBg]} />}

      {value && (
        <Animated.Text
          style={[
            styles.cellText,
            symbolStyle,
            {
              color: isWinCell ? WIN_COLOR : color,
              textShadowColor: isWinCell ? WIN_COLOR : color,
              textShadowRadius: isWinCell ? 28 : 14,
              textShadowOffset: { width: 0, height: 0 },
            },
          ]}
        >
          {value}
        </Animated.Text>
      )}
    </TouchableOpacity>
  );
};

// ─── SegmentedControl ─────────────────────────────────────────────────────────
function SegmentedControl<T extends string>({
  options, labels, value, onChange, activeColor,
}: {
  options: T[]; labels: string[]; value: T; onChange: (v: T) => void; activeColor: string;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((opt, i) => {
        const active = value === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[
              styles.segItem, 
              active && { 
                backgroundColor: `${activeColor}20`, 
                borderColor: activeColor,
                shadowColor: activeColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 8,
                elevation: 4,
              }
            ]}
            onPress={() => { tapLight(); onChange(opt); }}
            activeOpacity={0.7}
          >
            <Text 
              style={[styles.segText, active && { color: activeColor, textShadowColor: activeColor, textShadowRadius: 10 }]}
            >
              {labels[i]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Main Component (OOP Engine Integration) ──────────────────────────────────
export default function TicTacToe() {
  const [gameState, engine] = useEngine(() => new TicTacToeEngine());

  const {
    board,
    currentPlayer,
    winnerInfo,
    isDraw,
    gameMode,
    difficulty,
    xScore,
    oScore,
  } = gameState;

  const gameOver = engine.isGameOver();

  // Reset Board handler
  const resetBoard = () => {
    tapMedium();
    engine.reset();
  };

  const fullReset = () => {
    engine.resetAll();
  };

  const handlePress = (index: number) => {
    tapLight();
    const moved = engine.makeMove(index);
    if (moved) {
      if (engine.getState().winnerInfo) {
        notifySuccess();
      } else if (engine.getState().isDraw) {
        notifyError();
      }
    }
  };

  // ── Derived UI ────────────────────────────────────────────────────────────
  const winLine = winnerInfo?.line ?? [];
  const turnColor = winnerInfo ? WIN_COLOR : isDraw ? Colors.text.muted : (currentPlayer === 'X' ? X_COLOR : O_COLOR);
  const resultTitle = winnerInfo
    ? gameMode === 'PvE'
      ? winnerInfo.winner === 'X' ? 'YOU WIN!' : 'CPU WINS!'
      : `${winnerInfo.winner} WINS!`
    : isDraw
      ? "IT'S A DRAW!"
      : '';

  const turnLabel = gameOver
    ? resultTitle
    : `${currentPlayer}'S TURN`;


  return (
    <View style={styles.root}>
      <CyberBackground autoScroll />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

        <GameHeader
          title="TIC TAC TOE"
          score={xScore}
          scoreLabel={gameMode === 'PvE' ? 'YOU (X)' : 'PLAYER X'}
          highScore={oScore}
          highScoreLabel={gameMode === 'PvE' ? `CPU (${difficulty[0]}${difficulty.slice(1).toLowerCase()})` : 'PLAYER O'}
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
              <SegmentedControl
                options={['PvP', 'PvE'] as GameMode[]}
                labels={['👤 1v1', '🤖 1v CPU']}
                value={gameMode}
                onChange={m => engine.setGameMode(m)}
                activeColor={ACCENT}
              />
            </View>
            
            {gameMode === 'PvE' && (
              <View style={[styles.settingGroup, { marginTop: Spacing[4] }]}>
                <Text style={styles.settingLabel}>CPU DIFFICULTY</Text>
                <SegmentedControl
                  options={['EASY', 'MEDIUM', 'HARD'] as Difficulty[]}
                  labels={['EASY', 'MEDIUM', 'HARD']}
                  value={difficulty}
                  onChange={d => engine.setDifficulty(d)}
                  activeColor={ACCENT}
                />
              </View>
            )}
          </View>

          {/* ── Turn / Result indicator ───────────────────────── */}
          <View style={styles.turnRow}>
            <Text style={[styles.turnText, { color: turnColor, textShadowColor: turnColor }]}>
              {turnLabel}
            </Text>
          </View>

          {/* ── Board ─────────────────────────────────────────── */}
          <View style={[styles.board, { width: MAX_BOARD, height: MAX_BOARD }]}>
            {/* Grid lines */}
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <View style={[styles.gridLine, { width: CELL_GAP, height: '100%', left: CELL_SIZE }]} />
              <View style={[styles.gridLine, { width: CELL_GAP, height: '100%', left: CELL_SIZE * 2 + CELL_GAP }]} />
              <View style={[styles.gridLine, { width: '100%', height: CELL_GAP, top: CELL_SIZE }]} />
              <View style={[styles.gridLine, { width: '100%', height: CELL_GAP, top: CELL_SIZE * 2 + CELL_GAP }]} />
            </View>

            {/* Cells */}
            <View style={styles.grid}>
              {board.map((cell: any, index: number) => (
                <AnimatedCell
                  key={index}
                  value={cell}
                  onPress={() => handlePress(index)}
                  disabled={gameOver || (gameMode === 'PvE' && currentPlayer !== 'X')}
                  isWinCell={winLine.includes(index)}
                />
              ))}
            </View>
          </View>

          {/* ── Reset Scores ──────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.resetBtn, glassmorphism()]}
            onPress={fullReset}
            activeOpacity={0.8}
          >
            <Text style={styles.resetBtnText}>RESET SCORES</Text>
          </TouchableOpacity>

        </ScrollView>

        {/* ── Game Over Modal ───────────────────────────────── */}
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  safe: { flex: 1 },

  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[10],
    gap: Spacing[4],
  },

  // Settings Panel
  settingsPanel: {
    width: '100%',
    padding: Spacing[4],
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(20, 10, 40, 0.65)',
    borderWidth: 1,
    borderColor: `${ACCENT}40`,
  },
  settingGroup: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing[2],
  },
  settingLabel: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
    letterSpacing: 2,
    marginBottom: Spacing[1],
  },

  // Segmented
  segmented: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing[2],
  },
  segItem: {
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[5],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.full,
  },
  segText: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
    letterSpacing: 0.5,
  },

  // Scores
  scoreRow: {
    flexDirection: 'row',
    width: '100%',
    gap: Spacing[3],
    alignItems: 'center',
  },
  scoreCard: {
    flex: 1,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[2],
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  scoreLabel: {
    fontFamily: Fonts.heading,
    fontSize: 9,
    marginBottom: 2,
    letterSpacing: 1,
  },
  scoreNum: {
    fontFamily: Fonts.heading,
    fontSize: FontSize['2xl'],
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  midBtn: {
    width: 46,
    height: 46,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  midBtnText: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.xl,
    color: Colors.text.secondary,
  },

  // Turn
  turnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    height: 24,
  },
  turnText: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.sm,
    letterSpacing: 2,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  aiPulse: {
    width: 8, height: 8, borderRadius: 4,
  },

  // Board
  board: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(8, 4, 18, 0.85)',
    borderWidth: BOARD_BORDER,
    borderColor: `${ACCENT}40`,
    ...elegantShadow(0.6, 35, 18),
    shadowColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: `${ACCENT}40`,
  },
  grid: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CELL_GAP,
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cellText: {
    fontFamily: Fonts.heading,
    fontSize: CELL_SIZE * 0.52,
  },

  // Reset
  resetBtn: {
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[8],
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: `${O_COLOR}30`,
  },
  resetBtnText: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
    letterSpacing: 2,
  },
});
