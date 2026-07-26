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
import { CyberBackground } from '../src/components/CyberBackground';

// ── Theme (Dark Blue Cyber Theme) ─────────────────────────────────────────────
const ACCENT      = '#00E5FF'; // Cyber Cyan
const NEON_CYAN   = '#00E5FF'; 
const SKY_TOP     = '#020208'; // Deep space
const SKY_BOTTOM  = '#0A0625'; // Dark blue cyber sky
const GROUND_TOP  = '#1B3A22'; // Dark mossy grass
const GROUND_BOT  = '#1C110C'; // Deep dirt brown

// ── Physics & Sizing ──────────────────────────────────────────────────────────
const GRAVITY             = 0.8;
const JUMP                = -12;
const PIPE_SPEED          = 5;
const PIPE_WIDTH          = 52;
const PIPE_GAP            = 180; // Vertical gap between top and bottom trees
const PIPE_HORIZONTAL_GAP = 280; // Distance between trees horizontally
const BIRD_SIZE           = 30;  // Slightly scaled down for the slim profile
const BIRD_X              = Math.floor(screenWidth / 3);
const GROUND_H            = 80;

// ── Slim & Sleek Realistic Sparrow Component ──────────────────────────────────
const PixelBird = ({ rotation, wingPhase }: { rotation: SharedValue<number>; wingPhase: SharedValue<number> }) => {
  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const wingStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: wingPhase.value * -4 },
      { rotate: `${wingPhase.value * -30}deg` }
    ],
  }));

  return (
    <Animated.View style={[{ width: BIRD_SIZE + 10, height: BIRD_SIZE, justifyContent: 'center' }, bodyStyle]}>
      {/* Sleek, Elongated Tail Feathers */}
      <View style={{
        position: 'absolute', left: -8, top: 12, width: 16, height: 6,
        backgroundColor: '#5D4037', borderBottomLeftRadius: 4, borderTopLeftRadius: 2, transform: [{ rotate: '-5deg' }]
      }} />
      
      {/* Slimmer Light Grey/Tan Underbelly */}
      <View style={{
        position: 'absolute', left: 4, top: 10, width: 26, height: 12,
        backgroundColor: '#EFEBE9', borderRadius: 10,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 2,
      }} />
      
      {/* Streamlined Dark Brown Back/Mantle */}
      <View style={{
        position: 'absolute', left: 6, top: 4, width: 22, height: 10,
        backgroundColor: '#795548', borderRadius: 8
      }} />
      
      {/* Slim Head Cap (Dark Brown) */}
      <View style={{
        position: 'absolute', left: 20, top: 2, width: 12, height: 12,
        backgroundColor: '#5D4037', borderRadius: 6
      }} />
      
      {/* Small White Cheek Patch */}
      <View style={{
        position: 'absolute', left: 22, top: 8, width: 6, height: 5,
        backgroundColor: '#FFFFFF', borderRadius: 3
      }} />
      
      {/* Black Bib / Throat (Sleeker cut) */}
      <View style={{
        position: 'absolute', left: 26, top: 12, width: 6, height: 6,
        backgroundColor: '#212121', borderBottomRightRadius: 4
      }} />
      
      {/* Pointy, Slim Beak */}
      <View style={{
        position: 'absolute', left: 31, top: 6, width: 7, height: 4,
        backgroundColor: '#111111', borderTopRightRadius: 3, borderBottomRightRadius: 2
      }} />
      
      {/* Eye */}
      <View style={{
        position: 'absolute', left: 25, top: 4, width: 3, height: 3,
        backgroundColor: '#000', borderRadius: 1.5
      }}>
        <View style={{ position: 'absolute', left: 0.5, top: 0.5, width: 1, height: 1, backgroundColor: '#FFF', borderRadius: 0.5 }} />
      </View>

      {/* Flapping Wing with minimal drag (slimmer wing) */}
      <Animated.View style={[{
        position: 'absolute', left: 8, top: 8, width: 16, height: 10,
        backgroundColor: '#8D6E63', borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
        borderWidth: 1, borderColor: '#4E342E', overflow: 'hidden'
      }, wingStyle]}>
        {/* Feather Details */}
        <View style={{ position: 'absolute', left: 3, top: 3, width: 8, height: 1, backgroundColor: '#3E2723' }} />
        <View style={{ position: 'absolute', left: 5, top: 6, width: 6, height: 1, backgroundColor: '#3E2723' }} />
      </Animated.View>
    </Animated.View>
  );
};

// ── Enhanced Wooden Tree Trunk Obstacle ───────────────────────────────────────
const TreeTrunk = React.memo(({ x, topH, bottomTop, bottomH }: { x: number; topH: number; bottomTop: number; bottomH: number }) => {
  const WoodCore = ({ isTop }: { isTop: boolean }) => (
    <View style={[styles.cutWoodCore, isTop ? { bottom: -2 } : { top: -2 }]}>
      <LinearGradient colors={['#F4D0A5', '#E3BA8C']} style={StyleSheet.absoluteFillObject} />
      <View style={{ width: '84%', height: '64%', borderRadius: 8, borderWidth: 1, borderColor: '#C89F70' }} />
      <View style={{ position: 'absolute', width: '40%', height: '28%', borderRadius: 4, borderWidth: 1, borderColor: '#B58856' }} />
    </View>
  );

  return (
    <>
      <View style={[styles.trunkContainer, { left: x, top: 0, height: topH }]}>
        <View style={styles.trunkBody}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#6D4C41' }]} />
          <View style={{ position: 'absolute', left: 8, width: 2, height: '100%', backgroundColor: '#3E2723', opacity: 0.6 }} />
          <View style={{ position: 'absolute', left: 20, width: 4, height: '100%', backgroundColor: '#3E2723', opacity: 0.4 }} />
          <View style={{ position: 'absolute', left: 36, width: 3, height: '100%', backgroundColor: '#3E2723', opacity: 0.5 }} />
          <View style={[styles.knot, { top: 40, left: 10, width: 8, height: 16 }]} />
          <View style={[styles.knot, { top: 120, left: 30, width: 12, height: 20 }]} />
          <View style={[styles.knot, { top: 220, left: 15, width: 10, height: 14 }]} />
          <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent', 'rgba(0,0,0,0.5)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </View>
        <WoodCore isTop={true} />
      </View>

      <View style={[styles.trunkContainer, { left: x, top: bottomTop, height: bottomH }]}>
        <View style={styles.trunkBody}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#6D4C41' }]} />
          <View style={{ position: 'absolute', left: 12, width: 3, height: '100%', backgroundColor: '#3E2723', opacity: 0.5 }} />
          <View style={{ position: 'absolute', left: 26, width: 2, height: '100%', backgroundColor: '#3E2723', opacity: 0.7 }} />
          <View style={{ position: 'absolute', left: 42, width: 3, height: '100%', backgroundColor: '#3E2723', opacity: 0.4 }} />
          <View style={[styles.knot, { top: 30, left: 24, width: 10, height: 18 }]} />
          <View style={[styles.knot, { top: 150, left: 8, width: 8, height: 14 }]} />
          <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent', 'rgba(0,0,0,0.5)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </View>
        <WoodCore isTop={false} />
      </View>
    </>
  );
});
TreeTrunk.displayName = 'TreeTrunk';

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

  useEffect(() => {
    if (gameStarted && !gameOver && !isPaused) {
      wingPhase.value = withRepeat(
        withSequence(withTiming(1, { duration: 100 }), withTiming(0, { duration: 100 })),
        -1, true
      );
    } else {
      wingPhase.value = withTiming(0, { duration: 100 });
    }
  }, [gameStarted, gameOver, isPaused]);

  const jump = useCallback(() => {
    if (gameOverRef.current || isPausedRef.current) return;
    if (!gameStartedRef.current) return; 

    tapLight();
    setVelocity(JUMP);

    birdRot.value = withSequence(
      withTiming(-25, { duration: 100 }),
      withTiming(90, { duration: 600, easing: Easing.in(Easing.cubic) }),
    );

    // Natural sparrow feather particles
    const newP: Particle[] = [];
    for (let i = 0; i < 3; i++) {
      newP.push({
        id: particleIdRef.current++,
        x: BIRD_X + 10,
        y: birdYRef.current + (BIRD_SIZE / 2),
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 2 + 1,
        life: 1,
        color: i % 2 === 0 ? '#EFEBE9' : '#795548', 
      });
    }
    setParticles(p => [...p, ...newP]);
  }, []);

  const togglePause = useCallback(() => {
    if (gameOverRef.current) return;
    if (!gameStartedRef.current) {
      setGameStarted(true);
      setVelocity(JUMP);
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
      const pX = curPipes[i]; 
      const pY = curHeights[i];

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

    if (curPipes.length === 0 || curPipes[curPipes.length - 1] < screenWidth - PIPE_HORIZONTAL_GAP) {
      curPipes.push(screenWidth);
      const minH = screenHeight * 0.2;
      const maxH = screenHeight * 0.8 - PIPE_GAP;
      curHeights.push(Math.random() * (maxH - minH) + minH);
    }
    
    setPipes(curPipes);
    setPipeHeights(curHeights);

    if (passed) { setScore(s => s + 1); tapLight(); }

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
    for (let i = 0; i < 20; i++) {
      explode.push({
        id: particleIdRef.current++,
        x: BIRD_X + 15, y: finalY + 15,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12,
        life: 1,
        // Sparrow feathers flying on death
        color: i % 3 === 0 ? '#795548' : i % 3 === 1 ? '#EFEBE9' : '#5D4037',
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

  const handleTap = () => {
    if (gameOver) return;
    if (!gameStarted) { togglePause(); return; }
    if (isPaused) return;
    jump();
  };

  return (
    <TouchableWithoutFeedback onPress={handleTap}>
      <View style={styles.root}>
        <CyberBackground scrollOffset={useSharedValue(0)} autoScroll />
        
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <GameHeader
            title="FLAPPY"
            score={score}
            highScore={highScore}
            accentColor={ACCENT}
            onBack={() => { setGameOver(true); router.replace('/'); }}
          />

          {!gameStarted && !gameOver && (
            <ControlsOverlay
              instructions={['Navigate the slim sparrow through the trees.']}
              controls={[
                { action: 'Flap / Jump', input: 'Space / ↑ / W' },
                { action: 'Start / Pause', input: 'Enter' },
              ]}
            />
          )}

          {!gameOver && (
            <View style={[styles.birdContainer, { top: birdY, left: BIRD_X }]}>
              <PixelBird rotation={birdRot} wingPhase={wingPhase} />
            </View>
          )}

          {particles.map(p => (
            <View
              key={p.id}
              style={{
                position: 'absolute', left: p.x, top: p.y,
                width: 6, height: 6, borderRadius: 3,
                backgroundColor: p.color, opacity: p.life,
              }}
            />
          ))}

          {pipes.map((pipeX, index) => {
            const topH = pipeHeights[index];
            if (topH === undefined) return null;
            const bottomTop = topH + PIPE_GAP;
            const bottomH = screenHeight - bottomTop;
            return (
              <TreeTrunk
                key={index}
                x={pipeX}
                topH={topH}
                bottomTop={bottomTop}
                bottomH={bottomH}
              />
            );
          })}

          <View style={styles.ground}>
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
  root: { flex: 1, backgroundColor: SKY_TOP },
  safe: { flex: 1 },

  birdContainer: { position: 'absolute', width: BIRD_SIZE, height: BIRD_SIZE, zIndex: 10 },

  trunkContainer: { position: 'absolute', width: PIPE_WIDTH },
  trunkBody: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#3E2723' },
  knot: { position: 'absolute', borderRadius: 8, borderWidth: 2, borderColor: '#3E2723', backgroundColor: '#5D4037' },
  cutWoodCore: {
    position: 'absolute', left: -3, width: PIPE_WIDTH + 6, height: 18,
    borderWidth: 2, borderColor: '#4E342E', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },

  ground: { position: 'absolute', bottom: 0, width: '100%', height: GROUND_H, borderTopWidth: 2, borderTopColor: '#1B5E20', overflow: 'hidden', zIndex: 10 },

  overlayCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 20 },
  actionBtn: { paddingHorizontal: Spacing[8], paddingVertical: Spacing[4], borderRadius: Radius.md, borderWidth: 1.5, backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  actionBtnText: { fontFamily: Fonts.heading, fontSize: FontSize.lg, letterSpacing: 3 },
  overlayHint: { fontFamily: Fonts.body, fontSize: FontSize.xs, color: '#888', marginTop: Spacing[3], letterSpacing: 1 },
  pauseCard: { padding: Spacing[8], borderRadius: Radius.xl, alignItems: 'center', backgroundColor: 'rgba(5, 1, 24, 0.9)', borderWidth: 1, borderColor: NEON_CYAN },
  pauseTitle: { fontFamily: Fonts.heading, fontSize: FontSize['2xl'], color: ACCENT, letterSpacing: 4 },

  liveScore: { position: 'absolute', top: 100, alignSelf: 'center', zIndex: 20 },
  liveScoreText: {
    fontFamily: Fonts.heading, fontSize: 56, color: '#FFF',
    textShadowColor: ACCENT, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15, letterSpacing: 2,
  },
});