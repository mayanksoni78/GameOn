import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
  SharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { glassmorphism } from '../src/theme/colors';
import { Fonts, FontSize } from '../src/theme/typography';
import { Spacing, Radius } from '../src/theme/spacing';
import { GameHeader } from '../src/components/GameHeader';
import { GameOverModal } from '../src/components/GameOverModal';
import { ControlsOverlay } from '../src/components/ControlsOverlay';
import { LinearGradient } from 'expo-linear-gradient';
import { tapLight, notifyError, tapMedium } from '../src/utils/haptics';
import { useKeyboard, KeyboardKey } from '../src/hooks/useKeyboard';
import { CyberBackground } from '../src/components/CyberBackground';

import { useWindowDimensions } from 'react-native';

// ── Theme ─────────────────────────────────────────────────────────────────────
const ACCENT    = '#00E5FF';
const NEON_CYAN = '#00E5FF';
const SKY_TOP   = '#020208';
const GROUND_TOP = '#1B3A22';
const GROUND_BOT = '#1C110C';

// ── Base physics (scaled at runtime) ─────────────────────────────────────────
const GRAVITY_BASE     = 0.45;
const JUMP_BASE        = -9.5;
const PIPE_SPEED_BASE  = 3.8;
const PIPE_WIDTH       = 60;
const PIPE_GAP_MIN_BASE = 185;
const PIPE_GAP_MAX_BASE = 260;
const PIPE_HORIZ_BASE  = 260;
const PIPE_COUNT       = 4;
const BIRD_SIZE        = 32;
const GROUND_H_BASE    = 80;

// ── Sparrow ───────────────────────────────────────────────────────────────────
const PixelBird = ({ rotation, wingPhase }: { rotation: SharedValue<number>; wingPhase: SharedValue<number> }) => {
  const bodyStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  const wingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: wingPhase.value * -5 }, { rotate: `${wingPhase.value * -30}deg` }],
  }));
  return (
    <Animated.View style={[{ width: BIRD_SIZE + 10, height: BIRD_SIZE, justifyContent: 'center' }, bodyStyle]}>
      <View style={{ position: 'absolute', left: -8, top: 12, width: 16, height: 6, backgroundColor: '#5D4037', borderBottomLeftRadius: 4, borderTopLeftRadius: 2, transform: [{ rotate: '-5deg' }] }} />
      <View style={{ position: 'absolute', left: 4,  top: 10, width: 26, height: 12, backgroundColor: '#EFEBE9', borderRadius: 10 }} />
      <View style={{ position: 'absolute', left: 6,  top: 4,  width: 22, height: 10, backgroundColor: '#795548', borderRadius: 8 }} />
      <View style={{ position: 'absolute', left: 20, top: 2,  width: 12, height: 12, backgroundColor: '#5D4037', borderRadius: 6 }} />
      <View style={{ position: 'absolute', left: 22, top: 8,  width: 6,  height: 5,  backgroundColor: '#FFFFFF', borderRadius: 3 }} />
      <View style={{ position: 'absolute', left: 26, top: 12, width: 6,  height: 6,  backgroundColor: '#212121', borderBottomRightRadius: 4 }} />
      <View style={{ position: 'absolute', left: 31, top: 6,  width: 7,  height: 4,  backgroundColor: '#111111', borderTopRightRadius: 3, borderBottomRightRadius: 2 }} />
      <View style={{ position: 'absolute', left: 25, top: 4,  width: 3,  height: 3,  backgroundColor: '#000', borderRadius: 1.5 }}>
        <View style={{ position: 'absolute', left: 0.5, top: 0.5, width: 1, height: 1, backgroundColor: '#FFF', borderRadius: 0.5 }} />
      </View>
      <Animated.View style={[{ position: 'absolute', left: 8, top: 8, width: 16, height: 10, backgroundColor: '#8D6E63', borderBottomLeftRadius: 10, borderBottomRightRadius: 10, borderWidth: 1, borderColor: '#4E342E', overflow: 'hidden' }, wingStyle]}>
        <View style={{ position: 'absolute', left: 3, top: 3, width: 8, height: 1, backgroundColor: '#3E2723' }} />
        <View style={{ position: 'absolute', left: 5, top: 6, width: 6, height: 1, backgroundColor: '#3E2723' }} />
      </Animated.View>
    </Animated.View>
  );
};

// ── Bird Container driven by SharedValue ──────────────────────────────────────
const BirdContainer = ({ birdY, birdRot, wingPhase, birdX }: { birdY: SharedValue<number>; birdRot: SharedValue<number>; wingPhase: SharedValue<number>; birdX: number }) => {
  const style = useAnimatedStyle(() => ({
    position: 'absolute', left: birdX, top: birdY.value,
    width: BIRD_SIZE + 10, height: BIRD_SIZE, zIndex: 10,
  }));
  return <Animated.View style={style}><PixelBird rotation={birdRot} wingPhase={wingPhase} /></Animated.View>;
};

const AnimatedPipe = React.memo(({ xSV, topHSV, gapSV, screenHeight, pipeWidth }: {
  xSV: SharedValue<number>;
  topHSV: SharedValue<number>;
  gapSV: SharedValue<number>;
  screenHeight: number;
  pipeWidth: number;
}) => {

  // Top trunk body
  const topTrunkStyle = useAnimatedStyle(() => ({
    position: 'absolute', left: xSV.value + (pipeWidth * 0.15),
    top: 0, width: pipeWidth * 0.7, height: Math.max(0, topHSV.value - 24),
  }));

  // Top canopy cap
  const topCapStyle = useAnimatedStyle(() => ({
    position: 'absolute', left: xSV.value - (pipeWidth * 0.1),
    top: Math.max(0, topHSV.value) - 34,
    width: pipeWidth * 1.2, height: 36,
  }));

  // Top canopy leaves (layered)
  const topLeavesStyle = useAnimatedStyle(() => ({
    position: 'absolute', left: xSV.value - (pipeWidth * 0.2),
    top: Math.max(0, topHSV.value) - 60,
    width: pipeWidth * 1.4, height: 34,
  }));

  // Bottom trunk body
  const bottomTrunkStyle = useAnimatedStyle(() => ({
    position: 'absolute', left: xSV.value + (pipeWidth * 0.15),
    top: topHSV.value + gapSV.value + 24,
    width: pipeWidth * 0.7, height: Math.max(0, screenHeight - topHSV.value - gapSV.value - 24),
  }));

  // Bottom canopy cap
  const bottomCapStyle = useAnimatedStyle(() => ({
    position: 'absolute', left: xSV.value - (pipeWidth * 0.1),
    top: topHSV.value + gapSV.value - 2,
    width: pipeWidth * 1.2, height: 36,
  }));

  // Bottom leaves crown
  const bottomLeavesStyle = useAnimatedStyle(() => ({
    position: 'absolute', left: xSV.value - (pipeWidth * 0.2),
    top: topHSV.value + gapSV.value + 28,
    width: pipeWidth * 1.4, height: 34,
  }));

  return (
    <>
      {/* ── TOP PIPE (Facing Down) ── */}
      
      {/* Trunk */}
      <Animated.View style={[topTrunkStyle, { overflow: 'hidden', backgroundColor: '#5D4037' }]}>
        <LinearGradient colors={['#3E2723', '#5D4037', '#4E342E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        <View style={{ position: 'absolute', left: 4, width: 2, height: '100%', backgroundColor: '#3E2723', opacity: 0.6 }} />
        <View style={{ position: 'absolute', right: 4, width: 4, height: '100%', backgroundColor: '#212121', opacity: 0.3 }} />
        {/* Bark details */}
        <View style={{ position: 'absolute', left: 10, top: 40, width: 2, height: 15, backgroundColor: '#3E2723', opacity: 0.5 }} />
        <View style={{ position: 'absolute', left: 24, top: 80, width: 3, height: 20, backgroundColor: '#3E2723', opacity: 0.4 }} />
        <View style={{ position: 'absolute', left: 8, top: 130, width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: '#3E2723', backgroundColor: '#4E342E' }} />
      </Animated.View>

      {/* Top Cap (Wood base of the leaves) */}
      <Animated.View style={[topCapStyle, { borderRadius: 6, backgroundColor: '#4E342E', overflow: 'hidden' }]}>
        <LinearGradient colors={['#3E2723', '#5D4037', '#212121']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        <View style={{ position: 'absolute', bottom: 4, left: 4, right: 4, height: 3, backgroundColor: '#3E2723', borderRadius: 2 }} />
      </Animated.View>

      {/* Top Leaves (Bushy, vibrant green) */}
      <Animated.View style={[topLeavesStyle, { overflow: 'visible' }]}>
        {/* Dark base layer */}
        <View style={{ position: 'absolute', left: 4, top: 12, width: PIPE_WIDTH + 20, height: 22, backgroundColor: '#1B5E20', borderRadius: 12 }} />
        {/* Mid layer */}
        <View style={{ position: 'absolute', left: 8, top: 6, width: PIPE_WIDTH + 12, height: 20, backgroundColor: '#2E7D32', borderRadius: 10 }} />
        {/* Top highlight layer */}
        <View style={{ position: 'absolute', left: 12, top: 0, width: PIPE_WIDTH + 4, height: 16, backgroundColor: '#388E3C', borderRadius: 8 }} />
        <View style={{ position: 'absolute', left: 16, top: 2, width: PIPE_WIDTH - 4, height: 6, backgroundColor: '#4CAF50', borderRadius: 4 }} />
        
        {/* Overhanging side leaves with varied colors */}
        <View style={{ position: 'absolute', left: -4, top: 10, width: 14, height: 16, backgroundColor: '#144d18', borderRadius: 7 }} />
        <View style={{ position: 'absolute', left: 2, top: 4, width: 14, height: 14, backgroundColor: '#2E7D32', borderRadius: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 2 }} />
        <View style={{ position: 'absolute', right: -4, top: 10, width: 14, height: 16, backgroundColor: '#144d18', borderRadius: 7 }} />
        <View style={{ position: 'absolute', right: 2, top: 4, width: 14, height: 14, backgroundColor: '#2E7D32', borderRadius: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 2 }} />
      </Animated.View>


      {/* ── BOTTOM PIPE (Facing Up) ── */}

      {/* Bottom Leaves */}
      <Animated.View style={[bottomLeavesStyle, { overflow: 'visible', zIndex: 5 }]}>
        <View style={{ position: 'absolute', left: 4, top: 0, width: PIPE_WIDTH + 20, height: 22, backgroundColor: '#1B5E20', borderRadius: 12 }} />
        <View style={{ position: 'absolute', left: 8, top: 8, width: PIPE_WIDTH + 12, height: 20, backgroundColor: '#2E7D32', borderRadius: 10 }} />
        <View style={{ position: 'absolute', left: 12, top: 16, width: PIPE_WIDTH + 4, height: 16, backgroundColor: '#388E3C', borderRadius: 8 }} />
        <View style={{ position: 'absolute', left: 16, top: 20, width: PIPE_WIDTH - 4, height: 6, backgroundColor: '#4CAF50', borderRadius: 4 }} />
        
        {/* Overhanging side leaves */}
        <View style={{ position: 'absolute', left: -4, top: 8, width: 14, height: 16, backgroundColor: '#144d18', borderRadius: 7 }} />
        <View style={{ position: 'absolute', left: 2, top: 16, width: 14, height: 14, backgroundColor: '#2E7D32', borderRadius: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 2 }} />
        <View style={{ position: 'absolute', right: -4, top: 8, width: 14, height: 16, backgroundColor: '#144d18', borderRadius: 7 }} />
        <View style={{ position: 'absolute', right: 2, top: 16, width: 14, height: 14, backgroundColor: '#2E7D32', borderRadius: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 2 }} />
      </Animated.View>

      {/* Bottom Cap */}
      <Animated.View style={[bottomCapStyle, { borderRadius: 6, backgroundColor: '#4E342E', overflow: 'hidden' }]}>
        <LinearGradient colors={['#3E2723', '#5D4037', '#212121']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        <View style={{ position: 'absolute', top: 4, left: 4, right: 4, height: 3, backgroundColor: '#3E2723', borderRadius: 2 }} />
      </Animated.View>

      {/* Bottom Trunk */}
      <Animated.View style={[bottomTrunkStyle, { overflow: 'hidden', backgroundColor: '#5D4037' }]}>
        <LinearGradient colors={['#3E2723', '#5D4037', '#4E342E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        <View style={{ position: 'absolute', left: 4, width: 2, height: '100%', backgroundColor: '#3E2723', opacity: 0.6 }} />
        <View style={{ position: 'absolute', right: 4, width: 4, height: '100%', backgroundColor: '#212121', opacity: 0.3 }} />
        {/* Bark details */}
        <View style={{ position: 'absolute', left: 14, top: 20, width: 2, height: 15, backgroundColor: '#3E2723', opacity: 0.5 }} />
        <View style={{ position: 'absolute', left: 28, top: 70, width: 3, height: 20, backgroundColor: '#3E2723', opacity: 0.4 }} />
        <View style={{ position: 'absolute', left: 12, top: 110, width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: '#3E2723', backgroundColor: '#4E342E' }} />
      </Animated.View>
    </>
  );
});
AnimatedPipe.displayName = 'AnimatedPipe';

type Particle = { id: number; x: number; y: number; vx: number; vy: number; life: number; color: string };

// ── Main Component ────────────────────────────────────────────────────────────
export default function FlappyBird() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  
  // ── Derived Scales ────────────────────────────────────────────────────────────
  // Scale physics constants based on screen height for consistent feel
  const scaleRatio = Math.min(windowHeight / 850, 1.2);
  const GRAVITY = GRAVITY_BASE * scaleRatio;
  const JUMP_FORCE = JUMP_BASE * scaleRatio;
  const PIPE_SPEED = PIPE_SPEED_BASE * (windowWidth / 390); // Scale speed slightly by width
  const PIPE_GAP_MIN = PIPE_GAP_MIN_BASE * scaleRatio;
  const PIPE_GAP_MAX = PIPE_GAP_MAX_BASE * scaleRatio;
  const PIPE_HORIZ_SPACING = Math.max(windowWidth * 0.6, PIPE_HORIZ_BASE);
  const BIRD_X = windowWidth * 0.25;
  const GROUND_H = Math.max(GROUND_H_BASE, windowHeight * 0.1);

  const GAME_WIDTH = windowWidth;
  const GAME_HEIGHT = windowHeight;
  const layoutRef = useRef({ width: windowWidth, height: windowHeight, scale: 1 });
  layoutRef.current = { 
    width: windowWidth, 
    height: windowHeight, 
    scale: scaleRatio 
  };
  
  const BIRD_X_POS = Math.floor(Math.min(GAME_WIDTH / 4, 300)); // Cap bird position nicely

  const [score, setScore]             = useState(0);
  const [highScore, setHighScore]     = useState(0);
  const [gameOver, setGameOver]       = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused]       = useState(false);
  const [particles, setParticles]     = useState<Particle[]>([]);
  const particleIdRef = useRef(0);

  // All physics as SharedValues — zero React re-renders during gameplay
  const birdY     = useSharedValue(windowHeight / 2);
  const velSV     = useSharedValue(0);
  const birdRot   = useSharedValue(0);
  const wingPhase = useSharedValue(0);

  // Fixed pipe pool with per-pipe gap
  const pipeXs    = useRef(Array.from({ length: PIPE_COUNT }, (_, i) => useSharedValue(900 + i * 300))).current;
  const pipeTopHs = useRef(Array.from({ length: PIPE_COUNT }, () => useSharedValue(windowHeight * 0.3))).current;
  const pipeGaps  = useRef(Array.from({ length: PIPE_COUNT }, () => useSharedValue(PIPE_GAP_MAX_BASE))).current;

  const gameOverRef    = useRef(false);
  const gameStartedRef = useRef(false);
  const isPausedRef    = useRef(false);
  const particlesRef   = useRef(particles);
  const scoreRef       = useRef(0);
  const highScoreRef   = useRef(0);
  const gameLoopRef    = useRef<number | null>(null);
  const lastTimeRef    = useRef<number | null>(null);

  useEffect(() => {
    gameOverRef.current    = gameOver;
    gameStartedRef.current = gameStarted;
    isPausedRef.current    = isPaused;
  }, [gameOver, gameStarted, isPaused]);

  useEffect(() => { particlesRef.current = particles; }, [particles]);
  useEffect(() => { highScoreRef.current = highScore; }, [highScore]);
  useEffect(() => { scoreRef.current = score; }, [score]);

  useEffect(() => {
    AsyncStorage.getItem('flappy_hs').then(v => v && setHighScore(parseInt(v)));
  }, []);

  useEffect(() => {
    if (gameStarted && !gameOver && !isPaused) {
      wingPhase.value = withRepeat(
        withSequence(withTiming(1, { duration: 90 }), withTiming(0, { duration: 90 })),
        -1, true
      );
    } else {
      wingPhase.value = withTiming(0, { duration: 100 });
    }
  }, [gameStarted, gameOver, isPaused]);

  // Random gap per pipe: starts wide, narrows over time
  const randomGap = (score: number) => {
    const progress = Math.min(score / 30, 1);
    const range = PIPE_GAP_MAX_BASE - PIPE_GAP_MIN_BASE;
    const baseGap = PIPE_GAP_MAX_BASE - progress * range;
    return baseGap + (Math.random() - 0.5) * 40;
  };

  const randomTopH = (gap: number) => {
    const minH = GAME_HEIGHT * 0.12;
    const maxH = GAME_HEIGHT - GROUND_H_BASE - gap - GAME_HEIGHT * 0.12;
    return minH + Math.random() * (maxH - minH);
  };

  const initPipes = useCallback(() => {
    for (let i = 0; i < PIPE_COUNT; i++) {
      const gap = PIPE_GAP_MAX_BASE;
      pipeXs[i].value    = GAME_WIDTH * 0.65 + i * PIPE_HORIZ_BASE;
      pipeGaps[i].value  = gap;
      pipeTopHs[i].value = randomTopH(gap);
    }
  }, [GAME_WIDTH, windowHeight]);

  const doJump = useCallback(() => {
    velSV.value = JUMP_BASE;
    birdRot.value = withSequence(
      withTiming(-28, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(90,  { duration: 550, easing: Easing.in(Easing.cubic) }),
    );
    tapLight();
    const newP: Particle[] = Array.from({ length: 3 }, (_, i) => ({
      id: particleIdRef.current++,
      x: BIRD_X_POS + 10, y: birdY.value + BIRD_SIZE / 2,
      vx: (Math.random() - 0.5) * 4, vy: Math.random() * 2 + 1,
      life: 1,
      color: i % 2 === 0 ? '#EFEBE9' : '#795548',
    }));
    setParticles(p => [...p, ...newP]);
  }, []);

  const jump = useCallback(() => {
    if (gameOverRef.current || isPausedRef.current || !gameStartedRef.current) return;
    doJump();
  }, []);

  const togglePause = useCallback(() => {
    if (gameOverRef.current) return;
    if (!gameStartedRef.current) {
      initPipes();
      setGameStarted(true);
      gameStartedRef.current = true;
      velSV.value = JUMP_BASE;
      birdRot.value = withSequence(
        withTiming(-28, { duration: 90 }),
        withTiming(90,  { duration: 550, easing: Easing.in(Easing.cubic) }),
      );
      tapMedium();
      return;
    }
    setIsPaused(p => !p);
    tapLight();
  }, []);

  const onGameOver = useCallback((finalY: number) => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    setGameOver(true);
    setGameStarted(false);
    notifyError();
    const s = scoreRef.current;
    const hs = highScoreRef.current;
    if (s > hs) {
      setHighScore(s);
      AsyncStorage.setItem('flappy_hs', s.toString());
    }
    const explode: Particle[] = Array.from({ length: 22 }, (_, i) => ({
      id: particleIdRef.current++,
      x: BIRD_X_POS + 15, y: finalY + 15,
      vx: (Math.random() - 0.5) * 13, vy: (Math.random() - 0.5) * 13,
      life: 1,
      color: i % 3 === 0 ? '#795548' : i % 3 === 1 ? '#EFEBE9' : '#5D4037',
    }));
    setParticles(p => [...p, ...explode]);
    const animateDeath = () => {
      setParticles(prev => {
        const next = prev
          .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 0.022 }))
          .filter(p => p.life > 0);
        if (next.length > 0) requestAnimationFrame(animateDeath);
        return next;
      });
    };
    requestAnimationFrame(animateDeath);
  }, []);

  // ── Game Loop: full SharedValue physics ──────────────────────────────────────
  const gameLoop = useCallback((timestamp: number) => {
    if (gameOverRef.current || !gameStartedRef.current || isPausedRef.current) {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      lastTimeRef.current = null;
      return;
    }

    const dt = lastTimeRef.current ? Math.min((timestamp - lastTimeRef.current) / 16.67, 2) : 1;
    lastTimeRef.current = timestamp;

    const layout = layoutRef.current;
    const scaledPipeWidth = PIPE_WIDTH * layout.scale;
    const scaledPipeHoriz = PIPE_HORIZ_BASE * layout.scale;

    const newVel = velSV.value + GRAVITY_BASE * dt;
    const newY   = birdY.value + newVel * dt;

    if (newY < 0 || newY > layout.height - GROUND_H_BASE - BIRD_SIZE) {
      runOnJS(onGameOver)(newY);
      return;
    }

    velSV.value = newVel;
    birdY.value = newY;

    let passed = false;
    const currentScore = scoreRef.current;

    for (let i = 0; i < PIPE_COUNT; i++) {
      const pX    = pipeXs[i].value - PIPE_SPEED_BASE * dt;
      const pTopH = pipeTopHs[i].value;
      const pGap  = pipeGaps[i].value;

      // Collision check
      if (
        BIRD_X_POS + BIRD_SIZE - 4 > pX + 4 &&
        BIRD_X_POS + 4            < pX + scaledPipeWidth - 4 &&
        (newY + 4 < pTopH || newY + BIRD_SIZE - 4 > pTopH + pGap)
      ) {
        runOnJS(onGameOver)(newY);
        return;
      }

      // Score gate
      if (pX + scaledPipeWidth < BIRD_X_POS && pX + scaledPipeWidth + PIPE_SPEED_BASE * dt >= BIRD_X_POS) passed = true;

      // Recycle: send behind the furthest pipe with new random gap
      if (pX < -scaledPipeWidth - 20) {
        let maxX = -Infinity;
        for (let j = 0; j < PIPE_COUNT; j++) {
          if (pipeXs[j].value > maxX) maxX = pipeXs[j].value;
        }
        const newGap = randomGap(currentScore);
        const randHoriz = (Math.random() - 0.5) * 60; // Horizontal randomization
        pipeXs[i].value    = maxX + scaledPipeHoriz + randHoriz;
        pipeGaps[i].value  = newGap;
        pipeTopHs[i].value = randomTopH(newGap);
      } else {
        pipeXs[i].value = pX;
      }
    }

    if (passed) {
      const newScore = scoreRef.current + 1;
      scoreRef.current = newScore;
      runOnJS(setScore)(newScore);
      runOnJS(tapLight)();
    }

    // Particles
    const curP = particlesRef.current;
    if (curP.length > 0) {
      const next = curP
        .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 0.05 }))
        .filter(p => p.life > 0);
      runOnJS(setParticles)(next);
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, []);

  useEffect(() => {
    if (gameStarted && !gameOver && !isPaused) {
      lastTimeRef.current = null;
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    return () => { if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current); };
  }, [gameStarted, gameOver, isPaused]);

  const restart = useCallback(() => {
    birdY.value      = layoutRef.current.height / 2;
    velSV.value      = 0;
    birdRot.value    = 0;
    wingPhase.value  = 0;
    scoreRef.current = 0;
    gameOverRef.current    = false;
    gameStartedRef.current = false;
    lastTimeRef.current    = null;
    for (let i = 0; i < PIPE_COUNT; i++) {
      pipeXs[i].value    = layoutRef.current.width + i * (PIPE_HORIZ_BASE * layoutRef.current.scale);
      pipeGaps[i].value  = PIPE_GAP_MAX_BASE;
      pipeTopHs[i].value = randomTopH(PIPE_GAP_MAX_BASE);
    }
    setScore(0); setGameOver(false); setGameStarted(false);
    setIsPaused(false); setParticles([]);
  }, []);

  useKeyboard((key: KeyboardKey) => {
    if (key === 'Enter') { if (gameOver) { restart(); return; } togglePause(); return; }
    if (key === ' ' || key === 'ArrowUp' || key === 'w' || key === 'W') jump();
  }, { disableRepeat: true, preventDefault: true });

  const handleTap = () => {
    if (gameOver) return;
    if (!gameStarted) { togglePause(); return; }
    if (isPaused) return;
    jump();
  };

  return (
    <View style={styles.root} onStartShouldSetResponder={() => true} onResponderGrant={handleTap}>
        {/* Same CyberBackground as home page */}
        <CyberBackground scrollOffset={useSharedValue(0)} autoScroll />

        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          {/* Main responsive gameplay container centered on screen */}
          <View style={[styles.gameplayArea, { width: GAME_WIDTH, height: GAME_HEIGHT }]}>
            <GameHeader title="FLAPPY" score={score} highScore={highScore} accentColor={ACCENT}
              onBack={() => { setGameOver(true); router.replace('/'); }} />

            {!gameStarted && !gameOver && (
              <ControlsOverlay
                instructions={['Navigate the slim sparrow through the trees.']}
                controls={[{ action: 'Flap / Jump', input: 'Space / ↑ / W' }, { action: 'Start / Pause', input: 'Enter' }]}
              />
            )}

            {/* Pipes */}
            {pipeXs.map((xSV, i) => (
              <AnimatedPipe key={i} xSV={xSV} topHSV={pipeTopHs[i]} gapSV={pipeGaps[i]} screenHeight={windowHeight} pipeWidth={PIPE_WIDTH * layoutRef.current.scale} />
            ))}

            {/* Bird */}
            {!gameOver && <BirdContainer birdY={birdY} birdRot={birdRot} wingPhase={wingPhase} birdX={BIRD_X_POS} />}

            {/* Particles */}
            {particles.map(p => (
              <View key={p.id} style={{
                position: 'absolute', left: p.x, top: p.y,
                width: 6, height: 6, borderRadius: 3,
                backgroundColor: p.color, opacity: p.life,
              }} />
            ))}

            {/* Grass ground strip */}
            <View style={[styles.ground, { height: GROUND_H_BASE }]}>
              <LinearGradient colors={[GROUND_TOP, GROUND_BOT]} style={StyleSheet.absoluteFillObject} />
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, backgroundColor: '#2E7D32' }} />
            </View>

            {!gameStarted && !gameOver && (
              <View style={styles.overlayCenter}>
                <TouchableOpacity style={[styles.actionBtn, glassmorphism(), { borderColor: `${ACCENT}60` }]} onPress={togglePause} activeOpacity={0.8}>
                  <Text style={[styles.actionBtnText, { color: ACCENT }]}>▶  START</Text>
                </TouchableOpacity>
                <Text style={styles.overlayHint}>or press Enter</Text>
              </View>
            )}

            {isPaused && (
              <View style={styles.overlayCenter}>
                <View style={[styles.pauseCard, glassmorphism()]}>
                  <Text style={styles.pauseTitle}>PAUSED</Text>
                  <TouchableOpacity style={[styles.actionBtn, { borderColor: `${NEON_CYAN}60`, marginTop: Spacing[4] }]} onPress={togglePause} activeOpacity={0.8}>
                    <Text style={[styles.actionBtnText, { color: NEON_CYAN }]}>▶  RESUME</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {gameStarted && !gameOver && !isPaused && (
              <View style={styles.liveScore}>
                <Text style={styles.liveScoreText}>{score}</Text>
              </View>
            )}

            <GameOverModal visible={gameOver} title="GAME OVER" score={score} highScore={highScore}
              isNewHighScore={score >= highScore && score > 0} accentColor={ACCENT}
              onRestart={restart} onHome={() => router.replace('/')} />
          </View>
        </SafeAreaView>
      </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SKY_TOP },
  safe: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gameplayArea: {
    overflow: 'hidden',
  },
  ground: { position: 'absolute', bottom: 0, width: '100%', borderTopWidth: 2, borderTopColor: '#1B5E20', overflow: 'hidden', zIndex: 10 },
  overlayCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 20 },
  actionBtn: { paddingHorizontal: Spacing[8], paddingVertical: Spacing[4], borderRadius: Radius.md, borderWidth: 1.5, backgroundColor: 'rgba(0,0,0,0.4)' },
  actionBtnText: { fontFamily: Fonts.heading, fontSize: FontSize.lg, letterSpacing: 3 },
  overlayHint: { fontFamily: Fonts.body, fontSize: FontSize.xs, color: '#888', marginTop: Spacing[3], letterSpacing: 1 },
  pauseCard: { padding: Spacing[8], borderRadius: Radius.xl, alignItems: 'center', backgroundColor: 'rgba(5,1,24,0.9)', borderWidth: 1, borderColor: NEON_CYAN },
  pauseTitle: { fontFamily: Fonts.heading, fontSize: FontSize['2xl'], color: ACCENT, letterSpacing: 4 },
  liveScore: { position: 'absolute', top: 100, alignSelf: 'center', zIndex: 20 },
  liveScoreText: { fontFamily: Fonts.heading, fontSize: 56, color: '#FFF', textShadowColor: ACCENT, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15, letterSpacing: 2 },
});