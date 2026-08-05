import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, glassmorphism, elegantShadow } from '../src/theme/colors';
import { Fonts, FontSize } from '../src/theme/typography';
import { Spacing, Radius } from '../src/theme/spacing';
import { GameHeader } from '../src/components/GameHeader';
import { GameOverModal } from '../src/components/GameOverModal';
import { tapLight, tapMedium, notifySuccess, notifyError } from '../src/utils/haptics';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence,
  withRepeat, Easing, runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ── Theme (Elegant Deep Blue & Indigo) ─────────────────────────────────────────
const MANSION = {
  bg:         '#050610',
  wallBase:   '#161A30',
  wallLight:  '#2C345C',
  wallDark:   '#080A12',
  wallCore:   '#1A1F3A',
  floor:      '#0A0C18',
  floorAlt:   '#0E1122',
  accent:     '#D2B48C',   
  cheese:     '#FFD600',
  jerry:      '#8B4513',   
  tom:        '#778899',   
  tomBlue:    '#4682B4',   
  tomDark:    '#2F4F4F',   
  moonlight:  'rgba(60, 90, 200, 0.08)',
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
  EASY:   { label: 'Easy',   tomCount: 1, tomSpeed: 450, targetScore: 500,  color: MANSION.accent },
  MEDIUM: { label: 'Medium', tomCount: 2, tomSpeed: 350, targetScore: 1000, color: MANSION.tomBlue },
  HARD:   { label: 'Hard',   tomCount: 3, tomSpeed: 280, targetScore: 1500, color: '#6A5ACD' }, 
};

// ── Maze Config ───────────────────────────────────────────────────────────────
// Increased maze size to 21x21 for smaller cells and cleaner layout
const MAZE_ROWS = 21;
const MAZE_COLS = 21;

const HEADER_HEIGHT = 160; // Increased to fit top controls
const BOTTOM_HEIGHT = 80;
const VIEWPORT_HEIGHT = screenHeight - HEADER_HEIGHT - BOTTOM_HEIGHT - 40;
const VIEWPORT_WIDTH = screenWidth - 16;
const CELL_SIZE = Math.min(
  Math.floor(VIEWPORT_WIDTH / MAZE_COLS),
  Math.floor(VIEWPORT_HEIGHT / MAZE_ROWS),
  28 // Capped slightly smaller
);
const MAZE_PX_W = CELL_SIZE * MAZE_COLS;
const MAZE_PX_H = CELL_SIZE * MAZE_ROWS;

// ── Maze Generation (Recursive Backtracker) ───────────────────────────────────
function generateMaze(): number[][] {
  const grid: number[][] = Array.from({ length: MAZE_ROWS }, () => Array(MAZE_COLS).fill(0));
  const stack: [number, number][] = [];
  const start: [number, number] = [1, 1];
  grid[start[0]][start[1]] = 1;
  stack.push(start);

  while (stack.length > 0) {
    const [cr, cc] = stack[stack.length - 1];
    const neighbors: [number, number, number, number][] = [];
    for (const [dr, dc] of [[0, -2], [0, 2], [-2, 0], [2, 0]]) {
      const nr = cr + dr;
      const nc = cc + dc;
      if (nr > 0 && nr < MAZE_ROWS - 1 && nc > 0 && nc < MAZE_COLS - 1 && grid[nr][nc] === 0) {
        neighbors.push([nr, nc, cr + dr / 2, cc + dc / 2]);
      }
    }
    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
      grid[pick[0]][pick[1]] = 1;
      grid[pick[2]][pick[3]] = 1;
      stack.push([pick[0], pick[1]]);
    }
  }

  for (let i = 0; i < Math.floor(MAZE_ROWS * MAZE_COLS * 0.05); i++) {
    const r = 2 + Math.floor(Math.random() * (MAZE_ROWS - 4));
    const c = 2 + Math.floor(Math.random() * (MAZE_COLS - 4));
    if (grid[r][c] === 0) {
      let adj = 0;
      if (grid[r - 1]?.[c] === 1) adj++;
      if (grid[r + 1]?.[c] === 1) adj++;
      if (grid[r]?.[c - 1] === 1) adj++;
      if (grid[r]?.[c + 1] === 1) adj++;
      if (adj >= 2) grid[r][c] = 1;
    }
  }
  return grid;
}

function getPathCells(maze: number[][]): Pos[] {
  const cells: Pos[] = [];
  for (let r = 0; r < maze.length; r++) {
    for (let c = 0; c < maze[0].length; c++) {
      if (maze[r][c] === 1) cells.push({ r, c });
    }
  }
  return cells;
}

function bfsNextStep(maze: number[][], from: Pos, to: Pos): Pos {
  if (from.r === to.r && from.c === to.c) return from;
  const rows = maze.length;
  const cols = maze[0].length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const parent = Array.from({ length: rows }, () => Array(cols).fill(null)) as (Pos | null)[][];
  
  const queue: Pos[] = [from];
  visited[from.r][from.c] = true;
  
  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr.r === to.r && curr.c === to.c) {
      let step: Pos = curr;
      while (parent[step.r][step.c] && !(parent[step.r][step.c]!.r === from.r && parent[step.r][step.c]!.c === from.c)) {
        step = parent[step.r][step.c]!;
      }
      return step;
    }
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = curr.r + dr;
      const nc = curr.c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc] && maze[nr][nc] === 1) {
        visited[nr][nc] = true;
        parent[nr][nc] = curr;
        queue.push({ r: nr, c: nc });
      }
    }
  }
  return from;
}

function randomPathPos(maze: number[][], exclude: Pos[]): Pos {
  const paths = getPathCells(maze).filter(p => !exclude.some(e => e.r === p.r && e.c === p.c));
  return paths[Math.floor(Math.random() * paths.length)] || { r: 1, c: 1 };
}

function spawnCheese(maze: number[][], count: number, exclude: Pos[]): Pos[] {
  const result: Pos[] = [];
  const used = [...exclude];
  for (let i = 0; i < count; i++) {
    const pos = randomPathPos(maze, used);
    result.push(pos);
    used.push(pos);
  }
  return result;
}

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


// ── Background Component ──────────────────────────────────────────────
const MansionBackground = React.memo(() => (
  <View style={StyleSheet.absoluteFill}>
    <LinearGradient
      colors={['#050610', '#0B0D1E', '#10142B', '#050610']}
      locations={[0, 0.3, 0.7, 1]}
      style={StyleSheet.absoluteFill}
    />
    <View style={bgStyles.moonGlow} />
    <View style={bgStyles.lightStreak1} />
    <View style={bgStyles.lightStreak2} />
    {Array.from({ length: 20 }).map((_, i) => (
      <View key={`dust-${i}`} style={[bgStyles.dust, {
        left: `${5 + Math.random() * 90}%` as any,
        top: `${5 + Math.random() * 90}%` as any,
        width: Math.random() * 2 + 1,
        height: Math.random() * 2 + 1,
        opacity: Math.random() * 0.1 + 0.05,
      }]} />
    ))}
  </View>
));

const bgStyles = StyleSheet.create({
  moonGlow: {
    position: 'absolute', right: -40, top: -40,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: MANSION.moonlight,
  },
  lightStreak1: {
    position: 'absolute', right: 30, top: 20,
    width: 3, height: 120,
    backgroundColor: 'rgba(60, 100, 255, 0.03)',
    transform: [{ rotate: '25deg' }],
  },
  lightStreak2: {
    position: 'absolute', right: 60, top: 10,
    width: 2, height: 100,
    backgroundColor: 'rgba(60, 100, 255, 0.02)',
    transform: [{ rotate: '20deg' }],
  },
  dust: {
    position: 'absolute', backgroundColor: '#A9B4C2', borderRadius: 4,
  },
});

// ── Main Game Component ───────────────────────────────────────────────────────
export default function JerryVsTomGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('EASY');
  const [gameState, setGameState] = useState<GameState>('idle');
  const [maze, setMaze] = useState<number[][]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [cheeses, setCheeses] = useState<Pos[]>([]);
  const [cheeseCount, setCheeseCount] = useState(0);

  const [jerryPos, setJerryPos] = useState<Pos>({ r: 1, c: 1 });
  const [tomPositions, setTomPositions] = useState<Pos[]>([]);

  const mazeRef = useRef(maze);
  const jerryPosRef = useRef(jerryPos);
  const tomPosRef = useRef(tomPositions);
  const cheesesRef = useRef(cheeses);
  const stateRef = useRef(gameState);
  const scoreRef = useRef(score);
  const tomTimerRef = useRef<any>(null);
  const isMovingRef = useRef(false);

  const jerryAnimX = useSharedValue(CELL_SIZE);
  const jerryAnimY = useSharedValue(CELL_SIZE);
  const jerryScale = useSharedValue(1);

  useEffect(() => { mazeRef.current = maze; }, [maze]);
  useEffect(() => { jerryPosRef.current = jerryPos; }, [jerryPos]);
  useEffect(() => { tomPosRef.current = tomPositions; }, [tomPositions]);
  useEffect(() => { cheesesRef.current = cheeses; }, [cheeses]);
  useEffect(() => { stateRef.current = gameState; }, [gameState]);
  useEffect(() => { scoreRef.current = score; }, [score]);

  useEffect(() => {
    AsyncStorage.getItem('jerry_tom_hs').then(v => v && setHighScore(parseInt(v)));
    // Generate initial idle maze so the board isn't completely blank
    setMaze(generateMaze());
  }, []);

  const config = DIFFICULTIES[difficulty];

  // ── Start Game ──────────────────────────────────────────────────────────────
  const startGame = useCallback((diff: Difficulty = difficulty) => {
    clearInterval(tomTimerRef.current);
    const cfg = DIFFICULTIES[diff];
    const newMaze = generateMaze();
    setMaze(newMaze);

    const jPos: Pos = { r: 1, c: 1 };
    setJerryPos(jPos);
    jerryAnimX.value = jPos.c * CELL_SIZE;
    jerryAnimY.value = jPos.r * CELL_SIZE;
    isMovingRef.current = false;

    const tomStarts: Pos[] = [];
    const farCorners: Pos[] = [
      { r: MAZE_ROWS - 2, c: MAZE_COLS - 2 },
      { r: 1, c: MAZE_COLS - 2 },
      { r: MAZE_ROWS - 2, c: 1 },
    ];
    for (let i = 0; i < cfg.tomCount; i++) {
      let target = farCorners[i % farCorners.length];
      while (newMaze[target.r]?.[target.c] !== 1 && target.r > 1 && target.c > 1) {
        target = { r: target.r - 1, c: target.c - 1 };
      }
      if (newMaze[target.r]?.[target.c] !== 1) {
        target = randomPathPos(newMaze, [jPos, ...tomStarts]);
      }
      tomStarts.push(target);
    }
    setTomPositions(tomStarts);

    const initialCheese = spawnCheese(newMaze, 5, [jPos, ...tomStarts]); 
    setCheeses(initialCheese);

    setScore(0);
    setCheeseCount(0);
    setDifficulty(diff);
    setGameState('playing');
    tapMedium();

    tomTimerRef.current = setInterval(() => {
      if (stateRef.current !== 'playing') return;
      
      setTomPositions(prevToms => {
        const m = mazeRef.current;
        const jp = jerryPosRef.current;
        if (!m.length) return prevToms;
        
        const newToms = prevToms.map(tom => bfsNextStep(m, tom, jp));

        for (const tom of newToms) {
          if (tom.r === jp.r && tom.c === jp.c) {
            clearInterval(tomTimerRef.current);
            setTimeout(() => {
              setGameState('lost');
              notifyError();
              const s = scoreRef.current;
              AsyncStorage.getItem('jerry_tom_hs').then(v => {
                const hs = v ? parseInt(v) : 0;
                if (s > hs) {
                  setHighScore(s);
                  AsyncStorage.setItem('jerry_tom_hs', s.toString());
                }
              });
            }, 0);
          }
        }
        return newToms;
      });
    }, cfg.tomSpeed);
  }, [difficulty, jerryAnimX, jerryAnimY]);

  useEffect(() => () => clearInterval(tomTimerRef.current), []);

  // ── Move Jerry ──────────────────────────────────────────────────────────────
  const moveJerry = useCallback((dir: Direction) => {
    if (stateRef.current !== 'playing') return;
    if (isMovingRef.current) return;

    const m = mazeRef.current;
    const pos = jerryPosRef.current;
    let nr = pos.r, nc = pos.c;

    switch (dir) {
      case 'UP':    nr--; break;
      case 'DOWN':  nr++; break;
      case 'LEFT':  nc--; break;
      case 'RIGHT': nc++; break;
    }

    if (nr < 0 || nr >= MAZE_ROWS || nc < 0 || nc >= MAZE_COLS) return;
    if (m[nr][nc] === 0) return;

    isMovingRef.current = true;
    const newPos = { r: nr, c: nc };
    setJerryPos(newPos);
    tapLight();

    jerryScale.value = withSequence(
      withTiming(1.2, { duration: 30 }),
      withTiming(1, { duration: 30 })
    );

    jerryAnimX.value = withTiming(nc * CELL_SIZE, { duration: 60, easing: Easing.linear });
    jerryAnimY.value = withTiming(nr * CELL_SIZE, { duration: 60, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(onMoveComplete)(nr, nc);
    });
  }, [jerryAnimX, jerryAnimY, jerryScale]);

  const onMoveComplete = (nr: number, nc: number) => {
    isMovingRef.current = false;

    const cs = cheesesRef.current;
    const idx = cs.findIndex(ch => ch.r === nr && ch.c === nc);
    if (idx !== -1) {
      const newCheeses = [...cs];
      newCheeses.splice(idx, 1);
      const respawned = randomPathPos(mazeRef.current, [{ r: nr, c: nc }, ...tomPosRef.current, ...newCheeses]);
      newCheeses.push(respawned);
      setCheeses(newCheeses);
      setCheeseCount(prev => prev + 1);
      setScore(prev => prev + 25);
    }

    const toms = tomPosRef.current;
    for (const tom of toms) {
      if (tom.r === nr && tom.c === nc) {
        clearInterval(tomTimerRef.current);
        setGameState('lost');
        notifyError();
        const s = scoreRef.current;
        if (s > highScore) {
          setHighScore(s);
          AsyncStorage.setItem('jerry_tom_hs', s.toString());
        }
        return;
      }
    }
  };

  const resumeGame = () => {
    setGameState('playing');
    const cfg = DIFFICULTIES[difficulty];
    tomTimerRef.current = setInterval(() => {
      if (stateRef.current !== 'playing') return;
      setTomPositions(prevToms => {
        const m = mazeRef.current;
        const jp = jerryPosRef.current;
        if (!m.length) return prevToms;
        const newToms = prevToms.map(tom => bfsNextStep(m, tom, jp));
        for (const tom of newToms) {
          if (tom.r === jp.r && tom.c === jp.c) {
            clearInterval(tomTimerRef.current);
            setTimeout(() => {
              setGameState('lost');
              notifyError();
            }, 0);
          }
        }
        return newToms;
      });
    }, cfg.tomSpeed);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (stateRef.current === 'playing') {
          clearInterval(tomTimerRef.current);
          setGameState('paused');
        } else if (stateRef.current === 'paused') {
          resumeGame();
        }
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (stateRef.current === 'idle' || stateRef.current === 'lost') {
          startGame(difficulty);
        } else if (stateRef.current === 'playing') {
          clearInterval(tomTimerRef.current);
          setGameState('paused');
        } else if (stateRef.current === 'paused') {
          resumeGame();
        }
        return;
      }
      if (stateRef.current !== 'playing') return;
      if (e.key === 'ArrowUp'    || e.key.toLowerCase() === 'w') { e.preventDefault(); moveJerry('UP'); }
      if (e.key === 'ArrowDown'  || e.key.toLowerCase() === 's') { e.preventDefault(); moveJerry('DOWN'); }
      if (e.key === 'ArrowLeft'  || e.key.toLowerCase() === 'a') { e.preventDefault(); moveJerry('LEFT'); }
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') { e.preventDefault(); moveJerry('RIGHT'); }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [difficulty, moveJerry, startGame]);

  const touchStartRef = useRef({ x: 0, y: 0 });

  const handleTouchStart = (e: any) => {
    const touch = e.nativeEvent;
    touchStartRef.current = { x: touch.pageX, y: touch.pageY };
  };

  const handleTouchEnd = (e: any) => {
    if (gameState !== 'playing') return;
    const touch = e.nativeEvent;
    const dx = touch.pageX - touchStartRef.current.x;
    const dy = touch.pageY - touchStartRef.current.y;
    const threshold = 20;
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
              left: c * CELL_SIZE,
              top: r * CELL_SIZE,
              width: CELL_SIZE + 1,
              height: CELL_SIZE + 1,
            }]}>
              <View style={styles.wallInner} />
            </View>
          );
        } else {
          const isAlt = (r + c) % 2 === 0;
          f.push(
            <View key={`f-${r}-${c}`} style={{
              position: 'absolute', left: c * CELL_SIZE, top: r * CELL_SIZE,
              width: CELL_SIZE + 1, height: CELL_SIZE + 1,
              backgroundColor: isAlt ? MANSION.floor : MANSION.floorAlt,
            }} />
          );
        }
      }
    }
    return { walls: w, floors: f };
  }, [maze]);

  return (
    <View style={styles.root} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <MansionBackground />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <GameHeader
          title="TOM & JERRY CHASE"
          score={score}
          highScore={highScore}
          accentColor={config.color}
          onBack={() => router.replace('/')}
        />

        <View style={styles.content}>
          {/* Top Integrated Header: Controls & Difficulty */}
          <View style={styles.topControls}>
            {/* Difficulty Selector (Always Visible, interactable if idle/lost) */}
            <View style={styles.diffSelector}>
                {(Object.keys(DIFFICULTIES) as Difficulty[]).map(d => (
                    <TouchableOpacity
                        key={d}
                        style={[
                            styles.diffBtn,
                            difficulty === d && { backgroundColor: `${DIFFICULTIES[d].color}30`, borderColor: DIFFICULTIES[d].color }
                        ]}
                        onPress={() => {
                            if (gameState === 'playing' || gameState === 'paused') return;
                            tapLight(); 
                            setDifficulty(d); 
                        }}
                        activeOpacity={0.7}
                        disabled={gameState === 'playing' || gameState === 'paused'}
                    >
                        <Text style={[styles.diffBtnText, difficulty === d && { color: DIFFICULTIES[d].color }]}>
                            {DIFFICULTIES[d].label} ({DIFFICULTIES[d].tomCount} Tom{DIFFICULTIES[d].tomCount > 1 ? 's' : ''})
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            
            {/* Mobile Actions / Game State Actions */}
            <View style={styles.actionSelector}>
                {gameState === 'idle' || gameState === 'lost' ? (
                     <TouchableOpacity style={[styles.actionBtn, { backgroundColor: config.color }]} onPress={() => startGame(difficulty)}>
                         <Text style={styles.actionBtnText}>START (Enter)</Text>
                     </TouchableOpacity>
                ) : gameState === 'playing' ? (
                     <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.accent.warning }]} onPress={() => {
                         clearInterval(tomTimerRef.current);
                         setGameState('paused');
                     }}>
                         <Text style={styles.actionBtnText}>PAUSE (Enter)</Text>
                     </TouchableOpacity>
                ) : (
                     <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.accent.success }]} onPress={resumeGame}>
                         <Text style={styles.actionBtnText}>RESUME (Enter)</Text>
                     </TouchableOpacity>
                )}
            </View>
          </View>

          <View style={styles.infoBar}>
            <View style={[styles.infoChip, { borderColor: `${MANSION.cheese}40` }]}>
              <Text style={styles.infoLabel}>CHEESE</Text>
              <Text style={[styles.infoValue, { color: MANSION.cheese }]}>{cheeseCount}</Text>
            </View>
            <View style={[styles.infoChip, { borderColor: `${config.color}40` }]}>
              <Text style={styles.infoLabel}>SCORE</Text>
              <Text style={[styles.infoValue, { color: config.color }]}>{score}</Text>
            </View>
            <View style={[styles.infoChip, { borderColor: `${MANSION.tom}40` }]}>
              <Text style={styles.infoLabel}>TOMS</Text>
              <Text style={[styles.infoValue, { color: MANSION.tom }]}>{config.tomCount}</Text>
            </View>
          </View>

          {maze.length > 0 && (
            <View style={[styles.mazeViewport, glassmorphism(0.2)]}>
              <View style={[styles.mazeContainer, { width: MAZE_PX_W, height: MAZE_PX_H }]}>
                {floors}
                {walls}

                {(gameState !== 'idle') && cheeses.map((ch, i) => (
                  <View key={`ch-${i}`} style={[styles.spriteCell, {
                    left: ch.c * CELL_SIZE, top: ch.r * CELL_SIZE,
                    width: CELL_SIZE, height: CELL_SIZE,
                  }]}>
                    <CheeseSprite size={CELL_SIZE * 0.8} />
                  </View>
                ))}

                {(gameState !== 'idle') && tomPositions.map((tom, i) => (
                  <View key={`tom-${i}`} style={[styles.spriteCell, {
                    left: tom.c * CELL_SIZE, top: tom.r * CELL_SIZE,
                    width: CELL_SIZE, height: CELL_SIZE,
                  }]}>
                    <TomSprite size={CELL_SIZE * 0.9} />
                  </View>
                ))}

                {(gameState !== 'idle') && (
                  <Animated.View style={[styles.spriteCell, {
                    width: CELL_SIZE, height: CELL_SIZE,
                  }, jerryStyle]}>
                    <JerrySprite size={CELL_SIZE * 0.9} />
                  </Animated.View>
                )}
              </View>

              {gameState === 'paused' && (
                <View style={[styles.pausedOverlay, glassmorphism(0.85)]}>
                  <Text style={styles.pausedTitle}>⏸ PAUSED</Text>
                  <Text style={styles.pausedSub}>Press Enter to resume</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.hintRow}>
            <Text style={styles.hintText}>Mobile: Swipe | Desktop: Arrow Keys, WASD, Enter</Text>
          </View>
        </View>

        <GameOverModal
          visible={gameState === 'lost'}
          title="CAUGHT BY TOM!"
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
  root: { flex: 1, backgroundColor: MANSION.bg },
  safe: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', width: '100%' },

  topControls: {
    width: '100%',
    maxWidth: 600,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[2],
  },
  diffSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  diffBtn: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  diffBtnText: { fontFamily: Fonts.heading, fontSize: FontSize.xs, color: Colors.text.muted },
  actionSelector: {
      flexDirection: 'row',
      gap: 8,
  },
  actionBtn: {
      paddingHorizontal: Spacing[4],
      paddingVertical: Spacing[2],
      borderRadius: Radius.sm,
      justifyContent: 'center',
      ...elegantShadow(1, 5, 0, '#FFF'),
  },
  actionBtnText: {
      fontFamily: Fonts.heading, fontSize: FontSize.xs, color: '#000',
  },

  infoBar: {
    flexDirection: 'row', justifyContent: 'center', gap: Spacing[2],
    paddingHorizontal: Spacing[2], paddingVertical: Spacing[1],
    width: '100%', zIndex: 10, marginBottom: Spacing[2]
  },
  infoChip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing[2],
    paddingHorizontal: Spacing[3], paddingVertical: Spacing[1],
    borderRadius: Radius.full, borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  infoLabel: { fontFamily: Fonts.heading, fontSize: FontSize.xs, color: Colors.text.muted },
  infoValue: { fontFamily: Fonts.heading, fontSize: FontSize.sm },

  mazeViewport: {
    flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', marginHorizontal: 8, borderRadius: Radius.md,
    borderWidth: 2, borderColor: '#1E2340',
    backgroundColor: MANSION.bg,
  },
  mazeContainer: { position: 'relative', backgroundColor: MANSION.floor },

  wall: {
    position: 'absolute', 
    backgroundColor: MANSION.wallBase,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderTopColor: MANSION.wallLight,
    borderLeftColor: MANSION.wallLight,
    borderBottomColor: MANSION.wallDark,
    borderRightColor: MANSION.wallDark,
  },
  wallInner: {
    width: '60%',
    height: '60%',
    backgroundColor: MANSION.wallCore,
    borderRadius: 2,
  },

  spriteCell: { position: 'absolute', alignItems: 'center', justifyContent: 'center', zIndex: 5 },

  pausedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center', zIndex: 20,
    backgroundColor: 'rgba(5, 6, 16, 0.9)',
  },
  pausedTitle: { fontFamily: Fonts.heading, fontSize: FontSize['2xl'], color: MANSION.accent, letterSpacing: 4 },
  pausedSub: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: '#FFF', opacity: 0.7, marginTop: Spacing[2] },

  hintRow: { width: '100%', alignItems: 'center', paddingVertical: 6 },
  hintText: {
    fontFamily: Fonts.body, fontSize: FontSize.xs, color: '#FFF', opacity: 0.4,
    backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
  },
});