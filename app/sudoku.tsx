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

const DIFF_COLORS = { EASY: SUCCESS, MEDIUM: WARNING, HARD: ACCENT_PURPLE };

function SegmentedControl({ options, labels, value, onChange, activeColor }) {
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

function SudokuCell({ cell, r, c, cellSize, isSelected, isHighlight, isRelated, onPress }) {
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

export default function Sudoku() {
  const [difficulty, setDifficulty] = useState('EASY');
  const [board, setBoard] = useState([]);
  const [solution, setSolution] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [timer, setTimer] = useState(0);
  const [hints, setHints] = useState(3);
  const [isWon, setIsWon] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);

  const timerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (gameStarted && !isWon && !isPaused) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [gameStarted, isWon, isPaused]);

  useEffect(() => { initGame('EASY'); }, []);

  const initGame = (diff) => {
    let sol = SEED_BOARD.map(row => [...row]);
    const numMap = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
    sol = sol.map(row => row.map(val => numMap[val - 1]));
    setSolution(sol);

    const toRemove = diff === 'EASY' ? 30 : diff === 'MEDIUM' ? 45 : 60;
    let b = sol.map(row =>
      row.map(val => ({ val, isGiven: true, notes: new Set(), isError: false }))
    );

    let removed = 0;
    while (removed < toRemove) {
      const r = Math.floor(Math.random() * 9);
      const c = Math.floor(Math.random() * 9);
      if (b[r][c].val !== 0) {
        b[r][c].val = 0;
        b[r][c].isGiven = false;
        removed++;
      }
    }

    setBoard(b);
    setHistory([b]);
    setFuture([]);
    setDifficulty(diff);
    setSelectedCell(null);
    setTimer(0);
    setHints(3);
    setIsWon(false);
    setIsPaused(false);
    setMistakes(0);
    setGameStarted(true);
  };

  const saveHistory = (newBoard) => {
    setHistory(prev => [...prev.slice(-20), newBoard]);
    setFuture([]);
  };

  const deepCopyBoard = (b) =>
    b.map(row => row.map(cell => ({ ...cell, notes: new Set(cell.notes) })));

  const handleInput = useCallback((num) => {
    if (!selectedCell || isWon || isPaused) return;
    const { r, c } = selectedCell;
    if (board[r][c].isGiven) return;

    tapLight();
    const newBoard = deepCopyBoard(board);

    if (num === 0) {
      newBoard[r][c].val = 0;
      newBoard[r][c].isError = false;
      newBoard[r][c].notes.clear();
    } else {
      newBoard[r][c].val = num;
      newBoard[r][c].notes.clear();
      const correct = num === solution[r][c];
      newBoard[r][c].isError = !correct;
      if (!correct) {
        notifyError();
        setMistakes(m => m + 1);
      }
    }

    setBoard(newBoard);
    saveHistory(newBoard);
    checkWin(newBoard);
  }, [selectedCell, isWon, isPaused, board, solution]);

  const useHint = () => {
    if (!selectedCell || hints <= 0 || isWon || isPaused) return;
    const { r, c } = selectedCell;
    if (board[r][c].isGiven || board[r][c].val === solution[r][c]) return;

    tapMedium();
    const newBoard = deepCopyBoard(board);
    newBoard[r][c].val = solution[r][c];
    newBoard[r][c].isError = false;
    newBoard[r][c].notes.clear();
    setBoard(newBoard);
    saveHistory(newBoard);
    setHints(h => h - 1);
    checkWin(newBoard);
  };

  const undo = () => {
    if (history.length <= 1 || isPaused) return;
    tapMedium();
    const current = history[history.length - 1];
    const prev = history[history.length - 2];
    setFuture(f => [current, ...f]);
    setHistory(h => h.slice(0, -1));
    setBoard(prev);
  };

  const redo = () => {
    if (future.length === 0 || isPaused) return;
    tapMedium();
    const next = future[0];
    setHistory(h => [...h, next]);
    setFuture(f => f.slice(1));
    setBoard(next);
  };

  const checkWin = (b) => {
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (b[r][c].val !== solution[r][c]) return;
    setIsWon(true);
    notifySuccess();
  };

  const handleCellTap = (r, c) => {
    if (isPaused) return;
    tapLight();
    setSelectedCell({ r, c });
    if (Platform.OS !== 'web') {
      inputRef.current?.focus();
    }
  };

  useKeyboard((key) => {
    if (isPaused) return;
    const k = key;
    if (['1','2','3','4','5','6','7','8','9'].includes(k)) {
      handleInput(parseInt(k));
    } else if (k === 'Backspace' || k === 'Delete' || k === '0') {
      handleInput(0);
    } else if (k === 'h' || k === 'H') {
      useHint();
    } else if (k === 'Tab') {
      if (selectedCell) {
        const { r, c } = selectedCell;
        let nextR = r, nextC = c + 1;
        if (nextC > 8) {
          nextC = 0;
          nextR = (r + 1) % 9;
        }
        setSelectedCell({ r: nextR, c: nextC });
      } else {
        setSelectedCell({ r: 0, c: 0 });
      }
    } else if (selectedCell) {
      const { r, c } = selectedCell;
      if (k === 'ArrowUp' || k === 'w')
        setSelectedCell({ r: Math.max(0, r - 1), c });
      else if (k === 'ArrowDown' || k === 's')
        setSelectedCell({ r: Math.min(8, r + 1), c });
      else if (k === 'ArrowLeft' || k === 'a')
        setSelectedCell({ r, c: Math.max(0, c - 1) });
      else if (k === 'ArrowRight' || k === 'd')
        setSelectedCell({ r, c: Math.min(8, c + 1) });
    }
  }, [selectedCell, handleInput, useHint, isPaused]);

  const isDesktop = screenWidth >= 768;

  const formatTime = (secs) => {
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
          <View style={[styles.settingsPanel, glassmorphism(PANEL_BG)]}>
            <Text style={styles.settingLabel}>DIFFICULTY</Text>
            <SegmentedControl
              options={['EASY', 'MEDIUM', 'HARD']}
              labels={['EASY', 'MEDIUM', 'HARD']}
              value={difficulty}
              onChange={(d) => initGame(d)}
              activeColor={DIFF_COLORS[difficulty]}
            />
          </View>

          <View style={styles.statusBar}>
            <View style={[styles.statusPill, glassmorphism(PANEL_BG)]}>
              <Text style={styles.statusIcon}>⏱</Text>
              <Text style={styles.statusValue}>{formatTime(timer)}</Text>
            </View>
            <View style={[styles.statusPill, glassmorphism(PANEL_BG), { borderColor: mistakes > 0 ? `${DANGER}50` : 'transparent' }]}>
              <Text style={styles.statusIcon}>✗</Text>
              <Text style={[styles.statusValue, { color: mistakes > 0 ? DANGER : Colors.text.secondary }]}>{mistakes}</Text>
            </View>
            <View style={[styles.statusPill, glassmorphism(PANEL_BG), { borderColor: hints > 0 ? `${WARNING}40` : 'transparent' }]}>
              <Text style={styles.statusIcon}>💡</Text>
              <Text style={[styles.statusValue, { color: hints > 0 ? WARNING : Colors.text.muted }]}>{hints}</Text>
            </View>
          </View>

          <View style={styles.gameLayout}>
            <View style={[styles.boardWrapper, { width: boardWidth + 4, height: boardWidth + 4 }]}>
              <View style={[styles.board, { width: boardWidth, height: boardWidth }]}>
                {board.map((row, r) => (
                  <View key={r} style={{ flexDirection: 'row' }}>
                    {row.map((cell, c) => {
                      const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                      const selVal = selectedCell ? board[selectedCell.r]?.[selectedCell.c]?.val : 0;
                      const isHighlight = !isSelected && selVal !== 0 && cell.val === selVal;
                      const isRelated = !isSelected && !!selectedCell && (
                        selectedCell.r === r || selectedCell.c === c ||
                        (Math.floor(selectedCell.r / 3) === Math.floor(r / 3) &&
                          Math.floor(selectedCell.c / 3) === Math.floor(c / 3))
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
                <TouchableOpacity style={[styles.toolBtn, glassmorphism(PANEL_BG), history.length <= 1 && styles.toolBtnDisabled]} onPress={undo}>
                  <Text style={styles.toolBtnIcon}>↩</Text>
                  <Text style={styles.toolBtnLabel}>UNDO</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toolBtn, glassmorphism(PANEL_BG), future.length === 0 && styles.toolBtnDisabled]} onPress={redo}>
                  <Text style={styles.toolBtnIcon}>↪</Text>
                  <Text style={styles.toolBtnLabel}>REDO</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toolBtn, glassmorphism(PANEL_BG)]} onPress={() => handleInput(0)}>
                  <Text style={styles.toolBtnIcon}>⌫</Text>
                  <Text style={styles.toolBtnLabel}>ERASE</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toolBtn, glassmorphism(PANEL_BG), hints === 0 && styles.toolBtnDisabled]}
                  onPress={useHint}
                >
                  <Text style={styles.toolBtnIcon}>💡</Text>
                  <Text style={[styles.toolBtnLabel, { color: hints > 0 ? WARNING : Colors.text.muted }]}>HINT</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toolBtn, glassmorphism(PANEL_BG)]} onPress={() => setIsPaused(true)}>
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
                  const num = parseInt(text);
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
            <TouchableOpacity style={styles.resumeBtn} onPress={() => setIsPaused(false)}>
              <Text style={styles.resumeBtnText}>RESUME</Text>
            </TouchableOpacity>
          </View>
        )}

        <GameOverModal
          visible={isWon}
          title="PUZZLE SOLVED! 🎉"
          score={formatTime(timer)}
          highScore={''}
          isNewHighScore={false}
          accentColor={ACCENT_BLUE}
          onRestart={() => initGame(difficulty)}
          onHome={() => router.replace('/')}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK_BLUE_BG },
  safe: { flex: 1 },
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