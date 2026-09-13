export interface GameGuide {
  title: string;
  category: string;
  objective: string[];
  controls: { action: string; input: string }[];
  tips?: string[];
}

export const GAME_GUIDES: Record<string, GameGuide> = {
  SNAKE: {
    title: 'SNAKE',
    category: 'ARCADE',
    objective: [
      'Eat fruits and glowing apples to grow your snake and increase your score.',
      'Avoid running into walls or biting your own tail.',
      'Speed progressively increases as your score climbs!'
    ],
    controls: [
      { action: 'Move Up', input: '↑ / W / Swipe Up' },
      { action: 'Move Down', input: '↓ / S / Swipe Down' },
      { action: 'Move Left', input: '← / A / Swipe Left' },
      { action: 'Move Right', input: '→ / D / Swipe Right' },
      { action: 'Start / Pause', input: 'Space / Enter' },
    ],
    tips: [
      'Use the perimeter walls to coil when space is tight.',
      'Special golden fruits give bonus points before they vanish!'
    ]
  },
  'FLAPPY': {
    title: 'FLAPPY BIRD',
    category: 'ARCADE',
    objective: [
      'Navigate the retro flyer through narrow vertical pipe gaps.',
      'Each cleared pipe scores 1 point.',
      'Gravity is relentless—timing your flaps is key!'
    ],
    controls: [
      { action: 'Flap / Rise', input: 'Space / ↑ / W / Tap' },
      { action: 'Start / Pause', input: 'Enter' },
    ],
    tips: [
      'Tap gently in steady rhythm rather than panic-tapping.',
      'Aim for the center-lower portion of each upcoming gap.'
    ]
  },
  'DINO JUMP': {
    title: 'DINO JUMP',
    category: 'ACTION',
    objective: [
      'Sprint through the neon prehistoric wasteland for maximum distance.',
      'Leap over desert cacti and duck underneath flying pterodactyls.',
      'The desert accelerates smoothly as you survive longer!'
    ],
    controls: [
      { action: 'Jump', input: 'Space / ↑ / W / Tap' },
      { action: 'Duck', input: '↓ / S / Swipe Down' },
      { action: 'Start / Pause', input: 'Enter' },
    ],
    tips: [
      'Hold jump slightly longer for higher clearance over triple cacti.',
      'Duck immediately after landing if high birds are approaching.'
    ]
  },
  'TETRIS': {
    title: 'TETRIS',
    category: 'ARCADE',
    objective: [
      'Fit falling tetromino shapes to complete solid horizontal lines.',
      'Clearing lines awards points and clears space from reaching the top ceiling.',
      'Clear multiple lines at once (Tetris = 4 lines) for huge bonus scores!'
    ],
    controls: [
      { action: 'Move Left / Right', input: '← / → / A / D / Swipe' },
      { action: 'Rotate Piece', input: '↑ / W / Tap' },
      { action: 'Soft Drop', input: '↓ / S / Drag Down' },
      { action: 'Hard Drop', input: 'Space / Flick Down' },
      { action: 'Hold Piece', input: 'Enter / H / Hold Box' },
    ],
    tips: [
      'Keep your stack flat with an open column for the long I-bar.',
      'Use the ghost piece outline to aim drops precisely.'
    ]
  },
  '2048': {
    title: '2048',
    category: 'PUZZLE',
    objective: [
      'Slide number tiles across the 4x4 grid in 4 directions.',
      'When two tiles with the same number collide, they merge into one (2+2=4, 4+4=8...).',
      'Reach the legendary 2048 tile to win, or keep playing for high scores!'
    ],
    controls: [
      { action: 'Slide Grid', input: 'Swipe / Arrows / WASD' },
      { action: 'New Game', input: 'Reset Button' },
    ],
    tips: [
      'Keep your highest value tile locked in one specific corner (e.g. bottom-right).',
      'Build descending value snake chains around your primary corner.'
    ]
  },
  'TIC TAC TOE': {
    title: 'TIC TAC TOE',
    category: 'BOARD',
    objective: [
      'Place 3 of your marks in a horizontal, vertical, or diagonal row.',
      'Play against a friend locally (PvP) or battle the smart CPU AI (PvE).',
      'Test your tactical wits across Easy, Medium, and Unbeatable Hard modes!'
    ],
    controls: [
      { action: 'Place Mark', input: 'Click / Tap Grid Cell' },
      { action: 'Reset Board', input: '↺ Button' },
      { action: 'Switch Mode', input: 'PvP / PvE Tabs' },
    ],
    tips: [
      'Taking the center square gives the most offensive and defensive options.',
      'Setting up a double-fork trap guarantees victory on the next turn.'
    ]
  },
  'CONNECT 4': {
    title: 'CONNECT 4',
    category: 'BOARD',
    objective: [
      'Drop colored discs into the 7 vertical columns of the upright grid.',
      'Be the first player to form a horizontal, vertical, or diagonal line of 4 discs.',
      'Block your opponent before they complete their 4-in-a-row!'
    ],
    controls: [
      { action: 'Drop Disc', input: 'Tap / Click Column' },
      { action: 'Reset Match', input: '↺ Button' },
      { action: 'Mode / Diff', input: 'PvP / PvE Controls' },
    ],
    tips: [
      'Controlling the central column (Column 4) provides the most win combinations.',
      'Watch out for vertical drop traps where dropping a disc hands your opponent a win.'
    ]
  },
  'SUDOKU': {
    title: 'SUDOKU',
    category: 'PUZZLE',
    objective: [
      'Fill the 9x9 grid so every row, column, and 3x3 box contains digits 1 to 9.',
      'Each digit from 1-9 must appear exactly once in each sector without repetition.',
      'Complete the puzzle before making 3 mistakes!'
    ],
    controls: [
      { action: 'Select Cell', input: 'Tap / Click Grid Cell' },
      { action: 'Enter Digit', input: 'Keypad / 1-9 Keys' },
      { action: 'Erase / Delete', input: '0 / Backspace / Delete' },
      { action: 'Use Hint', input: '💡 Hint Button / H' },
      { action: 'Navigate Cells', input: 'Tab / Arrow Keys' },
    ],
    tips: [
      'Scan rows, columns, and 3x3 cages that already have 6+ numbers filled.',
      'Use pencil notes and process of elimination to spot unique candidates.'
    ]
  },
  'BLOCKUDOKU': {
    title: 'BLOCKUDOKU',
    category: 'PUZZLE',
    objective: [
      'Drag and place tetromino block shapes from the tray onto the 9x9 board.',
      'Fill complete 9-block horizontal rows, vertical columns, or 3x3 square zones.',
      'Keep space open on the board—if none of the 3 pieces fit, the game ends!'
    ],
    controls: [
      { action: 'Place Shape', input: 'Drag & Drop from Tray' },
      { action: 'Restart Game', input: 'Restart Button' },
    ],
    tips: [
      'Clear multiple sections simultaneously for massive combo point multipliers.',
      'Always reserve room for bulky 3x3 blocks and 5-length straight bars.'
    ]
  },
  'TOM & JERRY': {
    title: 'TOM & JERRY',
    category: 'ACTION',
    objective: [
      'Guide Jerry the mouse through the intricate mansion maze corridors.',
      'Collect all the delicious cheese wedges scattered across the rooms.',
      'Outsmart Tom and the patrol cats—avoid getting caught!'
    ],
    controls: [
      { action: 'Move Jerry', input: 'WASD / Arrows / Swipe' },
      { action: 'Start / Resume', input: '▶ Start Button' },
      { action: 'Pause Game', input: '⏸ Pause Button' },
      { action: 'Difficulty', input: 'Easy / Medium / Hard' },
    ],
    tips: [
      'Cats take predictable corner turns—lure them away then double back through side passages.',
      'Clear out isolated dead-end rooms early while cats are still distant.'
    ]
  }
};
