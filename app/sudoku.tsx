import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withSequence, Easing
} from 'react-native-reanimated';
import { Colors, glassmorphism, elegantShadow } from '../src/theme/colors';
import { Fonts, FontSize } from '../src/theme/typography';
import { Spacing, Radius } from '../src/theme/spacing';
import { AnimatedBackground } from '../src/components/AnimatedBackground';
import { GameHeader } from '../src/components/GameHeader';
import { GameOverModal } from '../src/components/GameOverModal';
import { screenWidth, screenHeight } from '../src/utils/dimensions';
import { tapLight, tapMedium, notifySuccess, notifyError } from '../src/utils/haptics';
import { useKeyboard, KeyboardKey } from '../src/hooks/useKeyboard';

const ACCENT = '#00E5FF';
const ACCENT2 = '#9013FE';
const DANGER = '#FF1744';
const SUCCESS = '#00E676';
const WARNING = '#FFD600';

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
type CellInfo = { val: number; isGiven: boolean; notes: Set<number>; isError: boolean };
type BoardState = CellInfo[][];

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

const DIFF_COLORS: Record<Difficulty, string> = { EASY: SUCCESS, MEDIUM: WARNING, HARD: DANGER };

// ── Segmented Control (inline) ─────────────────────────────────────────────
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
            <Text style={[styles.segText, active && { color: activeColor, textShadowColor: activeColor, textShadowRadius: 10 }]}>
              {labels[i]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Cell Component ─────────────────────────────────────────────────────────
function SudokuCell({
  cell, r, c, cellSize, isSelected, isHighlight, isRelated, onPress
}: {
  cell: CellInfo; r: number; c: number; cellSize: number;
  isSelected: boolean; isHighlight: boolean; isRelated: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (cell.isError) {
      shake.value = withSequence(
        withTiming(-5, { duration: 50 }),
        withTiming(5, { duration: 50 }),
        withTiming(-5, { duration: 50 }),
        withTiming(5, { duration: 50 }),
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
      withTiming(0.9, { duration: 60 }),
      withSpring(1, { damping: 12, stiffness: 300 })
    );
    onPress();
  };

  const borderRight = (c === 2 || c === 5) ? 2.5 : 0.5;
  const borderBottom = (r === 2 || r === 5) ? 2.5 : 0.5;
  const borderRightColor = (c === 2 || c === 5) ? `${ACCENT2}90` : 'rgba(255,255,255,0.15)';
  const borderBottomColor = (r === 2 || r === 5) ? `${ACCENT2}90` : 'rgba(255,255,255,0.15)';

  let bgColor = 'transparent';
  if (isSelected) bgColor = `${ACCENT}45`;
  else if (isHighlight) bgColor = `${ACCENT}18`;
  else if (isRelated) bgColor = 'rgba(144,19,254,0.08)';

  const noteSize = cellSize / 3 - 1;

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
              { fontSize: cellSize * 0.48 },
              cell.isGiven ? styles.cellGiven : styles.cellUser,
              cell.isError && styles.cellError,
              isSelected && !cell.isGiven && !cell.isError && { color: '#FFFFFF', textShadowColor: ACCENT, textShadowRadius: 8 },
            ]}>
              {cell.val}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Main Sudoku Component ──────────────────────────────────────────────────
export default function Sudoku() {
  const [difficulty, setDifficulty] = useState<Difficulty>('EASY');
  const [board, setBoard] = useState<BoardState>([]);
  const [solution, setSolution] = useState<number[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [history, setHistory] = useState<BoardState[]>([]);
  const [future, setFuture] = useState<BoardState[]>([]);
  const [timer, setTimer] = useState(0);
  const [hints, setHints] = useState(3);
  const [isWon, setIsWon] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);

  const timerRef = useRef<any>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (gameStarted && !isWon) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [gameStarted, isWon]);

  // Auto-start first game
  useEffect(() => { initGame('EASY'); }, []);

  const initGame = (diff: Difficulty) => {
    let sol = SEED_BOARD.map(row => [...row]);
    const numMap = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
    sol = sol.map(row => row.map(val => numMap[val - 1]));
    setSolution(sol);

    const toRemove = diff === 'EASY' ? 30 : diff === 'MEDIUM' ? 45 : 60;
    let b = sol.map(row =>
      row.map(val => ({ val, isGiven: true, notes: new Set<number>(), isError: false }))
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
    setMistakes(0);
    setGameStarted(true);
  };

  const saveHistory = (newBoard: BoardState) => {
    setHistory(prev => [...prev.slice(-20), newBoard]);
    setFuture([]);
  };

  const deepCopyBoard = (b: BoardState): BoardState =>
    b.map(row => row.map(cell => ({ ...cell, notes: new Set(cell.notes) })));

  const handleInput = useCallback((num: number) => {
    if (!selectedCell || isWon) return;
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
  }, [selectedCell, isWon, board, solution]);

  const useHint = () => {
    if (!selectedCell || hints <= 0 || isWon) return;
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
    if (history.length <= 1) return;
    tapMedium();
    const current = history[history.length - 1];
    const prev = history[history.length - 2];
    setFuture(f => [current, ...f]);
    setHistory(h => h.slice(0, -1));
    setBoard(prev);
  };

  const redo = () => {
    if (future.length === 0) return;
    tapMedium();
    const next = future[0];
    setHistory(h => [...h, next]);
    setFuture(f => f.slice(1));
    setBoard(next);
  };

  const checkWin = (b: BoardState) => {
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (b[r][c].val !== solution[r][c]) return;
    setIsWon(true);
    notifySuccess();
  };

  const handleCellTap = (r: number, c: number) => {
    tapLight();
    setSelectedCell({ r, c });
    if (Platform.OS !== 'web') {
      inputRef.current?.focus();
    }
  };

  // ── Keyboard Controls ────────────────────────────────────────────────────
  useKeyboard((key: KeyboardKey) => {
    const k = key as string;
    if (['1','2','3','4','5','6','7','8','9'].includes(k)) {
      handleInput(parseInt(k));
    } else if (k === 'Backspace' || k === 'Delete' || k === '0') {
      handleInput(0);
    } else if (k === 'h' || k === 'H') {
      useHint();
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
    }
  }, [selectedCell, handleInput, useHint]);

  const isDesktop = screenWidth >= 768;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const boardWidth = isDesktop ? Math.min(screenWidth - 350, 500) : Math.min(screenWidth - 24, 420);
  const cellSize = boardWidth / 9;

  return (
    <View style={styles.root}>
      <AnimatedBackground />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <GameHeader
          title="SUDOKU"
          accentColor={ACCENT2}
          onBack={() => router.replace('/')}
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Difficulty Selector (inline, same page) ── */}
          <View style={[styles.settingsPanel, glassmorphism()]}>
            <Text style={styles.settingLabel}>DIFFICULTY</Text>
            <SegmentedControl
              options={['EASY', 'MEDIUM', 'HARD'] as Difficulty[]}
              labels={['⚡ EASY', '🔥 MEDIUM', '💀 HARD']}
              value={difficulty}
              onChange={(d) => initGame(d)}
              activeColor={DIFF_COLORS[difficulty]}
            />
          </View>

          {/* ── Status Pills ── */}
          <View style={styles.statusBar}>
            <View style={[styles.statusPill, glassmorphism()]}>
              <Text style={styles.statusIcon}>⏱</Text>
              <Text style={styles.statusValue}>{formatTime(timer)}</Text>
            </View>
            <View style={[styles.statusPill, glassmorphism(), { borderColor: `${DANGER}40` }]}>
              <Text style={styles.statusIcon}>✗</Text>
              <Text style={[styles.statusValue, { color: mistakes > 0 ? DANGER : Colors.text.secondary }]}>{mistakes}</Text>
            </View>
            <View style={[styles.statusPill, glassmorphism(), { borderColor: `${WARNING}40` }]}>
              <Text style={styles.statusIcon}>💡</Text>
              <Text style={[styles.statusValue, { color: hints > 0 ? WARNING : Colors.text.muted }]}>{hints}</Text>
            </View>
          </View>

          {/* ── Main Game Area (Responsive) ── */}
          <View style={isDesktop ? styles.desktopLayout : styles.mobileLayout}>
            {/* ── Board ── */}
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

            <View style={isDesktop ? styles.desktopControls : styles.mobileControls}>
              {/* ── Tool Bar ── */}
              <View style={styles.toolbar}>
                <TouchableOpacity style={[styles.toolBtn, glassmorphism(), history.length <= 1 && styles.toolBtnDisabled]} onPress={undo}>
                  <Text style={styles.toolBtnIcon}>↩</Text>
                  <Text style={styles.toolBtnLabel}>UNDO</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toolBtn, glassmorphism(), future.length === 0 && styles.toolBtnDisabled]} onPress={redo}>
                  <Text style={styles.toolBtnIcon}>↪</Text>
                  <Text style={styles.toolBtnLabel}>REDO</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toolBtn, glassmorphism()]} onPress={() => handleInput(0)}>
                  <Text style={styles.toolBtnIcon}>⌫</Text>
                  <Text style={styles.toolBtnLabel}>ERASE</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toolBtn, glassmorphism(), hints === 0 && styles.toolBtnDisabled]}
                  onPress={useHint}
                >
                  <Text style={styles.toolBtnIcon}>💡</Text>
                  <Text style={[styles.toolBtnLabel, { color: hints > 0 ? WARNING : Colors.text.muted }]}>HINT</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toolBtn, glassmorphism()]}
                  onPress={() => initGame(difficulty)}
                >
                  <Text style={[styles.toolBtnIcon, { color: SUCCESS }]}>↺</Text>
                  <Text style={[styles.toolBtnLabel, { color: SUCCESS }]}>NEW</Text>
                </TouchableOpacity>
              </View>

              {/* ── Native Keyboard Input (Hidden) ── */}
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
            Arrow keys / WASD to navigate · 1–9 to enter · Delete to erase · H for hint · Tab to move
          </Text>

        </ScrollView>

        {/* ── Win Modal ── */}
        <GameOverModal
          visible={isWon}
          title="PUZZLE SOLVED! 🎉"
          score={formatTime(timer)}
          highScore={''}
          isNewHighScore={false}
          accentColor={SUCCESS}
          onRestart={() => initGame(difficulty)}
          onHome={() => router.replace('/')}
        />
      </SafeAreaView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  safe: { flex: 1 },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing[2],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[10],
    gap: Spacing[3],
  },

  // ── Settings Panel ──
  settingsPanel: {
    width: '100%',
    maxWidth: 440,
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

  // ── Segmented Control ──
  segmented: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  segItem: {
    flex: 1,
    paddingVertical: Spacing[2],
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

  // ── Status Bar ──
  statusBar: {
    flexDirection: 'row',
    gap: Spacing[2],
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    gap: Spacing[1],
  },
  statusIcon: { fontSize: 12 },
  statusValue: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },

  // ── Board ──
  boardWrapper: {
    borderRadius: Radius.sm,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: `${ACCENT2}60`,
    ...elegantShadow(0.4, 20, 10, ACCENT2),
  },
  board: {
    backgroundColor: 'rgba(11, 7, 21, 0.85)',
    borderLeftWidth: 0.5,
    borderTopWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },

  // ── Cell ──
  cellText: {
    fontFamily: Fonts.heading,
  },
  cellGiven: {
    color: Colors.text.primary,
  },
  cellUser: {
    color: ACCENT,
    textShadowColor: ACCENT,
    textShadowRadius: 4,
  },
  cellError: {
    color: DANGER,
    textShadowColor: DANGER,
    textShadowRadius: 8,
  },

  // ── Toolbar ──
  toolbar: {
    flexDirection: 'row',
    gap: Spacing[2],
    justifyContent: 'center',
  },
  toolBtn: {
    borderRadius: Radius.sm,
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[3],
    alignItems: 'center',
    minWidth: 56,
  },
  toolBtnActive: {
    borderColor: ACCENT,
    backgroundColor: `${ACCENT}15`,
  },
  toolBtnDisabled: {
    opacity: 0.4,
  },
  toolBtnIcon: {
    fontSize: 18,
    color: Colors.text.primary,
  },
  toolBtnLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 9,
    color: Colors.text.muted,
    marginTop: 2,
    letterSpacing: 0.5,
  },

  // ── Layout ──
  desktopLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[8],
  },
  mobileLayout: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: Spacing[3],
  },
  desktopControls: {
    flexDirection: 'column',
    gap: Spacing[6],
    alignItems: 'center',
  },
  mobileControls: {
    flexDirection: 'column',
    gap: Spacing[3],
    alignItems: 'center',
  }
});
