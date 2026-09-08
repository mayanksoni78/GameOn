import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { StyleSheet, Text, View, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming, runOnJS, Easing } from 'react-native-reanimated';
import { Colors, glassmorphism, elegantShadow } from '../src/theme/colors';
import { Fonts, FontSize } from '../src/theme/typography';
import { Spacing, Radius } from '../src/theme/spacing';
import { CyberBackground } from '../src/components/CyberBackground';
import { GameHeader } from '../src/components/GameHeader';
import { GameOverModal } from '../src/components/GameOverModal';
import { ControlsOverlay } from '../src/components/ControlsOverlay';
import { screenWidth, screenHeight } from '../src/utils/dimensions';
import { tapLight, notifySuccess, notifyError, tapMedium } from '../src/utils/haptics';
import { useKeyboard, KeyboardKey } from '../src/hooks/useKeyboard';

const ACCENT = Colors.accent.warning;

// Increase board size
const BOARD_PADDING = Spacing[4] * 2;
const MAX_BOARD = Math.min(screenWidth - 32, 500); 
const CELL_SIZE = Math.floor((MAX_BOARD - Spacing[2] * 5) / 4);

type TileData = {
    id: string;
    val: number;
    r: number;
    c: number;
    isNew: boolean;
    isMerged: boolean;
};
type Board = (TileData | null)[][];
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const TILE_COLORS: Record<number, { bg: string, text: string }> = {
  2: { bg: '#00F0FF', text: '#000' }, // Electric Cyan
  4: { bg: '#2979FF', text: '#FFF' }, // Deep Blue
  8: { bg: '#651FFF', text: '#FFF' }, // Neon Purple
  16: { bg: '#D500F9', text: '#FFF' }, // Cyberpunk Magenta
  32: { bg: '#F50057', text: '#FFF' }, // Hot Pink
  64: { bg: '#FF1744', text: '#FFF' }, // Crimson Red
  128: { bg: '#FF9100', text: '#FFF' }, // Sunset Orange
  256: { bg: '#FFEA00', text: '#000' }, // Bright Yellow
  512: { bg: '#00E676', text: '#000' }, // Emerald Green
  1024: { bg: '#1DE9B6', text: '#000' }, // Teal
  2048: { bg: '#FFD700', text: '#000' }, // Gold
  4096: { bg: '#FFFFFF', text: '#000' }, // Platinum
};

// Generates a random ID
const generateId = () => Math.random().toString(36).substring(2, 9);

const AnimatedTile = memo(({ tile }: { tile: TileData }) => {
    const { val, isNew, isMerged, r, c } = tile;
    const scale = useSharedValue(isNew ? 0 : 1);
    const animX = useSharedValue(c * (CELL_SIZE + Spacing[2]));
    const animY = useSharedValue(r * (CELL_SIZE + Spacing[2]));
    
    useEffect(() => {
        // Slide animation
        animX.value = withTiming(c * (CELL_SIZE + Spacing[2]), { duration: 120, easing: Easing.out(Easing.quad) });
        animY.value = withTiming(r * (CELL_SIZE + Spacing[2]), { duration: 120, easing: Easing.out(Easing.quad) });

        // Pop animation
        if (isNew) {
            scale.value = withSpring(1, { damping: 14, stiffness: 200, mass: 0.8 });
        } else if (isMerged) {
            scale.value = withSequence(
                withTiming(1.25, { duration: 80 }),
                withSpring(1, { damping: 14, stiffness: 200, mass: 0.8 })
            );
        }
    }, [r, c, isNew, isMerged]);

    const animStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: animX.value },
            { translateY: animY.value },
            { scale: scale.value }
        ]
    }));

    const styleDef = TILE_COLORS[val > 4096 ? 4096 : val] || { bg: '#FFFFFF', text: '#000' };

    return (
        <Animated.View
            style={[
                styles.tileWrapper,
                { width: CELL_SIZE, height: CELL_SIZE },
                animStyle
            ]}
        >
            <View style={[
                styles.tileInner,
                { 
                    backgroundColor: styleDef.bg,
                    ...elegantShadow(0.6, 12, 4),
                    shadowColor: styleDef.bg,
                }
            ]}>
                {/* 3D Highlight */}
                <View style={{ position: 'absolute', top: 2, left: 2, width: '40%', height: '30%', backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 4 }} />
                
                <Text style={[styles.cellText, { color: styleDef.text, fontSize: val >= 1024 ? FontSize.lg : FontSize.xl }]}>
                    {val}
                </Text>
            </View>
        </Animated.View>
    );
});
AnimatedTile.displayName = 'AnimatedTile';

import { useEngine, Game2048Engine, Direction2048 } from '../src/engines';

export default function Game2048() {
  const [gameState, engine] = useEngine(() => new Game2048Engine());
  const { board, score, highScore, gameOver } = gameState;

  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('2048_hs').then((v) => {
      if (v) engine.setHighScore(parseInt(v, 10));
    });
  }, [engine]);

  useEffect(() => {
    if (score > highScore) {
      AsyncStorage.setItem('2048_hs', score.toString());
    }
  }, [score, highScore]);

  const initGame = () => {
    engine.reset();
    setGameStarted(false);
    setIsPaused(false);
  };

  const startGame = () => {
    if (gameOver) engine.reset();
    setGameStarted(true);
    setIsPaused(false);
  };

  const move = useCallback((direction: Direction2048) => {
    if (engine.isGameOver() || isPaused || !gameStarted) return;
    const moved = engine.move(direction);
    if (moved) {
      tapLight();
      if (engine.isGameOver()) {
        notifyError();
      }
    }
  }, [engine, isPaused, gameStarted]);


  // Extract flat list of tiles for Reanimated rendering
  const tiles: TileData[] = [];
  if (board && board.length > 0) {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const val = board[r][c];
        if (val > 0) {
          tiles.push({
            id: `tile-${r}-${c}-${val}`,
            val,
            r,
            c,
            isNew: false,
            isMerged: false,
          });
        }
      }
    }
  }

  // Gestures
  const pan = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .activeOffsetY([-20, 20])
    .onEnd((e) => {
        const { translationX, translationY } = e;
        if (Math.abs(translationX) > Math.abs(translationY)) {
            if (translationX > 0) runOnJS(move)('RIGHT');
            else runOnJS(move)('LEFT');
        } else {
            if (translationY > 0) runOnJS(move)('DOWN');
            else runOnJS(move)('UP');
        }
  });

  // Keyboard
  useKeyboard((key: KeyboardKey) => {
    if (key === 'Enter') {
        if (gameOver) initGame();
        else if (!gameStarted) startGame();
        else setIsPaused(p => !p);
        return;
    }
    switch (key) {
      case 'ArrowUp': case 'w': case 'W': move('UP'); break;
      case 'ArrowDown': case 's': case 'S': move('DOWN'); break;
      case 'ArrowLeft': case 'a': case 'A': move('LEFT'); break;
      case 'ArrowRight': case 'd': case 'D': move('RIGHT'); break;
    }
  }, { disableRepeat: true, preventDefault: true });

  if (board.length === 0) return null;

  return (
    <View style={styles.root}>
      <CyberBackground autoScroll />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        
        <GameHeader
          title="2048"
          score={score}
          highScore={highScore}
          accentColor={ACCENT}
          onBack={() => router.replace('/')}
        />

        <ControlsOverlay
          instructions={[
            "Combine matching numbers to create a larger number.",
            "Reach the 2048 tile to win!"
          ]}
          controls={[
            { action: "Slide Tiles", input: "Swipe / WASD / Arrows" },
            { action: "Start / Pause", input: "Enter" },
          ]}
        />

        <View style={styles.mainContent}>
            
            <View style={styles.scoreContainer}>
                <View style={[styles.scoreCard, glassmorphism()]}>
                    <Text style={styles.scoreLabel}>SCORE</Text>
                    <Text style={styles.scoreValue}>{score}</Text>
                </View>
                <View style={[styles.scoreCard, glassmorphism()]}>
                    <Text style={styles.scoreLabel}>BEST</Text>
                    <Text style={styles.scoreValue}>{highScore}</Text>
                </View>
            </View>

            <GestureDetector gesture={pan}>
                <View style={styles.boardWrapper}>
                    <View style={[styles.board, glassmorphism(), { width: MAX_BOARD, height: MAX_BOARD }]}>
                        
                        {/* Static Grid Background */}
                        {Array(4).fill(null).map((_, r) => (
                            <View key={`bg-r-${r}`} style={styles.row}>
                                {Array(4).fill(null).map((_, c) => (
                                    <View
                                        key={`bg-c-${c}`}
                                        style={[styles.cellBackground, { width: CELL_SIZE, height: CELL_SIZE }]}
                                    />
                                ))}
                            </View>
                        ))}
                        
                        {/* Animated Tiles Layer */}
                        <View style={StyleSheet.absoluteFill}>
                            {tiles.map(tile => (
                                <AnimatedTile key={tile.id} tile={tile} />
                            ))}
                        </View>

                        {/* Overlays */}
                        {!gameStarted && !gameOver && (
                          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', zIndex: 50, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: Radius.lg }]}>
                            <TouchableOpacity onPress={startGame} activeOpacity={0.7} style={{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.6)' }}>
                              <Text style={{ fontFamily: Fonts.heading, fontSize: FontSize.xl, color: Colors.white, textShadowColor: ACCENT, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10, letterSpacing: 2 }}>START</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        {isPaused && (
                          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', zIndex: 50, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: Radius.lg }]}>
                            <Text style={{ fontFamily: Fonts.heading, fontSize: 32, color: Colors.white, textShadowColor: ACCENT, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10, letterSpacing: 4 }}>PAUSED</Text>
                          </View>
                        )}

                    </View>
                </View>
            </GestureDetector>

        </View>

        <GameOverModal
          visible={gameOver}
          title="OUT OF MOVES"
          score={score}
          highScore={highScore}
          isNewHighScore={score >= highScore && score > 0}
          accentColor={ACCENT}
          onRestart={initGame}
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
      alignItems: 'center',
      justifyContent: 'center',
  },
  scoreContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: Spacing[4],
      marginBottom: Spacing[6],
      width: MAX_BOARD,
  },
  scoreCard: {
      flex: 1,
      padding: Spacing[3],
      borderRadius: Radius.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      ...elegantShadow(0.4, 15, 5),
  },
  scoreLabel: {
      fontFamily: Fonts.heading,
      fontSize: FontSize.xs,
      color: Colors.text.muted,
      marginBottom: Spacing[1],
      letterSpacing: 2,
  },
  scoreValue: {
      fontFamily: Fonts.heading,
      fontSize: FontSize.xl,
      color: Colors.white,
      textShadowColor: ACCENT,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 10,
  },
  boardWrapper: {
      alignItems: 'center',
      justifyContent: 'center',
  },
  board: {
    padding: Spacing[2],
    backgroundColor: 'rgba(10, 5, 20, 0.75)',
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    ...elegantShadow(0.5, 30, 15),
    shadowColor: ACCENT,
  },
  row: {
    flexDirection: 'row',
  },
  cellBackground: {
    margin: Spacing[1],
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)',
  },
  tileWrapper: {
    position: 'absolute',
    margin: Spacing[2], // Matches the padding + margin of the background grid
  },
  tileInner: {
    flex: 1,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cellText: {
    fontFamily: Fonts.heading,
  },
});
