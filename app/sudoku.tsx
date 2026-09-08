import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence } from 'react-native-reanimated';
import { Colors, glassmorphism, elegantShadow } from '../src/theme/colors';
import { Fonts, FontSize } from '../src/theme/typography';
import { Spacing, Radius } from '../src/theme/spacing';
import { CyberBackground } from '../src/components/CyberBackground';
import { GameHeader } from '../src/components/GameHeader';
import { GameOverModal } from '../src/components/GameOverModal';
import { screenWidth } from '../src/utils/dimensions';
import { tapLight, tapMedium, notifySuccess, notifyError } from '../src/utils/haptics';
import { useKeyboard } from '../src/hooks/useKeyboard';

const ACCENT_BLUE = '#38BDF8';
const ACCENT_PURPLE = '#A855F7';
const BORDER_PURPLE = '#6B21A8';
const DARK_BLUE_BG = '#080F1E';
const PANEL_BG = 'rgba(17, 24, 45, 0.8)';
const BOARD_BG = 'rgba(11, 15, 28, 0.95)';
const DANGER = '#FB7185';
const SUCCESS = '#34D399';
const WARNING = '#FBBF24';

const SEED_BOARD = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

const DIFF_COLORS: Record<SudokuDifficulty, string> = { EASY: SUCCESS, MEDIUM: WARNING, HARD: ACCENT_PURPLE };

function SegmentedControl({
  options,
  labels,
  value,
  onChange,
  activeColor,
}: {
  options: SudokuDifficulty[];
  labels: string[];
  value: SudokuDifficulty;
  onChange: (val: SudokuDifficulty) => void;
  activeColor: string;
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
                shadowOpacity: 0.5,
                shadowRadius: 6,
                elevation: 3,
              }
            ]}
            onPress={() => { tapLight(); onChange(opt); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.segText, active && { color: activeColor, textShadowColor: activeColor, textShadowRadius: 8 }]}>
              {labels[i]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function SudokuCell({
  cell,
  r,
  c,
  cellSize,
  isSelected,
  isHighlight,
  isRelated,
  onPress,
}: {
  cell: any;
  r: number;
  c: number;
  cellSize: number;
  isSelected: boolean;
  isHighlight: boolean;
  isRelated: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (cell.isError) {
      shake.value = withSequence(
        withTiming(-4, { duration: 50 }),
        withTiming(4, { duration: 50 }),
        withTiming(-4, { duration: 50 }),
        withTiming(4, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [cell.isError]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: shake.value }
    ],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.92, { duration: 50 }),
      withSpring(1, { damping: 14, stiffness: 300 })
    );
    onPress();
  };

  const borderRight = (c === 2 || c === 5) ? 2 : 0.5;
  const borderBottom = (r === 2 || r === 5) ? 2 : 0.5;
  const borderRightColor = (c === 2 || c === 5) ? BORDER_PURPLE : 'rgba(255,255,255,0.06)';
  const borderBottomColor = (r === 2 || r === 5) ? BORDER_PURPLE : 'rgba(255,255,255,0.06)';

  let bgColor = 'transparent';
  if (isSelected) bgColor = `${ACCENT_BLUE}40`;
  else if (isHighlight) bgColor = `${ACCENT_BLUE}15`;
  else if (isRelated) bgColor = `${ACCENT_PURPLE}15`;

  return (
    <Animated.View style={[animatedStyle, {
      width: cellSize, height: cellSize,
      borderRightWidth: borderRight, borderRightColor,
      borderBottomWidth: borderBottom, borderBottomColor,
      backgroundColor: bgColor,
      alignItems: 'center', justifyContent: 'center',
    }]}>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        onPress={handlePress}
        activeOpacity={1}
      >
        {cell.val !== 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[
              styles.cellText,
              { fontSize: cellSize * 0.45 },
              cell.isGiven ? styles.cellGiven : styles.cellUser,
              cell.isError && styles.cellError,
              isSelected && !cell.isGiven && !cell.isError && { color: '#FFFFFF', textShadowColor: ACCENT_BLUE, textShadowRadius: 6 },
            ]}>
              {cell.val}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
}

import { useEngine, SudokuEngine, SudokuDifficulty } from '../src/engines';

export default function Sudoku() {
  const [gameState, engine] = useEngine(() => new SudokuEngine());
  const {
    board,
    selectedRow,
    selectedCol,
    difficulty,
    mistakes,
    timerSeconds: timer,
    hints,
    canUndo,
    canRedo,
    isComplete: isWon,
    isPaused,
    gameOver,
  } = gameState;

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      engine.tickTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleInput = useCallback((num: number) => {
    if (isWon || isPaused || gameOver) return;
    tapLight();
    const correct = engine.enterNumber(num);
    if (num > 0 && !correct) {
      notifyError();
    }
  }, [isWon, isPaused, gameOver]);

  const useHint = () => {
    if (hints <= 0 || isWon || isPaused || gameOver) return;
    tapMedium();
    engine.useHint();
  };

  const undo = () => {
    if (!canUndo || isPaused) return;
    tapMedium();
    engine.undo();
  };

  const redo = () => {
    if (!canRedo || isPaused) return;
    tapMedium();
    engine.redo();
  };

  const handleCellTap = (r: number, c: number) => {
    if (isPaused) return;
    tapLight();
    engine.selectCell(r, c);
    if (Platform.OS !== 'web') {
      inputRef.current?.focus();
    }
  };

  useKeyboard((key: string) => {
    if (isPaused) return;
    const k = key;
    if (['1','2','3','4','5','6','7','8','9'].includes(k)) {
      handleInput(parseInt(k, 10));
    } else if (k === 'Backspace' || k === 'Delete' || k === '0') {
      handleInput(0);
    } else if (k === 'h' || k === 'H') {
      useHint();
    } else if (k === 'Tab') {
      if (selectedRow !== null && selectedCol !== null) {
        let nextR = selectedRow, nextC = selectedCol + 1;
        if (nextC > 8) {
          nextC = 0;
          nextR = (selectedRow + 1) % 9;
        }
        engine.selectCell(nextR, nextC);
      } else {
        engine.selectCell(0, 0);
      }
    } else if (selectedRow !== null && selectedCol !== null) {
      if (k === 'ArrowUp' || k === 'w')
        engine.selectCell(Math.max(0, selectedRow - 1), selectedCol);
      else if (k === 'ArrowDown' || k === 's')
        engine.selectCell(Math.min(8, selectedRow + 1), selectedCol);
      else if (k === 'ArrowLeft' || k === 'a')
        engine.selectCell(selectedRow, Math.max(0, selectedCol - 1));
      else if (k === 'ArrowRight' || k === 'd')
        engine.selectCell(selectedRow, Math.min(8, selectedCol + 1));
    }
  }, { disableRepeat: true, preventDefault: true });

  const isDesktop = screenWidth >= 768;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const boardWidth = isDesktop ? Math.min(screenWidth - 120, 380) : Math.min(screenWidth - 40, 340);
  const cellSize = boardWidth / 9;

  return (
    <View style={styles.root}>
      <CyberBackground autoScroll />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <GameHeader
          title="SUDOKU"
          accentColor={ACCENT_PURPLE}
          onBack={() => router.replace('/')}
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.settingsPanel, styles.panelBg]}>
            <Text style={styles.settingLabel}>DIFFICULTY</Text>
            <SegmentedControl
              options={['EASY', 'MEDIUM', 'HARD']}
              labels={['EASY', 'MEDIUM', 'HARD']}
              value={difficulty}
              onChange={(d: SudokuDifficulty) => engine.setDifficulty(d)}
              activeColor={DIFF_COLORS[difficulty]}
            />
          </View>

          <View style={styles.statusBar}>
            <View style={[styles.statusPill, styles.panelBg]}>
              <Text style={styles.statusIcon}>⏱</Text>
              <Text style={styles.statusValue}>{formatTime(timer)}</Text>
            </View>
            <View style={[styles.statusPill, styles.panelBg, { borderColor: mistakes > 0 ? `${DANGER}50` : 'transparent' }]}>
              <Text style={styles.statusIcon}>✗</Text>
              <Text style={[styles.statusValue, { color: mistakes > 0 ? DANGER : Colors.text.secondary }]}>{mistakes}/3</Text>
            </View>
            <View style={[styles.statusPill, styles.panelBg, { borderColor: hints > 0 ? `${WARNING}40` : 'transparent' }]}>
              <Text style={styles.statusIcon}>💡</Text>
              <Text style={[styles.statusValue, { color: hints > 0 ? WARNING : Colors.text.muted }]}>{hints}</Text>
            </View>
          </View>

          <View style={styles.gameLayout}>
            <View style={[styles.boardWrapper, { width: boardWidth + 4, height: boardWidth + 4 }]}>
              <View style={[styles.board, { width: boardWidth, height: boardWidth }]}>
                {board.map((row: any[], r: number) => (
                  <View key={r} style={{ flexDirection: 'row' }}>
                    {row.map((cell: any, c: number) => {
                      const isSelected = selectedRow === r && selectedCol === c;
                      const selVal = selectedRow !== null && selectedCol !== null ? board[selectedRow]?.[selectedCol]?.val : 0;
                      const isHighlight = !isSelected && selVal !== 0 && cell.val === selVal;
                      const isRelated = !isSelected && selectedRow !== null && selectedCol !== null && (
                        selectedRow === r || selectedCol === c ||
                        (Math.floor(selectedRow / 3) === Math.floor(r / 3) &&
                          Math.floor(selectedCol / 3) === Math.floor(c / 3))
                      );
                      return (
                        <SudokuCell
                          key={c}
                          cell={cell} r={r} c={c}
                          cellSize={cellSize}
                          isSelected={isSelected}
                          isHighlight={isHighlight}
                          isRelated={isRelated}
                          onPress={() => handleCellTap(r, c)}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.controlsContainer}>
              <View style={styles.toolbar}>
                <TouchableOpacity style={[styles.toolBtn, styles.panelBg, !canUndo && styles.toolBtnDisabled]} onPress={undo}>
                  <Text style={styles.toolBtnIcon}>↩</Text>
                  <Text style={styles.toolBtnLabel}>UNDO</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toolBtn, styles.panelBg, !canRedo && styles.toolBtnDisabled]} onPress={redo}>
                  <Text style={styles.toolBtnIcon}>↪</Text>
                  <Text style={styles.toolBtnLabel}>REDO</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toolBtn, styles.panelBg]} onPress={() => handleInput(0)}>
                  <Text style={styles.toolBtnIcon}>⌫</Text>
                  <Text style={styles.toolBtnLabel}>ERASE</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toolBtn, styles.panelBg, hints === 0 && styles.toolBtnDisabled]}
                  onPress={useHint}
                >
                  <Text style={styles.toolBtnIcon}>💡</Text>
                  <Text style={[styles.toolBtnLabel, { color: hints > 0 ? WARNING : Colors.text.muted }]}>HINT</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toolBtn, styles.panelBg]} onPress={() => engine.togglePause(true)}>
                  <Text style={styles.toolBtnIcon}>⏸</Text>
                  <Text style={styles.toolBtnLabel}>PAUSE</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                ref={inputRef}
                style={{ width: 0, height: 0, opacity: 0 }}
                keyboardType="number-pad"
                maxLength={1}
                value=""
                onChangeText={(text) => {
                  const num = parseInt(text, 10);
                  if (!isNaN(num) && num > 0 && num <= 9) {
                    handleInput(num);
                  }
                }}
                onKeyPress={({ nativeEvent }) => {
                  if (nativeEvent.key === 'Backspace') {
                    handleInput(0);
                  }
                }}
              />
            </View>
          </View>

          <Text style={styles.kbHint}>
            Arrow keys / WASD to navigate · 1–9 to enter · Delete to erase · H for hint
          </Text>
        </ScrollView>

        {isPaused && (
          <View style={styles.pauseOverlay}>
            <Text style={styles.pausedTitle}>PAUSED</Text>
            <Text style={styles.pausedSub}>Take a breath, your timer is frozen.</Text>
            <TouchableOpacity style={styles.resumeBtn} onPress={() => engine.togglePause(false)}>
              <Text style={styles.resumeBtnText}>RESUME</Text>
            </TouchableOpacity>
          </View>
        )}

        <GameOverModal
          visible={isWon || gameOver}
          title={isWon ? "PUZZLE SOLVED! 🎉" : "GAME OVER"}
          score={isWon ? formatTime(timer) : `${mistakes} Mistakes`}
          highScore={''}
          isNewHighScore={false}
          accentColor={isWon ? ACCENT_BLUE : DANGER}
          onRestart={() => engine.reset()}
          onHome={() => router.replace('/')}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK_BLUE_BG },
  safe: { flex: 1 },
  panelBg: {
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing[2],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[10],
    gap: Spacing[4],
  },
  settingsPanel: {
    width: '100%',
    maxWidth: 420,
    padding: Spacing[4],
    borderRadius: Radius.lg,
  },
  settingLabel: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
    letterSpacing: 2,
    marginBottom: Spacing[2],
  },
  segmented: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  segItem: {
    flex: 1,
    paddingVertical: Spacing[2],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: Radius.full,
  },
  segText: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
    letterSpacing: 0.5,
  },
  statusBar: {
    flexDirection: 'row',
    gap: Spacing[3],
    justifyContent: 'center',
    width: '100%',
    maxWidth: 420,
  },
  statusPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    gap: Spacing[2],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusIcon: { fontSize: 13 },
  statusValue: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  gameLayout: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: Spacing[6],
    width: '100%',
  },
  boardWrapper: {
    borderRadius: Radius.sm,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: `${ACCENT_PURPLE}90`,
    ...elegantShadow(0.4, 15, 8, ACCENT_PURPLE),
  },
  board: {
    backgroundColor: BOARD_BG,
    borderLeftWidth: 0.5,
    borderTopWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cellText: {
    fontFamily: Fonts.heading,
  },
  cellGiven: {
    color: Colors.text.primary,
  },
  cellUser: {
    color: ACCENT_BLUE,
    textShadowColor: ACCENT_BLUE,
    textShadowRadius: 4,
  },
  cellError: {
    color: DANGER,
    textShadowColor: DANGER,
    textShadowRadius: 5,
  },
  controlsContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
    justifyContent: 'center',
    width: '100%',
  },
  toolBtn: {
    borderRadius: Radius.sm,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: 55,
  },
  toolBtnDisabled: {
    opacity: 0.35,
  },
  toolBtnIcon: {
    fontSize: 16,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  toolBtnLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 9,
    color: Colors.text.muted,
    letterSpacing: 0.5,
  },
  kbHint: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
    textAlign: 'center',
    marginTop: Spacing[1],
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 15, 30, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  pausedTitle: { 
    fontFamily: Fonts.heading, 
    fontSize: FontSize['2xl'], 
    color: '#A855F7',
    textShadowColor: '#6B21A8',
    textShadowRadius: 10,
    letterSpacing: 4 
  },
  pausedSub: { 
    fontFamily: Fonts.body, 
    fontSize: FontSize.sm, 
    color: '#E0E7FF',
    opacity: 0.8, 
    marginTop: Spacing[2] 
  },
  resumeBtn: {
    marginTop: Spacing[6], 
    paddingVertical: Spacing[3], 
    paddingHorizontal: Spacing[6],
    borderRadius: Radius.md,
    backgroundColor: '#1E1B4B',
    borderWidth: 1.5,
    borderColor: '#6B21A8',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center'
  },
  resumeBtnText: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.md,
    color: '#38BDF8',
    letterSpacing: 2,
  }
});