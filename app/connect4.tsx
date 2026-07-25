import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
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
import { AnimatedBackground } from '../src/components/AnimatedBackground';
import { GameHeader } from '../src/components/GameHeader';
import { GameOverModal } from '../src/components/GameOverModal';
import { screenWidth } from '../src/utils/dimensions';
import { tapLight, tapMedium, notifySuccess, notifyError } from '../src/utils/haptics';

// ── Constants ─────────────────────────────────────────────────────────────────
const ROWS = 6;
const COLS = 7;
const ACCENT     = '#00E5FF'; // Neon Cyan
const P1_COLOR   = '#FF1744';  // Neon Red
const P2_COLOR   = '#FFD600';  // Electric Yellow
const BOARD_PAD  = 48;
const MAX_BOARD  = Math.min(screenWidth - BOARD_PAD, 490);
const CELL_SIZE  = Math.floor(MAX_BOARD / COLS);
const DISC_SIZE  = CELL_SIZE - 10;

type Player     = 1 | 2;
type Board      = (Player | null)[][];
type GameMode   = 'PvP' | 'PvE';
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

const makeBoard = (): Board => Array.from({ length: ROWS }, () => Array(COLS).fill(null));

// ── Win check with line ───────────────────────────────────────────────────────
function checkWinner(b: Board): { winner: Player | 'Draw'; line: [number,number][] } | null {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!b[r][c]) continue;
      for (const [dr,dc] of dirs) {
        const cells: [number,number][] = [];
        let ok = true;
        for (let k = 0; k < 4; k++) {
          const nr = r + dr*k, nc = c + dc*k;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || b[nr][nc] !== b[r][c]) { ok = false; break; }
          cells.push([nr, nc]);
        }
        if (ok) return { winner: b[r][c]!, line: cells };
      }
    }
  }
  if (b[0].every(c => c !== null)) return { winner: 'Draw', line: [] };
  return null;
}

// ── AI ────────────────────────────────────────────────────────────────────────
function getValidCols(b: Board): number[] {
  const v: number[] = [];
  for (let c = 0; c < COLS; c++) if (!b[0][c]) v.push(c);
  return v;
}

function getOpenRow(b: Board, c: number): number {
  for (let r = ROWS - 1; r >= 0; r--) if (!b[r][c]) return r;
  return -1;
}

function evalWindow(w: (Player|null)[], p: Player): number {
  const opp: Player = p === 1 ? 2 : 1;
  let pc = 0, ec = 0, oc = 0;
  for (const c of w) { if (c === p) pc++; else if (!c) ec++; else oc++; }
  if (pc === 4) return 100;
  if (pc === 3 && ec === 1) return 5;
  if (pc === 2 && ec === 2) return 2;
  if (oc === 3 && ec === 1) return -4;
  return 0;
}

function scoreBoard(b: Board, p: Player): number {
  let s = 0;
  // Center
  for (let r = 0; r < ROWS; r++) if (b[r][3] === p) s += 3;
  // Horizontal
  for (let r = 0; r < ROWS; r++) for (let c = 0; c <= COLS-4; c++) s += evalWindow([b[r][c],b[r][c+1],b[r][c+2],b[r][c+3]], p);
  // Vertical
  for (let c = 0; c < COLS; c++) for (let r = 0; r <= ROWS-4; r++) s += evalWindow([b[r][c],b[r+1][c],b[r+2][c],b[r+3][c]], p);
  // Diag ↘
  for (let r = 0; r <= ROWS-4; r++) for (let c = 0; c <= COLS-4; c++) s += evalWindow([b[r][c],b[r+1][c+1],b[r+2][c+2],b[r+3][c+3]], p);
  // Diag ↗
  for (let r = 3; r < ROWS; r++) for (let c = 0; c <= COLS-4; c++) s += evalWindow([b[r][c],b[r-1][c+1],b[r-2][c+2],b[r-3][c+3]], p);
  return s;
}

function minimaxAB(b: Board, depth: number, alpha: number, beta: number, isMax: boolean): { col: number; score: number } {
  const valid = getValidCols(b);
  const w = checkWinner(b);
  if (w?.winner === 2) return { col: -1, score: 1000000 };
  if (w?.winner === 1) return { col: -1, score: -1000000 };
  if (w?.winner === 'Draw' || valid.length === 0) return { col: -1, score: 0 };
  if (depth === 0) return { col: -1, score: scoreBoard(b, 2) };

  if (isMax) {
    let best = -Infinity, bestCol = valid[0];
    for (const c of valid) {
      const r = getOpenRow(b, c);
      const copy = b.map(row => [...row]);
      copy[r][c] = 2;
      const s = minimaxAB(copy, depth-1, alpha, beta, false).score;
      if (s > best) { best = s; bestCol = c; }
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return { col: bestCol, score: best };
  } else {
    let best = Infinity, bestCol = valid[0];
    for (const c of valid) {
      const r = getOpenRow(b, c);
      const copy = b.map(row => [...row]);
      copy[r][c] = 1;
      const s = minimaxAB(copy, depth-1, alpha, beta, true).score;
      if (s < best) { best = s; bestCol = c; }
      beta = Math.min(beta, best);
      if (alpha >= beta) break;
    }
    return { col: bestCol, score: best };
  }
}

// ── Animated Disc ─────────────────────────────────────────────────────────────
const AnimatedDisc = ({ player, isWinCell }: { player: Player | null; isWinCell: boolean }) => {
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
  const [mode, setMode]             = useState<GameMode>('PvP');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [board, setBoard]           = useState<Board>(makeBoard());
  const [currentPlayer, setCurrent] = useState<Player>(1);
  const [winResult, setWinResult]   = useState<{ winner: Player | 'Draw'; line: [number,number][] } | null>(null);
  const [gameOver, setGameOver]     = useState(false);
  const [scoreP1, setScoreP1]       = useState(0);
  const [scoreP2, setScoreP2]       = useState(0);
  const [aiThink, setAiThink]       = useState(false);
  const [resultTitle, setResultTitle] = useState('');
  const [resultAccent, setResultAccent] = useState<string>(ACCENT);

  const boardRef   = useRef(board);
  const currentRef = useRef(currentPlayer);
  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { currentRef.current = currentPlayer; }, [currentPlayer]);

  // Reset on mode/difficulty change
  useEffect(() => {
    const b = makeBoard();
    boardRef.current = b;
    setBoard(b);
    setCurrent(1);
    setWinResult(null);
    setGameOver(false);
    setAiThink(false);
    setResultTitle('');
  }, [mode, difficulty]);

  const resetBoard = useCallback(() => {
    tapMedium();
    const b = makeBoard();
    boardRef.current = b;
    setBoard(b);
    setCurrent(1);
    setWinResult(null);
    setGameOver(false);
    setAiThink(false);
    setResultTitle('');
  }, []);

  const fullReset = useCallback(() => {
    resetBoard();
    setScoreP1(0);
    setScoreP2(0);
  }, [resetBoard]);

  // Resolve after placing a disc
  const resolve = (newBoard: Board, player: Player, currentMode: GameMode): boolean => {
    const w = checkWinner(newBoard);
    if (w) {
      setWinResult(w);
      setGameOver(true);
      if (w.winner === 'Draw') {
        setResultTitle("IT'S A DRAW!");
        setResultAccent(Colors.text.muted);
        notifyError();
      } else if (w.winner === 1) {
        setScoreP1(s => s + 1);
        setResultTitle(currentMode === 'PvE' ? 'YOU WIN!' : 'PLAYER 1 WINS!');
        setResultAccent(P1_COLOR);
        notifySuccess();
      } else {
        setScoreP2(s => s + 1);
        setResultTitle(currentMode === 'PvE' ? 'CPU WINS!' : 'PLAYER 2 WINS!');
        setResultAccent(P2_COLOR);
        if (currentMode === 'PvE') notifyError(); else notifySuccess();
      }
      return true;
    }
    return false;
  };

  // Human drop
  const handleDrop = (col: number) => {
    if (gameOver || aiThink) return;
    if (mode === 'PvE' && currentPlayer === 2) return;

    const row = getOpenRow(board, col);
    if (row === -1) return;

    tapLight();
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = currentPlayer;
    boardRef.current = newBoard;
    setBoard(newBoard);

    if (!resolve(newBoard, currentPlayer, mode)) {
      setCurrent(currentPlayer === 1 ? 2 : 1);
    }
  };

  // AI turn
  useEffect(() => {
    if (mode !== 'PvE' || currentPlayer !== 2 || gameOver) return;

    setAiThink(true);
    const delay = difficulty === 'EASY' ? 500 : difficulty === 'MEDIUM' ? 700 : 900;

    const timer = setTimeout(() => {
      const b = boardRef.current;
      const valid = getValidCols(b);
      if (valid.length === 0) { setAiThink(false); return; }

      let col: number;
      if (difficulty === 'EASY') {
        col = valid[Math.floor(Math.random() * valid.length)];
      } else if (difficulty === 'MEDIUM') {
        col = minimaxAB(b.map(r => [...r]), 2, -Infinity, Infinity, true).col;
      } else {
        col = minimaxAB(b.map(r => [...r]), 4, -Infinity, Infinity, true).col;
      }

      const row = getOpenRow(b, col);
      if (row === -1) { setAiThink(false); return; }

      const newBoard = b.map(r => [...r]);
      newBoard[row][col] = 2;
      boardRef.current = newBoard;
      setAiThink(false);
      setBoard(newBoard);

      if (!resolve(newBoard, 2, 'PvE')) {
        setCurrent(1);
      }
    }, delay);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, mode, gameOver, difficulty]);

  // Winning cells set
  const winCells = new Set<string>();
  if (winResult?.line) {
    for (const [r,c] of winResult.line) winCells.add(`${r}-${c}`);
  }

  const turnColor = currentPlayer === 1 ? P1_COLOR : P2_COLOR;
  const turnLabel = gameOver
    ? resultTitle
    : aiThink
      ? 'AI THINKING...'
      : `${mode === 'PvE' && currentPlayer === 1 ? 'YOUR' : `P${currentPlayer}'S`} TURN`;

  return (
    <View style={styles.root}>
      <AnimatedBackground />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

        <GameHeader
          title="CONNECT 4"
          accentColor={ACCENT}
          onBack={() => router.replace('/')}
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
              <Seg options={['PvP','PvE'] as GameMode[]} labels={['👤 1v1','🤖 1v CPU']} value={mode} onChange={setMode} color={ACCENT} />
            </View>
            
            {mode === 'PvE' && (
              <View style={[styles.settingGroup, { marginTop: Spacing[4] }]}>
                <Text style={styles.settingLabel}>CPU DIFFICULTY</Text>
                <Seg options={['EASY','MEDIUM','HARD'] as Difficulty[]} labels={['EASY','MEDIUM','HARD']} value={difficulty} onChange={setDifficulty} color={ACCENT} />
              </View>
            )}
          </View>

          {/* ── Score ─── */}
          <View style={styles.scoreRow}>
            <View style={[styles.scoreCard, glassmorphism(), { borderColor: `${P1_COLOR}50` }]}>
              <Text style={[styles.scoreLabel, { color: P1_COLOR }]}>{mode === 'PvE' ? 'YOU' : 'P1'}</Text>
              <Text style={[styles.scoreNum, { color: P1_COLOR, textShadowColor: P1_COLOR }]}>{scoreP1}</Text>
            </View>
            <TouchableOpacity style={[styles.midBtn, glassmorphism()]} onPress={resetBoard} activeOpacity={0.8}>
              <Text style={styles.midBtnText}>↺</Text>
            </TouchableOpacity>
            <View style={[styles.scoreCard, glassmorphism(), { borderColor: `${P2_COLOR}50` }]}>
              <Text style={[styles.scoreLabel, { color: P2_COLOR }]}>{mode === 'PvE' ? `CPU` : 'P2'}</Text>
              <Text style={[styles.scoreNum, { color: P2_COLOR, textShadowColor: P2_COLOR }]}>{scoreP2}</Text>
            </View>
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
                  style={styles.column}
                  onPress={() => handleDrop(c)}
                  disabled={gameOver || aiThink || (mode === 'PvE' && currentPlayer === 2)}
                  activeOpacity={0.85}
                >
                  {board.map((row, r) => (
                    <View key={`${r}-${c}`} style={styles.cellOuter}>
                      <View style={[styles.cellHole, winCells.has(`${r}-${c}`) && { borderColor: '#FFD70080' }]}>
                        <AnimatedDisc player={row[c]} isWinCell={winCells.has(`${r}-${c}`)} />
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
          score={winResult?.winner === 'Draw' ? '—' : '+1'}
          accentColor={resultAccent}
          onRestart={resetBoard}
          onHome={() => { fullReset(); router.replace('/'); }}
        />
      </SafeAreaView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
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
  seg: {
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

  // Score
  scoreRow: { flexDirection: 'row', width: '100%', gap: Spacing[3], alignItems: 'center' },
  scoreCard: { flex: 1, paddingVertical: Spacing[3], paddingHorizontal: Spacing[2], borderRadius: Radius.md, alignItems: 'center', borderWidth: 1.5 },
  scoreLabel: { fontFamily: Fonts.heading, fontSize: 9, marginBottom: 2, letterSpacing: 1 },
  scoreNum: { fontFamily: Fonts.heading, fontSize: FontSize['2xl'], textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
  midBtn: {
    width: 46,
    height: 46,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${ACCENT}80`,
    backgroundColor: `${ACCENT}20`,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 3,
  },
  midBtnText: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.xl,
    color: ACCENT,
    textShadowColor: ACCENT,
    textShadowRadius: 8,
  },

  // Turn
  turnRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], height: 24 },
  turnDot: { width: 10, height: 10, borderRadius: 5 },
  turnText: { fontFamily: Fonts.heading, fontSize: FontSize.sm, letterSpacing: 2, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },

  // Board
  boardFrame: {
    padding: Spacing[2],
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: `${ACCENT}40`,
    ...elegantShadow(0.5, 30, 15),
    shadowColor: ACCENT,
  },
  boardGrid: {
    flexDirection: 'row',
    backgroundColor: '#0D1B4A',
    borderRadius: Radius.md,
    padding: 3,
    overflow: 'hidden',
  },
  column: {
    width: CELL_SIZE,
    alignItems: 'center',
  },
  cellOuter: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    padding: 3,
  },
  cellHole: {
    flex: 1,
    borderRadius: 100,
    backgroundColor: 'rgba(0,0,0,0.75)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  disc: {
    width: DISC_SIZE - 8,
    height: DISC_SIZE - 8,
    borderRadius: 100,
    borderWidth: 2,
  },

  // Reset
  resetBtn: {
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[8],
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: `${ACCENT}80`,
    backgroundColor: `${ACCENT}20`,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 3,
  },
  resetBtnText: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.xs,
    color: ACCENT,
    letterSpacing: 2,
    textShadowColor: ACCENT,
    textShadowRadius: 8,
  },
});
