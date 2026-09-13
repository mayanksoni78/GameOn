import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, PointerEvent, useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../src/theme/colors';
import { Fonts, FontSize } from '../src/theme/typography';
import { Spacing } from '../src/theme/spacing';
import { CyberBackground } from '../src/components/CyberBackground';
import { GameHeader } from '../src/components/GameHeader';
import { GameOverModal } from '../src/components/GameOverModal';
import { tapLight, tapMedium, notifyError, notifySuccess } from '../src/utils/haptics';

// ── Theme ─────────────────────────────────────────────────────────────────────
const ACCENT = '#00E5FF';

// ── Grid sizing ───────────────────────────────────────────────────────────────
const GRID = 10;
const DRAG_OFFSET_Y = 80;

// ── Shape definitions ─────────────────────────────────────────────────────────
const SHAPE_DEFS: { cells: [number, number][]; color: string }[] = [
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
type Piece = { cells: [number, number][]; color: string; id: string };

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
  cellSize,
  trayCellSize,
  boardLayoutRef,
  boardStateRef,
  onPlace,
  onHover,
  onHoverEnd,
}: {
  piece: Piece;
  index: number;
  cellSize: number;
  trayCellSize: number;
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
    const c = Math.floor(relX / cellSize);
    const r = Math.floor(relY / cellSize);
    
    return { r, c };
  }, [boardLayoutRef, cellSize]);

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
                { width: trayCellSize, height: trayCellSize, margin: 1, borderRadius: 2 },
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

import { useEngine, BlockodukoEngine } from '../src/engines';

// ══════════════════════════════════════════════════════════════════════════════
// ── Main Game ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function Blockoduko() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const boardSize = Math.min(windowWidth - 24, windowHeight - 350, 460);
  const cellSize = Math.max(22, Math.floor(boardSize / GRID));
  const actualBoard = cellSize * GRID;
  const trayCellSize = Math.floor(cellSize * 0.5);

  const [gameState, engine] = useEngine(() => new BlockodukoEngine());
  const { grid: board, dockPieces, score, highScore, gameOver } = gameState;

  const [hover, setHover] = useState<{
    cells: number[][]; r: number; c: number; valid: boolean; color: string;
  } | null>(null);

  const boardRef = useRef<Board>(board as any);
  const scoreRef = useRef(score);
  const highScoreRef = useRef(highScore);

  useEffect(() => { boardRef.current = board as any; }, [board]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { highScoreRef.current = highScore; }, [highScore]);

  // Absolute page location of board top-left corner
  const boardLayoutRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('blockoduko_hs').then(v => {
      if (v) {
        const hs = parseInt(v, 10);
        if (hs > engine.getHighScore()) {
          engine.setHighScore(hs);
        }
      }
    });
  }, []);

  const handleHover = useCallback((cells: number[][], r: number, c: number, valid: boolean, color: string) => {
    setHover(prev => {
      if (prev && prev.r === r && prev.c === c && prev.valid === valid) return prev;
      return { cells, r, c, valid, color };
    });
  }, []);
  const handleHoverEnd = useCallback(() => setHover(null), []);

  const handlePlace = useCallback((pieceIdx: number, r: number, c: number) => {
    const success = engine.placePiece(pieceIdx, r, c);
    if (success) {
      tapMedium();
      const s = engine.getScore();
      if (s > engine.getHighScore()) {
        AsyncStorage.setItem('blockoduko_hs', s.toString());
      }
      if (engine.getState().gameOver) {
        notifyError();
      }
    }
  }, [engine]);

  const restart = useCallback(() => {
    tapMedium();
    engine.reset();
    setHover(null);
  }, [engine]);

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
    setTimeout(measureBoard, 200);
  }, [measureBoard]);

  return (
    <View style={styles.root}>
      <CyberBackground theme="blockudoku" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

        <GameHeader
          title="BLOCKUDOKU"
          category="PUZZLE"
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
            style={[styles.boardFrame, { width: actualBoard, height: actualBoard }]}
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
                    appliedBg = hoverValid ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
                    appliedBorder = hoverValid ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)';
                  }

                  return (
                    <View
                      key={c}
                      style={[
                        styles.cell,
                        { width: cellSize, height: cellSize },
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
            {dockPieces.map((piece, index) => {
              if (!piece) return null;
              return (
                <DraggablePiece
                  key={piece.id}
                  piece={piece as Piece}
                  index={index}
                  cellSize={cellSize}
                  trayCellSize={trayCellSize}
                  boardLayoutRef={boardLayoutRef}
                  boardStateRef={boardRef}
                  onPlace={handlePlace}
                  onHover={handleHover}
                  onHoverEnd={handleHoverEnd}
                />
              );
            })}
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
  root: { flex: 1, backgroundColor: 'transparent' },
  safe: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 28,
  },

  // Board
  boardFrame: {
    backgroundColor: '#12111A',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 1,
  },
  row: { flexDirection: 'row' },
  cell: {
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellInner: {
    width: '88%',
    height: '88%',
    borderRadius: 2,
  },
  blockGloss: {
    position: 'absolute',
    top: 1,
    left: 1,
    width: '45%',
    height: '35%',
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 1,
  },

  // Tray
  trayContainer: {
    width: '94%',
    maxWidth: 460,
    marginTop: Spacing[4],
    minHeight: 80,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[2],
    backgroundColor: '#12111A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 10,
    elevation: 4,
  },

  // Restart
  resetBtn: {
    marginTop: Spacing[4],
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
    zIndex: 1,
  },
  resetBtnText: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.xs,
    color: '#F4F4F5',
    letterSpacing: 1.5,
  },
});
