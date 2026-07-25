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
} from 'react-native-reanimated';
import { Colors, glassmorphism, elegantShadow } from '../src/theme/colors';
import { Fonts, FontSize } from '../src/theme/typography';
import { Spacing, Radius } from '../src/theme/spacing';
import { GameHeader } from '../src/components/GameHeader';
import { GameOverModal } from '../src/components/GameOverModal';
import { ControlsOverlay } from '../src/components/ControlsOverlay';
import { screenHeight, screenWidth } from '../src/utils/dimensions';
import { LinearGradient } from 'expo-linear-gradient';
import { tapLight, notifyError, tapMedium } from '../src/utils/haptics';
import { useKeyboard, KeyboardKey } from '../src/hooks/useKeyboard';

// ── Theme ─────────────────────────────────────────────────────────────────────
const ACCENT      = '#FFD700';
const NEON_CYAN   = '#00E5FF';
const NEON_PURPLE = Colors.accent.primary;
const SKY_TOP     = '#050118';
const SKY_BOTTOM  = '#0A0830';

// ── Physics (unchanged) ──────────────────────────────────────────────────────
const GRAVITY    = 0.8;
const JUMP       = -12;
const PIPE_SPEED = 5;
const PIPE_WIDTH = 52;
const PIPE_GAP   = 180;
const BIRD_SIZE  = 36;
const BIRD_X     = Math.floor(screenWidth / 3);
const GROUND_H   = 80;

// ── Premium Pixel Bird ────────────────────────────────────────────────────────
const PixelBird = ({ rotation, wingPhase }: { rotation: SharedValue<number>; wingPhase: SharedValue<number> }) => {
  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const wingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: wingPhase.value * -4 }],
  }));

  return (
    <Animated.View style={[{ width: BIRD_SIZE + 10, height: BIRD_SIZE + 6 }, bodyStyle]}>
      {/* Body */}
      <View style={{
        position: 'absolute', top: 6, left: 4,
        width: 28, height: 22, borderRadius: 10,
        backgroundColor: '#F4D03F',
        borderWidth: 2, borderColor: '#C29D0F',
        shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8,
      }} />
      {/* Belly highlight */}
      <View style={{ position: 'absolute', top: 18, left: 10, width: 14, height: 8, borderRadius: 4, backgroundColor: '#FFF9C4' }} />
      {/* Wing */}
      <Animated.View style={[{ position: 'absolute', top: 12, left: 0 }, wingStyle]}>
        <View style={{
          width: 16, height: 10, borderRadius: 6,
          backgroundColor: '#E67E22',
          borderWidth: 2, borderColor: '#A0522D',
        }} />
      </Animated.View>
      {/* Eye (white) */}
      <View style={{
        position: 'absolute', top: 4, left: 22,
        width: 12, height: 12, borderRadius: 6,
        backgroundColor: '#FFFFFF',
        borderWidth: 2, borderColor: '#333',
      }} />
      {/* Pupil */}
      <View style={{ position: 'absolute', top: 7, left: 27, width: 5, height: 5, borderRadius: 3, backgroundColor: '#000' }} />
      {/* Eye glint */}
      <View style={{ position: 'absolute', top: 5, left: 28, width: 2, height: 2, borderRadius: 1, backgroundColor: '#FFF' }} />
      {/* Beak */}
      <View style={{
        position: 'absolute', top: 14, left: 30,
        width: 14, height: 9, borderRadius: 4,
        backgroundColor: '#FF7043',
        borderWidth: 2, borderColor: '#BF360C',
      }} />
    </Animated.View>
  );
};

// ── Cityscape Background ──────────────────────────────────────────────────────
const CityBackground = React.memo(() => {
  // Generate buildings deterministically
  const bgBuildings = React.useMemo(() =>
    Array.from({ length: 20 }).map((_, i) => ({
      h: 40 + (Math.sin(i * 2.7) * 0.5 + 0.5) * 120,
      w: 18 + (Math.sin(i * 1.3) * 0.5 + 0.5) * 30,
      x: i * 5.2,
      c: i % 3 === 0 ? '#0D0530' : i % 3 === 1 ? '#120840' : '#0A0425',
    })), []);

  const fgBuildings = React.useMemo(() =>
    Array.from({ length: 15 }).map((_, i) => ({
      h: 30 + (Math.cos(i * 3.1) * 0.5 + 0.5) * 80,
      w: 22 + (Math.cos(i * 1.7) * 0.5 + 0.5) * 35,
      x: i * 7,
      c: i % 2 === 0 ? '#150A38' : '#1A0E45',
      hasWin: i % 2 === 0,
      winColor: ['#00E5FF', '#FF4081', '#FFD700', '#00E676'][i % 4],
    })), []);

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={[SKY_TOP, SKY_BOTTOM]} style={StyleSheet.absoluteFillObject} />

      {/* Stars */}
      {[10,25,40,55,70,85,15,45,75,35,60,90,20,50,80].map((x, i) => (
        <View
          key={`s${i}`}
          style={{
            position: 'absolute',
            top: `${5 + (i * 7) % 30}%`,
            left: `${x}%`,
            width: i % 3 === 0 ? 2 : 1.5,
            height: i % 3 === 0 ? 2 : 1.5,
            borderRadius: 1,
            backgroundColor: '#FFF',
            opacity: 0.3 + (i % 5) * 0.1,
          }}
        />
      ))}

      {/* BG buildings */}
      {bgBuildings.map((b, i) => (
        <View key={`bg${i}`} style={{
          position: 'absolute', bottom: GROUND_H,
          left: `${b.x}%` as any, width: b.w, height: b.h,
          backgroundColor: b.c,
        }} />
      ))}

      {/* FG buildings with windows */}
      {fgBuildings.map((b, i) => (
        <View key={`fg${i}`} style={{
          position: 'absolute', bottom: GROUND_H,
          left: `${b.x}%` as any, width: b.w, height: b.h,
          backgroundColor: b.c,
        }}>
          {b.hasWin && (
            <>
              <View style={{ position: 'absolute', top: 6, left: 4, width: 3, height: 3, backgroundColor: b.winColor, opacity: 0.6, borderRadius: 0.5 }} />
              <View style={{ position: 'absolute', top: 14, right: 4, width: 3, height: 3, backgroundColor: b.winColor, opacity: 0.4, borderRadius: 0.5 }} />
              <View style={{ position: 'absolute', top: 24, left: 8, width: 3, height: 3, backgroundColor: b.winColor, opacity: 0.5, borderRadius: 0.5 }} />
            </>
          )}
        </View>
      ))}
    </View>
  );
});
CityBackground.displayName = 'CityBackground';

// ── Pipe as Building ──────────────────────────────────────────────────────────
const PipeBuilding = React.memo(({ x, topH, bottomTop, bottomH }: { x: number; topH: number; bottomTop: number; bottomH: number }) => {
  const windowSize = 4;
  const windowGap = 10;

  return (
    <>
      {/* Top pipe (hangs from ceiling) */}
      <View style={[styles.pipe, { left: x, top: 0, height: topH }]}>
        <LinearGradient
          colors={['#1A0E45', '#2D1B69', '#1A0E45']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 0 }]}
        />
        {/* Cap */}
        <View style={styles.pipeCap} />
        {/* Windows */}
        {Array.from({ length: Math.floor(topH / windowGap) }).map((_, i) => (
          <View key={`tw${i}`} style={{
            position: 'absolute',
            bottom: 12 + i * windowGap,
            left: '30%',
            width: windowSize,
            height: windowSize,
            backgroundColor: i % 3 === 0 ? NEON_CYAN : NEON_PURPLE,
            opacity: 0.4 + (i % 4) * 0.1,
            borderRadius: 1,
          }} />
        ))}
        {/* Side glow */}
        <View style={{ position: 'absolute', top: 0, left: 0, width: 2, height: '100%', backgroundColor: `${NEON_PURPLE}30` }} />
        <View style={{ position: 'absolute', top: 0, right: 0, width: 1, height: '100%', backgroundColor: `${NEON_CYAN}20` }} />
      </View>

      {/* Bottom pipe (rises from ground) */}
      <View style={[styles.pipe, { left: x, top: bottomTop, height: bottomH }]}>
        <LinearGradient
          colors={['#1A0E45', '#2D1B69', '#1A0E45']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 0 }]}
        />
        {/* Cap */}
        <View style={[styles.pipeCap, { top: 0, bottom: undefined }]} />
        {/* Windows */}
        {Array.from({ length: Math.floor(bottomH / windowGap) }).map((_, i) => (
          <View key={`bw${i}`} style={{
            position: 'absolute',
            top: 12 + i * windowGap,
            right: '30%',
            width: windowSize,
            height: windowSize,
            backgroundColor: i % 3 === 0 ? NEON_PURPLE : NEON_CYAN,
            opacity: 0.4 + (i % 4) * 0.1,
            borderRadius: 1,
          }} />
        ))}
        <View style={{ position: 'absolute', top: 0, left: 0, width: 2, height: '100%', backgroundColor: `${NEON_PURPLE}30` }} />
        <View style={{ position: 'absolute', top: 0, right: 0, width: 1, height: '100%', backgroundColor: `${NEON_CYAN}20` }} />
      </View>
    </>
  );
});
PipeBuilding.displayName = 'PipeBuilding';

// ── Particle type ─────────────────────────────────────────────────────────────
type Particle = { id: number; x: number; y: number; vx: number; vy: number; life: number; color: string };

// ── Main Component ────────────────────────────────────────────────────────────
export default function FlappyBird() {
  const [birdY, setBirdY]           = useState(screenHeight / 2);
  const [velocity, setVelocity]     = useState(0);
  const [pipes, setPipes]           = useState<number[]>([]);
  const [pipeHeights, setPipeHeights] = useState<number[]>([]);
  const [score, setScore]           = useState(0);
  const [highScore, setHighScore]   = useState(0);
  const [gameOver, setGameOver]     = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused]     = useState(false);
  const [particles, setParticles]   = useState<Particle[]>([]);
  const particleIdRef = useRef(0);

  const birdRot   = useSharedValue(0);
  const wingPhase = useSharedValue(0);

  // Refs for game loop
  const birdYRef       = useRef(birdY);
  const velocityRef    = useRef(velocity);
  const pipesRef       = useRef(pipes);
  const pipeHeightsRef = useRef(pipeHeights);
  const gameOverRef    = useRef(gameOver);
  const gameStartedRef = useRef(gameStarted);
  const isPausedRef    = useRef(isPaused);
  const particlesRef   = useRef(particles);
  const scoreRef       = useRef(score);
  const highScoreRef   = useRef(highScore);
  const gameLoopRef    = useRef<number | null>(null);

  useEffect(() => {
    birdYRef.current       = birdY;
    velocityRef.current    = velocity;
    pipesRef.current       = pipes;
    pipeHeightsRef.current = pipeHeights;
    gameOverRef.current    = gameOver;
    gameStartedRef.current = gameStarted;
    isPausedRef.current    = isPaused;
    scoreRef.current       = score;
    highScoreRef.current   = highScore;
  }, [birdY, velocity, pipes, pipeHeights, gameOver, gameStarted, isPaused, score, highScore]);

  useEffect(() => { particlesRef.current = particles; }, [particles]);

  useEffect(() => {
    AsyncStorage.getItem('flappy_hs').then(v => v && setHighScore(parseInt(v)));
  }, []);

  // Wing flap animation
  useEffect(() => {
    if (gameStarted && !gameOver && !isPaused) {
      wingPhase.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 120 }),
          withTiming(0, { duration: 120 }),
        ),
        -1, true,
      );
    } else {
      wingPhase.value = withTiming(0, { duration: 100 });
    }
  }, [gameStarted, gameOver, isPaused]);

  const jump = useCallback(() => {
    if (gameOverRef.current || isPausedRef.current) return;
    if (!gameStartedRef.current) return; // Must press Enter/Start first

    tapLight();
    setVelocity(JUMP);

    birdRot.value = withSequence(
      withTiming(-25, { duration: 100 }),
      withTiming(90, { duration: 600, easing: Easing.in(Easing.cubic) }),
    );

    // Flap particles
    const newP: Particle[] = [];
    for (let i = 0; i < 3; i++) {
      newP.push({
        id: particleIdRef.current++,
        x: BIRD_X + 10,
        y: birdYRef.current + BIRD_SIZE,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 2 + 1,
        life: 1,
        color: i % 2 === 0 ? NEON_CYAN : ACCENT,
      });
    }
    setParticles(p => [...p, ...newP]);
  }, []);

  const togglePause = useCallback(() => {
    if (gameOverRef.current) return;
    if (!gameStartedRef.current) {
      // Start the game
      setGameStarted(true);
      spawnPipe(screenWidth);
      setVelocity(JUMP); // initial jump
      birdRot.value = withSequence(
        withTiming(-25, { duration: 100 }),
        withTiming(90, { duration: 600, easing: Easing.in(Easing.cubic) }),
      );
      tapMedium();
      return;
    }
    setIsPaused(p => !p);
    tapLight();
  }, []);

  const spawnPipe = (startX: number) => {
    setPipes(p => [...p, startX]);
    const minH = screenHeight * 0.2;
    const maxH = screenHeight * 0.8 - PIPE_GAP;
    setPipeHeights(h => [...h, Math.random() * (maxH - minH) + minH]);
  };

  // ── Game Loop ─────────────────────────────────────────────────────────────
  const gameLoop = () => {
    if (gameOverRef.current || !gameStartedRef.current || isPausedRef.current) {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      return;
    }

    let newVel = velocityRef.current + GRAVITY;
    let newY = birdYRef.current + newVel;

    if (newY < 0 || newY > screenHeight - GROUND_H - BIRD_SIZE) {
      handleGameOver(newY);
      return;
    }

    setBirdY(newY);
    setVelocity(newVel);

    let curPipes   = [...pipesRef.current];
    let curHeights = [...pipeHeightsRef.current];
    let passed     = false;

    for (let i = 0; i < curPipes.length; i++) {
      curPipes[i] -= PIPE_SPEED;

      const pX = curPipes[i]; const pY = curHeights[i];
      if (
        BIRD_X + BIRD_SIZE > pX &&
        BIRD_X < pX + PIPE_WIDTH &&
        (newY < pY || newY + BIRD_SIZE > pY + PIPE_GAP)
      ) {
        handleGameOver(newY);
        return;
      }
      if (pX + PIPE_WIDTH < BIRD_X && pX + PIPE_WIDTH + PIPE_SPEED >= BIRD_X) passed = true;
    }

    if (curPipes.length > 0 && curPipes[0] < -PIPE_WIDTH) {
      curPipes.shift();
      curHeights.shift();
    }

    if (curPipes.length === 0 || curPipes[curPipes.length - 1] < screenWidth - 250) {
      spawnPipe(screenWidth);
    } else {
      setPipes(curPipes);
      setPipeHeights(curHeights);
    }

    if (passed) { setScore(s => s + 1); tapLight(); }

    // Update particles
    let curP = [...particlesRef.current];
    let pChanged = false;
    for (let i = curP.length - 1; i >= 0; i--) {
      curP[i] = { ...curP[i], x: curP[i].x + curP[i].vx, y: curP[i].y + curP[i].vy, life: curP[i].life - 0.05 };
      if (curP[i].life <= 0) curP.splice(i, 1);
      pChanged = true;
    }
    if (pChanged) setParticles(curP);

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    if (gameStarted && !gameOver && !isPaused) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    return () => { if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current); };
  }, [gameStarted, gameOver, isPaused]);

  const handleGameOver = (finalY: number) => {
    setGameOver(true);
    setGameStarted(false);
    notifyError();
    const s = scoreRef.current;
    const hs = highScoreRef.current;
    if (s > hs) {
      setHighScore(s);
      AsyncStorage.setItem('flappy_hs', s.toString());
    }

    const explode: Particle[] = [];
    for (let i = 0; i < 15; i++) {
      explode.push({
        id: particleIdRef.current++,
        x: BIRD_X + 15, y: finalY + 15,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1,
        color: i % 3 === 0 ? '#FF4081' : i % 3 === 1 ? ACCENT : NEON_CYAN,
      });
    }
    setParticles(p => [...p, ...explode]);

    const animateDeath = () => {
      setParticles(prev => {
        const next = prev.map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 0.02 })).filter(p => p.life > 0);
        if (next.length > 0) requestAnimationFrame(animateDeath);
        return next;
      });
    };
    requestAnimationFrame(animateDeath);
  };

  const restart = () => {
    setBirdY(screenHeight / 2);
    setVelocity(0);
    setPipes([]);
    setPipeHeights([]);
    setScore(0);
    setGameOver(false);
    setGameStarted(false);
    setIsPaused(false);
    setParticles([]);
    birdRot.value = 0;
    wingPhase.value = 0;
  };

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useKeyboard((key: KeyboardKey) => {
    if (key === 'Enter') {
      if (gameOver) { restart(); return; }
      togglePause();
      return;
    }
    if (key === ' ' || key === 'ArrowUp' || key === 'w' || key === 'W') {
      jump();
    }
  }, [gameOver]);

  // ── Touch handler — tap only flaps (start/pause via buttons/Enter) ────────
  const handleTap = () => {
    if (gameOver) return;
    if (!gameStarted) {
      // On mobile, tap also starts for convenience
      togglePause();
      return;
    }
    if (isPaused) return;
    jump();
  };

  return (
    <TouchableWithoutFeedback onPress={handleTap}>
      <View style={styles.root}>
        <CityBackground />
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

          <GameHeader
            title="FLAPPY"
            score={score}
            highScore={highScore}
            accentColor={ACCENT}
            onBack={() => { setGameOver(true); router.replace('/'); }}
          />

          {/* Controls info */}
          {!gameStarted && !gameOver && (
            <ControlsOverlay
              instructions={['Navigate the bird through the gaps between buildings.']}
              controls={[
                { action: 'Flap', input: 'Space / ↑ / W' },
                { action: 'Start / Pause', input: 'Enter' },
              ]}
            />
          )}

          {/* Bird */}
          {!gameOver && (
            <View style={[styles.birdContainer, { top: birdY, left: BIRD_X }]}>
              <PixelBird rotation={birdRot} wingPhase={wingPhase} />
            </View>
          )}

          {/* Particles */}
          {particles.map(p => (
            <View
              key={p.id}
              style={{
                position: 'absolute', left: p.x, top: p.y,
                width: 5, height: 5, borderRadius: 3,
                backgroundColor: p.color, opacity: p.life,
              }}
            />
          ))}

          {/* Pipes as buildings */}
          {pipes.map((pipeX, index) => {
            const topH = pipeHeights[index];
            if (topH === undefined) return null;
            const bottomTop = topH + PIPE_GAP;
            const bottomH = screenHeight - bottomTop;
            return (
              <PipeBuilding
                key={index}
                x={pipeX}
                topH={topH}
                bottomTop={bottomTop}
                bottomH={bottomH}
              />
            );
          })}

          {/* Ground */}
          <View style={styles.ground}>
            <LinearGradient
              colors={['#1A0E45', '#0D0530']}
              style={StyleSheet.absoluteFillObject}
            />
            {/* Road lines */}
            <View style={{ position: 'absolute', top: 8, left: 0, right: 0, height: 2, backgroundColor: `${NEON_PURPLE}40` }} />
            <View style={{ position: 'absolute', top: 20, left: 0, right: 0, height: 1, backgroundColor: `${NEON_CYAN}20` }} />
          </View>

          {/* ── Overlays ── */}

          {/* Start overlay */}
          {!gameStarted && !gameOver && (
            <View style={styles.overlayCenter}>
              <TouchableOpacity
                style={[styles.actionBtn, glassmorphism(), { borderColor: `${ACCENT}60` }]}
                onPress={togglePause}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionBtnText, { color: ACCENT }]}>▶  START</Text>
              </TouchableOpacity>
              <Text style={styles.overlayHint}>or press Enter</Text>
            </View>
          )}

          {/* Pause overlay */}
          {isPaused && (
            <View style={styles.overlayCenter}>
              <View style={[styles.pauseCard, glassmorphism()]}>
                <Text style={styles.pauseTitle}>PAUSED</Text>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: `${NEON_CYAN}60`, marginTop: Spacing[4] }]}
                  onPress={togglePause}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.actionBtnText, { color: NEON_CYAN }]}>▶  RESUME</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Score display (in-game) */}
          {gameStarted && !gameOver && !isPaused && (
            <View style={styles.liveScore}>
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
        </SafeAreaView>
      </View>
    </TouchableWithoutFeedback>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  safe: { flex: 1 },

  birdContainer: {
    position: 'absolute',
    width: BIRD_SIZE + 10,
    height: BIRD_SIZE + 6,
    zIndex: 10,
  },

  pipe: {
    position: 'absolute',
    width: PIPE_WIDTH,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: `${NEON_PURPLE}60`,
    overflow: 'hidden',
  },
  pipeCap: {
    position: 'absolute',
    bottom: 0,
    left: -4,
    right: -4,
    height: 10,
    backgroundColor: '#2D1B69',
    borderWidth: 2,
    borderColor: `${NEON_PURPLE}80`,
    borderRadius: 2,
  },

  ground: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: GROUND_H,
    borderTopWidth: 3,
    borderTopColor: `${NEON_PURPLE}60`,
    overflow: 'hidden',
  },

  // Overlays
  overlayCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 20,
  },
  actionBtn: {
    paddingHorizontal: Spacing[8],
    paddingVertical: Spacing[4],
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  actionBtnText: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.lg,
    letterSpacing: 3,
  },
  overlayHint: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
    marginTop: Spacing[3],
    letterSpacing: 1,
  },
  pauseCard: {
    padding: Spacing[8],
    borderRadius: Radius.xl,
    alignItems: 'center',
  },
  pauseTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSize['2xl'],
    color: Colors.white,
    letterSpacing: 4,
    textShadowColor: NEON_PURPLE,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },

  // Live score
  liveScore: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    zIndex: 20,
  },
  liveScoreText: {
    fontFamily: Fonts.heading,
    fontSize: 56,
    color: '#FFFFFF',
    textShadowColor: ACCENT,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    letterSpacing: 2,
  },
});
