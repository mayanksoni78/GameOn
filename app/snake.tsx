import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, glassmorphism, elegantShadow } from '../src/theme/colors';
import { Radius, Spacing } from '../src/theme/spacing';
import { Fonts, FontSize } from '../src/theme/typography';
import { AnimatedBackground } from '../src/components/AnimatedBackground';
import { GameHeader } from '../src/components/GameHeader';
import { GameOverModal } from '../src/components/GameOverModal';
import { tapLight, notifySuccess, notifyError, tapMedium } from '../src/utils/haptics';
import { useKeyboard, KeyboardKey } from '../src/hooks/useKeyboard';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withRepeat, Easing, withDelay } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ---- Theme constants ----
const SNAKE_GREEN = '#00E5FF'; // Electric Cyan (keeping variable name for compatibility)
const HEAD_GRADIENT = ['#00FFFF', '#0070FF'] as const;
const PURPLE_GLOW = '#A855F7';
const GRID_SIZE = 20;

type Coordinate = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

const SPEED_MAP = {
  EASY: 200,
  MEDIUM: 130,
  HARD: 90,
};

// Valid MaterialCommunityIcons for fruits with refreshed, distinct colors
const FRUITS = [
  { name: 'food-apple', color: '#FF4757', points: 1, label: 'Apple' },       // shiny red Apple
  { name: 'fruit-citrus', color: '#FFA502', points: 2, label: 'Orange' },    // bright Orange
] as const;

// ---------------------------------------------------------------------------
// Board background: Grid cells with explicit white borders & alternating fill
// ---------------------------------------------------------------------------
const BoardBackground = memo(({ boardWidth, cellSize }: { boardWidth: number; cellSize: number }) => {
  return (
    <>
      <LinearGradient
        colors={['#12061F', '#1A0F2E', '#24123D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Ambient corner glows */}
      <View pointerEvents="none" className="absolute -top-12 -left-12 w-40 h-40 rounded-full bg-purple-600/20" />
      <View pointerEvents="none" className="absolute -bottom-16 -right-10 w-52 h-52 rounded-full bg-purple-500/10" />

      {/* Grid cells with explicit individual white borders */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { flexDirection: 'row', flexWrap: 'wrap' }]}>
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
          const dark = (Math.floor(i / GRID_SIZE) + i) % 2 === 0;
          return (
            <View
              key={i}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: dark ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.08)',
                borderWidth: 0.5,
                borderColor: 'rgba(255, 255, 255, 0.25)',
              }}
            />
          );
        })}
      </View>
    </>
  );
});
BoardBackground.displayName = 'BoardBackground';

// Snake head — Circular, cute face with crisp WHITE eyes and dark pupils/highlights
const SnakeHead = ({ x, y, cellSize, speed, direction }: any) => {
  const animX = useSharedValue(x * cellSize);
  const animY = useSharedValue(y * cellSize);
  const rotation = useSharedValue(0);
  const blink = useSharedValue(1);

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
    blink.value = withRepeat(
      withSequence(
        withDelay(Math.random() * 3200 + 1000, withTiming(0.1, { duration: 60 })),
        withTiming(1, { duration: 60 })
      ),
      -1,
      true
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

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: cellSize,
          height: cellSize,
          zIndex: 10,
        },
        animStyle,
      ]}
    >
      <View
        style={{
          flex: 1,
          margin: 1, // Constrained tightly to cell bounds without box overflow
          borderRadius: 999, // Circular face
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.45)',
        }}
      >
        <LinearGradient
          colors={HEAD_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Clean White Left Eye with dark pupil */}
        <Animated.View
          style={[
            blinkStyle,
            {
              position: 'absolute',
              top: '15%',
              right: '18%',
              width: '32%',
              height: '32%',
              backgroundColor: '#FFFFFF',
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          {/* Dark Pupil */}
          <View style={{ width: '55%', height: '55%', backgroundColor: '#1E293B', borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ position: 'absolute', top: '15%', right: '15%', width: '35%', height: '35%', backgroundColor: '#FFFFFF', borderRadius: 999 }} />
          </View>
        </Animated.View>

        {/* Clean White Right Eye with dark pupil */}
        <Animated.View
          style={[
            blinkStyle,
            {
              position: 'absolute',
              bottom: '15%',
              right: '18%',
              width: '32%',
              height: '32%',
              backgroundColor: '#FFFFFF',
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          {/* Dark Pupil */}
          <View style={{ width: '55%', height: '55%', backgroundColor: '#1E293B', borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ position: 'absolute', top: '15%', right: '15%', width: '35%', height: '35%', backgroundColor: '#FFFFFF', borderRadius: 999 }} />
          </View>
        </Animated.View>

        {/* Soft Blushing Cheeks */}
        <Animated.View style={[blinkStyle, { position: 'absolute', top: '10%', right: '55%', width: '22%', height: '16%', backgroundColor: '#FFA2A2', borderRadius: 999, opacity: 0.65 }]} />
        <Animated.View style={[blinkStyle, { position: 'absolute', bottom: '10%', right: '55%', width: '22%', height: '16%', backgroundColor: '#FFA2A2', borderRadius: 999, opacity: 0.65 }]} />
      </View>
    </Animated.View>
  );
};

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
        withTiming(1.2, { duration: speed / 2 }),
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
          width: cellSize - 2,
          height: cellSize - 2,
          margin: 1,
          borderRadius: 999, // Circular body segments
          overflow: 'hidden',
          backgroundColor: SNAKE_GREEN,
          opacity: Math.max(0.4, 1 - index * 0.015),
          shadowColor: SNAKE_GREEN,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: 4,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.35)',
        },
        animStyle,
      ]}
    />
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

export default function Snake() {
  const [boardWidth, setBoardWidth] = useState(0);
  const [cellSize, setCellSize] = useState(0);

  const [snake, setSnake] = useState<Coordinate[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Coordinate>({ x: 5, y: 5 });
  const [foodType, setFoodType] = useState(0);
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isEating, setIsEating] = useState(false);

  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const particleIdRef = useRef(0);

  const directionRef = useRef(direction);
  const snakeRef = useRef(snake);
  const isGameOverRef = useRef(isGameOver);
  const gameStartedRef = useRef(gameStarted);
  const isPausedRef = useRef(isPaused);

  const foodScale = useSharedValue(1);
  const foodFloat = useSharedValue(0);

  useEffect(() => {
    directionRef.current = direction;
    snakeRef.current = snake;
    isGameOverRef.current = isGameOver;
    gameStartedRef.current = gameStarted;
    isPausedRef.current = isPaused;
  }, [direction, snake, isGameOver, gameStarted, isPaused]);

  useEffect(() => {
    AsyncStorage.getItem('snake_highscore').then((val) => {
      if (val) setHighScore(parseInt(val));
    });

    const hPad = 32;
    const vPad = 200;
    const maxSize = 500;
    
    const available = Math.min(SCREEN_W - hPad * 2, SCREEN_H - vPad);
    const calculatedBoardSize = Math.min(available, maxSize);
    const exactCellSize = Math.floor(calculatedBoardSize / GRID_SIZE);
    const exactBoardWidth = exactCellSize * GRID_SIZE;

    setCellSize(exactCellSize);
    setBoardWidth(exactBoardWidth);

    foodScale.value = withRepeat(withSequence(withTiming(1.15, { duration: 600 }), withTiming(0.95, { duration: 600 })), -1, true);
    foodFloat.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const moveSnake = useCallback(() => {
    if (isGameOverRef.current || !gameStartedRef.current || isPausedRef.current) return;

    const currentHead = snakeRef.current[0];
    const newHead = { ...currentHead };

    switch (directionRef.current) {
      case 'UP':
        newHead.y -= 1;
        break;
      case 'DOWN':
        newHead.y += 1;
        break;
      case 'LEFT':
        newHead.x -= 1;
        break;
      case 'RIGHT':
        newHead.x += 1;
        break;
    }

    if (
      newHead.x < 0 ||
      newHead.x >= GRID_SIZE ||
      newHead.y < 0 ||
      newHead.y >= GRID_SIZE ||
      snakeRef.current.some((segment, index) => index !== snakeRef.current.length - 1 && segment.x === newHead.x && segment.y === newHead.y)
    ) {
      handleGameOver();
      return;
    }

    const newSnake = [newHead, ...snakeRef.current];

    if (newHead.x === food.x && newHead.y === food.y) {
      setIsEating(true);
      setTimeout(() => setIsEating(false), SPEED_MAP[difficulty]);

      spawnParticles(food.x * cellSize + cellSize / 2, food.y * cellSize + cellSize / 2, FRUITS[foodType].color);

      setScore((s) => s + FRUITS[foodType].points);
      notifySuccess();

      let newFood: Coordinate;
      while (true) {
        newFood = {
          x: Math.floor(Math.random() * GRID_SIZE),
          y: Math.floor(Math.random() * GRID_SIZE),
        };
        if (!newSnake.some((s) => s.x === newFood.x && s.y === newFood.y)) break;
      }
      setFood(newFood);
      setFoodType(Math.floor(Math.random() * FRUITS.length));
    } else {
      newSnake.pop();
    }

    setSnake(newSnake);
  }, [food, difficulty, cellSize, foodType]);

  const spawnParticles = (x: number, y: number, color: string) => {
    const newParticles = Array.from({ length: 10 }).map((_, i) => ({
      id: particleIdRef.current++,
      x,
      y,
      color: i % 2 === 0 ? SNAKE_GREEN : color,
    }));
    setParticles((p) => [...p, ...newParticles].slice(-30));
  };

  useEffect(() => {
    if (!gameStarted || isPaused) return;
    const interval = setInterval(moveSnake, SPEED_MAP[difficulty]);
    return () => clearInterval(interval);
  }, [moveSnake, gameStarted, difficulty, isPaused]);

  const handleGameOver = () => {
    setIsGameOver(true);
    setGameStarted(false);
    setIsPaused(false);
    notifyError();
    if (score > highScore) {
      setHighScore(score);
      AsyncStorage.setItem('snake_highscore', score.toString());
    }
  };

  const restartGame = () => {
    tapMedium();
    setSnake([{ x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) }]);
    setDirection('RIGHT');
    setScore(0);
    setIsGameOver(false);
    setGameStarted(false);
    setIsPaused(false);
    setParticles([]);
  };

  const togglePause = () => {
    if (!gameStartedRef.current && !isPausedRef.current) return;
    tapLight();
    setIsPaused(prev => !prev);
  };

  const startGame = () => {
    tapLight();
    if (!gameStartedRef.current) {
      setGameStarted(true);
      setIsPaused(false);
    }
  };

  const handleDirectionChange = (newDir: Direction) => {
    if (isPausedRef.current || !gameStartedRef.current) return;
    const current = directionRef.current;
    if (
      (newDir === 'UP' && current !== 'DOWN') ||
      (newDir === 'DOWN' && current !== 'UP') ||
      (newDir === 'LEFT' && current !== 'RIGHT') ||
      (newDir === 'RIGHT' && current !== 'LEFT')
    ) {
      setDirection(newDir);
    }
  };

  useKeyboard((key: KeyboardKey) => {
    if (key === 'Enter') {
      if (isGameOver) restartGame();
      else if (!gameStarted) startGame();
      else togglePause();
      return;
    }
    switch (key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        handleDirectionChange('UP');
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        handleDirectionChange('DOWN');
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        handleDirectionChange('LEFT');
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        handleDirectionChange('RIGHT');
        break;
      case 'Escape':
      case ' ':
        togglePause();
        break;
    }
  }, [isGameOver, gameStarted, isPaused]);

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
      <AnimatedBackground />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <GameHeader title={`SNAKE - ${difficulty}`} score={score} highScore={highScore} accentColor={SNAKE_GREEN} onBack={() => router.back()} />

        <View style={styles.controlBar}>
          <TouchableOpacity 
            style={[styles.controlBtn, !gameStarted || isPaused ? { backgroundColor: SNAKE_GREEN } : glassmorphism()]} 
            onPress={!gameStarted ? startGame : (isPaused ? togglePause : undefined)}
          >
            <MaterialCommunityIcons name="play" size={24} color={!gameStarted || isPaused ? "#000" : Colors.white} />
            <Text style={[styles.controlBtnText, { color: !gameStarted || isPaused ? '#000' : Colors.white }]}>{!gameStarted ? 'START' : 'RESUME'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.controlBtn, glassmorphism(), (!gameStarted || isPaused) && { opacity: 0.5 }]} 
            onPress={gameStarted && !isPaused ? togglePause : undefined}
          >
            <MaterialCommunityIcons name="pause" size={24} color={Colors.white} />
            <Text style={styles.controlBtnText}>PAUSE</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.controlBtn, glassmorphism()]} onPress={restartGame}>
            <MaterialCommunityIcons name="refresh" size={24} color={Colors.white} />
          </TouchableOpacity>

          {!gameStarted && (
            <View style={styles.diffSelector}>
              {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDifficulty(d)}
                  style={[styles.diffTab, difficulty === d && { backgroundColor: 'rgba(92,230,122,0.25)' }]}
                >
                  <Text style={[styles.diffTabText, difficulty === d && { color: SNAKE_GREEN }]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.legendRow}>
          {FRUITS.map((fruit, idx) => (
            <View key={idx} style={styles.legendItem}>
              <MaterialCommunityIcons name={fruit.name as any} size={16} color={fruit.color} />
              <Text style={styles.legendText}>+{fruit.points}</Text>
            </View>
          ))}
        </View>

        <GestureDetector gesture={panGesture}>
          <View style={styles.boardWrapper}>
            <View
              className="rounded-3xl overflow-hidden border-2 border-white/20"
              style={[{ width: boardWidth, height: boardWidth }, elegantShadow(0.45, 24, 12), { shadowColor: PURPLE_GLOW }]}
            >
              <BoardBackground boardWidth={boardWidth} cellSize={cellSize} />

              {particles.map((p) => (
                <Particle key={p.id} x={p.x} y={p.y} color={p.color} />
              ))}

              <Animated.View
                style={[
                  styles.foodWrapper,
                  foodAnimStyle,
                  {
                    width: cellSize,
                    height: cellSize,
                    left: food.x * cellSize,
                    top: food.y * cellSize,
                  },
                ]}
              >
                <View style={{
                  width: cellSize * 0.75,
                  height: cellSize * 0.75,
                  borderRadius: 999,
                  backgroundColor: FRUITS[foodType].color,
                  shadowColor: FRUITS[foodType].color,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 1,
                  shadowRadius: 10,
                  elevation: 5,
                }}>
                  {/* Shiny highlight */}
                  <View style={{
                    position: 'absolute',
                    top: '15%',
                    left: '15%',
                    width: '35%',
                    height: '25%',
                    backgroundColor: 'rgba(255,255,255,0.7)',
                    borderRadius: 999,
                    transform: [{ rotate: '-30deg' }]
                  }} />
                </View>
                {/* Cute green leaf on top */}
                <View style={{
                  position: 'absolute',
                  top: '5%',
                  right: '20%',
                  width: '35%',
                  height: '25%',
                  backgroundColor: '#2ED573', // Emerald green
                  borderTopRightRadius: 10,
                  borderBottomLeftRadius: 10,
                  borderTopLeftRadius: 0,
                  borderBottomRightRadius: 0,
                  transform: [{ rotate: '15deg' }]
                }} />
              </Animated.View>

              {snake.map((segment, index) => {
                if (index === 0) return null;
                return (
                  <SnakeBody key={index} x={segment.x} y={segment.y} cellSize={cellSize} speed={SPEED_MAP[difficulty]} index={index} isEating={isEating} />
                );
              })}

              <SnakeHead x={snake[0].x} y={snake[0].y} cellSize={cellSize} speed={SPEED_MAP[difficulty]} direction={direction} />

              {!gameStarted && !isGameOver && (
                <View style={[StyleSheet.absoluteFill, styles.overlayCenter]}>
                  <View className="px-6 py-4 rounded-xl border border-white/10 bg-black/60">
                    <Text style={styles.messageText}>PRESS ENTER TO START</Text>
                  </View>
                </View>
              )}
              {isPaused && (
                <View style={[StyleSheet.absoluteFill, styles.overlayCenter]} className="bg-black/60">
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
          accentColor={SNAKE_GREEN}
          onRestart={restartGame}
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
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[2],
    gap: Spacing[3],
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: Radius.full,
    gap: Spacing[2],
  },
  controlBtnText: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.sm,
    color: Colors.white,
  },
  diffSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radius.full,
    padding: 4,
    marginLeft: Spacing[2],
  },
  diffTab: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: Radius.full,
  },
  diffTabText: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing[4],
    paddingBottom: Spacing[3],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  boardWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Spacing[2],
  },
  foodWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  messageText: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.lg,
    color: Colors.white,
    textShadowColor: PURPLE_GLOW,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});