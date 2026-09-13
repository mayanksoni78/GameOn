import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView, TextInput, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence } from 'react-native-reanimated';
import { Colors, elegantShadow } from '../src/theme/colors';
import { Fonts, FontSize } from '../src/theme/typography';
import { Spacing } from '../src/theme/spacing';
import { CyberBackground } from '../src/components/CyberBackground';
import { GameHeader } from '../src/components/GameHeader';
import { GameOverModal } from '../src/components/GameOverModal';
import { tapLight, tapMedium, notifySuccess, notifyError } from '../src/utils/haptics';
import { useKeyboard } from '../src/hooks/useKeyboard';

const ACCENT_BLUE = '#38BDF8';
const ACCENT_PURPLE = '#A855F7';
const BORDER_PURPLE = '#6B21A8';
const DARK_BLUE_BG = '#07050E';
const PANEL_BG = 'rgba(14, 9, 30, 0.9)';
const BOARD_BG = '#07050E';
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

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const boardWidth = Math.min(windowWidth - 24, windowHeight - 390, 360);
  const cellSize = Math.max(28, Math.floor(boardWidth / 9));
  const actualBoardWidth = cellSize * 9;

  return (
    <View style={styles.root}>
      <CyberBackground theme="sudoku" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <GameHeader
          title="SUDOKU"
          category="PUZZLE"
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
            <View style={[styles.statusPill, styles.panelBg, { borderColor: mistakes > 0 ? `${DANGER}60` : 'transparent' }]}>
              <Text style={styles.statusIcon}>✗</Text>
              <Text style={[styles.statusValue, { color: mistakes > 0 ? DANGER : Colors.text.secondary }]}>{mistakes}/3</Text>
            </View>
            <View style={[styles.statusPill, styles.panelBg, { borderColor: hints > 0 ? `${WARNING}50` : 'transparent' }]}>
              <Text style={styles.statusIcon}>💡</Text>
              <Text style={[styles.statusValue, { color: hints > 0 ? WARNING : Colors.text.muted }]}>{hints}</Text>
            </View>
          </View>

          <View style={styles.gameLayout}>
            <View style={[styles.boardFrame, { width: actualBoardWidth + 6, height: actualBoardWidth + 6 }]}>
              <View style={[styles.board, { width: actualBoardWidth, height: actualBoardWidth }]}>
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
              {/* Number Pad for on-screen input */}
              <View style={styles.numberPad}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={styles.numKey}
                    onPress={() => handleInput(num)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.numKeyText}>{num}</Text>
                  </TouchableOpacity>
                ))}
              </View>

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
            WASD / Arrows to navigate · 1–9 to enter · 0/Delete to erase · H for hint
          </Text>
        </ScrollView>

        {isPaused && (
          <View style={styles.pauseOverlay}>
            <Text style={styles.pausedTitle}>PAUSED</Text>
            <Text style={styles.pausedSub}>Take a breath, your timer is frozen.</Text>
            <TouchableOpacity style={styles.resumeBtn} onPress={() => engine.togglePause(false)} activeOpacity={0.8}>
              <Text style={styles.resumeBtnText}>▶  RESUME</Text>
            </TouchableOpacity>
          </View>
        )}

        <GameOverModal
          visible={isWon || gameOver}
          title={isWon ? "PUZZLE SOLVED!" : "GAME OVER"}
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
  root: { flex: 1, backgroundColor: 'transparent' },
  safe: { flex: 1 },
  panelBg: {
    backgroundColor: '#12111A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing[2],
    paddingTop: Spacing[1],
    paddingBottom: Spacing[8],
    gap: Spacing[3],
  },
  gameLayout: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing[3],
  },
  settingsPanel: {
    width: '100%',
    maxWidth: 380,
    padding: Spacing[3],
    borderRadius: 6,
  },
  settingLabel: {
    fontFamily: Fonts.heading,
    fontSize: FontSize['2xs'],
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: Spacing[1],
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
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    backgroundColor: '#161522',
  },
  segText: {
    fontFamily: Fonts.heading,
    fontSize: FontSize['2xs'],
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  statusBar: {
    flexDirection: 'row',
    gap: Spacing[2],
    justifyContent: 'center',
    width: '100%',
    maxWidth: 380,
  },
  statusPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[2],
    borderRadius: 4,
    gap: Spacing[1],
  },
  statusIcon: {
    fontSize: FontSize.xs,
  },
  statusValue: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.xs,
    color: Colors.text.primary,
  },
  boardFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
    backgroundColor: '#12111A',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  board: {
    backgroundColor: '#0E0D16',
    borderLeftWidth: 0.5,
    borderTopWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cellText: {
    fontFamily: Fonts.heading,
  },
  cellGiven: {
    color: Colors.text.primary,
  },
  cellUser: {
    color: '#38BDF8',
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
    maxWidth: 380,
    gap: Spacing[2],
  },
  numberPad: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 4,
  },
  numKey: {
    flex: 1,
    height: 38,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    backgroundColor: '#161522',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  numKeyText: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.xs,
    color: '#F4F4F5',
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
    justifyContent: 'center',
    width: '100%',
  },
  toolBtn: {
    borderRadius: 4,
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: 50,
  },
  toolBtnDisabled: {
    opacity: 0.35,
  },
  toolBtnIcon: {
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  toolBtnLabel: {
    fontFamily: Fonts.heading,
    fontSize: 7,
    color: Colors.text.muted,
    letterSpacing: 0.5,
  },
  kbHint: {
    fontFamily: Fonts.body,
    fontSize: FontSize['2xs'],
    color: Colors.text.muted,
    textAlign: 'center',
    marginTop: Spacing[1],
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 5, 14, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  pausedTitle: { 
    fontFamily: Fonts.heading, 
    fontSize: FontSize.xl, 
    color: '#A855F7',
    textShadowColor: '#6B21A8',
    textShadowRadius: 10,
    letterSpacing: 3 
  },
  pausedSub: { 
    fontFamily: Fonts.body, 
    fontSize: FontSize.xs, 
    color: '#E0E7FF',
    opacity: 0.8, 
    marginTop: Spacing[2] 
  },
  resumeBtn: {
    marginTop: Spacing[6], 
    paddingVertical: Spacing[3], 
    paddingHorizontal: Spacing[6],
    borderRadius: 4,
    backgroundColor: '#07050E',
    borderWidth: 2,
    borderColor: '#A855F7',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center'
  },
  resumeBtnText: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.sm,
    color: '#38BDF8',
    letterSpacing: 2,
  }
});