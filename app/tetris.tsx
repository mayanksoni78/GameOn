import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Colors, glassmorphism, elegantShadow } from '../src/theme/colors';
import { Fonts, FontSize } from '../src/theme/typography';
import { Radius, Spacing } from '../src/theme/spacing';
import { CyberBackground } from '../src/components/CyberBackground';
import { GameHeader } from '../src/components/GameHeader';
import { GameOverModal } from '../src/components/GameOverModal';
import { ControlsOverlay } from '../src/components/ControlsOverlay';
import { screenWidth, screenHeight } from '../src/utils/dimensions';
import { tapLight, notifySuccess, notifyError, tapMedium } from '../src/utils/haptics';
import { useKeyboard, KeyboardKey } from '../src/hooks/useKeyboard';
import Animated, { runOnJS, useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const ACCENT = Colors.accent.secondary;
const ROWS = 20;
const COLS = 10;
const BASE_SPEED = 800;

const TETROMINOS = {
  I: { shape: [[1, 1, 1, 1]], color: '#00F0FF' }, // Electric Neon Cyan
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#2979FF' }, // Deep Sapphire Blue
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#FF9100' }, // Vibrant Sunset Orange
  O: { shape: [[1, 1], [1, 1]], color: '#FFEA00' }, // Bright Lemon Yellow
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#00E676' }, // Toxic Emerald Green
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#D500F9' }, // Cyberpunk Magenta
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#FF1744' }, // Crimson Red
};

type TetrominoType = keyof typeof TETROMINOS;

const AnimatedPieceCell = memo(({ r, c, cellSize, color, isGhost }: { r: number, c: number, cellSize: number, color: string, isGhost?: boolean }) => {
    const animX = useSharedValue(c * cellSize);
    const animY = useSharedValue(r * cellSize);
    
    useEffect(() => {
        // Fast snap timing to feel snappy but not rigid
        animX.value = withTiming(c * cellSize, { duration: 60, easing: Easing.linear });
        animY.value = withTiming(r * cellSize, { duration: 60, easing: Easing.linear });
    }, [c, r, cellSize]);

    const style = useAnimatedStyle(() => ({
        transform: [{ translateX: animX.value }, { translateY: animY.value }]
    }));

    return (
        <Animated.View style={[{
            position: 'absolute',
            width: cellSize,
            height: cellSize,
            zIndex: isGhost ? 5 : 10,
        }, style]}>
            <View style={{
                flex: 1,
                margin: 1, // Inner spacing to show grid gaps
                backgroundColor: isGhost ? 'transparent' : color,
                borderColor: isGhost ? color : 'rgba(255,255,255,0.6)',
                borderWidth: isGhost ? 2 : 1.5,
                borderRadius: 4,
                opacity: isGhost ? 0.3 : 1,
                ...(isGhost ? {} : elegantShadow(0.8, 12, 6)),
                shadowColor: color
            }}>
                {/* 3D Inner Highlight */}
                {!isGhost && <View style={{ position: 'absolute', top: 1, left: 1, width: '40%', height: '30%', backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 2 }} />}
            </View>
        </Animated.View>
    );
});
AnimatedPieceCell.displayName = 'AnimatedPieceCell';

export default function Tetris() {
  const [boardWidth, setBoardWidth] = useState(0);
  const [cellSize, setCellSize] = useState(0);
  const [grid, setGrid] = useState<string[][]>(Array(ROWS).fill(Array(COLS).fill('')));
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  
  const [currentPiece, setCurrentPiece] = useState<{
    shape: number[][];
    color: string;
    r: number;
    c: number;
    type: TetrominoType;
  } | null>(null);

  const [nextPieceType, setNextPieceType] = useState<TetrominoType>('T');
  const [holdPieceType, setHoldPieceType] = useState<TetrominoType | null>(null);
  const [canHold, setCanHold] = useState(true);

  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const gameStartedRef = useRef(gameStarted);
  const isPausedRef = useRef(isPaused);

  const gameLoopRef = useRef<any>(null);
  const currentPieceRef = useRef(currentPiece);
  const gridRef = useRef(grid);
  const gameOverRef = useRef(gameOver);

  useEffect(() => {
      currentPieceRef.current = currentPiece;
      gridRef.current = grid;
      gameOverRef.current = gameOver;
      gameStartedRef.current = gameStarted;
      isPausedRef.current = isPaused;
  }, [currentPiece, grid, gameOver, gameStarted, isPaused]);

  useEffect(() => {
    AsyncStorage.getItem('tetris_hs').then(s => s && setHighScore(parseInt(s)));
    
    // Increased bounds for better scaling and larger cells
    const maxW = Math.min(screenWidth - 32, 500); 
    const maxH = screenHeight * 0.72;
    const size = Math.floor(Math.min(maxW / COLS, maxH / ROWS));
    
    setCellSize(size);
    setBoardWidth(size * COLS);
    spawnPiece();
  }, []);

  const getRandomType = (): TetrominoType => {
    const keys = Object.keys(TETROMINOS) as TetrominoType[];
    return keys[Math.floor(Math.random() * keys.length)];
  };

  const spawnPiece = useCallback((typeToSpawn?: TetrominoType) => {
    const type = typeToSpawn || nextPieceType;
    if (!typeToSpawn) setNextPieceType(getRandomType());
    
    const tetromino = TETROMINOS[type];
    const newPiece = {
      shape: tetromino.shape,
      color: tetromino.color,
      r: 0,
      c: Math.floor(COLS / 2) - Math.floor(tetromino.shape[0].length / 2),
      type: type,
    };

    if (isValidMove(newPiece.shape, newPiece.r, newPiece.c, gridRef.current)) {
      setCurrentPiece(newPiece);
      setCanHold(true);
    } else {
      handleGameOver();
    }
  }, [nextPieceType]);

  const holdPiece = useCallback(() => {
      if (gameOverRef.current || isPausedRef.current || !gameStartedRef.current || !currentPieceRef.current || !canHold) return;
      tapLight();
      const currentType = currentPieceRef.current.type;
      
      if (holdPieceType) {
          spawnPiece(holdPieceType);
      } else {
          spawnPiece(); // Just spawn next
      }
      setHoldPieceType(currentType);
      setCanHold(false);
  }, [holdPieceType, canHold, spawnPiece]);

  const isValidMove = (shape: number[][], r: number, c: number, currentGrid: string[][]) => {
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const newR = r + row;
          const newC = c + col;
          if (newC < 0 || newC >= COLS || newR >= ROWS || (newR >= 0 && currentGrid[newR][newC] !== '')) {
            return false;
          }
        }
      }
    }
    return true;
  };

  const move = useCallback((dr: number, dc: number) => {
    if (gameOverRef.current || isPausedRef.current || !gameStartedRef.current) return false;
    const cp = currentPieceRef.current;
    if (!cp) return false;
    const newR = cp.r + dr;
    const newC = cp.c + dc;
    
    if (isValidMove(cp.shape, newR, newC, gridRef.current)) {
      setCurrentPiece({ ...cp, r: newR, c: newC });
      return true;
    }
    return false;
  }, []);

  const rotate = useCallback(() => {
    if (gameOverRef.current || isPausedRef.current || !gameStartedRef.current) return;
    const cp = currentPieceRef.current;
    if (!cp) return;
    tapLight();
    const rotated = cp.shape[0].map((_, i) =>
      cp.shape.map(row => row[i]).reverse()
    );
    if (isValidMove(rotated, cp.r, cp.c, gridRef.current)) {
      setCurrentPiece({ ...cp, shape: rotated });
    } else {
        // Wall kick attempt (simple)
        if (isValidMove(rotated, cp.r, cp.c - 1, gridRef.current)) {
            setCurrentPiece({ ...cp, shape: rotated, c: cp.c - 1 });
        } else if (isValidMove(rotated, cp.r, cp.c + 1, gridRef.current)) {
            setCurrentPiece({ ...cp, shape: rotated, c: cp.c + 1 });
        }
    }
  }, []);

  const hardDrop = useCallback(() => {
    if (gameOverRef.current || isPausedRef.current || !gameStartedRef.current) return;
    const cp = currentPieceRef.current;
    if (!cp) return;
    tapMedium();
    let dropR = cp.r;
    while (isValidMove(cp.shape, dropR + 1, cp.c, gridRef.current)) {
      dropR++;
    }
    const finalPiece = { ...cp, r: dropR };
    setCurrentPiece(finalPiece);
    // Instantly lock
    lockPiece(finalPiece);
  }, []);

  const lockPiece = useCallback((pieceToLock = currentPieceRef.current) => {
    const cp = pieceToLock;
    if (!cp) return;
    const newGrid = gridRef.current.map(row => [...row]);
    let locked = false;

    for (let r = 0; r < cp.shape.length; r++) {
      for (let c = 0; c < cp.shape[r].length; c++) {
        if (cp.shape[r][c]) {
          if (cp.r + r < 0) {
            handleGameOver();
            return;
          }
          newGrid[cp.r + r][cp.c + c] = cp.color;
          locked = true;
        }
      }
    }

    if (locked) {
      let linesCleared = 0;
      const filteredGrid = newGrid.filter(row => row.some(cell => cell === ''));
      linesCleared = ROWS - filteredGrid.length;

      const finalGrid = [
        ...Array(linesCleared).fill(Array(COLS).fill('')),
        ...filteredGrid
      ];

      setGrid(finalGrid);
      if (linesCleared > 0) {
        setScore(s => s + linesCleared * 100);
        notifySuccess();
      }
      spawnPiece();
    }
  }, [spawnPiece]);

  useEffect(() => {
    if (gameOver) {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      return;
    }

    gameLoopRef.current = setInterval(() => {
      if (gameOverRef.current || isPausedRef.current || !gameStartedRef.current) return;
      if (!move(1, 0)) {
        lockPiece();
      }
    }, Math.max(150, BASE_SPEED - Math.floor(score / 500) * 100));

    return () => clearInterval(gameLoopRef.current);
  }, [move, lockPiece, gameOver, score]);

  const handleGameOver = () => {
    setGameOver(true);
    notifyError();
    if (score > highScore) {
      setHighScore(score);
      AsyncStorage.setItem('tetris_hs', score.toString());
    }
  };

  const restart = () => {
    setGrid(Array(ROWS).fill(Array(COLS).fill('')));
    setScore(0);
    setGameOver(false);
    setGameStarted(false);
    setIsPaused(false);
    setHoldPieceType(null);
    setNextPieceType(getRandomType());
    spawnPiece(getRandomType());
  };

  useKeyboard((key: KeyboardKey) => {
    if (key === 'Enter') {
        if (gameOver) restart();
        else if (!gameStarted) {
            setGameStarted(true);
            setIsPaused(false);
        } else {
            setIsPaused(prev => !prev);
        }
        return;
    }
    switch (key) {
      case 'ArrowUp': case 'w': case 'W': rotate(); break;
      case 'ArrowDown': case 's': case 'S': move(1, 0); break;
      case 'ArrowLeft': case 'a': case 'A': move(0, -1); break;
      case 'ArrowRight': case 'd': case 'D': move(0, 1); break;
      case ' ': hardDrop(); break;
      case 'Shift': holdPiece(); break;
    }
  }, { disableRepeat: false, preventDefault: true });

  // Gestures for Mobile
  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .activeOffsetY([-10, 10])
    .onUpdate((e) => {
        // Discrete movement tracking
        const threshold = cellSize;
        if (e.translationX > threshold) {
            runOnJS(move)(0, 1);
            e.translationX -= threshold; // Consume
        } else if (e.translationX < -threshold) {
            runOnJS(move)(0, -1);
            e.translationX += threshold; // Consume
        }
        if (e.translationY > threshold) {
            runOnJS(move)(1, 0);
            e.translationY -= threshold;
        }
    })
    .onEnd((e) => {
        if (e.velocityY > 1500) {
            runOnJS(hardDrop)();
        }
    });

  const tapGesture = Gesture.Tap().onStart(() => {
      runOnJS(rotate)();
  });

  const composedGesture = Gesture.Simultaneous(panGesture, tapGesture);

  if (!cellSize) return null;

  const nextPiece = TETROMINOS[nextPieceType];
  const holdPieceData = holdPieceType ? TETROMINOS[holdPieceType] : null;

  let ghostR = 0;
  if (currentPiece) {
      ghostR = currentPiece.r;
      while (isValidMove(currentPiece.shape, ghostR + 1, currentPiece.c, grid)) {
          ghostR++;
      }
  }

  // Precompute level
  const currentLevel = Math.floor(score / 500) + 1;

  return (
    <View style={styles.root}>
      <CyberBackground autoScroll />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        
        <GameHeader
          title="TETRIS"
          score={score}
          highScore={highScore}
          accentColor={ACCENT}
          onBack={() => { setGameOver(true); router.replace('/'); }}
        />

        <ControlsOverlay
          instructions={[
            "Clear horizontal lines by dropping blocks.",
            "The game gets faster as your level increases."
          ]}
          controls={[
            { action: "Move", input: "Swipe / A/D / Arrows" },
            { action: "Rotate", input: "Tap / W / Up" },
            { action: "Hard Drop", input: "Flick Down / Space" },
            { action: "Hold", input: "Enter" },
          ]}
        />

        <View style={styles.mainContent}>
            
            {/* Left Column: HOLD & LEVEL */}
            <View style={styles.sideColumn}>
                <View style={[styles.sideCard, glassmorphism(), !canHold && { opacity: 0.5 }]}>
                    <Text style={[styles.sideTitle, { color: ACCENT }]}>HOLD</Text>
                    <TouchableOpacity onPress={holdPiece} activeOpacity={0.7} style={styles.miniGrid}>
                        {holdPieceData && holdPieceData.shape.map((row, r) => (
                            <View key={`hr-${r}`} style={{ flexDirection: 'row' }}>
                                {row.map((val, c) => (
                                    <View
                                        key={`hc-${c}`}
                                        style={[
                                            styles.miniCell,
                                            val ? { backgroundColor: holdPieceData.color, borderColor: 'rgba(255,255,255,0.6)' } : { backgroundColor: 'transparent', borderWidth: 0 }
                                        ]}
                                    >
                                        {val ? <View style={styles.miniHighlight} /> : null}
                                    </View>
                                ))}
                            </View>
                        ))}
                    </TouchableOpacity>
                </View>
                
                <View style={[styles.levelCard, glassmorphism()]}>
                    <Text style={styles.sideTitle}>LEVEL</Text>
                    <Text style={[styles.levelText, { color: ACCENT }]}>{currentLevel}</Text>
                </View>
            </View>

            {/* Center: THE BOARD */}
            <GestureDetector gesture={composedGesture}>
                <View style={styles.boardWrapper}>
                    <View style={[styles.board, glassmorphism(), { padding: 2, borderRadius: 6 }]}>
                        {/* Grid Background */}
                        {grid.map((row, r) => (
                            <View key={`r-${r}`} style={styles.row}>
                                {row.map((cell, c) => (
                                    <View
                                        key={`c-${c}`}
                                        style={[
                                            styles.cell,
                                            { width: cellSize - 2, height: cellSize - 2 },
                                            cell ? { 
                                                backgroundColor: cell, 
                                                borderColor: 'rgba(255,255,255,0.4)', 
                                                borderWidth: 1.5,
                                                ...elegantShadow(0.6, 5, 2),
                                                shadowColor: cell
                                            } : { 
                                                backgroundColor: (r + c) % 2 === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)', 
                                                borderWidth: 1, 
                                                borderColor: 'rgba(255,255,255,0.05)' 
                                            }
                                        ]}
                                    >
                                        {/* Highlight for locked pieces */}
                                        {cell ? <View style={{ position: 'absolute', top: 1, left: 1, width: '40%', height: '30%', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 }} /> : null}
                                    </View>
                                ))}
                            </View>
                        ))}
                        
                        {/* Animated Ghost Piece */}
                        {currentPiece && currentPiece.shape.map((row, r) =>
                            row.map((val, c) => {
                                if (val) {
                                    return <AnimatedPieceCell key={`g-${r}-${c}`} r={ghostR + r} c={currentPiece.c + c} cellSize={cellSize} color={currentPiece.color} isGhost={true} />;
                                }
                                return null;
                            })
                        )}

                        {/* Animated Current Piece */}
                        {currentPiece && currentPiece.shape.map((row, r) =>
                            row.map((val, c) => {
                                if (val) {
                                    return <AnimatedPieceCell key={`p-${r}-${c}`} r={currentPiece.r + r} c={currentPiece.c + c} cellSize={cellSize} color={currentPiece.color} />;
                                }
                                return null;
                            })
                        )}

                        {/* Overlays */}
                        {!gameStarted && !gameOver && (
                          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', zIndex: 50, backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                            <View style={{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.6)' }}>
                              <Text style={{ fontFamily: Fonts.heading, fontSize: FontSize.xl, color: Colors.white, textShadowColor: ACCENT, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10, letterSpacing: 2 }}>START</Text>
                            </View>
                          </View>
                        )}
                        {isPaused && (
                          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', zIndex: 50, backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                            <Text style={{ fontFamily: Fonts.heading, fontSize: 32, color: Colors.white, textShadowColor: ACCENT, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10, letterSpacing: 4 }}>PAUSED</Text>
                          </View>
                        )}
                    </View>
                </View>
            </GestureDetector>

            {/* Right Column: NEXT */}
            <View style={styles.sideColumn}>
                <View style={[styles.sideCard, glassmorphism()]}>
                    <Text style={[styles.sideTitle, { color: ACCENT }]}>NEXT</Text>
                    <View style={styles.miniGrid}>
                        {nextPiece.shape.map((row, r) => (
                            <View key={`nr-${r}`} style={{ flexDirection: 'row' }}>
                                {row.map((val, c) => (
                                    <View
                                        key={`nc-${c}`}
                                        style={[
                                            styles.miniCell,
                                            val ? { backgroundColor: nextPiece.color, borderColor: 'rgba(255,255,255,0.6)' } : { backgroundColor: 'transparent', borderWidth: 0 }
                                        ]}
                                    >
                                        {val ? <View style={styles.miniHighlight} /> : null}
                                    </View>
                                ))}
                            </View>
                        ))}
                    </View>
                </View>
            </View>
        </View>

        <GameOverModal
          visible={gameOver}
          score={score}
          highScore={highScore}
          isNewHighScore={score >= highScore && score > 0}
          accentColor={ACCENT}
          onRestart={restart}
          onHome={() => router.replace('/')}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  safe: {
    flex: 1,
  },
  mainContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing[4],
  },
  boardWrapper: {
    alignItems: 'center',
    marginHorizontal: Spacing[4],
  },
  board: {
    backgroundColor: 'rgba(10, 5, 20, 0.75)',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    ...elegantShadow(0.5, 30, 15),
    shadowColor: ACCENT,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    borderRadius: 4,
    margin: 1, // Inner spacing
  },
  sideColumn: {
      flex: 1,
      maxWidth: 100,
      justifyContent: 'center',
      gap: Spacing[4],
  },
  sideCard: {
      padding: Spacing[3],
      borderRadius: Radius.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      ...elegantShadow(0.4, 15, 5),
  },
  levelCard: {
      padding: Spacing[3],
      borderRadius: Radius.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      ...elegantShadow(0.4, 15, 5),
  },
  sideTitle: {
      fontFamily: Fonts.heading,
      fontSize: FontSize.xs,
      color: Colors.text.muted,
      marginBottom: Spacing[2],
      letterSpacing: 2,
  },
  levelText: {
      fontFamily: Fonts.heading,
      fontSize: FontSize.xl,
      textShadowColor: ACCENT,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 10,
  },
  miniGrid: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 50,
  },
  miniCell: {
      width: 14,
      height: 14,
      margin: 1,
      borderWidth: 1.5,
      borderRadius: 3,
      overflow: 'hidden',
  },
  miniHighlight: {
      position: 'absolute',
      top: 1,
      left: 1,
      width: '40%',
      height: '30%',
      backgroundColor: 'rgba(255,255,255,0.4)',
      borderRadius: 1,
  }
});
