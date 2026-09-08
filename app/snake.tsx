import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, glassmorphism, elegantShadow } from '../src/theme/colors';
import { Radius, Spacing } from '../src/theme/spacing';
import { Fonts, FontSize } from '../src/theme/typography';
import { CyberBackground } from '../src/components/CyberBackground';
import { GameHeader } from '../src/components/GameHeader';
import { GameOverModal } from '../src/components/GameOverModal';
import { tapLight, notifySuccess, notifyError, tapMedium } from '../src/utils/haptics';
import { useKeyboard, KeyboardKey } from '../src/hooks/useKeyboard';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withRepeat, Easing, withDelay } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ---- Theme Constants ----
const ACCENT_WHITE = '#FFFFFF';
const DARK_BLUE_BG = '#0B132B';
const DARK_PURPLE_BG = '#1C0B2B';

// Realistic Snake Color Palette
const SNAKE_MAIN = '#2E7D32'; 
const SNAKE_SHADOW = '#1B5E20';
const GRID_SIZE = 20;

type Coordinate = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

const SPEED_MAP = {
  EASY: 200,
  MEDIUM: 130,
  HARD: 90,
};

const FRUITS = [
  { name: 'food-apple', color: '#EF4444', points: 1, label: 'APPLE' },
  { name: 'fruit-citrus', color: '#F97316', points: 2, label: 'ORANGE' },
] as const;

// ---------------------------------------------------------------------------
// 3D Fruit Graphic
// ---------------------------------------------------------------------------
const Fruit3DGraphic = ({ size, color }: { size: number; color: string }) => {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.85,
        height: size * 0.85,
        borderRadius: 999,
        backgroundColor: color,
        overflow: 'hidden',
        borderWidth: size * 0.05,
        borderColor: 'rgba(255,255,255,0.4)',
        shadowColor: color,
        shadowOpacity: 0.6,
        shadowRadius: size * 0.2,
      }}>
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          borderRadius: 999, borderWidth: size * 0.15, borderColor: 'rgba(0,0,0,0.2)',
        }} />
        <View style={{
          position: 'absolute', top: '12%', left: '12%', width: '45%', height: '35%',
          backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 999, transform: [{ rotate: '-35deg' }]
        }} />
      </View>
      <View style={{
        position: 'absolute', top: -size * 0.02, width: '12%', height: '25%',
        backgroundColor: '#78350F', borderRadius: 3, transform: [{ rotate: '15deg' }],
      }} />
      <View style={{
        position: 'absolute', top: -size * 0.05, right: '15%', width: '40%', height: '35%',
        backgroundColor: SNAKE_MAIN, borderTopLeftRadius: size * 0.2, borderBottomRightRadius: size * 0.2,
        transform: [{ rotate: '-10deg' }], borderWidth: 1, borderColor: SNAKE_SHADOW,
      }}>
         <View style={{ position: 'absolute', left: '15%', top: '45%', width: '70%', height: 1, backgroundColor: SNAKE_SHADOW, transform: [{ rotate: '45deg' }] }} />
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Board background with Crisp White Grid Borders
// ---------------------------------------------------------------------------
const BoardBackground = memo(({ boardWidth, cellSize }: { boardWidth: number; cellSize: number }) => {
  return (
    <>
      <LinearGradient colors={[DARK_BLUE_BG, '#120D31', DARK_PURPLE_BG]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { flexDirection: 'row', flexWrap: 'wrap' }]}>
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
          const dark = (Math.floor(i / GRID_SIZE) + i) % 2 === 0;
          return (
            <View
              key={i}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: dark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(30, 27, 75, 0.25)',
                borderWidth: 0.5,
                borderColor: 'rgba(255, 255, 255, 0.15)', // White Grid Border
              }}
            />
          );
        })}
      </View>
    </>
  );
});
BoardBackground.displayName = 'BoardBackground';

// ---------------------------------------------------------------------------
// Realistic Cartoon Style Snake Head & Body Components
// ---------------------------------------------------------------------------

// Snake head — Realistic Cartoon Style: Snout, Reptile Eyes, Slit Pupils, Forked Tongue
const SnakeHead = ({ x, y, cellSize, speed, direction }: any) => {
  const animX = useSharedValue(x * cellSize);
  const animY = useSharedValue(y * cellSize);
  const rotation = useSharedValue(0);
  const blink = useSharedValue(1);
  const tongue = useSharedValue(0);

  useEffect(() => {
    animX.value = withTiming(x * cellSize, { duration: speed, easing: Easing.linear });
    animY.value = withTiming(y * cellSize, { duration: speed, easing: Easing.linear });
  }, [x, y, cellSize, speed]);

  useEffect(() => {
    let target = 0;
    if (direction === 'UP') target = -90;
    if (direction === 'DOWN') target = 90;
    if (direction === 'LEFT') target = 180;
    if (direction === 'RIGHT') target = 0;
    rotation.value = target;
  }, [direction]);

  useEffect(() => {
    // Eye blink animation
    blink.value = withRepeat(
      withSequence(
        withDelay(Math.random() * 3000 + 2000, withTiming(0.1, { duration: 80 })),
        withTiming(1, { duration: 80 })
      ),
      -1,
      true
    );
    // Tongue flickering animation
    tongue.value = withRepeat(
      withSequence(
        withDelay(2500, withTiming(1, { duration: 150 })),
        withTiming(0, { duration: 150 }),
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 100 })
      ),
      -1,
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: animX.value },
      { translateY: animY.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const blinkStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));
  const tongueStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: tongue.value }, { translateX: tongue.value * (cellSize * 0.15) }],
    opacity: tongue.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: cellSize,
          height: cellSize,
          zIndex: 100,
        },
        animStyle,
      ]}
    >
      {/* Animated Forked Tongue */}
      <Animated.View style={[
        tongueStyle, 
        { 
          position: 'absolute', 
          right: '-15%', 
          top: '45%', 
          width: '35%', 
          height: '10%', 
          backgroundColor: '#FF3333', 
          zIndex: -1,
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center'
        }
      ]}>
         {/* Tongue fork top */}
         <View style={{ position: 'absolute', right: -4, top: -3, width: 6, height: 2, backgroundColor: '#FF3333', transform: [{rotate: '30deg'}]}} />
         {/* Tongue fork bottom */}
         <View style={{ position: 'absolute', right: -4, bottom: -3, width: 6, height: 2, backgroundColor: '#FF3333', transform: [{rotate: '-30deg'}]}} />
      </Animated.View>

      <View
        style={{
          flex: 1,
          margin: 0,
          borderTopLeftRadius: cellSize * 0.4,
          borderBottomLeftRadius: cellSize * 0.4,
          borderTopRightRadius: cellSize * 0.25,
          borderBottomRightRadius: cellSize * 0.25,
          overflow: 'hidden',
          backgroundColor: '#1E5631',
          borderWidth: 1.5,
          borderColor: 'rgba(0,0,0,0.4)',
        }}
      >
        <LinearGradient
          colors={['#4C9A2A', '#2E7D32', '#1B5E20']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Nostrils */}
        <View style={{ position: 'absolute', right: '8%', top: '25%', width: '12%', height: '12%', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 999 }} />
        <View style={{ position: 'absolute', right: '8%', bottom: '25%', width: '12%', height: '12%', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 999 }} />

        {/* Left Reptile Eye */}
        <Animated.View
          style={[
            blinkStyle,
            {
              position: 'absolute',
              top: '12%',
              right: '25%',
              width: '35%',
              height: '30%',
              backgroundColor: '#FFD700',
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.6)',
              shadowColor: '#FFD700',
              shadowOpacity: 0.5,
              shadowRadius: 2,
            },
          ]}
        >
          {/* Vertical Slit Pupil */}
          <View style={{ width: '25%', height: '75%', backgroundColor: '#000', borderRadius: 999 }} />
          {/* Eye reflection */}
          <View style={{ position: 'absolute', top: '15%', left: '20%', width: '30%', height: '30%', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 999 }} />
        </Animated.View>

        {/* Right Reptile Eye */}
        <Animated.View
          style={[
            blinkStyle,
            {
              position: 'absolute',
              bottom: '12%',
              right: '25%',
              width: '35%',
              height: '30%',
              backgroundColor: '#FFD700',
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.6)',
              shadowColor: '#FFD700',
              shadowOpacity: 0.5,
              shadowRadius: 2,
            },
          ]}
        >
          <View style={{ width: '25%', height: '75%', backgroundColor: '#000', borderRadius: 999 }} />
          <View style={{ position: 'absolute', top: '15%', left: '20%', width: '30%', height: '30%', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 999 }} />
        </Animated.View>

        {/* Head Scales / Textures */}
        <View style={{ position: 'absolute', top: '40%', left: '15%', width: '30%', height: '20%', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 999 }} />
      </View>
    </Animated.View>
  );
};

// Snake Body — Elegant & Color Matched with Head
const SnakeBody = memo(({ x, y, cellSize, speed, index, isEating }: any) => {
  const animX = useSharedValue(x * cellSize);
  const animY = useSharedValue(y * cellSize);
  const scale = useSharedValue(1);

  useEffect(() => {
    animX.value = withTiming(x * cellSize, { duration: speed, easing: Easing.linear });
    animY.value = withTiming(y * cellSize, { duration: speed, easing: Easing.linear });
  }, [x, y, cellSize, speed]);

  useEffect(() => {
    if (isEating) {
      scale.value = withSequence(
        withTiming(1.18, { duration: speed / 2 }),
        withTiming(1, { duration: speed / 2 })
      );
    }
  }, [isEating, speed]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: animX.value }, { translateY: animY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: cellSize + 1,
          height: cellSize + 1,
          margin: -0.5,
          borderRadius: cellSize * 0.35, // Organic snake segment curve
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(15, 45, 18, 0.45)', // Rich organic scale outline
          zIndex: Math.max(1, 80 - index),
        },
        animStyle,
      ]}
    >
      {/* 100% Color-Matched Gradient identical to Snake Head palette */}
      <LinearGradient
        colors={['#4C9A2A', '#2E7D32', '#1B5E20']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Elegant 3D Specular Highlight on Scale Top */}
      <View style={{
        position: 'absolute', 
        top: '10%', 
        left: '15%', 
        width: '70%', 
        height: '32%', 
        backgroundColor: 'rgba(255, 255, 255, 0.25)', 
        borderRadius: 999 
      }} />

      {/* Dorsal Spine Ridge Highlight */}
      <View style={{
        position: 'absolute', 
        top: '38%', 
        left: '20%', 
        width: '60%', 
        height: '14%', 
        backgroundColor: 'rgba(76, 154, 42, 0.35)', 
        borderRadius: 999 
      }} />

      {/* Bottom Shadow for Organic Cylinder Depth */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '28%',
        backgroundColor: 'rgba(0, 0, 0, 0.22)',
      }} />
    </Animated.View>
  );
});
SnakeBody.displayName = 'SnakeBody';

const Particle = ({ x, y, color }: { x: number; y: number; color: string }) => {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 30 + 10;
    translateX.value = withTiming(Math.cos(angle) * dist, { duration: 500, easing: Easing.out(Easing.quad) });
    translateY.value = withTiming(Math.sin(angle) * dist, { duration: 500, easing: Easing.out(Easing.quad) });
    opacity.value = withTiming(0, { duration: 500 });
    scale.value = withTiming(0, { duration: 500 });
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', left: x, top: y, width: 6, height: 6, backgroundColor: color, borderRadius: 3 },
        style,
      ]}
    />
  );
};

import { useEngine, SnakeEngine } from '../src/engines';

export default function Snake() {
  const [boardWidth, setBoardWidth] = useState(0);
  const [cellSize, setCellSize] = useState(0);

  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [gameState, engine] = useEngine(() => new SnakeEngine(GRID_SIZE, GRID_SIZE));
  const { snake, food, foodType, direction, score, highScore, gameOver: isGameOver, gameStarted, isPaused, isEating } = gameState;

  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const particleIdRef = useRef(0);

  const foodScale = useSharedValue(1);
  const foodFloat = useSharedValue(0);
  const engineRef = useRef(engine);
  engineRef.current = engine;
  const cellSizeRef = useRef(cellSize);
  cellSizeRef.current = cellSize;

  useEffect(() => {
    AsyncStorage.getItem('snake_highscore').then((val) => {
      if (val) {
        const stored = parseInt(val);
        if (stored > engine.getHighScore()) {
          engine.setHighScore(stored);
        }
      }
    });

    engine.setOnEat((foodPt, fType) => {
      spawnParticles(foodPt.x * cellSizeRef.current + cellSizeRef.current / 2, foodPt.y * cellSizeRef.current + cellSizeRef.current / 2, FRUITS[fType].color);
      notifySuccess();
    });

    const hPad = 32;
    const vPad = 220;
    const maxSize = 500;
    
    const available = Math.min(SCREEN_W - hPad * 2, SCREEN_H - vPad);
    const calculatedBoardSize = Math.min(available, maxSize);
    const exactCellSize = Math.floor(calculatedBoardSize / GRID_SIZE);
    const exactBoardWidth = exactCellSize * GRID_SIZE;

    setCellSize(exactCellSize);
    setBoardWidth(exactBoardWidth);

    foodScale.value = withRepeat(withSequence(withTiming(1.08, { duration: 600 }), withTiming(0.95, { duration: 600 })), -1, true);
    foodFloat.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const spawnParticles = (x: number, y: number, color: string) => {
    const newParticles = Array.from({ length: 12 }).map((_, i) => ({
      id: particleIdRef.current++,
      x,
      y,
      color: i % 2 === 0 ? ACCENT_WHITE : color,
    }));
    setParticles((p) => [...p, ...newParticles].slice(-40));
  };

  useEffect(() => {
    if (!gameStarted || isPaused || isGameOver) return;
    const interval = setInterval(() => {
      const moved = engineRef.current.tick();
      if (!moved && engineRef.current.getState().gameOver) {
        notifyError();
        const currentScore = engineRef.current.getScore();
        if (currentScore > engineRef.current.getHighScore()) {
          AsyncStorage.setItem('snake_highscore', currentScore.toString());
        }
      }
    }, SPEED_MAP[difficulty]);
    return () => clearInterval(interval);
  }, [gameStarted, difficulty, isPaused, isGameOver]);

  const restartGame = () => {
    tapMedium();
    engine.reset();
    setParticles([]);
  };

  const togglePause = () => {
    tapLight();
    engine.togglePause();
  };

  const startGame = () => {
    tapLight();
    engine.startGame();
  };

  const handleDirectionChange = (newDir: Direction) => {
    engine.setDirection(newDir);
  };

  useKeyboard((key: KeyboardKey) => {
    if (key === 'Enter') {
      if (isGameOver) restartGame();
      else if (!gameStarted) startGame();
      else togglePause();
      return;
    }
    switch (key) {
      case 'ArrowUp': case 'w': case 'W': handleDirectionChange('UP'); break;
      case 'ArrowDown': case 's': case 'S': handleDirectionChange('DOWN'); break;
      case 'ArrowLeft': case 'a': case 'A': handleDirectionChange('LEFT'); break;
      case 'ArrowRight': case 'd': case 'D': handleDirectionChange('RIGHT'); break;
      case 'Escape': case ' ': togglePause(); break;
    }
  }, { disableRepeat: true, preventDefault: true });

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .activeOffsetY([-20, 20])
    .onEnd((e) => {
      const { translationX, translationY } = e;
      if (Math.abs(translationX) > Math.abs(translationY)) {
        if (translationX > 0) handleDirectionChange('RIGHT');
        else handleDirectionChange('LEFT');
      } else {
        if (translationY > 0) handleDirectionChange('DOWN');
        else handleDirectionChange('UP');
      }
    });

  const foodAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: foodScale.value }, { translateY: foodFloat.value }],
  }));

  if (!cellSize || !boardWidth) return null;

  return (
    <View style={styles.root}>
      <CyberBackground autoScroll />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <GameHeader title={`SNAKE - ${difficulty}`} score={score} highScore={highScore} accentColor={ACCENT_WHITE} onBack={() => router.back()} />

        <View style={styles.controlBar}>
          <TouchableOpacity style={[styles.controlBtn, !gameStarted || isPaused ? { backgroundColor: ACCENT_WHITE } : styles.glassCard]} onPress={!gameStarted ? startGame : (isPaused ? togglePause : undefined)}>
            <MaterialCommunityIcons name="play" size={22} color={!gameStarted || isPaused ? DARK_BLUE_BG : ACCENT_WHITE} />
            <Text style={[styles.controlBtnText, { color: !gameStarted || isPaused ? DARK_BLUE_BG : ACCENT_WHITE }]}>{!gameStarted ? 'START' : 'RESUME'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.controlBtn, styles.glassCard, (!gameStarted || isPaused) && { opacity: 0.5 }]} onPress={gameStarted && !isPaused ? togglePause : undefined}>
            <MaterialCommunityIcons name="pause" size={22} color={ACCENT_WHITE} />
            <Text style={styles.controlBtnText}>PAUSE</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.controlBtn, styles.glassCard]} onPress={restartGame}>
            <MaterialCommunityIcons name="refresh" size={22} color={ACCENT_WHITE} />
          </TouchableOpacity>

          {!gameStarted && (
            <View style={styles.diffSelector}>
              {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((d) => (
                <TouchableOpacity key={d} onPress={() => setDifficulty(d)} style={[styles.diffTab, difficulty === d && styles.diffTabActive]}>
                  <Text style={[styles.diffTabText, difficulty === d && styles.diffTabTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.foodHeaderContainer}>
          <View style={styles.foodHeaderPanel}>
            {FRUITS.map((fruit, idx) => (
              <React.Fragment key={idx}>
                <View style={styles.foodHeaderItem}>
                  <View style={[styles.foodIconWrapper, { backgroundColor: `${fruit.color}15`, borderColor: `${fruit.color}50` }]}>
                    <Fruit3DGraphic size={22} color={fruit.color} />
                  </View>
                  <View style={styles.foodTextWrapper}>
                    <Text style={styles.foodLabelText}>{fruit.label}</Text>
                    <Text style={[styles.foodPointsText, { color: fruit.color }]}>+{fruit.points} PTS</Text>
                  </View>
                </View>
                {idx < FRUITS.length - 1 && <View style={styles.foodDivider} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        <GestureDetector gesture={panGesture}>
          <View style={styles.boardWrapper}>
            <View className="rounded-3xl overflow-hidden border-2 border-white/20" style={[{ width: boardWidth, height: boardWidth }, elegantShadow(0.5, 28, 14), { shadowColor: '#34D399' }]}>
              
              <BoardBackground boardWidth={boardWidth} cellSize={cellSize} />

              {particles.map((p) => (
                <Particle key={p.id} x={p.x} y={p.y} color={p.color} />
              ))}

              <Animated.View style={[styles.foodWrapper, foodAnimStyle, { width: cellSize, height: cellSize, left: food.x * cellSize, top: food.y * cellSize }]}>
                <View style={{ position: 'absolute', bottom: cellSize * 0.05, width: cellSize * 0.6, height: cellSize * 0.15, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 999, transform: [{ scaleX: 1.3 }] }} />
                <Fruit3DGraphic size={cellSize} color={FRUITS[foodType].color} />
              </Animated.View>

              {/* Render tail first, head last so overlaps look perfect */}
              {snake.map((segment, index) => {
                if (index === 0) return null;
                return <SnakeBody key={index} x={segment.x} y={segment.y} cellSize={cellSize} speed={SPEED_MAP[difficulty]} index={index} isEating={isEating} />;
              }).reverse()}

              <SnakeHead x={snake[0].x} y={snake[0].y} cellSize={cellSize} speed={SPEED_MAP[difficulty]} direction={direction} />

              {!gameStarted && !isGameOver && (
                <View style={[StyleSheet.absoluteFill, styles.overlayCenter]}>
                  <View style={styles.startCard}>
                    <Text style={styles.messageText}>PRESS ENTER TO START</Text>
                  </View>
                </View>
              )}
              {isPaused && (
                <View style={[StyleSheet.absoluteFill, styles.overlayCenter, { backgroundColor: 'rgba(11, 19, 43, 0.75)' }]}>
                  <Text style={[styles.messageText, { fontSize: 32 }]}>PAUSED</Text>
                </View>
              )}
            </View>
          </View>
        </GestureDetector>

        <GameOverModal
          visible={isGameOver}
          score={score}
          highScore={highScore}
          isNewHighScore={score >= highScore && score > 0}
          accentColor={SNAKE_MAIN}
          onRestart={restartGame}
          onHome={() => router.replace('/')}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK_BLUE_BG },
  safe: { flex: 1 },
  glassCard: { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
  controlBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing[4], paddingBottom: Spacing[3], gap: Spacing[3] },
  controlBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing[4], paddingVertical: Spacing[2], borderRadius: Radius.full, gap: Spacing[2] },
  controlBtnText: { fontFamily: Fonts.heading, fontSize: FontSize.sm, color: ACCENT_WHITE },
  diffSelector: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: Radius.full, padding: 4, marginLeft: Spacing[2], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  diffTab: { paddingHorizontal: Spacing[4], paddingVertical: Spacing[2], borderRadius: Radius.full },
  diffTabActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  diffTabText: { fontFamily: Fonts.heading, fontSize: FontSize.sm, color: 'rgba(255,255,255,0.5)' },
  diffTabTextActive: { color: ACCENT_WHITE },
  foodHeaderContainer: { alignItems: 'center', justifyContent: 'center', paddingBottom: Spacing[3], paddingHorizontal: Spacing[4] },
  foodHeaderPanel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', width: '100%', maxWidth: 320, backgroundColor: 'rgba(15, 23, 42, 0.7)', paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)', shadowColor: '#34D399', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10 },
  foodHeaderItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  foodIconWrapper: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  foodTextWrapper: { justifyContent: 'center' },
  foodLabelText: { fontFamily: Fonts.bodySemiBold, fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, marginBottom: 2 },
  foodPointsText: { fontFamily: Fonts.heading, fontSize: FontSize.sm, fontWeight: '800' },
  foodDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.15)' },
  boardWrapper: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: Spacing[1] },
  foodWrapper: { position: 'absolute', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  overlayCenter: { alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  startCard: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.25)', backgroundColor: 'rgba(11, 19, 43, 0.85)' },
  messageText: { fontFamily: Fonts.heading, fontSize: FontSize.lg, color: ACCENT_WHITE, textShadowColor: '#34D399', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
});