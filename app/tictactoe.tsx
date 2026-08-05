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

// ─── Types ────────────────────────────────────────────────────────────────────
type Player     = 'X' | 'O' | null;
type GameMode   = 'PvP' | 'PvE';
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

// ─── Win check ────────────────────────────────────────────────────────────────
const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

function getWinnerInfo(sq: Player[]): { winner: Player; line: number[] } | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (sq[a] && sq[a] === sq[b] && sq[a] === sq[c]) return { winner: sq[a], line };
  }
  return null;
}

function isDraw(sq: Player[]): boolean {
  return !sq.includes(null) && !getWinnerInfo(sq);
}

// ─── AI ───────────────────────────────────────────────────────────────────────
function minimax(b: Player[], depth: number, max: boolean): number {
  const w = getWinnerInfo(b);
  if (w?.winner === 'O') return 10 - depth;
  if (w?.winner === 'X') return depth - 10;
  if (isDraw(b)) return 0;
  if (max) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) { if (!b[i]) { b[i] = 'O'; best = Math.max(best, minimax(b, depth+1, false)); b[i] = null; } }
    return best;
  }
  let best = Infinity;
  for (let i = 0; i < 9; i++) { if (!b[i]) { b[i] = 'X'; best = Math.min(best, minimax(b, depth+1, true)); b[i] = null; } }
  return best;
}

function getBestMove(b: Player[]): number {
  let best = -Infinity, m = -1;
  for (let i = 0; i < 9; i++) { if (!b[i]) { b[i] = 'O'; const s = minimax(b, 0, false); b[i] = null; if (s > best) { best = s; m = i; } } }
  return m;
}

function getRandomMove(b: Player[]): number {
  const e: number[] = []; b.forEach((v, i) => { if (!v) e.push(i); });
  return e.length ? e[Math.floor(Math.random() * e.length)] : -1;
}

function getMediumMove(b: Player[]): number {
  for (let i = 0; i < 9; i++) { if (!b[i]) { b[i] = 'O'; if (getWinnerInfo(b)) { b[i] = null; return i; } b[i] = null; } }
  for (let i = 0; i < 9; i++) { if (!b[i]) { b[i] = 'X'; if (getWinnerInfo(b)) { b[i] = null; return i; } b[i] = null; } }
  if (!b[4]) return 4;
  return getRandomMove(b);
}

// ─── AnimatedCell ─────────────────────────────────────────────────────────────
const AnimatedCell = ({
  value, onPress, disabled, isWinCell,
}: {
  value: Player; onPress: () => void; disabled: boolean; isWinCell: boolean;
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TicTacToe() {
  const [mode,       setMode]       = useState<GameMode>('PvP');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');

  const [board,    setBoard]    = useState<Player[]>(Array(9).fill(null));
  const [isXNext,  setIsXNext]  = useState(true);
  const [winInfo,  setWinInfo]  = useState<{ winner: Player; line: number[] } | null>(null);
  const [draw,     setDraw]     = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [scoreX,   setScoreX]   = useState(0);
  const [scoreO,   setScoreO]   = useState(0);
  const [aiThink,  setAiThink]  = useState(false);

  // Track result text for modal (avoids stale reads)
  const [resultTitle,  setResultTitle]  = useState('');
  const [resultAccent, setResultAccent] = useState<string>(ACCENT);

  // boardRef for async AI timeout reads
  const boardRef = useRef<Player[]>(board);
  useEffect(() => { boardRef.current = board; }, [board]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetBoard = useCallback(() => {
    tapMedium();
    const empty: Player[] = Array(9).fill(null);
    boardRef.current = empty;
    setBoard(empty);
    setIsXNext(true);
    setWinInfo(null);
    setDraw(false);
    setGameOver(false);
    setAiThink(false);
    setResultTitle('');
  }, []);

  const fullReset = useCallback(() => {
    resetBoard();
    setScoreX(0);
    setScoreO(0);
  }, [resetBoard]);

  // Reset on mode/difficulty change
  useEffect(() => {
    const empty: Player[] = Array(9).fill(null);
    boardRef.current = empty;
    setBoard(empty);
    setIsXNext(true);
    setWinInfo(null);
    setDraw(false);
    setGameOver(false);
    setAiThink(false);
    setResultTitle('');
  }, [mode, difficulty]);

  // ── Resolve board (pure function, no stale closures) ──────────────────────
  const resolveBoard = (newBoard: Player[], currentMode: GameMode): boolean => {
    const wi = getWinnerInfo(newBoard);
    if (wi) {
      setWinInfo(wi);
      setGameOver(true);
      const isXWin = wi.winner === 'X';
      if (isXWin) {
        setScoreX(s => s + 1);
        setResultTitle(currentMode === 'PvE' ? 'YOU WIN!' : 'X WINS!');
        setResultAccent(X_COLOR);
        notifySuccess();
      } else {
        setScoreO(s => s + 1);
        setResultTitle(currentMode === 'PvE' ? 'CPU WINS!' : 'O WINS!');
        setResultAccent(O_COLOR);
        if (currentMode === 'PvE') notifyError(); else notifySuccess();
      }
      return true;
    }
    if (isDraw(newBoard)) {
      setDraw(true);
      setGameOver(true);
      setResultTitle("IT'S A DRAW!");
      setResultAccent(Colors.text.muted);
      notifyError();
      return true;
    }
    return false;
  };

  // ── Human tap (reads fresh state — no useCallback) ────────────────────────
  const handlePress = (index: number) => {
    if (gameOver || aiThink) return;
    if (board[index]) return;
    if (mode === 'PvE' && !isXNext) return;

    tapLight();
    const newBoard = [...board];
    newBoard[index] = isXNext ? 'X' : 'O';
    boardRef.current = newBoard;
    setBoard(newBoard);

    if (!resolveBoard(newBoard, mode)) {
      setIsXNext(prev => !prev);
    }
  };

  // ── AI turn ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'PvE' || isXNext || gameOver) return;

    setAiThink(true);
    const delay = difficulty === 'EASY' ? 400 : difficulty === 'MEDIUM' ? 550 : 700;

    const timer = setTimeout(() => {
      const current = [...boardRef.current];
      let move = -1;
      if (difficulty === 'EASY')        move = getRandomMove(current);
      else if (difficulty === 'MEDIUM') move = getMediumMove(current);
      else                              move = getBestMove(current);

      if (move === -1) { setAiThink(false); return; }

      const newBoard = [...boardRef.current];
      newBoard[move] = 'O';
      boardRef.current = newBoard;
      setAiThink(false);
      setBoard(newBoard);

      if (!resolveBoard(newBoard, 'PvE')) {
        setIsXNext(true);
      }
    }, delay);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isXNext, mode, gameOver, difficulty]);

  // ── Derived UI ────────────────────────────────────────────────────────────
  const winLine   = winInfo?.line ?? [];
  const turnColor = winInfo ? WIN_COLOR : draw ? Colors.text.muted : (isXNext ? X_COLOR : O_COLOR);
  const turnLabel = gameOver
    ? resultTitle
    : aiThink
      ? "AI THINKING..."
      : `${isXNext ? 'X' : 'O'}'S TURN`;

  return (
    <View style={styles.root}>
      <CyberBackground autoScroll />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

        <GameHeader
          title="TIC TAC TOE"
          score={scoreX}
          scoreLabel={mode === 'PvE' ? 'YOU (X)' : 'PLAYER X'}
          highScore={scoreO}
          highScoreLabel={mode === 'PvE' ? `CPU (${difficulty[0]}${difficulty.slice(1).toLowerCase()})` : 'PLAYER O'}
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
                value={mode}
                onChange={m => setMode(m)}
                activeColor={ACCENT}
              />
            </View>
            
            {mode === 'PvE' && (
              <View style={[styles.settingGroup, { marginTop: Spacing[4] }]}>
                <Text style={styles.settingLabel}>CPU DIFFICULTY</Text>
                <SegmentedControl
                  options={['EASY', 'MEDIUM', 'HARD'] as Difficulty[]}
                  labels={['EASY', 'MEDIUM', 'HARD']}
                  value={difficulty}
                  onChange={d => setDifficulty(d)}
                  activeColor={ACCENT}
                />
              </View>
            )}
          </View>

          {/* Scoreboard moved to GameHeader */}

          {/* ── Turn / Result indicator ───────────────────────── */}
          <View style={styles.turnRow}>
            {aiThink && <View style={[styles.aiPulse, { backgroundColor: ACCENT }]} />}
            <Text style={[styles.turnText, { color: turnColor, textShadowColor: turnColor }]}>
              {turnLabel}
            </Text>
          </View>

          {/* ── Board ─────────────────────────────────────────── */}
          <View style={[styles.board, { width: MAX_BOARD, height: MAX_BOARD }]}>
            {/* Grid lines — pointerEvents: 'none' so they never block taps */}
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <View style={[styles.gridLine, { width: CELL_GAP, height: '100%', left: CELL_SIZE }]} />
              <View style={[styles.gridLine, { width: CELL_GAP, height: '100%', left: CELL_SIZE * 2 + CELL_GAP }]} />
              <View style={[styles.gridLine, { width: '100%', height: CELL_GAP, top: CELL_SIZE }]} />
              <View style={[styles.gridLine, { width: '100%', height: CELL_GAP, top: CELL_SIZE * 2 + CELL_GAP }]} />
            </View>

            {/* Cells */}
            <View style={styles.grid}>
              {board.map((cell, index) => (
                <AnimatedCell
                  key={index}
                  value={cell}
                  onPress={() => handlePress(index)}
                  disabled={gameOver || aiThink || (mode === 'PvE' && !isXNext)}
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
          score={draw ? '—' : '+1'}
          accentColor={resultAccent}
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
