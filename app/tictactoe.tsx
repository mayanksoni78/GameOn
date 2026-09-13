import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { Colors, glassmorphism, elegantShadow } from '../src/theme/colors';
import { Fonts, FontSize } from '../src/theme/typography';
import { Spacing, Radius } from '../src/theme/spacing';
import { CyberBackground } from '../src/components/CyberBackground';
import { GameHeader } from '../src/components/GameHeader';
import { GameOverModal } from '../src/components/GameOverModal';
import { tapLight, tapMedium, notifySuccess, notifyError } from '../src/utils/haptics';

// ─── Theme ────────────────────────────────────────────────────────────────────
const ACCENT    = '#00E5FF'; // Neon Cyan
const X_COLOR   = '#00E5FF'; // Neon Cyan
const O_COLOR   = '#FF2A6D'; // Neon Hot Pink
const WIN_COLOR = '#FFE600'; // Electric Gold
const BOARD_BORDER = 2;
const CELL_GAP     = 2;

import { useEngine, TicTacToeEngine, PlayerSymbol, GameMode, Difficulty } from '../src/engines';

// ─── AnimatedCell ─────────────────────────────────────────────────────────────
const AnimatedCell = ({
  value, onPress, disabled, isWinCell, cellSize,
}: {
  value: PlayerSymbol; onPress: () => void; disabled: boolean; isWinCell: boolean; cellSize: number;
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
    backgroundColor: `rgba(255,230,0,${0.2 * glow.value})`,
  }));

  const color = value === 'X' ? X_COLOR : O_COLOR;

  return (
    <TouchableOpacity
      style={[styles.cell, { width: cellSize, height: cellSize }]}
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
              fontSize: cellSize * 0.50,
              color: isWinCell ? WIN_COLOR : color,
              textShadowColor: isWinCell ? WIN_COLOR : color,
              textShadowRadius: isWinCell ? 20 : 10,
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
  const { width } = useWindowDimensions();

  const maxBoard = Math.min(width - 48, 380);
  const boardInner = maxBoard - BOARD_BORDER * 2;
  const cellSize = Math.floor((boardInner - CELL_GAP * 2) / 3);
  const gridSize = cellSize * 3 + CELL_GAP * 2;

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
    tapMedium();
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
      <CyberBackground theme="tictactoe" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

        <GameHeader
          title="TIC TAC TOE"
          category="BOARD"
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
          <View style={[styles.board, { width: maxBoard, height: maxBoard }]}>
            {/* Grid lines */}
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <View style={[styles.gridLine, { width: CELL_GAP, height: '100%', left: cellSize }]} />
              <View style={[styles.gridLine, { width: CELL_GAP, height: '100%', left: cellSize * 2 + CELL_GAP }]} />
              <View style={[styles.gridLine, { width: '100%', height: CELL_GAP, top: cellSize }]} />
              <View style={[styles.gridLine, { width: '100%', height: CELL_GAP, top: cellSize * 2 + CELL_GAP }]} />
            </View>

            {/* Cells */}
            <View style={[styles.grid, { width: gridSize, height: gridSize }]}>
              {board.map((cell: any, index: number) => (
                <AnimatedCell
                  key={index}
                  value={cell}
                  onPress={() => handlePress(index)}
                  disabled={gameOver || (gameMode === 'PvE' && currentPlayer !== 'X')}
                  isWinCell={winLine.includes(index)}
                  cellSize={cellSize}
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
  root: { flex: 1, backgroundColor: 'transparent' },
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

  // Segmented
  segmented: {
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
    width: 44,
    height: 44,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161522',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  midBtnText: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.lg,
    color: '#F4F4F5',
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
  },
  aiPulse: {
    width: 8, height: 8, borderRadius: 4,
  },

  // Board
  board: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#12111A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  grid: {
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
  },

  // Reset
  resetBtn: {
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[6],
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: '#161522',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  resetBtnText: {
    fontFamily: Fonts.heading,
    fontSize: FontSize['2xs'],
    color: '#F4F4F5',
    letterSpacing: 1.5,
  },
});
