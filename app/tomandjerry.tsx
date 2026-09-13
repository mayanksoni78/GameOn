import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, elegantShadow } from '../src/theme/colors';
import { Fonts, FontSize } from '../src/theme/typography';
import { Spacing } from '../src/theme/spacing';
import { GameHeader } from '../src/components/GameHeader';
import { GameOverModal } from '../src/components/GameOverModal';
import { CyberBackground } from '../src/components/CyberBackground';
import { tapLight, tapMedium, notifySuccess, notifyError } from '../src/utils/haptics';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence,
  withRepeat, Easing,
} from 'react-native-reanimated';

// ── Theme (Elegant Deep Blue & Indigo) ─────────────────────────────────────────
const MANSION = {
  bg:         '#07050E',
  wallBase:   '#161A30',
  wallLight:  '#2C345C',
  wallDark:   '#080A12',
  wallCore:   '#1A1F3A',
  floor:      '#07050E',
  floorAlt:   '#0E091E',
  accent:     '#00E5FF',   
  cheese:     '#FFD600',
  jerry:      '#8B4513',   
  tom:        '#778899',   
  tomBlue:    '#4682B4',   
  tomDark:    '#2F4F4F',   
};

// ── Types ─────────────────────────────────────────────────────────────────────
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type GameState = 'idle' | 'playing' | 'paused' | 'won' | 'lost';
type Pos = { r: number; c: number };

interface DiffConfig {
  label: string;
  tomCount: number;
  tomSpeed: number;       
  targetScore: number;
  color: string;
}

const DIFFICULTIES: Record<Difficulty, DiffConfig> = {
  EASY:   { label: 'Easy',   tomCount: 1, tomSpeed: 450, targetScore: 500,  color: '#00E5FF' },
  MEDIUM: { label: 'Medium', tomCount: 2, tomSpeed: 350, targetScore: 1000, color: '#38BDF8' },
  HARD:   { label: 'Hard',   tomCount: 3, tomSpeed: 280, targetScore: 1500, color: '#A855F7' }, 
};

import { useEngine, TomAndJerryEngine, TomAndJerryDifficulty } from '../src/engines';

// ── Maze Config ───────────────────────────────────────────────────────────────
const MAZE_ROWS = TomAndJerryEngine.ROWS;
const MAZE_COLS = TomAndJerryEngine.COLS;

// ── CSS Sprites ─────────────────────────────────────────────────────────────

const JerrySprite = ({ size }: { size: number }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    {/* Tail */}
    <View style={{ position: 'absolute', bottom: -size*0.05, left: -size*0.1, width: size*0.4, height: size*0.1, backgroundColor: '#8B4513', borderRadius: size*0.05, transform: [{ rotate: '-20deg' }], shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.3, shadowRadius: 1 }} />
    
    {/* Ears (Larger, more rounded) */}
    <View style={{ position: 'absolute', top: -size*0.2, left: -size*0.2, width: size*0.55, height: size*0.55, borderRadius: size*0.275, backgroundColor: '#A0522D', borderWidth: 1, borderColor: '#5C3317', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        <View style={{ width: size*0.35, height: size*0.35, borderRadius: size*0.175, backgroundColor: '#F4A460' }} /> {/* Inner Ear */}
    </View>
    <View style={{ position: 'absolute', top: -size*0.2, right: -size*0.2, width: size*0.55, height: size*0.55, borderRadius: size*0.275, backgroundColor: '#A0522D', borderWidth: 1, borderColor: '#5C3317', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        <View style={{ width: size*0.35, height: size*0.35, borderRadius: size*0.175, backgroundColor: '#F4A460' }} /> {/* Inner Ear */}
    </View>

    {/* Body / Head */}
    <View style={{ width: size*0.8, height: size*0.75, borderRadius: size*0.375, backgroundColor: '#A0522D', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 3}, shadowOpacity: 0.6, shadowRadius: 3, elevation: 6, zIndex: 2 }}>
      
      {/* Tummy/Snout highlight (wider, peach color) */}
      <View style={{ position: 'absolute', bottom: -size*0.05, width: size*0.7, height: size*0.4, borderRadius: size*0.3, backgroundColor: '#F5DEB3' }} />

      {/* Eyes (Larger, cuter) */}
      <View style={{ flexDirection: 'row', gap: size*0.08, marginTop: -size*0.25 }}>
        <View style={{ width: size*0.22, height: size*0.28, backgroundColor: '#FFF', borderRadius: size*0.11, overflow: 'hidden', borderWidth: 1, borderColor: '#8B4513' }}>
            <View style={{ width: size*0.1, height: size*0.12, backgroundColor: '#000', borderRadius: size*0.05, position: 'absolute', bottom: 2, right: 2 }}>
                 <View style={{ width: size*0.04, height: size*0.04, backgroundColor: '#FFF', borderRadius: size*0.02, position: 'absolute', top: 1, right: 1 }} />
            </View>
        </View>
        <View style={{ width: size*0.22, height: size*0.28, backgroundColor: '#FFF', borderRadius: size*0.11, overflow: 'hidden', borderWidth: 1, borderColor: '#8B4513' }}>
            <View style={{ width: size*0.1, height: size*0.12, backgroundColor: '#000', borderRadius: size*0.05, position: 'absolute', bottom: 2, left: 2 }}>
                 <View style={{ width: size*0.04, height: size*0.04, backgroundColor: '#FFF', borderRadius: size*0.02, position: 'absolute', top: 1, right: 1 }} />
            </View>
        </View>
      </View>

      {/* Nose (Cute oval) */}
      <View style={{ width: size*0.14, height: size*0.08, backgroundColor: '#000', borderRadius: size*0.05, marginTop: size*0.02 }} />
      
      {/* Cheeks/Smile line */}
      <View style={{ position: 'absolute', bottom: size*0.12, left: size*0.2, width: size*0.15, height: 1, backgroundColor: '#D2691E', transform: [{ rotate: '10deg' }] }} />
      <View style={{ position: 'absolute', bottom: size*0.12, right: size*0.2, width: size*0.15, height: 1, backgroundColor: '#D2691E', transform: [{ rotate: '-10deg' }] }} />

      {/* Whiskers (Longer, more prominent) */}
      <View style={{ position: 'absolute', left: -2, top: size*0.4, width: size*0.25, height: 1.5, backgroundColor: '#5C3317', transform: [{ rotate: '5deg' }] }} />
      <View style={{ position: 'absolute', left: -2, top: size*0.5, width: size*0.25, height: 1.5, backgroundColor: '#5C3317', transform: [{ rotate: '15deg' }] }} />
      <View style={{ position: 'absolute', right: -2, top: size*0.4, width: size*0.25, height: 1.5, backgroundColor: '#5C3317', transform: [{ rotate: '-5deg' }] }} />
      <View style={{ position: 'absolute', right: -2, top: size*0.5, width: size*0.25, height: 1.5, backgroundColor: '#5C3317', transform: [{ rotate: '-15deg' }] }} />
    </View>
  </View>
);

const TomSprite = ({ size }: { size: number }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    {/* Ears (Pointy with pink insides) */}
    <View style={{ position: 'absolute', top: -size*0.1, left: size*0.05, width: 0, height: 0, borderLeftWidth: size*0.25, borderRightWidth: size*0.15, borderBottomWidth: size*0.4, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: MANSION.tomDark, transform: [{ rotate: '-25deg' }], zIndex: 1 }} />
    <View style={{ position: 'absolute', top: -size*0.05, left: size*0.15, width: 0, height: 0, borderLeftWidth: size*0.1, borderRightWidth: size*0.05, borderBottomWidth: size*0.2, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#E3A88D', transform: [{ rotate: '-25deg' }], zIndex: 2 }} />

    <View style={{ position: 'absolute', top: -size*0.1, right: size*0.05, width: 0, height: 0, borderLeftWidth: size*0.15, borderRightWidth: size*0.25, borderBottomWidth: size*0.4, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: MANSION.tomDark, transform: [{ rotate: '25deg' }], zIndex: 1 }} />
    <View style={{ position: 'absolute', top: -size*0.05, right: size*0.15, width: 0, height: 0, borderLeftWidth: size*0.05, borderRightWidth: size*0.1, borderBottomWidth: size*0.2, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#E3A88D', transform: [{ rotate: '25deg' }], zIndex: 2 }} />
    
    {/* Head/Body */}
    <View style={{ width: size*0.85, height: size*0.8, borderRadius: size*0.2, backgroundColor: MANSION.tomBlue, alignItems: 'center', justifyContent: 'center', borderBottomLeftRadius: size*0.4, borderBottomRightRadius: size*0.4, shadowColor: '#000', shadowOffset: {width: 0, height: 3}, shadowOpacity: 0.6, shadowRadius: 4, elevation: 6, zIndex: 3, overflow: 'hidden' }}>
      
      {/* White Snout/Muzzle */}
      <View style={{ position: 'absolute', bottom: -size*0.1, width: size*0.65, height: size*0.45, borderRadius: size*0.3, backgroundColor: '#E8EDF2' }} />

      {/* Eyes (Mischievous, glowing green/yellow) */}
      <View style={{ flexDirection: 'row', gap: size*0.1, marginTop: -size*0.2 }}>
        <View style={{ width: size*0.25, height: size*0.2, backgroundColor: '#FFF', borderRadius: size*0.1, borderTopWidth: 3, borderTopColor: '#2F4F4F', overflow: 'hidden' }}>
            <View style={{ width: size*0.1, height: size*0.12, backgroundColor: '#32CD32', borderRadius: size*0.05, position: 'absolute', bottom: 1, right: 1 }}>
                <View style={{ width: size*0.04, height: size*0.08, backgroundColor: '#000', borderRadius: size*0.02, alignSelf: 'center', marginTop: 1 }} />
            </View>
        </View>
        <View style={{ width: size*0.25, height: size*0.2, backgroundColor: '#FFF', borderRadius: size*0.1, borderTopWidth: 3, borderTopColor: '#2F4F4F', overflow: 'hidden' }}>
            <View style={{ width: size*0.1, height: size*0.12, backgroundColor: '#32CD32', borderRadius: size*0.05, position: 'absolute', bottom: 1, left: 1 }}>
                <View style={{ width: size*0.04, height: size*0.08, backgroundColor: '#000', borderRadius: size*0.02, alignSelf: 'center', marginTop: 1 }} />
            </View>
        </View>
      </View>

      {/* Nose */}
      <View style={{ width: size*0.12, height: size*0.08, backgroundColor: '#333', borderRadius: size*0.06, marginTop: size*0.08 }} />

      {/* Whiskers */}
      <View style={{ position: 'absolute', left: 0, top: size*0.5, width: size*0.25, height: 1.5, backgroundColor: '#FFF', transform: [{ rotate: '10deg' }] }} />
      <View style={{ position: 'absolute', left: -size*0.05, top: size*0.6, width: size*0.25, height: 1.5, backgroundColor: '#FFF', transform: [{ rotate: '-5deg' }] }} />
      <View style={{ position: 'absolute', right: 0, top: size*0.5, width: size*0.25, height: 1.5, backgroundColor: '#FFF', transform: [{ rotate: '-10deg' }] }} />
      <View style={{ position: 'absolute', right: -size*0.05, top: size*0.6, width: size*0.25, height: 1.5, backgroundColor: '#FFF', transform: [{ rotate: '5deg' }] }} />
    </View>
  </View>
);

const CheeseSprite = ({ size }: { size: number }) => {
  const pulse = useSharedValue(1);
  useEffect(() => {
      pulse.value = withRepeat(
          withSequence(
              withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
              withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
      );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  
  return (
      <Animated.View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, pulseStyle]}>
         {/* Cheese Wedge */}
         <View style={{ width: size*0.7, height: size*0.6, backgroundColor: MANSION.cheese, borderTopLeftRadius: size*0.35, borderBottomRightRadius: size*0.2, borderTopRightRadius: size*0.1, shadowColor: MANSION.cheese, shadowOpacity: 1, shadowRadius: 8, elevation: 8, borderColor: '#E6B800', borderWidth: 1 }}>
            {/* Cheese Holes */}
            <View style={{ width: size*0.18, height: size*0.18, borderRadius: size*0.09, backgroundColor: '#D4A000', position: 'absolute', top: size*0.1, left: size*0.1, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.3, shadowRadius: 1 }} />
            <View style={{ width: size*0.12, height: size*0.12, borderRadius: size*0.06, backgroundColor: '#D4A000', position: 'absolute', bottom: size*0.1, right: size*0.1, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.3, shadowRadius: 1 }} />
            <View style={{ width: size*0.14, height: size*0.14, borderRadius: size*0.07, backgroundColor: '#D4A000', position: 'absolute', top: size*0.3, right: size*0.25, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.3, shadowRadius: 1 }} />
            <View style={{ width: size*0.08, height: size*0.08, borderRadius: size*0.04, backgroundColor: '#D4A000', position: 'absolute', top: size*0.35, left: size*0.2 }} />
         </View>
      </Animated.View>
  );
};


// ── Main Game Component ───────────────────────────────────────────────────────
export default function JerryVsTomGame() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isMobile = windowWidth < 600;

  // Responsive cellSize calculation: ensure maze + HUD + mobile D-Pad fit cleanly on phone screen
  const verticalReserved = isMobile ? 320 : 220;
  const cellSize = Math.max(
    13,
    Math.min(
      Math.floor((windowWidth - 20) / MAZE_COLS),
      Math.floor((windowHeight - verticalReserved) / MAZE_ROWS),
      28
    )
  );
  const mazePxW = cellSize * MAZE_COLS;
  const mazePxH = cellSize * MAZE_ROWS;

  const [gameState, engine] = useEngine(() => new TomAndJerryEngine());
  const {
    maze,
    jerryPos,
    tomPositions,
    cheeses,
    cheeseCount,
    score,
    highScore,
    difficulty,
    status,
  } = gameState;

  const engineRef = useRef(engine);
  engineRef.current = engine;
  const isMovingRef = useRef(false);

  const jerryAnimX = useSharedValue(cellSize);
  const jerryAnimY = useSharedValue(cellSize);
  const jerryScale = useSharedValue(1);

  useEffect(() => {
    AsyncStorage.getItem('jerry_tom_hs').then(v => {
      if (v) {
        const hs = parseInt(v, 10);
        if (hs > engine.getHighScore()) {
          engine.setHighScore(hs);
        }
      }
    });
  }, []);

  const config = DIFFICULTIES[difficulty];

  const startGame = useCallback((diff: Difficulty) => {
    tapMedium();
    engine.startGame(diff);
  }, [engine]);

  useEffect(() => {
    if (status !== 'playing') return;
    const interval = setInterval(() => {
      const alive = engineRef.current.tickToms();
      if (!alive) {
        notifyError();
        const s = engineRef.current.getScore();
        if (s > engineRef.current.getHighScore()) {
          AsyncStorage.setItem('jerry_tom_hs', s.toString());
        }
      }
    }, config.tomSpeed);
    return () => clearInterval(interval);
  }, [status, config.tomSpeed]);

  const moveJerry = useCallback((dir: Direction) => {
    if (status !== 'playing') return;
    
    const res = engineRef.current.moveJerry(dir);
    
    if (res.ateCheese) {
      notifySuccess();
      const currentScore = engineRef.current.getScore();
      if (currentScore > engineRef.current.getHighScore()) {
        AsyncStorage.setItem('jerry_tom_hs', currentScore.toString());
      }
    }
    if (res.caught) {
      notifyError();
    }

    const currentJerry = engineRef.current.getState().jerryPos;
    jerryScale.value = withSequence(
      withTiming(1.15, { duration: 35 }),
      withTiming(1, { duration: 35 })
    );

    jerryAnimX.value = withTiming(currentJerry.c * cellSize, { duration: 65, easing: Easing.out(Easing.quad) });
    jerryAnimY.value = withTiming(currentJerry.r * cellSize, { duration: 65, easing: Easing.out(Easing.quad) });
  }, [status, cellSize, jerryAnimX, jerryAnimY, jerryScale]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        engineRef.current.togglePause();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const currentStatus = engineRef.current.getState().status;
        if (currentStatus === 'idle' || currentStatus === 'lost' || currentStatus === 'won') {
          startGame(difficulty);
        } else {
          engineRef.current.togglePause();
        }
        return;
      }
      if (engineRef.current.getState().status !== 'playing') return;
      if (e.key === 'ArrowUp'    || e.key.toLowerCase() === 'w') { e.preventDefault(); moveJerry('UP'); }
      if (e.key === 'ArrowDown'  || e.key.toLowerCase() === 's') { e.preventDefault(); moveJerry('DOWN'); }
      if (e.key === 'ArrowLeft'  || e.key.toLowerCase() === 'a') { e.preventDefault(); moveJerry('LEFT'); }
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') { e.preventDefault(); moveJerry('RIGHT'); }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [difficulty, moveJerry, startGame]);

  const touchStartRef = useRef({ x: 0, y: 0 });
  const repeatIntervalRef = useRef<any>(null);

  const startContinuousMove = useCallback((dir: Direction) => {
    moveJerry(dir);
    if (repeatIntervalRef.current) clearInterval(repeatIntervalRef.current);
    repeatIntervalRef.current = setInterval(() => {
      moveJerry(dir);
    }, 130);
  }, [moveJerry]);

  const stopContinuousMove = useCallback(() => {
    if (repeatIntervalRef.current) {
      clearInterval(repeatIntervalRef.current);
      repeatIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (repeatIntervalRef.current) clearInterval(repeatIntervalRef.current);
    };
  }, []);

  const handleTouchStart = (e: any) => {
    const touch = e.nativeEvent;
    touchStartRef.current = { x: touch.pageX, y: touch.pageY };
  };

  const handleTouchEnd = (e: any) => {
    if (status !== 'playing') return;
    const touch = e.nativeEvent;
    const dx = touch.pageX - touchStartRef.current.x;
    const dy = touch.pageY - touchStartRef.current.y;
    const threshold = 18;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      moveJerry(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      moveJerry(dy > 0 ? 'DOWN' : 'UP');
    }
  };

  const jerryStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: jerryAnimX.value },
      { translateY: jerryAnimY.value },
      { scale: jerryScale.value },
    ],
  }));

  const { walls, floors } = useMemo(() => {
    if (!maze.length) return { walls: [], floors: [] };
    const w: React.ReactNode[] = [];
    const f: React.ReactNode[] = [];
    for (let r = 0; r < maze.length; r++) {
      for (let c = 0; c < maze[0].length; c++) {
        if (maze[r][c] === 0) {
          w.push(
            <View key={`w-${r}-${c}`} style={[styles.wall, {
              left: c * cellSize,
              top: r * cellSize,
              width: cellSize + 1,
              height: cellSize + 1,
            }]}>
              <View style={styles.wallInner} />
            </View>
          );
        } else {
          const isAlt = (r + c) % 2 === 0;
          f.push(
            <View key={`f-${r}-${c}`} style={{
              position: 'absolute', left: c * cellSize, top: r * cellSize,
              width: cellSize + 1, height: cellSize + 1,
              backgroundColor: isAlt ? MANSION.floor : MANSION.floorAlt,
            }} />
          );
        }
      }
    }
    return { walls: w, floors: f };
  }, [maze, cellSize]);

  return (
    <View style={styles.root}>
      <CyberBackground theme="tomandjerry" />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <GameHeader
          title="TOM & JERRY"
          category="ACTION"
          score={score}
          highScore={highScore}
          accentColor={config.color}
          onBack={() => router.replace('/')}
        />

        <View style={styles.content}>
          {/* Top Integrated Header: Controls & Difficulty */}
          <View style={styles.topControls}>
            <View style={styles.diffSelector}>
                {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((d) => (
                    <TouchableOpacity
                        key={d}
                        style={[
                            styles.diffBtn,
                            difficulty === d && { backgroundColor: `${DIFFICULTIES[d].color}30`, borderColor: DIFFICULTIES[d].color }
                        ]}
                        onPress={() => {
                            if (status === 'playing' || status === 'paused') return;
                            tapLight(); 
                            engine.setDifficulty(d as TomAndJerryDifficulty); 
                        }}
                        activeOpacity={0.7}
                        disabled={status === 'playing' || status === 'paused'}
                    >
                        <Text style={[styles.diffBtnText, difficulty === d && { color: DIFFICULTIES[d].color }]}>
                            {DIFFICULTIES[d].label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            
            {/* Action buttons */}
            <View style={styles.actionSelector}>
                {status === 'idle' || status === 'lost' || status === 'won' ? (
                     <TouchableOpacity style={[styles.actionBtn, { borderColor: config.color }]} onPress={() => startGame(difficulty)}>
                         <Text style={[styles.actionBtnText, { color: config.color }]}>▶ START</Text>
                     </TouchableOpacity>
                ) : status === 'playing' ? (
                     <TouchableOpacity style={[styles.actionBtn, { borderColor: Colors.accent.warning }]} onPress={() => engine.togglePause()}>
                         <Text style={[styles.actionBtnText, { color: Colors.accent.warning }]}>⏸ PAUSE</Text>
                     </TouchableOpacity>
                ) : (
                     <TouchableOpacity style={[styles.actionBtn, { borderColor: Colors.accent.success }]} onPress={() => engine.togglePause()}>
                         <Text style={[styles.actionBtnText, { color: Colors.accent.success }]}>▶ RESUME</Text>
                     </TouchableOpacity>
                )}
            </View>
          </View>

          <View style={styles.infoBar}>
            <View style={[styles.infoChip, { borderColor: `${MANSION.cheese}60` }]}>
              <Text style={styles.infoLabel}>CHEESE</Text>
              <Text style={[styles.infoValue, { color: MANSION.cheese }]}>{cheeseCount}</Text>
            </View>
            <View style={[styles.infoChip, { borderColor: `${config.color}60` }]}>
              <Text style={styles.infoLabel}>SCORE</Text>
              <Text style={[styles.infoValue, { color: config.color }]}>{score}</Text>
            </View>
            <View style={[styles.infoChip, { borderColor: `${MANSION.tom}60` }]}>
              <Text style={styles.infoLabel}>TOMS</Text>
              <Text style={[styles.infoValue, { color: MANSION.tom }]}>{config.tomCount}</Text>
            </View>
          </View>

          {maze.length > 0 && (
            <View
              style={[
                styles.mazeViewport,
                Platform.OS === 'web' && ({ touchAction: 'none' } as any),
              ]}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <View style={[styles.mazeContainer, { width: mazePxW, height: mazePxH }]}>
                {floors}
                {walls}

                {(status !== 'idle') && cheeses.map((ch, i) => (
                  <View key={`ch-${i}`} style={[styles.spriteCell, {
                    left: ch.c * cellSize, top: ch.r * cellSize,
                    width: cellSize, height: cellSize,
                  }]}>
                    <CheeseSprite size={cellSize * 0.8} />
                  </View>
                ))}

                {(status !== 'idle') && tomPositions.map((tom, i) => (
                  <View key={`tom-${i}`} style={[styles.spriteCell, {
                    left: tom.c * cellSize, top: tom.r * cellSize,
                    width: cellSize, height: cellSize,
                  }]}>
                    <TomSprite size={cellSize * 0.9} />
                  </View>
                ))}

                {(status !== 'idle') && (
                  <Animated.View style={[styles.spriteCell, {
                    width: cellSize, height: cellSize,
                  }, jerryStyle]}>
                    <JerrySprite size={cellSize * 0.9} />
                  </Animated.View>
                )}
              </View>

              {status === 'paused' && (
                <View style={styles.pausedOverlay}>
                  <Text style={styles.pausedTitle}>PAUSED</Text>
                  <Text style={styles.pausedSub}>Press Enter to resume</Text>
                </View>
              )}
            </View>
          )}

          {/* Mobile Arcade D-Pad Navigation Controls */}
          {isMobile ? (
            <View style={styles.dpadContainer}>
              {/* Row 1: UP */}
              <View style={styles.dpadRow}>
                <TouchableOpacity
                  style={[styles.dpadBtn, styles.dpadBtnUp]}
                  onPressIn={() => { tapLight(); startContinuousMove('UP'); }}
                  onPressOut={stopContinuousMove}
                  activeOpacity={0.65}
                >
                  <MaterialCommunityIcons name="triangle" size={18} color="#00E5FF" />
                </TouchableOpacity>
              </View>

              {/* Row 2: LEFT - CENTER CORE - RIGHT */}
              <View style={styles.dpadRow}>
                <TouchableOpacity
                  style={[styles.dpadBtn, styles.dpadBtnLeft]}
                  onPressIn={() => { tapLight(); startContinuousMove('LEFT'); }}
                  onPressOut={stopContinuousMove}
                  activeOpacity={0.65}
                >
                  <MaterialCommunityIcons name="triangle" size={18} color="#00E5FF" style={{ transform: [{ rotate: '-90deg' }] }} />
                </TouchableOpacity>

                <View style={styles.dpadCenter}>
                  <View style={styles.dpadCenterDot} />
                </View>

                <TouchableOpacity
                  style={[styles.dpadBtn, styles.dpadBtnRight]}
                  onPressIn={() => { tapLight(); startContinuousMove('RIGHT'); }}
                  onPressOut={stopContinuousMove}
                  activeOpacity={0.65}
                >
                  <MaterialCommunityIcons name="triangle" size={18} color="#00E5FF" style={{ transform: [{ rotate: '90deg' }] }} />
                </TouchableOpacity>
              </View>

              {/* Row 3: DOWN */}
              <View style={styles.dpadRow}>
                <TouchableOpacity
                  style={[styles.dpadBtn, styles.dpadBtnDown]}
                  onPressIn={() => { tapLight(); startContinuousMove('DOWN'); }}
                  onPressOut={stopContinuousMove}
                  activeOpacity={0.65}
                >
                  <MaterialCommunityIcons name="triangle" size={18} color="#00E5FF" style={{ transform: [{ rotate: '180deg' }] }} />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <View style={styles.hintRow}>
            <Text style={styles.hintText}>
              {isMobile ? 'Tap/hold D-pad or swipe maze to guide Jerry' : 'Swipe or Arrow Keys / WASD to move'}
            </Text>
          </View>
        </View>

        <GameOverModal
          visible={status === 'lost' || status === 'won'}
          title={status === 'won' ? 'ESCAPED!' : 'CAUGHT!'}
          score={score}
          highScore={highScore}
          isNewHighScore={score >= highScore && score > 0}
          accentColor={config.color}
          onRestart={() => startGame(difficulty)}
          onHome={() => router.replace('/')}
          stats={[
            { label: 'Cheese', value: cheeseCount },
            { label: 'Difficulty', value: config.label },
          ]}
        />
      </SafeAreaView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  safe: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', width: '100%' },

  topControls: {
    width: '100%',
    maxWidth: 600,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: Spacing[3],
    marginBottom: Spacing[1],
  },
  diffSelector: {
    flexDirection: 'row',
    gap: 6,
  },
  diffBtn: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#161522',
  },
  diffBtnText: { fontFamily: Fonts.heading, fontSize: FontSize['2xs'], color: '#94A3B8' },
  actionSelector: {
      flexDirection: 'row',
      gap: 6,
  },
  actionBtn: {
      paddingHorizontal: Spacing[4],
      paddingVertical: Spacing[1],
      borderRadius: 4,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.12)',
      backgroundColor: '#161522',
      justifyContent: 'center',
  },
  actionBtnText: {
      fontFamily: Fonts.heading, fontSize: FontSize['2xs'], color: '#F4F4F5',
  },

  infoBar: {
    flexDirection: 'row', justifyContent: 'center', gap: Spacing[2],
    paddingHorizontal: Spacing[2], paddingVertical: Spacing[1],
    width: '100%', zIndex: 10, marginBottom: Spacing[1]
  },
  infoChip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing[1],
    paddingHorizontal: Spacing[3], paddingVertical: Spacing[1],
    borderRadius: 4, borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#12111A',
  },
  infoLabel: { fontFamily: Fonts.heading, fontSize: FontSize['2xs'], color: '#94A3B8' },
  infoValue: { fontFamily: Fonts.heading, fontSize: FontSize.xs },

  mazeViewport: {
    flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', marginHorizontal: 8, borderRadius: 6,
    backgroundColor: '#0E0D16',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  mazeContainer: { position: 'relative', backgroundColor: MANSION.floor },

  wall: {
    position: 'absolute', 
    backgroundColor: MANSION.wallBase,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: MANSION.wallLight,
    borderLeftColor: MANSION.wallLight,
    borderBottomColor: MANSION.wallDark,
    borderRightColor: MANSION.wallDark,
  },
  wallInner: {
    width: '60%',
    height: '60%',
    backgroundColor: MANSION.wallCore,
    borderRadius: 1,
  },

  spriteCell: { position: 'absolute', alignItems: 'center', justifyContent: 'center', zIndex: 5 },

  pausedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center', zIndex: 20,
    backgroundColor: 'rgba(7, 5, 14, 0.95)',
  },
  pausedTitle: { fontFamily: Fonts.heading, fontSize: FontSize.xl, color: MANSION.accent, letterSpacing: 3 },
  pausedSub: { fontFamily: Fonts.body, fontSize: FontSize.xs, color: '#FFF', opacity: 0.7, marginTop: Spacing[1] },

  hintRow: { width: '100%', alignItems: 'center', paddingVertical: 4 },
  hintText: {
    fontFamily: Fonts.body, fontSize: FontSize['2xs'], color: '#FFF', opacity: 0.5,
    backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 2,
  },

  // Mobile Arcade D-Pad Styling
  dpadContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 2,
  },
  dpadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadBtn: {
    width: 46,
    height: 44,
    backgroundColor: '#161522',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.28)',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  dpadBtnUp: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomWidth: 0,
  },
  dpadBtnDown: {
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderTopWidth: 0,
  },
  dpadBtnLeft: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    borderRightWidth: 0,
  },
  dpadBtnRight: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderLeftWidth: 0,
  },
  dpadCenter: {
    width: 44,
    height: 44,
    backgroundColor: '#12111A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  dpadCenterDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0, 229, 255, 0.35)',
  },
});