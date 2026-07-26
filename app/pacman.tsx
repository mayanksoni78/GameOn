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
  bg:         '#050610',   // Very dark navy background
  
  // 3D Wall Colors
  wallBase:   '#161A30',   // Base stone block color
  wallLight:  '#2C345C',   // Top/Left highlight (light source)
  wallDark:   '#080A12',   // Bottom/Right shadow
  wallCore:   '#1A1F3A',   // Inner texture color
  
  // Floor Colors
  floor:      '#0A0C18',   // Deepest blue for floor
  floorAlt:   '#0E1122',   // Slightly lighter floor tile
  
  accent:     '#D2B48C',   // Jerry Tan
  cheese:     '#FFD600',
  jerry:      '#8B4513',   
  tom:        '#778899',   
  tomBlue:    '#4682B4',   
  tomDark:    '#2F4F4F',   
  moonlight:  'rgba(60, 90, 200, 0.08)', // Soft cool blue glow
};

// ── Types ─────────────────────────────────────────────────────────────────────
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type GameState = 'idle' | 'playing' | 'paused' | 'won' | 'lost';
type Pos = { r: number; c: number };

interface DiffConfig {
  label: string;
  icon: string;
  tomCount: number;
  tomSpeed: number;       
  targetScore: number;
  color: string;
}

const DIFFICULTIES: Record<Difficulty, DiffConfig> = {
  EASY:   { label: 'Easy',   icon: '🐭', tomCount: 1, tomSpeed: 500, targetScore: 500,  color: MANSION.accent },
  MEDIUM: { label: 'Medium', icon: '🐱', tomCount: 2, tomSpeed: 400, targetScore: 1000, color: MANSION.tomBlue },
  HARD:   { label: 'Hard',   icon: '😼', tomCount: 3, tomSpeed: 300, targetScore: 1500, color: '#6A5ACD' }, // Slate Blue
};

// ── Maze Config ───────────────────────────────────────────────────────────────
const MAZE_ROWS = 15;
const MAZE_COLS = 15;

const HEADER_HEIGHT = 120;
const BOTTOM_HEIGHT = 60;
const VIEWPORT_HEIGHT = screenHeight - HEADER_HEIGHT - BOTTOM_HEIGHT - 40;
const VIEWPORT_WIDTH = screenWidth - 16;
const CELL_SIZE = Math.min(
  Math.floor(VIEWPORT_WIDTH / MAZE_COLS),
  Math.floor(VIEWPORT_HEIGHT / MAZE_ROWS),
  40 
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

// ── BFS Pathfinding ───────────────────────────────────────────────────────────
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

    const initialCheese = spawnCheese(newMaze, 4, [jPos, ...tomStarts]); 
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
      withTiming(1.15, { duration: 30 }),
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
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        if (stateRef.current === 'idle' || stateRef.current === 'lost') {
          startGame(difficulty);
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
          // 3D Beveled Wall Block
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

  const tomEmojis = ['🐱', '😾', '🙀'];

  return (
    <View style={styles.root} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <MansionBackground />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <GameHeader
          title="JERRY VS TOM"
          score={score}
          highScore={highScore}
          accentColor={config.color}
          onBack={() => router.replace('/')}
        />

        <View style={styles.content}>
          <View style={styles.infoBar}>
            <View style={[styles.infoChip, { borderColor: `${MANSION.cheese}40` }]}>
              <Text style={styles.infoLabel}>🧀</Text>
              <Text style={[styles.infoValue, { color: MANSION.cheese }]}>{cheeseCount}</Text>
            </View>
            <View style={[styles.infoChip, { borderColor: `${config.color}40` }]}>
              <Text style={styles.infoLabel}>SCORE</Text>
              <Text style={[styles.infoValue, { color: config.color }]}>{score}</Text>
            </View>
            <View style={[styles.infoChip, { borderColor: `${MANSION.tom}40` }]}>
              <Text style={styles.infoLabel}>🐱</Text>
              <Text style={[styles.infoValue, { color: MANSION.tom }]}>{config.tomCount}</Text>
            </View>
          </View>

          {gameState === 'idle' && (
            <View style={styles.modeRow}>
              {(Object.keys(DIFFICULTIES) as Difficulty[]).map(d => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.modeBtn,
                    { borderColor: difficulty === d ? DIFFICULTIES[d].color : 'rgba(255,255,255,0.08)' },
                    difficulty === d && { backgroundColor: `${DIFFICULTIES[d].color}15` },
                  ]}
                  onPress={() => { tapLight(); setDifficulty(d); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modeIcon}>{DIFFICULTIES[d].icon}</Text>
                  <Text style={[styles.modeLabel, difficulty === d && { color: DIFFICULTIES[d].color }]}>
                    {DIFFICULTIES[d].label}
                  </Text>
                  <Text style={styles.modeSub}>{DIFFICULTIES[d].tomCount} Tom{DIFFICULTIES[d].tomCount > 1 ? 's' : ''}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {(gameState === 'idle' || gameState === 'lost') && (
            <View style={styles.startWrap}>
              <TouchableOpacity
                style={[styles.startBtn, { backgroundColor: config.color }]}
                onPress={() => startGame(difficulty)}
                activeOpacity={0.8}
              >
                <Text style={styles.startBtnText}>
                  {gameState === 'idle' ? '🐭 START GAME' : '🔄 TRY AGAIN'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {maze.length > 0 && gameState !== 'idle' && (
            <View style={[styles.mazeViewport, glassmorphism(0.2)]}>
              <View style={[styles.mazeContainer, { width: MAZE_PX_W, height: MAZE_PX_H }]}>
                {floors}
                {walls}

                {cheeses.map((ch, i) => (
                  <View key={`ch-${i}`} style={[styles.cheeseCell, {
                    left: ch.c * CELL_SIZE, top: ch.r * CELL_SIZE,
                    width: CELL_SIZE, height: CELL_SIZE,
                  }]}>
                    <Text style={{ fontSize: CELL_SIZE * 0.55 }}>🧀</Text>
                  </View>
                ))}

                {tomPositions.map((tom, i) => (
                  <View key={`tom-${i}`} style={[styles.catCell, {
                    left: tom.c * CELL_SIZE, top: tom.r * CELL_SIZE,
                    width: CELL_SIZE, height: CELL_SIZE,
                  }]}>
                    <Text style={{ fontSize: CELL_SIZE * 0.65 }}>{tomEmojis[i % tomEmojis.length]}</Text>
                  </View>
                ))}

                <Animated.View style={[styles.mouseCell, {
                  width: CELL_SIZE, height: CELL_SIZE,
                }, jerryStyle]}>
                  <Text style={{ fontSize: CELL_SIZE * 0.7 }}>🐭</Text>
                </Animated.View>
              </View>

              {gameState === 'paused' && (
                <View style={[styles.pausedOverlay, glassmorphism(0.85)]}>
                  <Text style={styles.pausedTitle}>⏸ PAUSED</Text>
                  <Text style={styles.pausedSub}>Press P or Enter to resume</Text>
                  <TouchableOpacity style={[styles.resumeBtn, { backgroundColor: config.color }]} onPress={resumeGame}>
                    <Text style={styles.resumeBtnText}>RESUME</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {gameState === 'playing' && (
            <View style={styles.hintRow}>
              <Text style={styles.hintText}>Swipe or use Arrow Keys / WASD</Text>
            </View>
          )}
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

  infoBar: {
    flexDirection: 'row', justifyContent: 'center', gap: Spacing[2],
    paddingHorizontal: Spacing[2], paddingVertical: Spacing[1],
    width: '100%', zIndex: 10,
  },
  infoChip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing[2],
    paddingHorizontal: Spacing[3], paddingVertical: Spacing[1],
    borderRadius: Radius.full, borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  infoLabel: { fontFamily: Fonts.heading, fontSize: FontSize.xs, color: Colors.text.muted },
  infoValue: { fontFamily: Fonts.heading, fontSize: FontSize.sm },

  modeRow: {
    flexDirection: 'row', justifyContent: 'center', gap: Spacing[3],
    width: '100%', maxWidth: 400, marginTop: Spacing[4], zIndex: 10,
  },
  modeBtn: {
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[3],
    borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', minWidth: 90,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  modeIcon: { fontSize: 28, marginBottom: 4 },
  modeLabel: { fontFamily: Fonts.heading, fontSize: FontSize.xs, color: Colors.text.muted, letterSpacing: 1 },
  modeSub: { fontFamily: Fonts.body, fontSize: FontSize.xs - 2, color: 'rgba(255,255,255,0.3)', marginTop: 2 },

  startWrap: { width: '100%', maxWidth: 280, alignSelf: 'center', marginVertical: 16, zIndex: 10 },
  startBtn: {
    paddingVertical: Spacing[4], paddingHorizontal: Spacing[6],
    borderRadius: Radius.lg, alignItems: 'center',
    ...elegantShadow(1, 10, 0, '#FFF'),
  },
  startBtnText: { fontFamily: Fonts.heading, fontSize: FontSize.md, color: '#000', letterSpacing: 2 },

  mazeViewport: {
    flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', marginHorizontal: 8, borderRadius: Radius.md,
    borderWidth: 2, borderColor: '#1E2340', // Elegant dark blue border instead of pink
    backgroundColor: MANSION.bg,
  },
  mazeContainer: { position: 'relative', backgroundColor: MANSION.floor },

  // 3D Beveled Wall Effect
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

  cheeseCell: { position: 'absolute', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  catCell: { position: 'absolute', alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  mouseCell: { position: 'absolute', alignItems: 'center', justifyContent: 'center', zIndex: 5 },

  pausedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center', zIndex: 20,
    backgroundColor: 'rgba(5, 6, 16, 0.9)',
  },
  pausedTitle: { fontFamily: Fonts.heading, fontSize: FontSize['2xl'], color: MANSION.accent, letterSpacing: 4 },
  pausedSub: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: '#FFF', opacity: 0.7, marginTop: Spacing[2] },
  resumeBtn: {
    marginTop: Spacing[4], paddingVertical: Spacing[3], paddingHorizontal: Spacing[6],
    borderRadius: Radius.md,
  },
  resumeBtnText: { fontFamily: Fonts.heading, fontSize: FontSize.sm, color: '#000', letterSpacing: 2 },

  hintRow: { width: '100%', alignItems: 'center', paddingVertical: 6 },
  hintText: {
    fontFamily: Fonts.body, fontSize: FontSize.xs, color: '#FFF', opacity: 0.4,
    backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
  },
});