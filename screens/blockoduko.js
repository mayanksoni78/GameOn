import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');

const BLOCK_SHAPES = {
  Dot: [[1]],
  Square2x2: [[1, 1], [1, 1]],
  Small_L_d_r: [[1, 0], [1, 0], [1, 1]],
  Small_L_d_l: [[0, 1], [0, 1], [1, 1]],
  Small_L_u_r: [[1, 1], [1, 0], [1, 0]],
  Small_L_u_l: [[1, 1], [0, 1], [0, 1]],
  Line_3_v: [[1], [1], [1]],
  Line_3_h: [[1, 1, 1]],
  Line_4_v: [[1], [1], [1], [1]],
  Line_4_h: [[1, 1, 1, 1]],
  Line_5_v: [[1], [1], [1], [1], [1]],
  Line_5_h: [[1, 1, 1, 1, 1]],
  Corner1: [[1, 1], [1, 0]],
  Corner2: [[1, 1], [0, 1]],
  Corner3: [[1, 0], [1, 1]],
  Corner4: [[0, 1], [1, 1]],
  Square3x3: [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
  Large_L_d_r: [[1, 0, 0], [1, 0, 0], [1, 1, 1]],
  Large_L_u_r: [[1, 1, 1], [1, 0, 0], [1, 0, 0]],
  Large_L_d_l: [[0, 0, 1], [0, 0, 1], [1, 1, 1]],
  Large_L_u_l: [[1, 1, 1], [0, 0, 1], [0, 0, 1]],
  T_d: [[1, 1, 1], [0, 1, 0]],
  T_u: [[0, 1, 0], [1, 1, 1]],
  T_l: [[1, 0], [1, 1], [1, 0]],
  T_r: [[0, 1], [1, 1], [0, 1]],
};

// Board cell size, shared by the grid and the drag ghost so the dragged
// block lines up 1:1 with the board while it's being moved.
const CELL_SIZE = Math.min(width / 10, 36);
const CELL_GAP = 2;
// Tray blocks are drawn smaller (they're just a preview until picked up).
const TRAY_CELL = 16;
// How far above the finger/cursor the block floats while dragging, so it
// isn't hidden under the touch point on phones.
const DRAG_LIFT = 70;

const COLORS = {
  panel: 'rgba(20, 10, 35, 0.55)',
  panelBorder: 'rgba(180, 130, 255, 0.35)',
  accent: '#b06bff',
  accentGlow: '#00eaff',
  validGhost: 'rgba(80, 255, 170, 0.55)',
  invalidGhost: 'rgba(255, 70, 90, 0.55)',
};

const PALETTE = ['#ff5252', '#ff9800', '#ffeb3b', '#9c27b0', '#00bcd4', '#4caf50'];

class Block {
  constructor(shape, color) {
    this.shape = shape;
    this.color = color;
  }
}

class BlockGenerator {
  constructor() {
    this.shapes = Object.values(BLOCK_SHAPES);
  }

  getNewBlockSet() {
    const shapesCopy = [...this.shapes];
    for (let i = shapesCopy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shapesCopy[i], shapesCopy[j]] = [shapesCopy[j], shapesCopy[i]];
    }
    return shapesCopy
      .slice(0, 3)
      .map((shape) => new Block(shape, PALETTE[Math.floor(Math.random() * PALETTE.length)]));
  }
}

class Grid {
  constructor(size = 8) {
    this.size = size;
    this.matrix = Array(size).fill(null).map(() => Array(size).fill(null));
  }

  clone() {
    const newGrid = new Grid(this.size);
    newGrid.matrix = JSON.parse(JSON.stringify(this.matrix));
    return newGrid;
  }

  canPlaceBlock(block, startRow, startCol) {
    for (let r = 0; r < block.shape.length; r++) {
      for (let c = 0; c < block.shape[r].length; c++) {
        if (block.shape[r][c] === 1) {
          const boardRow = startRow + r;
          const boardCol = startCol + c;
          if (
            boardRow < 0 || boardCol < 0 ||
            boardRow >= this.size || boardCol >= this.size ||
            this.matrix[boardRow][boardCol] !== null
          )
            return false;
        }
      }
    }
    return true;
  }

  placeBlock(block, startRow, startCol) {
    for (let r = 0; r < block.shape.length; r++) {
      for (let c = 0; c < block.shape[r].length; c++) {
        if (block.shape[r][c] === 1) {
          this.matrix[startRow + r][startCol + c] = { filled: true, color: block.color };
        }
      }
    }
  }

  clearFullLines() {
    const rowsToClear = [];
    const colsToClear = [];

    for (let r = 0; r < this.size; r++) {
      if (this.matrix[r].every((cell) => cell !== null)) rowsToClear.push(r);
    }
    for (let c = 0; c < this.size; c++) {
      if (this.matrix.every((row) => row[c] !== null)) colsToClear.push(c);
    }
    for (const r of rowsToClear) this.matrix[r] = Array(this.size).fill(null);
    for (const c of colsToClear) {
      for (let r = 0; r < this.size; r++) this.matrix[r][c] = null;
    }

    return { clearedRows: rowsToClear.length, clearedCols: colsToClear.length };
  }
}

function canAnyBlockBePlaced(grid, blocks) {
  for (const block of blocks) {
    if (!block) continue;
    for (let r = 0; r < grid.size; r++) {
      for (let c = 0; c < grid.size; c++) {
        if (grid.canPlaceBlock(block, r, c)) return true;
      }
    }
  }
  return false;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const blockGenerator = new BlockGenerator();

// Computes the top-left board cell a block should land on given a raw
// finger/cursor position in page coordinates.
function targetCellFor(block, pageX, pageY, gridOrigin, gridSize) {
  const blockHeight = block.shape.length;
  const blockWidth = block.shape[0].length;
  const step = CELL_SIZE + CELL_GAP;

  const ghostLeft = pageX - (blockWidth * step) / 2;
  const ghostTop = pageY - DRAG_LIFT - (blockHeight * step) / 2;

  let row = Math.round((ghostTop - gridOrigin.y) / step);
  let col = Math.round((ghostLeft - gridOrigin.x) / step);

  row = clamp(row, 0, gridSize - blockHeight);
  col = clamp(col, 0, gridSize - blockWidth);

  return { row, col };
}

const Cell = ({ value, preview }) => {
  let style = [styles.cell, styles.emptyCell];
  if (value) style = [styles.cell, { backgroundColor: value.color }];
  if (preview) {
    style = [
      styles.cell,
      styles.previewCell,
      { backgroundColor: preview.valid ? COLORS.validGhost : COLORS.invalidGhost },
    ];
  }
  return <View style={style} />;
};

const BlockShape = ({ shape, color, cellSize, gap = 1 }) => (
  <View>
    {shape.map((row, rowIndex) => (
      <View key={rowIndex} style={{ flexDirection: 'row' }}>
        {row.map((cellValue, colIndex) => (
          <View
            key={colIndex}
            style={{
              width: cellSize,
              height: cellSize,
              margin: gap,
              borderRadius: 4,
              backgroundColor: cellValue === 1 ? color : 'transparent',
              borderWidth: cellValue === 1 ? 1 : 0,
              borderColor: 'rgba(0,0,0,0.35)',
            }}
          />
        ))}
      </View>
    ))}
  </View>
);

// One draggable block in the tray. Uses react-native-gesture-handler's
// Gesture.Pan, which (unlike PanResponder) properly captures the pointer on
// web via native Pointer Events, so dragging doesn't drop out mid-move.
const TrayBlockItem = ({ block, index, disabled, isBeingDragged, onDragStart, onDragMove, onDragEnd }) => {
  const pan = Gesture.Pan()
    .enabled(!disabled)
    .shouldCancelWhenOutside(false)
    .onBegin((e) => {
      onDragStart(index, block, e.absoluteX, e.absoluteY);
    })
    .onUpdate((e) => {
      onDragMove(block, e.absoluteX, e.absoluteY);
    })
    .onEnd((e) => {
      onDragEnd(block, e.absoluteX, e.absoluteY);
    })
    .onFinalize((e, success) => {
      if (!success) onDragEnd(block, e.absoluteX, e.absoluteY);
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={[styles.blockWrapper, isBeingDragged && { opacity: 0.25 }]}>
        <BlockShape shape={block.shape} color={block.color} cellSize={TRAY_CELL} />
      </View>
    </GestureDetector>
  );
};

const Blockoduko = () => {
  const [grid, setGrid] = useState(() => new Grid());
  const [availableBlocks, setAvailableBlocks] = useState(() => blockGenerator.getNewBlockSet());
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [highScore, setHighScore] = useState(0);

  // Drag state: which tray block is being dragged, its live finger position,
  // and the resulting board preview (target cell + whether it's valid).
  const [dragging, setDragging] = useState(null); // { index, block, x, y }
  const [preview, setPreview] = useState(null); // { row, col, valid }
  const [toast, setToast] = useState(null);

  const gridRef = useRef(null);
  const gridOriginRef = useRef({ x: 0, y: 0 });
  const toastTimer = useRef(null);
  const gridStateRef = useRef(grid);
  gridStateRef.current = grid;
  const multiplierRef = useRef(multiplier);
  multiplierRef.current = multiplier;

  const multiplierAnim = useRef(new Animated.Value(1)).current;
  const gameOverAnim = useRef(new Animated.Value(0)).current;
  const dragScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      const savedScore = await AsyncStorage.getItem('highScore');
      if (savedScore) setHighScore(parseInt(savedScore, 10));
    })();
  }, []);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      AsyncStorage.setItem('highScore', score.toString());
    }
  }, [score, highScore]);

  useEffect(() => {
    if (availableBlocks.length > 0 && !isGameOver) {
      if (!canAnyBlockBePlaced(grid, availableBlocks)) {
        setIsGameOver(true);
      }
    }
  }, [grid, availableBlocks, isGameOver]);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(multiplierAnim, { toValue: 1.35, duration: 120, useNativeDriver: true }),
      Animated.spring(multiplierAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [multiplier]);

  useEffect(() => {
    Animated.timing(gameOverAnim, {
      toValue: isGameOver ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isGameOver]);

  const showToast = (message) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1100);
  };

  const measureGrid = useCallback(() => {
    if (!gridRef.current) return;
    gridRef.current.measure((_x, _y, _w, _h, pageX, pageY) => {
      gridOriginRef.current = { x: pageX, y: pageY };
    });
  }, []);

  const handleRestart = () => {
    setGrid(new Grid());
    setScore(0);
    setAvailableBlocks(blockGenerator.getNewBlockSet());
    setIsGameOver(false);
    setMultiplier(1);
    setDragging(null);
    setPreview(null);
  };

  const commitPlacement = (block, startRow, startCol) => {
    const newGrid = gridStateRef.current.clone();
    newGrid.placeBlock(block, startRow, startCol);

    const blockCells = block.shape.flat().reduce((sum, cell) => sum + cell, 0);
    let scoreToAdd = blockCells;

    const { clearedRows, clearedCols } = newGrid.clearFullLines();
    const currentMultiplier = multiplierRef.current;

    if (clearedRows > 0 || clearedCols > 0) {
      scoreToAdd += (clearedRows + clearedCols + currentMultiplier) * 9;
      setMultiplier(currentMultiplier + clearedRows + clearedCols);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      setMultiplier(1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    setScore((prev) => prev + scoreToAdd);
    setGrid(newGrid);

    setAvailableBlocks((prev) => {
      const remaining = prev.filter((b) => b !== block);
      return remaining.length === 0 ? blockGenerator.getNewBlockSet() : remaining;
    });
  };

  const handleDragStart = useCallback(
    (index, block, x, y) => {
      measureGrid();
      setDragging({ index, block, x, y });
      Animated.spring(dragScale, { toValue: 1.08, useNativeDriver: true, friction: 5 }).start();
      Haptics.selectionAsync().catch(() => {});
    },
    [measureGrid, dragScale]
  );

  const handleDragMove = useCallback((block, x, y) => {
    setDragging((prev) => (prev ? { ...prev, x, y } : prev));
    const { row, col } = targetCellFor(block, x, y, gridOriginRef.current, gridStateRef.current.size);
    const valid = gridStateRef.current.canPlaceBlock(block, row, col);
    setPreview({ row, col, valid });
  }, []);

  const handleDragEnd = useCallback(
    (block, x, y) => {
      const { row, col } = targetCellFor(block, x, y, gridOriginRef.current, gridStateRef.current.size);

      if (gridStateRef.current.canPlaceBlock(block, row, col)) {
        commitPlacement(block, row, col);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        showToast("Can't fit there");
      }

      Animated.spring(dragScale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
      setDragging(null);
      setPreview(null);
    },
    [dragScale]
  );

  const previewForCell = (row, col) => {
    if (!preview || !dragging) return null;
    const { block } = dragging;
    const r = row - preview.row;
    const c = col - preview.col;
    if (r < 0 || c < 0 || r >= block.shape.length || c >= block.shape[0].length) return null;
    if (block.shape[r][c] !== 1) return null;
    return { valid: preview.valid };
  };

  const step = CELL_SIZE + CELL_GAP;
  const ghostBlock = dragging?.block;
  const ghostLeft = dragging ? dragging.x - (ghostBlock.shape[0].length * step) / 2 : 0;
  const ghostTop = dragging ? dragging.y - DRAG_LIFT - (ghostBlock.shape.length * step) / 2 : 0;

  return (
    <ImageBackground
      source={require('../assets/images/background_main.png')}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={styles.container}>
        <Text style={styles.title}>Blockodoku</Text>

        <View style={styles.scorePanel}>
          <View style={styles.scoreRow}>
            <Text style={styles.score}>Score{'\n'}{score}</Text>
            <Animated.Text style={[styles.multiplier, { transform: [{ scale: multiplierAnim }] }]}>
              {multiplier}x
            </Animated.Text>
            <Text style={styles.highScore}>Best{'\n'}{highScore}</Text>
          </View>
        </View>

        <View
          ref={gridRef}
          onLayout={measureGrid}
          style={styles.gridPanel}
          collapsable={false}
        >
          {grid.matrix.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((cellValue, colIndex) => (
                <Cell
                  key={colIndex}
                  value={cellValue}
                  preview={previewForCell(rowIndex, colIndex)}
                />
              ))}
            </View>
          ))}
        </View>

        <Text style={styles.instructions}>
          {toast ? toast : 'Drag a block from the tray onto the board'}
        </Text>

        <View style={styles.blockTray}>
          {availableBlocks.map((block, index) => (
            <TrayBlockItem
              key={index}
              block={block}
              index={index}
              disabled={isGameOver}
              isBeingDragged={dragging?.index === index}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
            />
          ))}
        </View>

        {dragging && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ghost,
              { left: ghostLeft, top: ghostTop, transform: [{ scale: dragScale }] },
            ]}
          >
            <BlockShape
              shape={ghostBlock.shape}
              color={ghostBlock.color}
              cellSize={CELL_SIZE - CELL_GAP * 2}
              gap={CELL_GAP / 2}
            />
          </Animated.View>
        )}

        {isGameOver && (
          <Animated.View style={[styles.gameOverOverlay, { opacity: gameOverAnim }]}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.gameOverCard}>
              <Text style={styles.gameOverText}>Game Over</Text>
              <Text style={styles.finalScoreText}>Final Score: {score}</Text>
              {score >= highScore && score > 0 && (
                <Text style={styles.newBestText}>New Best!</Text>
              )}
              <TouchableOpacity onPress={handleRestart} style={styles.restartButton}>
                <Text style={styles.restartButtonText}>Play Again</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bg: { flex: 1, width: '100%', height: '100%' },

  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    textShadowColor: '#9900ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
    marginBottom: 10,
  },

  scorePanel: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },

  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  score: {
    fontSize: 14,
    color: COLORS.accentGlow,
    fontWeight: 'bold',
    textAlign: 'left',
    lineHeight: 18,
  },

  highScore: {
    fontSize: 14,
    color: COLORS.accentGlow,
    fontWeight: 'bold',
    textAlign: 'right',
    lineHeight: 18,
  },

  multiplier: {
    fontSize: 22,
    color: '#ffffff',
    fontWeight: 'bold',
    textShadowColor: COLORS.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },

  instructions: {
    marginTop: 14,
    fontSize: 14,
    color: '#eee',
    minHeight: 18,
  },

  row: { flexDirection: 'row' },

  gridPanel: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(10, 0, 25, 0.4)',
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
  },

  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: CELL_GAP / 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },

  emptyCell: { backgroundColor: 'rgba(255,255,255,0.08)' },

  previewCell: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },

  blockTray: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 16,
    marginTop: 10,
    minHeight: 110,
    borderRadius: 16,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
  },

  blockWrapper: {
    padding: 6,
    borderRadius: 10,
  },

  ghost: {
    position: 'absolute',
    zIndex: 50,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  gameOverOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
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

  gameOverText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: COLORS.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },

  finalScoreText: {
    fontSize: 22,
    color: 'white',
    marginTop: 10,
  },

  newBestText: {
    fontSize: 16,
    color: '#ffd54f',
    fontWeight: 'bold',
    marginTop: 6,
  },

  restartButton: {
    marginTop: 24,
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    elevation: 5,
  },

  restartButtonText: {
    color: '#1a0330',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default Blockoduko;