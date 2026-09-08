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

import { useEngine, TetrisEngine } from '../src/engines';

export default function Tetris() {
  const [boardWidth, setBoardWidth] = useState(0);
  const [cellSize, setCellSize] = useState(0);

  const [gameState, engine] = useEngine(() => new TetrisEngine());
  const {
    grid,
    currentPiece,
    nextPiece,
    holdPiece: holdPieceData,
    canHold,
    score,
    highScore,
    gameOver,
    isPaused,
    gameStarted,
    level,
  } = gameState;

  const engineRef = useRef(engine);
  engineRef.current = engine;

  useEffect(() => {
    AsyncStorage.getItem('tetris_hs').then(s => {
      if (s) {
        const hs = parseInt(s, 10);
        if (hs > engine.getHighScore()) {
          engine.setHighScore(hs);
        }
      }
    });
    
    const maxW = Math.min(screenWidth - 32, 500); 
    const maxH = screenHeight * 0.72;
    const size = Math.floor(Math.min(maxW / COLS, maxH / ROWS));
    
    setCellSize(size);
    setBoardWidth(size * COLS);
  }, []);

  useEffect(() => {
    if (gameOver || isPaused || !gameStarted) return;

    const interval = setInterval(() => {
      const moved = engineRef.current.tick();
      if (!moved && engineRef.current.getState().gameOver) {
        notifyError();
        const sc = engineRef.current.getScore();
        if (sc > engineRef.current.getHighScore()) {
          AsyncStorage.setItem('tetris_hs', sc.toString());
        }
      }
    }, Math.max(150, BASE_SPEED - (level - 1) * 70));

    return () => clearInterval(interval);
  }, [gameOver, isPaused, gameStarted, level]);

  const rotate = useCallback(() => {
    tapLight();
    engine.rotate();
  }, [engine]);

  const moveLeft = useCallback(() => {
    engine.moveLeft();
  }, [engine]);

  const moveRight = useCallback(() => {
    engine.moveRight();
  }, [engine]);

  const moveDown = useCallback(() => {
    engine.moveDown();
  }, [engine]);

  const hardDrop = useCallback(() => {
    tapMedium();
    engine.hardDrop();
  }, [engine]);

  const holdPiece = useCallback(() => {
    tapLight();
    engine.hold();
  }, [engine]);

  const restart = () => {
    tapMedium();
    engine.reset();
  };

  useKeyboard((key: KeyboardKey) => {
    if (key === 'Enter') {
      if (gameOver) restart();
      else if (!gameStarted) engine.startGame();
      else engine.togglePause();
      return;
    }
    switch (key) {
      case 'ArrowUp': case 'w': case 'W': rotate(); break;
      case 'ArrowDown': case 's': case 'S': moveDown(); break;
      case 'ArrowLeft': case 'a': case 'A': moveLeft(); break;
      case 'ArrowRight': case 'd': case 'D': moveRight(); break;
      case ' ': hardDrop(); break;
      case 'Shift': holdPiece(); break;
    }
  }, { disableRepeat: false, preventDefault: true });

  // Gestures for Mobile
  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .activeOffsetY([-10, 10])
    .onUpdate((e) => {
      const threshold = cellSize;
      if (e.translationX > threshold) {
        runOnJS(moveRight)();
        e.translationX -= threshold;
      } else if (e.translationX < -threshold) {
        runOnJS(moveLeft)();
        e.translationX += threshold;
      }
      if (e.translationY > threshold) {
        runOnJS(moveDown)();
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

  const ghostR = engine.getGhostY();
  const currentLevel = level;

  return (
    <View style={styles.root}>
      <CyberBackground autoScroll />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        
        <GameHeader
          title="TETRIS"
          score={score}
          highScore={highScore}
          accentColor={ACCENT}
          onBack={() => { router.replace('/'); }}
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
                        {holdPieceData && holdPieceData.shape.map((row: number[], r: number) => (
                            <View key={`hr-${r}`} style={{ flexDirection: 'row' }}>
                                {row.map((val: number, c: number) => (
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
                        {grid.map((row: string[], r: number) => (
                            <View key={`r-${r}`} style={styles.row}>
                                {row.map((cell: string, c: number) => (
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
                        {currentPiece && currentPiece.shape.map((row: number[], r: number) =>
                            row.map((val: number, c: number) => {
                                if (val) {
                                    return <AnimatedPieceCell key={`g-${r}-${c}`} r={ghostR + r} c={currentPiece.x + c} cellSize={cellSize} color={currentPiece.color} isGhost={true} />;
                                }
                                return null;
                            })
                        )}

                        {/* Animated Current Piece */}
                        {currentPiece && currentPiece.shape.map((row: number[], r: number) =>
                            row.map((val: number, c: number) => {
                                if (val) {
                                    return <AnimatedPieceCell key={`p-${r}-${c}`} r={currentPiece.y + r} c={currentPiece.x + c} cellSize={cellSize} color={currentPiece.color} />;
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
                        {nextPiece.shape.map((row: number[], r: number) => (
                            <View key={`nr-${r}`} style={{ flexDirection: 'row' }}>
                                {row.map((val: number, c: number) => (
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
