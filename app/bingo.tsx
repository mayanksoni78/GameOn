import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, glassmorphism, elegantShadow } from '../src/theme/colors';
import { Fonts, FontSize } from '../src/theme/typography';
import { Spacing, Radius } from '../src/theme/spacing';
import { AnimatedBackground } from '../src/components/AnimatedBackground';
import { GameHeader } from '../src/components/GameHeader';
import { GameOverModal } from '../src/components/GameOverModal';
import { ControlsOverlay } from '../src/components/ControlsOverlay';
import { screenWidth } from '../src/utils/dimensions';
import { tapLight, tapMedium, notifySuccess } from '../src/utils/haptics';
import { useKeyboard, KeyboardKey } from '../src/hooks/useKeyboard';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';

const ACCENT = '#FF1744'; // Hot Pink

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
const GRID_SIZES = { EASY: 4, MEDIUM: 5, HARD: 6 };
const MAX_NUMBERS = { EASY: 40, MEDIUM: 75, HARD: 100 };

const AnimatedCell = ({ num, isMarked, isCenter, onPress }: any) => {
    const scale = useSharedValue(1);
    
    useEffect(() => {
        if (isMarked) scale.value = withSpring(1.1, { damping: 10, stiffness: 200 }, () => {
            scale.value = withSpring(1);
        });
    }, [isMarked]);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    return (
        <TouchableOpacity style={styles.cellOuter} onPress={onPress} activeOpacity={0.8}>
            <Animated.View style={[
                styles.cell, 
                isCenter ? styles.cellCenter : null,
                isMarked ? [styles.cellMarked, { backgroundColor: ACCENT, borderColor: ACCENT }] : null,
                animStyle
            ]}>
                <Text style={[
                    styles.cellText, 
                    isCenter ? styles.cellTextCenter : null,
                    isMarked ? styles.cellTextMarked : null
                ]}>
                    {isCenter ? 'FREE' : num}
                </Text>
            </Animated.View>
        </TouchableOpacity>
    );
};

export default function Bingo() {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  
  const [board, setBoard] = useState<{num: number, marked: boolean}[][]>([]);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [currentCall, setCurrentCall] = useState<number | null>(null);
  const [bingo, setBingo] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem('bingo_hs').then(v => v && setHighScore(parseInt(v)));
  }, []);

  const initGame = (diff: Difficulty) => {
      setDifficulty(diff);
      const size = GRID_SIZES[diff];
      const maxNum = MAX_NUMBERS[diff];
      
      // Generate numbers per column to ensure even distribution
      const numbersPerCol = Math.floor(maxNum / size);
      const newBoard: {num: number, marked: boolean}[][] = Array(size).fill(0).map(() => []);

      for (let c = 0; c < size; c++) {
          const colNums = new Set<number>();
          const min = c * numbersPerCol + 1;
          const max = (c + 1) * numbersPerCol;
          while (colNums.size < size) {
              colNums.add(Math.floor(Math.random() * (max - min + 1)) + min);
          }
          const colArr = Array.from(colNums).sort((a,b)=>a-b);
          for(let r = 0; r < size; r++) {
              newBoard[r][c] = { num: colArr[r], marked: false };
          }
      }

      // Center free space
      if (size % 2 !== 0) {
          const center = Math.floor(size / 2);
          newBoard[center][center].marked = true; // Free space
      }

      setBoard(newBoard);
      setCalledNumbers([]);
      setCurrentCall(null);
      setBingo(false);
      setScore(0);
  };

  const drawNumber = useCallback(() => {
      if (bingo || !difficulty) return;
      const maxNum = MAX_NUMBERS[difficulty];
      if (calledNumbers.length >= maxNum) return;

      let num;
      do {
          num = Math.floor(Math.random() * maxNum) + 1;
      } while (calledNumbers.includes(num));

      tapMedium();
      setCurrentCall(num);
      setCalledNumbers(prev => [num, ...prev]);
  }, [bingo, difficulty, calledNumbers]);

  const toggleMark = (r: number, c: number) => {
      if (bingo || !difficulty) return;
      
      const size = GRID_SIZES[difficulty];
      if (size % 2 !== 0 && r === Math.floor(size/2) && c === Math.floor(size/2)) return; // Free space

      const cell = board[r][c];
      
      // Can only mark if called or unmarking
      if (!cell.marked && !calledNumbers.includes(cell.num)) return;

      tapLight();
      const newBoard = board.map(row => row.map(cell => ({...cell})));
      newBoard[r][c].marked = !newBoard[r][c].marked;
      setBoard(newBoard);

      checkBingo(newBoard);
  };

  const checkBingo = (b: {num: number, marked: boolean}[][]) => {
      if (!difficulty) return;
      const size = GRID_SIZES[difficulty];
      let hasBingo = false;

      // Rows
      for (let r = 0; r < size; r++) {
          if (b[r].every(c => c.marked)) hasBingo = true;
      }
      // Cols
      for (let c = 0; c < size; c++) {
          let colWin = true;
          for (let r = 0; r < size; r++) if (!b[r][c].marked) colWin = false;
          if (colWin) hasBingo = true;
      }
      // Diags
      let diag1 = true;
      let diag2 = true;
      for (let i = 0; i < size; i++) {
          if (!b[i][i].marked) diag1 = false;
          if (!b[i][size - 1 - i].marked) diag2 = false;
      }
      if (diag1 || diag2) hasBingo = true;

      if (hasBingo) {
          notifySuccess();
          setBingo(true);
          const finalScore = (MAX_NUMBERS[difficulty] - calledNumbers.length) * 10 * size;
          setScore(finalScore);
          if (finalScore > highScore) {
              setHighScore(finalScore);
              AsyncStorage.setItem('bingo_hs', finalScore.toString());
          }
      }
  };

  useKeyboard((key: KeyboardKey) => {
      if (key === ' ' || key === 'Enter') {
          drawNumber();
      }
  });

  const cellSize = difficulty ? Math.floor(Math.min(screenWidth - 40, 400) / GRID_SIZES[difficulty]) : 0;

  return (
    <View style={styles.root}>
      <AnimatedBackground />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        
        <GameHeader
          title="BINGO"
          score={score}
          highScore={highScore}
          accentColor={ACCENT}
          onBack={() => difficulty ? setDifficulty(null) : router.back()}
          rightContent={
              difficulty ? (
                <TouchableOpacity style={[styles.restartBtn, glassmorphism()]} onPress={() => initGame(difficulty)}>
                    <Text style={[styles.restartBtnText, { color: Colors.text.primary }]}>↺</Text>
                </TouchableOpacity>
              ) : undefined
          }
        />

        <ControlsOverlay
          instructions={[
            "Draw numbers and mark them on your board.",
            "Complete a row, column, or diagonal to win!"
          ]}
          controls={[
            { action: "Draw Number", input: "Tap Button / Space" },
            { action: "Mark Cell", input: "Tap Cell" }
          ]}
        />

        <View style={styles.container}>
            {!difficulty ? (
                <View style={[styles.menuContainer, glassmorphism()]}>
                    <Text style={styles.menuTitle}>SELECT DIFFICULTY</Text>
                    {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map(d => (
                        <TouchableOpacity 
                            key={d}
                            style={styles.menuBtn} 
                            onPress={() => { tapLight(); initGame(d); }}
                        >
                            <Text style={[styles.menuBtnText, { color: ACCENT }]}>{d}</Text>
                            <Text style={styles.menuBtnSub}>{GRID_SIZES[d]}x{GRID_SIZES[d]} GRID</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            ) : (
                <>
                    {/* Caller */}
                    <View style={styles.callerSection}>
                        <View style={[styles.currentCall, glassmorphism(), elegantShadow(0.5, 20, 10, ACCENT)]}>
                            <Text style={styles.currentCallLabel}>LATEST DRAW</Text>
                            <Text style={styles.currentCallText}>{currentCall || '--'}</Text>
                        </View>
                        
                        <TouchableOpacity 
                            style={[styles.drawBtn, { backgroundColor: ACCENT }]}
                            onPress={drawNumber}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.drawBtnText}>DRAW NEXT</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Board */}
                    <View style={[styles.board, glassmorphism(), elegantShadow(0.4, 20, 10)]}>
                        {board.map((row, r) => (
                            <View key={`r-${r}`} style={styles.row}>
                                {row.map((cell, c) => (
                                    <View key={`c-${c}`} style={{ width: cellSize, height: cellSize }}>
                                        <AnimatedCell 
                                            num={cell.num} 
                                            isMarked={cell.marked} 
                                            isCenter={GRID_SIZES[difficulty] % 2 !== 0 && r === Math.floor(GRID_SIZES[difficulty]/2) && c === Math.floor(GRID_SIZES[difficulty]/2)}
                                            onPress={() => toggleMark(r, c)} 
                                        />
                                    </View>
                                ))}
                            </View>
                        ))}
                    </View>
                    
                    {/* History */}
                    <View style={[styles.historyContainer, glassmorphism()]}>
                        <Text style={styles.historyTitle}>CALLED NUMBERS</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyList}>
                            {calledNumbers.map((n, i) => (
                                <View key={i} style={styles.historyBall}>
                                    <Text style={styles.historyBallText}>{n}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </>
            )}
        </View>

        <GameOverModal
          visible={bingo}
          title="BINGO!"
          score={score}
          highScore={highScore}
          isNewHighScore={score >= highScore && score > 0}
          accentColor={ACCENT}
          onRestart={() => difficulty && initGame(difficulty)}
          onHome={() => setDifficulty(null)}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  safe: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
  },
  // Menu
  menuContainer: {
      width: '100%',
      padding: Spacing[6],
      borderRadius: Radius.lg,
      alignItems: 'center',
  },
  menuTitle: {
      fontFamily: Fonts.heading,
      fontSize: FontSize.sm,
      color: Colors.text.muted,
      marginBottom: Spacing[6],
      letterSpacing: 2,
  },
  menuBtn: {
      width: '100%',
      paddingVertical: Spacing[4],
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      borderRadius: Radius.sm,
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.02)',
      marginBottom: Spacing[4],
  },
  menuBtnText: {
      fontFamily: Fonts.heading,
      fontSize: FontSize.lg,
      letterSpacing: 1,
  },
  menuBtnSub: {
      fontFamily: Fonts.body,
      fontSize: FontSize.xs,
      color: Colors.text.muted,
      marginTop: Spacing[1],
  },
  // Caller
  callerSection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: Spacing[6],
  },
  currentCall: {
      flex: 1,
      alignItems: 'center',
      padding: Spacing[4],
      borderRadius: Radius.md,
      marginRight: Spacing[4],
  },
  currentCallLabel: {
      fontFamily: Fonts.heading,
      fontSize: FontSize.xs,
      color: Colors.text.muted,
  },
  currentCallText: {
      fontFamily: Fonts.heading,
      fontSize: FontSize['4xl'],
      color: Colors.text.primary,
  },
  drawBtn: {
      paddingHorizontal: Spacing[6],
      paddingVertical: Spacing[4],
      borderRadius: Radius.full,
      justifyContent: 'center',
  },
  drawBtnText: {
      fontFamily: Fonts.heading,
      fontSize: FontSize.sm,
      color: Colors.white,
  },
  // Board
  board: {
      padding: Spacing[2],
      borderRadius: Radius.md,
  },
  row: { flexDirection: 'row' },
  cellOuter: { flex: 1, padding: 2 },
  cell: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: Radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
  },
  cellCenter: { backgroundColor: 'rgba(255,255,255,0.1)' },
  cellMarked: { ...elegantShadow(0.5, 10, 5, ACCENT) },
  cellText: {
      fontFamily: Fonts.heading,
      fontSize: FontSize.lg,
      color: Colors.text.primary,
  },
  cellTextCenter: { fontSize: FontSize.xs, color: Colors.text.secondary },
  cellTextMarked: { color: Colors.white },
  // History
  historyContainer: {
      width: '100%',
      marginTop: Spacing[8],
      padding: Spacing[4],
      borderRadius: Radius.md,
  },
  historyTitle: {
      fontFamily: Fonts.heading,
      fontSize: FontSize.xs,
      color: Colors.text.muted,
      marginBottom: Spacing[2],
  },
  historyList: {
      paddingVertical: Spacing[2],
      gap: Spacing[2],
  },
  historyBall: {
      width: 40,
      height: 40,
      borderRadius: Radius.full,
      backgroundColor: 'rgba(255,255,255,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
  },
  historyBallText: {
      fontFamily: Fonts.heading,
      fontSize: FontSize.sm,
      color: Colors.text.secondary,
  },
  restartBtn: {
      width: 44,
      height: 44,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
  },
  restartBtnText: {
      fontSize: FontSize.xl,
  }
});
