import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const TETROMINOS = {
  I: { shape: [[1,1,1,1]], color: '#00e5ff' },
  O: { shape: [[1,1],[1,1]], color: '#ffca28' },
  T: { shape: [[1,1,1],[0,1,0]], color: '#c158ff' },
  S: { shape: [[0,1,1],[1,1,0]], color: '#69f0ae' },
  Z: { shape: [[1,1,0],[0,1,1]], color: '#ff5252' },
  J: { shape: [[1,0,0],[1,1,1]], color: '#448aff' },
  o: { shape: [[1]], color: '#ff9100' },
};

const TETROMINO_KEYS = Object.keys(TETROMINOS);

// Shared "glass" theme, matching Blockoduko.
const COLORS = {
  panel: 'rgba(20, 10, 35, 0.55)',
  panelBorder: 'rgba(180, 130, 255, 0.35)',
  accent: '#b06bff',
  accentGlow: '#00eaff',
};

// Board cell size in px (width/height incl. margin) — used both for layout
// and for translating swipe distance into grid steps.
const CELL_SIZE = 25;
const CELL_MARGIN = 1;
const CELL_STEP = CELL_SIZE + CELL_MARGIN * 2;

class Tetromino {
  constructor(type){
    this.type = type;
    this.shape = TETROMINOS[type].shape.map(r => [...r]);
    this.color = TETROMINOS[type].color;
    this.row = 0;
    this.col = 3; 
  }
  rotate(){
    const newShape = [];
    const rows = this.shape.length;
    const cols = this.shape[0].length;
    for(let c=0;c<cols;c++){
      const newRow = [];
      for(let r=rows-1;r>=0;r--){
        newRow.push(this.shape[r][c]);
      }
      newShape.push(newRow);
    }
    this.shape = newShape;
  }
  clone(){
    const t = new Tetromino(this.type);
    t.shape = this.shape.map(r => [...r]);
    t.color = this.color;
    t.row = this.row;
    t.col = this.col;
    return t;
  }
}
class TetrisGrid {
  constructor(rows = 15, cols = 10){
    this.rows = rows;
    this.cols = cols;
    this.matrix = Array(rows).fill(null).map(()=>Array(cols).fill(null));
  }
  clone(){
    const g = new TetrisGrid(this.rows, this.cols);
    g.matrix = this.matrix.map(r => [...r]);
    return g;
  }
  isValidPosition(tetromino){
    const { shape, row, col } = tetromino;
    for(let r=0; r<shape.length; r++){
      for(let c=0; c<shape[r].length; c++){
        if(shape[r][c]===1){
          const nr = row+r;
          const nc = col+c;
          if(nr<0 || nr>=this.rows || nc<0 || nc>=this.cols) return false;
          if(this.matrix[nr][nc] !== null) return false;
        }
      }
    }
    return true;
  }
  placeTetromino(tetromino){
    const { shape, row, col, color } = tetromino;
    for(let r=0; r<shape.length; r++){
      for(let c=0; c<shape[r].length; c++){
        if(shape[r][c]===1){
          this.matrix[row+r][col+c] = color;
        }
      }
    }
  }
  clearLines(){
    let cleared = 0;
    for(let r=this.rows-1; r>=0; r--){
      if(this.matrix[r].every(v => v !== null)){
        this.matrix.splice(r,1);
        this.matrix.unshift(Array(this.cols).fill(null));
        cleared++;
        r++;
      }
    }
    return cleared;
  }
}
function getRandomTetromino(){
  const r = Math.floor(Math.random()*TETROMINO_KEYS.length);
  return new Tetromino(TETROMINO_KEYS[r]);
}

const Tetris = () => {
  const [grid,setGrid] = useState(() => new TetrisGrid());
  const [current,setCurrent] = useState(() => getRandomTetromino());
  const [next,setNext] = useState(() => getRandomTetromino());
  const [score,setScore] = useState(0);
  const [level,setLevel] = useState(1);
  const [highScore,setHighScore] = useState(0);
  const [gameOver,setGameOver] = useState(false);

  const intervalRef = useRef(null);
  const gameOverAnim = useRef(new Animated.Value(0)).current;

  useEffect(()=>{
    (async()=>{
      const s = await AsyncStorage.getItem('tetrisHighScore');
      if(s) setHighScore(parseInt(s,10));
    })();
  },[]);
  useEffect(()=>{
    if(score > highScore){
      setHighScore(score);
      AsyncStorage.setItem('tetrisHighScore',score.toString());
    }
  },[score,highScore]);
  useEffect(()=>{
    startInterval();
    return stopInterval;
  },[current,level,gameOver]);
  useEffect(() => {
    if (gameOver) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
    Animated.timing(gameOverAnim, {
      toValue: gameOver ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [gameOver]);

  const startInterval = () => {
    stopInterval();
    if(!gameOver){
      const speed = Math.max(100, 600 - level*50);
      intervalRef.current = setInterval(()=>moveDown(), speed);
    }
  };
  const stopInterval = () => {
    if(intervalRef.current){
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
  const spawnNew = () => {
    const newPiece = next;
    newPiece.row = 0;
    newPiece.col = 3;
    if(!grid.isValidPosition(newPiece)){
      setGameOver(true);
      stopInterval();
      return;
    }
    setCurrent(newPiece);
    setNext(getRandomTetromino());
  };
  const moveDown = () => {
    if(gameOver) return;
    const clone = current.clone();
    clone.row++;
    if(grid.isValidPosition(clone)){
      setCurrent(clone);
    }
    else {
      const newGrid = grid.clone();
      newGrid.placeTetromino(current);
      const cleared = newGrid.clearLines();
      if(cleared>0){
        setScore(s=>s + cleared*100);
        setLevel(l=>l + Math.floor(cleared/2));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      setGrid(newGrid);
      spawnNew();
    }
  };
  const moveLeft = () => {
    if(gameOver) return;
    const clone = current.clone();
    clone.col--;
    if(grid.isValidPosition(clone)) {
      setCurrent(clone);
      Haptics.selectionAsync().catch(() => {});
    }
  };

  const moveRight = () => {
    if(gameOver) return;
    const clone = current.clone();
    clone.col++;
    if(grid.isValidPosition(clone)) {
      setCurrent(clone);
      Haptics.selectionAsync().catch(() => {});
    }
  };

  const rotate = () => {
    if(gameOver) return;
    const clone = current.clone();
    clone.rotate();
    if(grid.isValidPosition(clone)) {
      setCurrent(clone);
      Haptics.selectionAsync().catch(() => {});
    }
  };

  const drop = () => {
    if(gameOver) return;
    let clone = current.clone();
    while(grid.isValidPosition(clone)){
      clone.row++;
    }
    clone.row--;
    setCurrent(clone);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    moveDown();
  };
  const handleRestart = () => {
    setGrid(new TetrisGrid());
    setCurrent(getRandomTetromino());
    setNext(getRandomTetromino());
    setScore(0);
    setLevel(1);
    setGameOver(false);
  };

  // Swipe-to-move / swipe-to-drop / tap-to-rotate directly on the board.
  // .runOnJS(true) keeps everything on the JS thread since this is a
  // discrete, turn-based game — no need for worklets here.
  const swipeStep = useRef({ x: 0, y: 0 });

  const boardPan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(8)
    .onBegin(() => {
      swipeStep.current = { x: 0, y: 0 };
    })
    .onUpdate((e) => {
      const stepX = Math.trunc(e.translationX / CELL_STEP);
      if (stepX !== swipeStep.current.x) {
        const diff = stepX - swipeStep.current.x;
        const dir = diff > 0 ? moveRight : moveLeft;
        for (let i = 0; i < Math.abs(diff); i++) dir();
        swipeStep.current.x = stepX;
      }
      const stepY = Math.trunc(e.translationY / CELL_STEP);
      if (stepY > swipeStep.current.y) {
        const diff = stepY - swipeStep.current.y;
        for (let i = 0; i < diff; i++) moveDown();
        swipeStep.current.y = stepY;
      }
    });

  const boardTap = Gesture.Tap()
    .runOnJS(true)
    .maxDuration(250)
    .onEnd(() => rotate());

  const boardGesture = Gesture.Race(boardTap, boardPan);

  const displayGrid = grid.clone().matrix.map(r=>[...r]);
  const {shape,row,col,color} = current;

  for(let r=0;r<shape.length;r++){
    for(let c=0;c<shape[r].length;c++){
      if(shape[r][c]===1){
        const gr = row + r;
        const gc = col + c;
        if(gr>=0 && gr<grid.rows && gc>=0 && gc<grid.cols){
          displayGrid[gr][gc] = color;
        }
      }
    }
  }
  return(
    <ImageBackground
    source={require("../assets/images/background_main.png")}
    style={styles.bg}
    resizeMode="cover"
    >
    <View style={styles.container}>
      <Text style={styles.title}>Tetris</Text>

      <View style={styles.scorePanel}>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreText}>Score{'\n'}{score}</Text>
          <Text style={styles.levelText}>Lvl{'\n'}{level}</Text>
          <Text style={styles.high}>Best{'\n'}{highScore}</Text>
        </View>
      </View>

      <View style={styles.boardRow}>
        <GestureDetector gesture={boardGesture}>
          <View style={styles.board}>
            {displayGrid.map((row,i)=>(
              <View key={i} style={styles.row}>
                {row.map((cell,j)=>(
                  <View
                    key={j}
                    style={[
                      styles.cell,
                      cell ? { backgroundColor: cell } : styles.emptyCell,
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        </GestureDetector>

        <View style={styles.nextPanel}>
          <Text style={styles.nextLabel}>Next</Text>
          <View style={styles.nextBox}>
            {next.shape.map((r,i)=>(
              <View key={i} style={{flexDirection:'row'}}>
                {r.map((v,j)=>(
                  <View
                    key={j}
                    style={{
                      width:16,height:16,
                      margin:1,
                      borderRadius: 3,
                      backgroundColor: v===1?next.color:'transparent',
                    }}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </View>

      <Text style={styles.instructions}>Swipe the board to move · tap to rotate</Text>

      <View style={styles.controls}>
        <TouchableOpacity onPress={moveLeft} style={styles.controlButton}><Text style={styles.ctrlTxt}>◀</Text></TouchableOpacity>
        <TouchableOpacity onPress={rotate} style={styles.controlButton}><Text style={styles.ctrlTxt}>⟳</Text></TouchableOpacity>
        <TouchableOpacity onPress={moveRight} style={styles.controlButton}><Text style={styles.ctrlTxt}>▶</Text></TouchableOpacity>
        <TouchableOpacity onPress={drop} style={styles.controlButton}><Text style={styles.ctrlTxt}>⬇</Text></TouchableOpacity>
      </View>

      {gameOver && (
        <Animated.View style={[styles.overlay, { opacity: gameOverAnim }]}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.gameOverCard}>
            <Text style={styles.gameOver}>Game Over</Text>
            <Text style={styles.finalScoreText}>Final Score: {score}</Text>
            {score >= highScore && score > 0 && (
              <Text style={styles.newBestText}>New Best!</Text>
            )}
            <TouchableOpacity onPress={handleRestart} style={styles.restartButton}>
              <Text style={styles.restartText}>Play Again</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
    </ImageBackground>
  ); 
};
const styles = StyleSheet.create({
  bg:{
    flex: 1,
    resizeMode: "cover",
    justifyContent: "center",
    alignItems: "center"
  },
  container:{
    flex:1,
    alignItems:'center',
    justifyContent: 'flex-start',
    backgroundColor:"rgba(0,0,0,0.35)",
    paddingTop:30,
    paddingHorizontal: 20,
  },
  title:{
    fontSize:32,
    fontWeight:'bold',
    color:'#ffffff',
    textShadowColor: '#9900ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
    marginBottom:14
  },

  scorePanel: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  scoreRow:{
    flexDirection:'row',
    justifyContent:'space-between',
    alignItems: 'center',
  },
  scoreText:{ fontSize:14, color: COLORS.accentGlow, fontWeight: 'bold', lineHeight: 18 },
  levelText:{ fontSize:14, color: '#ffffff', fontWeight: 'bold', lineHeight: 18, textAlign: 'center' },
  high:{ fontSize:14, color: COLORS.accentGlow, fontWeight:'bold', lineHeight: 18, textAlign: 'right' },

  boardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  board:{
    borderWidth:1,
    borderColor: COLORS.panelBorder,
    borderRadius: 12,
    padding:4,
    backgroundColor: 'rgba(10, 0, 25, 0.4)',
  },

  row:{ flexDirection:'row' },

  cell:{
    width:CELL_SIZE,
    height:CELL_SIZE,
    margin:CELL_MARGIN,
    borderRadius: 4,
  },
  emptyCell: { backgroundColor: 'rgba(255,255,255,0.08)' },

  nextPanel: {
    marginLeft: 12,
    borderRadius: 12,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  nextLabel: {
    color: COLORS.accentGlow,
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 6,
  },
  nextBox: {
    minHeight: 40,
    justifyContent: 'center',
  },

  instructions: {
    marginTop: 14,
    fontSize: 13,
    color: '#eee',
  },

  controls:{
    flexDirection:'row',
    marginTop:14
  },
  controlButton:{
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.accent,
    marginHorizontal:8,
    borderRadius:12,
    elevation: 4,
  },
  ctrlTxt:{ fontSize:22, fontWeight:'bold', color: '#1a0330' },

  overlay:{
    position:'absolute',
    top:0,left:0,right:0,bottom:0,
    justifyContent:'center',
    alignItems:'center'
  },
  gameOverCard: {
    paddingVertical: 30,
    paddingHorizontal: 36,
    borderRadius: 20,
    backgroundColor: 'rgba(20, 10, 35, 0.85)',
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    alignItems: 'center',
  },
  gameOver:{
    color:'white',
    fontSize:36,
    fontWeight:'bold',
    textShadowColor: COLORS.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  finalScoreText: {
    fontSize: 20,
    color: 'white',
    marginTop: 10,
  },
  newBestText: {
    fontSize: 15,
    color: '#ffd54f',
    fontWeight: 'bold',
    marginTop: 6,
  },
  restartButton:{
    marginTop: 22,
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius:12,
    elevation: 5,
  },
  restartText:{
    fontSize:18,
    fontWeight:'bold',
    color:'#1a0330'
  }
});

export default Tetris;