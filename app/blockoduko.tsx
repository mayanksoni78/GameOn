import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, PointerEvent
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../src/theme/colors';
import { Fonts, FontSize } from '../src/theme/typography';
import { Spacing, Radius } from '../src/theme/spacing';
import { AnimatedBackground } from '../src/components/AnimatedBackground';
import { GameHeader } from '../src/components/GameHeader';
import { GameOverModal } from '../src/components/GameOverModal';
import { screenWidth, screenHeight } from '../src/utils/dimensions';
import { tapLight, tapMedium, notifyError, notifySuccess } from '../src/utils/haptics';

// ── Theme ─────────────────────────────────────────────────────────────────────
const ACCENT = '#00E5FF';

// ── Grid sizing ───────────────────────────────────────────────────────────────
const GRID = 10;
const RESERVED_V = 320;
const BOARD_SIZE = Math.min(screenWidth - 16, screenHeight - RESERVED_V, 520);
const CELL = Math.floor(BOARD_SIZE / GRID);
const ACTUAL_BOARD = CELL * GRID;

// ── Piece tray sizing ─────────────────────────────────────────────────────────
const TRAY_CELL = Math.floor(CELL * 0.5);
// Offsetpiece so it sits clearly above the thumb while dragging on touch devices
const DRAG_OFFSET_Y = 80;

// ── Shape definitions ─────────────────────────────────────────────────────────
const SHAPE_DEFS = [
  { cells: [[0,0]],                                       color: '#A855F7' }, // Dot
  { cells: [[0,0],[0,1]],                                 color: '#3B82F6' }, // H2
  { cells: [[0,0],[1,0]],                                 color: '#3B82F6' }, // V2
  { cells: [[0,0],[0,1],[0,2]],                           color: '#00E5FF' }, // H3
  { cells: [[0,0],[1,0],[2,0]],                           color: '#00E5FF' }, // V3
  { cells: [[0,0],[0,1],[1,0],[1,1]],                     color: '#FFD600' }, // Square
  { cells: [[0,0],[1,0],[1,1]],                           color: '#EC4899' }, // L-Small
  { cells: [[0,0],[0,1],[0,2],[1,2],[2,2]],               color: '#F97316' }, // L-Large
  { cells: [[0,0],[0,1],[1,1],[1,2]],                     color: '#10B981' }, // Z
  { cells: [[0,0],[0,1],[0,2],[1,1]],                     color: '#8B5CF6' }, // T
];

type CellColor = string | null;
type Board = CellColor[][];
type Piece = { cells: number[][]; color: string; id: string };

// ── Pure helpers ──────────────────────────────────────────────────────────────
const emptyBoard = (): Board =>
  Array.from({ length: GRID }, () => Array.from({ length: GRID }, () => null));

const canPlace = (cells: number[][], r: number, c: number, board: Board): boolean => {
  for (const [dr, dc] of cells) {
    const tr = r + dr, tc = c + dc;
    if (tr < 0 || tr >= GRID || tc < 0 || tc >= GRID || board[tr][tc] !== null) return false;
  }
  return true;
};

const anyCanPlace = (pieces: Piece[], board: Board): boolean => {
  for (const p of pieces) {
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if (canPlace(p.cells, r, c, board)) return true;
      }
    }
  }
  return false;
};

const doPlace = (cells: number[][], r: number, c: number, color: string, board: Board): number => {
  let count = 0;
  for (const [dr, dc] of cells) {
    board[r + dr][c + dc] = color;
    count++;
  }
  return count;
};

/** Clear completed rows and columns. Returns number of cleared cells. */
const clearCompleted = (board: Board): number => {
  const toClear = new Set<string>();

  for (let r = 0; r < GRID; r++) {
    if (board[r].every(c => c !== null)) {
      for (let c = 0; c < GRID; c++) toClear.add(`${r}-${c}`);
    }
  }

  for (let c = 0; c < GRID; c++) {
    let full = true;
    for (let r = 0; r < GRID; r++) { if (board[r][c] === null) { full = false; break; } }
    if (full) {
      for (let r = 0; r < GRID; r++) toClear.add(`${r}-${c}`);
    }
  }

  for (const key of toClear) {
    const [r, c] = key.split('-').map(Number);
    board[r][c] = null;
  }
  return toClear.size;
};

const randomPiece = (): Piece => {
  const def = SHAPE_DEFS[Math.floor(Math.random() * SHAPE_DEFS.length)];
  return { cells: def.cells, color: def.color, id: Math.random().toString(36) };
};

const genThree = (): Piece[] => [randomPiece(), randomPiece(), randomPiece()];

// ══════════════════════════════════════════════════════════════════════════════
// ── Draggable Piece ──────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const DraggablePiece = React.memo(({
  piece, index,
  boardLayoutRef,
  boardStateRef,
  onPlace,
  onHover,
  onHoverEnd,
}: {
  piece: Piece;
  index: number;
  boardLayoutRef: React.MutableRefObject<{ x: number; y: number } | null>;
  boardStateRef: React.MutableRefObject<Board>;
  onPlace: (idx: number, r: number, c: number) => void;
  onHover: (cells: number[][], r: number, c: number, valid: boolean, color: string) => void;
  onHoverEnd: () => void;
}) => {
  const viewRef = useRef<View>(null);
  const pan = useRef(new Animated.ValueXY()).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const elevate = useRef(new Animated.Value(0)).current;

  // Track initial touch position for calculating exact dx/dy
  const startPos = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  const toGrid = useCallback((pageX: number, pageY: number): { r: number; c: number } | null => {
    const bl = boardLayoutRef.current;
    if (!bl) return null;
    
    // pageX and pageY are relative to the entire screen.
    // The piece's top-left cell visually lands where the finger is, minus DRAG_OFFSET_Y.
    const relX = pageX - bl.x;
    const relY = (pageY - DRAG_OFFSET_Y) - bl.y;
    
    // Snap to grid cells
    const c = Math.floor(relX / CELL);
    const r = Math.floor(relY / CELL);
    
    return { r, c };
  }, [boardLayoutRef]);

  const handlePointerDown = (e: PointerEvent) => {
    isDragging.current = true;
    startPos.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
    
    // Capture pointer so we get move events even if finger leaves the element bounds
    if (viewRef.current) {
      // Some React Native versions support this on the native element
      (viewRef.current as any).setPointerCapture?.(e.nativeEvent.pointerId);
    }
    
    tapLight();
    elevate.setValue(100);
    Animated.spring(scaleAnim, { toValue: 1.15, useNativeDriver: false, friction: 5 }).start();
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging.current) return;
    
    const dx = e.nativeEvent.pageX - startPos.current.x;
    const dy = e.nativeEvent.pageY - startPos.current.y;
    
    // Move physically
    pan.setValue({ x: dx, y: dy - DRAG_OFFSET_Y });
    
    const pos = toGrid(e.nativeEvent.pageX, e.nativeEvent.pageY);
    if (pos) {
      const valid = canPlace(piece.cells, pos.r, pos.c, boardStateRef.current);
      onHover(piece.cells, pos.r, pos.c, valid, piece.color);
    } else {
      onHoverEnd();
    }
  };

  const releaseOrCancel = (e: PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    
    if (viewRef.current) {
      (viewRef.current as any).releasePointerCapture?.(e.nativeEvent.pointerId);
    }
    
    onHoverEnd();
    
    const pos = toGrid(e.nativeEvent.pageX, e.nativeEvent.pageY);
    if (pos && canPlace(piece.cells, pos.r, pos.c, boardStateRef.current)) {
      onPlace(index, pos.r, pos.c);
    } else {
      notifyError();
    }
    
    Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 6 }).start();
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: false, friction: 6 }).start();
    elevate.setValue(0);
  };

  // Pre-calculate shape bounding box to render the piece grid in the tray
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  for (const [dr, dc] of piece.cells) {
    minR = Math.min(minR, dr); maxR = Math.max(maxR, dr);
    minC = Math.min(minC, dc); maxC = Math.max(maxC, dc);
  }
  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;
  const grid: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  for (const [dr, dc] of piece.cells) grid[dr - minR][dc - minC] = true;

  // We add a wrapper with larger padding so it's easier to grab on mobile.
  // The Animated.View translates the whole wrapper.
  return (
    <Animated.View
      ref={viewRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={releaseOrCancel}
      onPointerCancel={releaseOrCancel}
      style={{
        zIndex: elevate as any,
        transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: scaleAnim }],
        padding: Spacing[2],
        alignItems: 'center',
        justifyContent: 'center',
        // Touch action prevents browser scrolling on web when dragging
        touchAction: 'none' as any,
      }}
    >
      {grid.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row' }}>
          {row.map((filled, ci) => (
            <View
              key={ci}
              style={[
                { width: TRAY_CELL, height: TRAY_CELL, margin: 1, borderRadius: 3 },
                filled
                  ? {
                      backgroundColor: piece.color,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.3)',
                      shadowColor: piece.color,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.6,
                      shadowRadius: 4,
                      elevation: 3,
                    }
                  : { backgroundColor: 'transparent' },
              ]}
            >
              {filled && <View style={styles.blockGloss} />}
            </View>
          ))}
        </View>
      ))}
    </Animated.View>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Main Game ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function Blockoduko() {
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [pieces, setPieces] = useState<Piece[]>(genThree);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  
  const [hover, setHover] = useState<{
    cells: number[][]; r: number; c: number; valid: boolean; color: string;
  } | null>(null);

  // Refs for stable closures during dragged state
  const boardRef = useRef<Board>(board);
  const piecesRef = useRef<Piece[]>(pieces);
  const scoreRef = useRef(score);
  const highScoreRef = useRef(highScore);

  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { piecesRef.current = pieces; }, [pieces]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { highScoreRef.current = highScore; }, [highScore]);

  // Absolute page location of board top-left corner
  const boardLayoutRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('blockoduko_hs').then(v => v && setHighScore(parseInt(v)));
  }, []);

  const handleHover = useCallback((cells: number[][], r: number, c: number, valid: boolean, color: string) => {
    setHover(prev => {
      if (prev && prev.r === r && prev.c === c && prev.valid === valid) return prev;
      return { cells, r, c, valid, color };
    });
  }, []);
  const handleHoverEnd = useCallback(() => setHover(null), []);

  const handlePlace = useCallback((pieceIdx: number, r: number, c: number) => {
    const currentBoard = boardRef.current;
    const currentPieces = piecesRef.current;
    const piece = currentPieces[pieceIdx];
    if (!piece || !canPlace(piece.cells, r, c, currentBoard)) return;

    tapMedium();

    const newBoard: Board = currentBoard.map(row => [...row]);
    const placed = doPlace(piece.cells, r, c, piece.color, newBoard);
    const cleared = clearCompleted(newBoard);

    const gained = placed * 10 + cleared * 10;
    const newScore = scoreRef.current + gained;

    if (cleared > 0) notifySuccess();

    const remaining = currentPieces.filter((_, i) => i !== pieceIdx);
    const nextPieces = remaining.length === 0 ? genThree() : remaining;
    const isOver = !anyCanPlace(nextPieces, newBoard);

    setBoard(newBoard);
    setScore(newScore);
    setPieces(nextPieces);

    if (isOver) {
      setGameOver(true);
      notifyError();
      const hs = highScoreRef.current;
      if (newScore > hs) {
        setHighScore(newScore);
        AsyncStorage.setItem('blockoduko_hs', newScore.toString());
      }
    }
  }, []);

  const restart = useCallback(() => {
    setBoard(emptyBoard());
    setPieces(genThree());
    setScore(0);
    setGameOver(false);
    setHover(null);
  }, []);

  const boardViewRef = useRef<View | null>(null);
  
  // Need multiple passes for reliable measurements on Android vs iOS
  const measureBoard = useCallback(() => {
    boardViewRef.current?.measure((_x, _y, _w, _h, px, py) => {
      if (px !== undefined && py !== undefined) {
        boardLayoutRef.current = { x: px, y: py };
      }
    });
  }, []);

  const onBoardLayout = useCallback((ref: View | null) => {
    if (!ref) return;
    boardViewRef.current = ref;
    // Delay measurement slightly to ensure paint is complete
    setTimeout(measureBoard, 200);
  }, [measureBoard]);

  return (
    <View style={styles.root}>
      <AnimatedBackground />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

        <GameHeader
          title="BLOCKUDOKU"
          score={score}
          highScore={highScore}
          accentColor={ACCENT}
          onBack={() => router.replace('/')}
        />

        <View style={styles.container} onLayout={measureBoard}>

          {/* ── Board ── */}
          <View
            ref={onBoardLayout}
            onLayout={measureBoard}
            style={[styles.boardFrame, { width: ACTUAL_BOARD, height: ACTUAL_BOARD }]}
          >
            {Array.from({ length: GRID }, (_, r) => (
              <View key={r} style={styles.row}>
                {Array.from({ length: GRID }, (_, c) => {
                  const cellColor = board[r][c];

                  // Hover highlight processing
                  let isHover = false;
                  let hoverValid = false;
                  let hoverColor = '';
                  
                  if (hover) {
                    for (const [dr, dc] of hover.cells) {
                      if (hover.r + dr === r && hover.c + dc === c) {
                        isHover = true;
                        hoverValid = hover.valid;
                        hoverColor = hover.color;
                        break;
                      }
                    }
                  }

                  // Determine colors based on cell state
                  let appliedBg = 'transparent';
                  let appliedBorder = 'transparent';
                  
                  if (cellColor !== null) {
                    appliedBg = cellColor;
                    appliedBorder = 'rgba(255,255,255,0.25)';
                  } else if (isHover) {
                    // True green or red for ghosting
                    appliedBg = hoverValid ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
                    appliedBorder = hoverValid ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)';
                  }

                  return (
                    <View
                      key={c}
                      style={[
                        styles.cell,
                        { width: CELL, height: CELL },
                      ]}
                    >
                      <View
                        style={[
                          styles.cellInner,
                          (cellColor !== null || isHover) && {
                            backgroundColor: appliedBg,
                            borderWidth: 1,
                            borderColor: appliedBorder,
                          },
                          cellColor !== null && {
                            shadowColor: cellColor,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.5,
                            shadowRadius: 3,
                          }
                        ]}
                      >
                        {(cellColor !== null || isHover) && <View style={styles.blockGloss} />}
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {/* ── Tray ── */}
          <View style={styles.trayContainer}>
            {pieces.map((piece, index) => (
              <DraggablePiece
                key={piece.id}
                piece={piece}
                index={index}
                boardLayoutRef={boardLayoutRef}
                boardStateRef={boardRef}
                onPlace={handlePlace}
                onHover={handleHover}
                onHoverEnd={handleHoverEnd}
              />
            ))}
          </View>

          {/* ── Restart ── */}
          <TouchableOpacity style={styles.resetBtn} onPress={restart} activeOpacity={0.7}>
            <Text style={styles.resetBtnText}>↻ RESTART</Text>
          </TouchableOpacity>

        </View>

        <GameOverModal
          visible={gameOver}
          title="NO MOVES"
          score={score}
          highScore={highScore}
          isNewHighScore={score > highScore && score > 0}
          accentColor={ACCENT}
          onRestart={restart}
          onHome={() => router.replace('/')}
        />

      </SafeAreaView>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Styles ───────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  safe: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Spacing[3],
  },

  // Board
  boardFrame: {
    backgroundColor: 'rgba(8, 4, 18, 0.85)',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden', // Contains children so borders don't leak
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 6,
    zIndex: 1, // Board is below dragging tray
  },
  row: { flexDirection: 'row' },
  cell: {
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellInner: {
    width: '86%',
    height: '86%',
    borderRadius: 3,
  },
  blockGloss: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: '45%',
    height: '35%',
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 2,
  },

  // Tray - requires higher zIndex than board to allow pieces to float over it
  trayContainer: {
    width: '100%',
    maxWidth: 500,
    marginTop: Spacing[6],
    height: TRAY_CELL * 4 + Spacing[4] * 2, // Fixed height ensures stable baseline
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[2],
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    zIndex: 10, // Higher than board
    elevation: 10,
  },

  // Restart
  resetBtn: {
    marginTop: Spacing[6],
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[8],
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: `${ACCENT}80`,
    backgroundColor: `${ACCENT}18`,
    zIndex: 1,
  },
  resetBtnText: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.sm,
    color: ACCENT,
    letterSpacing: 2,
    textShadowColor: ACCENT,
    textShadowRadius: 6,
  },
});
