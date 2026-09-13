import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
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
  cancelAnimation,
} from 'react-native-reanimated';
import { Fonts, FontSize } from '../src/theme/typography';
import { Spacing } from '../src/theme/spacing';
import { GameHeader } from '../src/components/GameHeader';
import { GameOverModal } from '../src/components/GameOverModal';
import { LinearGradient } from 'expo-linear-gradient';
import { tapLight, notifyError, tapMedium } from '../src/utils/haptics';
import { useKeyboard, KeyboardKey } from '../src/hooks/useKeyboard';
import { CyberBackground } from '../src/components/CyberBackground';

// ── Theme ─────────────────────────────────────────────────────────────────────
const ACCENT      = '#00E5FF';
const NEON_CYAN   = '#00E5FF';
const GROUND_TOP  = '#1B3A22';
const GROUND_BOT  = '#1C110C';

// ── Realistic Flappy Bird Physics & Dimensions ────────────────────────────────
const GRAVITY_BASE          = 0.38; // Authentic gentle gravity that accelerates downwards
const JUMP_BASE             = -7.8; // Snappy, responsive upward hop
const PIPE_SPEED_BASE       = 3.2;  // Classic Flappy Bird horizontal pace (steady & readable)
const PIPE_WIDTH            = 66;   // Substantial, realistic tree trunk width
const PIPE_GAP_MIN_BASE     = 160;  // Generous, fair gap minimum
const PIPE_GAP_MAX_BASE     = 215;  // Comfortable maximum gap
const ADJACENT_TREE_SPACING = 210;  // Reduced gap between adjacent trees for continuous flow
const PIPE_COUNT            = 8;    // 8 trees pool to cover wide and tall screens seamlessly
const BIRD_SIZE             = 32;
const GROUND_H_BASE         = 84;

// ── Sparrow Sprite ────────────────────────────────────────────────────────────
const PixelBird = ({ rotation, wingPhase }: { rotation: SharedValue<number>; wingPhase: SharedValue<number> }) => {
  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  const wingStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: wingPhase.value * -5 },
      { rotate: `${wingPhase.value * -32}deg` },
    ],
  }));

  return (
    <Animated.View style={[{ width: BIRD_SIZE + 10, height: BIRD_SIZE, justifyContent: 'center' }, bodyStyle]}>
      {/* Tail feathers */}
      <View style={{ position: 'absolute', left: -8, top: 12, width: 16, height: 6, backgroundColor: '#5D4037', borderBottomLeftRadius: 4, borderTopLeftRadius: 2, transform: [{ rotate: '-6deg' }] }} />
      {/* Belly */}
      <View style={{ position: 'absolute', left: 4,  top: 10, width: 26, height: 12, backgroundColor: '#FFFDD0', borderRadius: 10 }} />
      {/* Back & Torso */}
      <View style={{ position: 'absolute', left: 6,  top: 4,  width: 22, height: 10, backgroundColor: '#8D6E63', borderRadius: 8 }} />
      {/* Head */}
      <View style={{ position: 'absolute', left: 20, top: 2,  width: 13, height: 13, backgroundColor: '#6D4C41', borderRadius: 6.5 }} />
      {/* Eye white & pupil */}
      <View style={{ position: 'absolute', left: 24, top: 4,  width: 7,  height: 7,  backgroundColor: '#FFFFFF', borderRadius: 3.5 }}>
        <View style={{ position: 'absolute', left: 3, top: 1.5, width: 3.5, height: 3.5, backgroundColor: '#111827', borderRadius: 2 }}>
          <View style={{ position: 'absolute', left: 0.5, top: 0.5, width: 1.2, height: 1.2, backgroundColor: '#FFFFFF', borderRadius: 1 }} />
        </View>
      </View>
      {/* Beak */}
      <View style={{ position: 'absolute', left: 30, top: 7,  width: 8,  height: 5,  backgroundColor: '#F59E0B', borderTopRightRadius: 4, borderBottomRightRadius: 3, borderWidth: 0.5, borderColor: '#D97706' }} />
      {/* Animated Wing */}
      <Animated.View style={[{ position: 'absolute', left: 8, top: 8, width: 16, height: 11, backgroundColor: '#795548', borderBottomLeftRadius: 10, borderBottomRightRadius: 10, borderWidth: 1, borderColor: '#4E342E', overflow: 'hidden' }, wingStyle]}>
        <View style={{ position: 'absolute', left: 2, top: 2, width: 10, height: 1.5, backgroundColor: '#3E2723' }} />
        <View style={{ position: 'absolute', left: 4, top: 5, width: 8,  height: 1.5, backgroundColor: '#3E2723' }} />
        <View style={{ position: 'absolute', left: 3, top: 8, width: 6,  height: 1.5, backgroundColor: '#D7CCC8' }} />
      </Animated.View>
    </Animated.View>
  );
};

// ── Bird Container driven by SharedValue ──────────────────────────────────────
const BirdContainer = ({ birdY, birdRot, wingPhase, birdX }: { birdY: SharedValue<number>; birdRot: SharedValue<number>; wingPhase: SharedValue<number>; birdX: number }) => {
  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: birdX,
    top: birdY.value,
    width: BIRD_SIZE + 10,
    height: BIRD_SIZE,
    zIndex: 10,
  }));
  return (
    <Animated.View style={style}>
      <PixelBird rotation={birdRot} wingPhase={wingPhase} />
    </Animated.View>
  );
};

// ── Realistic Enchanted Tree Obstacle ─────────────────────────────────────────
const AnimatedPipe = React.memo(({ xSV, topHSV, gapSV, screenHeight, pipeWidth }: {
  xSV: SharedValue<number>;
  topHSV: SharedValue<number>;
  gapSV: SharedValue<number>;
  screenHeight: number;
  pipeWidth: number;
}) => {
  // Top trunk: anchors from well above screen top (-50px) down into the canopy rim
  const topTrunkStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: xSV.value + (pipeWidth * 0.12),
    top: -50,
    width: pipeWidth * 0.76,
    height: Math.max(0, topHSV.value + 40),
  }));

  // Top canopy rim / wooden collar
  const topCapStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: xSV.value - (pipeWidth * 0.08),
    top: Math.max(0, topHSV.value - 24),
    width: pipeWidth * 1.16,
    height: 24,
  }));

  // Top hanging foliage crown dipping into gap
  const topLeavesStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: xSV.value - (pipeWidth * 0.22),
    top: Math.max(0, topHSV.value - 14),
    width: pipeWidth * 1.44,
    height: 24,
  }));

  // Bottom upward foliage crown
  const bottomLeavesStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: xSV.value - (pipeWidth * 0.22),
    top: topHSV.value + gapSV.value - 10,
    width: pipeWidth * 1.44,
    height: 24,
  }));

  // Bottom canopy rim / wooden collar
  const bottomCapStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: xSV.value - (pipeWidth * 0.08),
    top: topHSV.value + gapSV.value + 8,
    width: pipeWidth * 1.16,
    height: 24,
  }));

  // Bottom trunk: extends all the way down into deep earth (+200px)
  const bottomTrunkStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: xSV.value + (pipeWidth * 0.12),
    top: topHSV.value + gapSV.value + 20,
    width: pipeWidth * 0.76,
    height: Math.max(0, screenHeight - (topHSV.value + gapSV.value) + 200),
  }));

  return (
    <>
      {/* ── TOP TREE (Hanging Ancient Trunk) ── */}
      <Animated.View style={[topTrunkStyle, { overflow: 'hidden', backgroundColor: '#3E2723', zIndex: 3 }]}>
        <LinearGradient
          colors={['#24140E', '#4E342E', '#3E2723', '#2B170E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Bark ridges and vertical woodgrain */}
        <View style={{ position: 'absolute', left: 4, width: 2.5, height: '100%', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />
        <View style={{ position: 'absolute', right: 4, width: 5, height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.45)' }} />
        <View style={{ position: 'absolute', left: 14, top: 40, width: 2, height: 45, backgroundColor: 'rgba(0, 0, 0, 0.35)' }} />
        <View style={{ position: 'absolute', left: 24, top: 110, width: 3, height: 60, backgroundColor: 'rgba(0, 0, 0, 0.3)' }} />
        {/* Tree knot */}
        <View style={{ position: 'absolute', left: 18, top: 190, width: 8, height: 12, borderRadius: 4, backgroundColor: '#20120B' }} />
      </Animated.View>

      {/* Top Tree Collar */}
      <Animated.View style={[topCapStyle, { borderRadius: 4, backgroundColor: '#4E342E', overflow: 'hidden', zIndex: 4 }]}>
        <LinearGradient
          colors={['#2D1B12', '#5D4037', '#3E2723', '#1C0F08']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(0, 0, 0, 0.5)' }} />
      </Animated.View>

      {/* Top Tree Lush Leafy Crown (Hanging into gap) */}
      <Animated.View style={[topLeavesStyle, { overflow: 'visible', zIndex: 6 }]}>
        <View style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: 20, backgroundColor: '#144D1E', borderRadius: 10 }} />
        <View style={{ position: 'absolute', left: 6, top: 3, width: '88%', height: 17, backgroundColor: '#1B5E20', borderRadius: 8 }} />
        <View style={{ position: 'absolute', left: 14, top: 6, width: '70%', height: 12, backgroundColor: '#2E7D32', borderRadius: 6 }} />
        <View style={{ position: 'absolute', left: 10, top: 16, width: 6, height: 9, backgroundColor: '#2E7D32', borderRadius: 3 }} />
        <View style={{ position: 'absolute', left: 24, top: 17, width: 8, height: 12, backgroundColor: '#1B5E20', borderRadius: 4 }} />
        <View style={{ position: 'absolute', right: 18, top: 16, width: 7, height: 10, backgroundColor: '#2E7D32', borderRadius: 3.5 }} />
        <View style={{ position: 'absolute', right: 8, top: 17, width: 5, height: 7, backgroundColor: '#144D1E', borderRadius: 2.5 }} />
      </Animated.View>

      {/* ── BOTTOM TREE (Rising Ancient Trunk) ── */}
      {/* Bottom Tree Lush Leafy Crown (Rising towards gap) */}
      <Animated.View style={[bottomLeavesStyle, { overflow: 'visible', zIndex: 6 }]}>
        <View style={{ position: 'absolute', left: 10, top: -4, width: 10, height: 12, backgroundColor: '#2E7D32', borderRadius: 5 }} />
        <View style={{ position: 'absolute', left: 26, top: -6, width: 14, height: 14, backgroundColor: '#388E3C', borderRadius: 7 }} />
        <View style={{ position: 'absolute', right: 26, top: -6, width: 14, height: 14, backgroundColor: '#388E3C', borderRadius: 7 }} />
        <View style={{ position: 'absolute', right: 10, top: -4, width: 10, height: 12, backgroundColor: '#2E7D32', borderRadius: 5 }} />
        <View style={{ position: 'absolute', left: 0, top: 4, width: '100%', height: 20, backgroundColor: '#144D1E', borderRadius: 10 }} />
        <View style={{ position: 'absolute', left: 6, top: 6, width: '88%', height: 16, backgroundColor: '#1B5E20', borderRadius: 8 }} />
        <View style={{ position: 'absolute', left: 14, top: 8, width: '70%', height: 11, backgroundColor: '#2E7D32', borderRadius: 5 }} />
      </Animated.View>

      {/* Bottom Tree Collar */}
      <Animated.View style={[bottomCapStyle, { borderRadius: 4, backgroundColor: '#4E342E', overflow: 'hidden', zIndex: 4 }]}>
        <LinearGradient
          colors={['#2D1B12', '#5D4037', '#3E2723', '#1C0F08']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(0, 0, 0, 0.5)' }} />
      </Animated.View>

      {/* Bottom Tree Trunk (Anchors deeply into the ground) */}
      <Animated.View style={[bottomTrunkStyle, { overflow: 'hidden', backgroundColor: '#3E2723', zIndex: 3 }]}>
        <LinearGradient
          colors={['#24140E', '#4E342E', '#3E2723', '#2B170E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Bark ridges and highlights */}
        <View style={{ position: 'absolute', left: 4, width: 2.5, height: '100%', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />
        <View style={{ position: 'absolute', right: 4, width: 5, height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.45)' }} />
        <View style={{ position: 'absolute', left: 12, top: 30, width: 2.5, height: 50, backgroundColor: 'rgba(0, 0, 0, 0.35)' }} />
        <View style={{ position: 'absolute', left: 22, top: 95, width: 3, height: 75, backgroundColor: 'rgba(0, 0, 0, 0.3)' }} />
        <View style={{ position: 'absolute', left: 16, top: 190, width: 9, height: 14, borderRadius: 5, backgroundColor: '#20120B' }} />
      </Animated.View>
    </>
  );
});
AnimatedPipe.displayName = 'AnimatedPipe';

type Particle = { id: number; x: number; y: number; vx: number; vy: number; life: number; color: string };

// ── Main Component ────────────────────────────────────────────────────────────
export default function FlappyBird() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Derived Scales based on viewport
  const scaleRatio = Math.min(windowHeight / 850, 1.15);
  const GRAVITY    = GRAVITY_BASE * scaleRatio;
  const JUMP_FORCE = JUMP_BASE * scaleRatio;
  const PIPE_SPEED = PIPE_SPEED_BASE * Math.min(Math.max(windowWidth / 390, 0.9), 1.25);

  const GAME_WIDTH  = windowWidth;
  const GAME_HEIGHT = windowHeight;
  const BIRD_X_POS  = Math.floor(Math.min(GAME_WIDTH * 0.22, 160));

  const layoutRef = useRef({ width: windowWidth, height: windowHeight, scale: scaleRatio });
  layoutRef.current = { width: windowWidth, height: windowHeight, scale: scaleRatio };

  const [score, setScore]             = useState(0);
  const [highScore, setHighScore]     = useState(0);
  const [gameOver, setGameOver]       = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused]       = useState(false);
  const [screenFlash, setScreenFlash] = useState(false);
  const [particles, setParticles]     = useState<Particle[]>([]);
  const particleIdRef = useRef(0);

  // Physics driven entirely by SharedValues
  const birdY     = useSharedValue(windowHeight * 0.42);
  const velSV     = useSharedValue(0);
  const birdRot   = useSharedValue(0);
  const wingPhase = useSharedValue(0);

  // Pipe pool with 8 pipes for continuous dense flow
  const pipeXs    = useRef(Array.from({ length: PIPE_COUNT }, () => useSharedValue(2500))).current;
  const pipeTopHs = useRef(Array.from({ length: PIPE_COUNT }, () => useSharedValue(windowHeight * 0.3))).current;
  const pipeGaps  = useRef(Array.from({ length: PIPE_COUNT }, () => useSharedValue(PIPE_GAP_MAX_BASE))).current;

  const gameOverRef    = useRef(false);
  const gameStartedRef = useRef(false);
  const isPausedRef    = useRef(false);
  const particlesRef   = useRef(particles);
  const scoreRef       = useRef(0);
  const highScoreRef   = useRef(0);
  const gameLoopRef    = useRef<number | null>(null);
  const deathAnimRef   = useRef<number | null>(null);
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

  // Idle Bobbing Animation when waiting to start
  useEffect(() => {
    if (!gameStarted && !gameOver) {
      birdY.value = withRepeat(
        withSequence(
          withTiming(windowHeight * 0.42 - 10, { duration: 500, easing: Easing.inOut(Easing.quad) }),
          withTiming(windowHeight * 0.42 + 10, { duration: 500, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      );
      birdRot.value = withTiming(0, { duration: 200 });
      wingPhase.value = withRepeat(
        withSequence(withTiming(1, { duration: 180 }), withTiming(0, { duration: 180 })),
        -1,
        true
      );
    }
  }, [gameStarted, gameOver, windowHeight]);

  // Active flight wing flapping
  useEffect(() => {
    if (gameStarted && !gameOver && !isPaused) {
      wingPhase.value = withRepeat(
        withSequence(withTiming(1, { duration: 80 }), withTiming(0, { duration: 80 })),
        -1,
        true
      );
    }
  }, [gameStarted, gameOver, isPaused]);

  // Dynamic gap calculation: fair, realistic, organic
  const randomGap = (curScore: number) => {
    const progress = Math.min(curScore / 30, 1);
    const baseGap = 205 - progress * 40;
    const jitter = (Math.random() - 0.5) * 30;
    return Math.max(PIPE_GAP_MIN_BASE, Math.min(PIPE_GAP_MAX_BASE, baseGap + jitter));
  };

  const randomTopH = (gap: number) => {
    const minH = GAME_HEIGHT * 0.12;
    const maxH = GAME_HEIGHT - GROUND_H_BASE - gap - GAME_HEIGHT * 0.12;
    return minH + Math.random() * (maxH - minH);
  };

  // Warmup Lead-in for first tree, but reduced gap between all adjacent trees thereafter
  const initPipes = useCallback(() => {
    const leadIn = Math.max(GAME_WIDTH * 0.85, 520);
    for (let i = 0; i < PIPE_COUNT; i++) {
      const gap = randomGap(0);
      // Trees after the first tree have reduced horizontal distance between each other
      pipeXs[i].value    = leadIn + i * ADJACENT_TREE_SPACING;
      pipeGaps[i].value  = gap;
      pipeTopHs[i].value = randomTopH(gap);
    }
  }, [GAME_WIDTH, windowHeight]);

  const doJump = useCallback(() => {
    cancelAnimation(birdY);
    velSV.value = JUMP_FORCE;
    birdRot.value = -24;
    tapLight();

    const newP: Particle[] = Array.from({ length: 3 }, () => ({
      id: particleIdRef.current++,
      x: BIRD_X_POS + 8,
      y: birdY.value + BIRD_SIZE * 0.7,
      vx: (Math.random() - 0.5) * 3 - 2,
      vy: Math.random() * 2 + 1,
      life: 0.8,
      color: Math.random() > 0.5 ? '#D7CCC8' : '#8D6E63',
    }));
    setParticles(p => [...p, ...newP]);
  }, [JUMP_FORCE, BIRD_X_POS]);

  const jump = useCallback(() => {
    if (gameOverRef.current || isPausedRef.current) return;
    if (!gameStartedRef.current) {
      initPipes();
      setGameStarted(true);
      gameStartedRef.current = true;
      doJump();
      tapMedium();
      return;
    }
    doJump();
  }, [doJump, initPipes]);

  const togglePause = useCallback(() => {
    if (gameOverRef.current) return;
    if (!gameStartedRef.current) {
      jump();
      return;
    }
    setIsPaused(p => !p);
    tapLight();
  }, [jump]);

  const onGameOver = useCallback((finalY: number) => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    setGameOver(true);
    setGameStarted(false);
    notifyError();

    // Screen flash effect
    setScreenFlash(true);
    setTimeout(() => setScreenFlash(false), 120);

    const s = scoreRef.current;
    const hs = highScoreRef.current;
    if (s > hs) {
      setHighScore(s);
      AsyncStorage.setItem('flappy_hs', s.toString());
    }

    birdRot.value = withTiming(85, { duration: 350, easing: Easing.in(Easing.quad) });

    const explode: Particle[] = Array.from({ length: 20 }, (_, i) => ({
      id: particleIdRef.current++,
      x: BIRD_X_POS + 15,
      y: finalY + 15,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 12,
      life: 1,
      color: i % 3 === 0 ? '#8D6E63' : i % 3 === 1 ? '#FFFDD0' : '#D7CCC8',
    }));
    setParticles(p => [...p, ...explode]);

    const animateDeath = () => {
      setParticles(prev => {
        const next = prev
          .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 0.025 }))
          .filter(p => p.life > 0);
        if (next.length > 0) {
          deathAnimRef.current = requestAnimationFrame(animateDeath);
        } else {
          deathAnimRef.current = null;
        }
        return next;
      });
    };
    if (deathAnimRef.current) cancelAnimationFrame(deathAnimRef.current);
    deathAnimRef.current = requestAnimationFrame(animateDeath);
  }, [BIRD_X_POS]);

  // ── Realistic Flappy Bird Game Loop ─────────────────────────────────────────
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

    const newVel = Math.min(10.5, velSV.value + GRAVITY * dt);
    const newY   = birdY.value + newVel * dt;

    if (newVel < 0) {
      birdRot.value = -24;
    } else if (newVel < 2.5) {
      birdRot.value = withTiming(-6, { duration: 90 });
    } else {
      const diveTarget = Math.min(82, (newVel - 2.5) * 14);
      birdRot.value = birdRot.value + (diveTarget - birdRot.value) * 0.16;
    }

    const floorLimit = layout.height - GROUND_H_BASE - BIRD_SIZE;
    if (newY < 0 || newY > floorLimit) {
      birdY.value = Math.min(newY, floorLimit);
      runOnJS(onGameOver)(newY);
      return;
    }

    velSV.value = newVel;
    birdY.value = newY;

    let passed = false;
    const currentScore = scoreRef.current;

    for (let i = 0; i < PIPE_COUNT; i++) {
      const pX    = pipeXs[i].value - PIPE_SPEED * dt;
      const pTopH = pipeTopHs[i].value;
      const pGap  = pipeGaps[i].value;

      if (
        BIRD_X_POS + BIRD_SIZE - 5 > pX + 4 &&
        BIRD_X_POS + 5            < pX + scaledPipeWidth - 4 &&
        (newY + 6 < pTopH || newY + BIRD_SIZE - 6 > pTopH + pGap)
      ) {
        runOnJS(onGameOver)(newY);
        return;
      }

      if (pX + scaledPipeWidth < BIRD_X_POS && pX + scaledPipeWidth + PIPE_SPEED * dt >= BIRD_X_POS) {
        passed = true;
      }

      // Recycle pipe when well off-screen left
      if (pX < -scaledPipeWidth - 30) {
        let maxX = -Infinity;
        for (let j = 0; j < PIPE_COUNT; j++) {
          if (pipeXs[j].value > maxX) maxX = pipeXs[j].value;
        }
        const newGap = randomGap(currentScore);
        const randJitter = (Math.random() - 0.5) * 20;
        // Reduced gap between adjacent trees (210px)
        pipeXs[i].value    = maxX + ADJACENT_TREE_SPACING + randJitter;
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

    const curP = particlesRef.current;
    if (curP.length > 0) {
      const next = curP
        .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 0.05 }))
        .filter(p => p.life > 0);
      runOnJS(setParticles)(next);
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [GRAVITY, PIPE_SPEED, BIRD_X_POS, onGameOver]);

  useEffect(() => {
    if (gameStarted && !gameOver && !isPaused) {
      lastTimeRef.current = null;
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameStarted, gameOver, isPaused, gameLoop]);

  const restart = useCallback(() => {
    if (deathAnimRef.current) {
      cancelAnimationFrame(deathAnimRef.current);
      deathAnimRef.current = null;
    }
    birdY.value            = windowHeight * 0.42;
    velSV.value            = 0;
    birdRot.value          = 0;
    wingPhase.value        = 0;
    scoreRef.current       = 0;
    gameOverRef.current    = false;
    gameStartedRef.current = false;
    lastTimeRef.current    = null;

    for (let i = 0; i < PIPE_COUNT; i++) {
      pipeXs[i].value = 2500;
    }

    setScore(0);
    setGameOver(false);
    setGameStarted(false);
    setIsPaused(false);
    setParticles([]);
  }, [windowHeight]);

  useKeyboard((key: KeyboardKey) => {
    if (key === 'Enter') {
      if (gameOver) { restart(); return; }
      togglePause();
      return;
    }
    if (key === ' ' || key === 'ArrowUp' || key === 'w' || key === 'W') {
      jump();
    }
  }, { disableRepeat: true, preventDefault: true });

  const handleTap = () => {
    if (gameOver) return;
    jump();
  };

  return (
    <View style={styles.root} onStartShouldSetResponder={() => true} onResponderGrant={handleTap}>
      <CyberBackground theme="flappy" />

      {screenFlash && <View pointerEvents="none" style={styles.flashOverlay} />}

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={[styles.gameplayArea, { width: GAME_WIDTH, height: GAME_HEIGHT }]}>
          <GameHeader
            title="FLAPPY"
            category="ARCADE"
            score={score}
            highScore={highScore}
            accentColor={ACCENT}
            onBack={() => { setGameOver(true); router.replace('/'); }}
          />

          {pipeXs.map((xSV, i) => (
            <AnimatedPipe
              key={i}
              xSV={xSV}
              topHSV={pipeTopHs[i]}
              gapSV={pipeGaps[i]}
              screenHeight={windowHeight}
              pipeWidth={PIPE_WIDTH * layoutRef.current.scale}
            />
          ))}

          <BirdContainer birdY={birdY} birdRot={birdRot} wingPhase={wingPhase} birdX={BIRD_X_POS} />

          {particles.map(p => (
            <View
              key={p.id}
              style={{
                position: 'absolute',
                left: p.x,
                top: p.y,
                width: 5,
                height: 5,
                borderRadius: 1.5,
                backgroundColor: p.color,
                opacity: p.life,
              }}
            />
          ))}

          <View style={[styles.ground, { height: GROUND_H_BASE }]}>
            <LinearGradient colors={[GROUND_TOP, GROUND_BOT]} style={StyleSheet.absoluteFillObject} />
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, backgroundColor: '#2E7D32' }} />
            <View style={{ position: 'absolute', top: 6, left: 0, right: 0, height: 3, backgroundColor: '#1B5E20' }} />
            <View style={{ position: 'absolute', top: 9, left: 0, right: 0, height: 1.5, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
          </View>

          {!gameStarted && !gameOver && (
            <View style={styles.overlayCenter} pointerEvents="box-none">
              <View style={styles.readyCard}>
                <Text style={styles.readyTitle}>GET READY!</Text>
                <Text style={styles.readySubtitle}>Trees arrive in a few moments</Text>
                <TouchableOpacity style={styles.actionBtn} onPress={jump} activeOpacity={0.8}>
                  <Text style={styles.actionBtnText}>▶  START FLAPPING</Text>
                </TouchableOpacity>
                <Text style={styles.overlayHint}>Tap screen or press Space / Enter</Text>
              </View>
            </View>
          )}

          {isPaused && (
            <View style={styles.overlayCenter}>
              <View style={styles.pauseCard}>
                <Text style={styles.pauseTitle}>PAUSED</Text>
                <TouchableOpacity style={[styles.actionBtn, { marginTop: Spacing[4] }]} onPress={togglePause} activeOpacity={0.8}>
                  <Text style={styles.actionBtnText}>▶  RESUME</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {gameStarted && !gameOver && !isPaused && (
            <View style={styles.liveScore} pointerEvents="none">
              <Text style={styles.liveScoreText}>{score}</Text>
            </View>
          )}

          <GameOverModal
            visible={gameOver}
            title="GAME OVER"
            score={score}
            highScore={highScore}
            isNewHighScore={score >= highScore && score > 0}
            accentColor={ACCENT}
            onRestart={restart}
            onHome={() => router.replace('/')}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  safe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameplayArea: {
    overflow: 'hidden',
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    opacity: 0.7,
    zIndex: 999,
  },
  ground: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    borderTopWidth: 2,
    borderTopColor: '#388E3C',
    overflow: 'hidden',
    zIndex: 10,
  },
  overlayCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    zIndex: 20,
  },
  readyCard: {
    alignItems: 'center',
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[5],
    borderRadius: 10,
    backgroundColor: 'rgba(14, 13, 24, 0.90)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 255, 0.35)',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  readyTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.lg,
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: Spacing[1],
    textShadowColor: 'rgba(0, 229, 255, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  readySubtitle: {
    fontFamily: Fonts.sans,
    fontSize: FontSize.xs,
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: Spacing[4],
  },
  actionBtn: {
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#00E5FF',
    backgroundColor: 'rgba(0, 229, 255, 0.18)',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnText: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.xs,
    color: '#FFFFFF',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0, 229, 255, 0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  overlayHint: {
    fontFamily: Fonts.sans,
    fontSize: FontSize['2xs'],
    color: '#CBD5E1',
    marginTop: Spacing[3],
    letterSpacing: 0.8,
  },
  pauseCard: {
    padding: Spacing[6],
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(16, 15, 26, 0.95)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 255, 0.35)',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  pauseTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.xl,
    color: '#FFFFFF',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 229, 255, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  liveScore: {
    position: 'absolute',
    top: 90,
    alignSelf: 'center',
    zIndex: 20,
  },
  liveScoreText: {
    fontFamily: Fonts.heading,
    fontSize: 34,
    color: '#FFFFFF',
    textShadowColor: '#00E5FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
    letterSpacing: 2,
  },
});
