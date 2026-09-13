# GameOn 🕹️ — Retro Arcade Portal

A clean, modern retro arcade web and mobile app featuring **10 classic games** in one place. Play directly in your browser on PC/Mac, or on iOS and Android phones and tablets!

Built with **Expo**, **React Native**, and **TypeScript**, styled with retro arcade aesthetics and buttery-smooth 60 FPS animations.

---

## 🎮 Included Games

| # | Game | Description | Quick Controls |
|---|---|---|---|
| 1 | 🐍 **Snake** | Eat food, grow longer, and avoid crashing into your own tail or walls. | `Arrow Keys` / `WASD` / Swipe |
| 2 | 🦖 **Dino Jump** | Run through the desert, jump over cacti, and bow/duck under flying birds. | `Space` / `↑` to Jump, `↓` to Duck |
| 3 | 🐦 **Flappy Bird** | Flap your wings to glide safely through ancient enchanted tree hollows. | `Space` / `↑` / Tap to Flap |
| 4 | 🧱 **Tetris** | Rotate and drop falling blocks to clear complete horizontal lines. | `← / →` Move, `↑` Rotate, `Space` Drop, `Shift` Hold |
| 5 | 🔢 **2048** | Slide and combine matching numbered tiles until you reach 2048! | `Arrow Keys` / `WASD` / Swipe |
| 6 | 🧀 **Tom & Jerry** | Guide Jerry through the mansion maze to eat cheese while dodging Tom cats. | `Arrow Keys` / `WASD` / Swipe |
| 7 | 🔴 **Connect 4** | Take turns dropping discs to connect four of your color in a row. | Tap column or click slot |
| 8 | 🧩 **Blockoduko** | Place polyomino block pieces on a 9×9 board to clear rows, cols & 3×3 squares. | Drag and drop pieces |
| 9 | ⭕ **Tic Tac Toe** | The classic 3×3 strategy duel — match 3 in a row to win! | Tap empty cell |
| 10 | 🔢 **Sudoku** | Fill the 9×9 puzzle grid so every row, column, and 3×3 box contains numbers 1–9. | Tap cell, choose number pad |

---

## ✨ Features

- 🕹️ **10 Full Arcade Games**: All your retro favorites in a single app.
- 📖 **In-Game How To Play Guides**: Tap the **`[? GUIDE]`** button in the header of any game to see complete rules, controls, and pro tips.
- 📱 **Play Anywhere**: Automatically adapts to Desktop monitors, Laptops, Tablets, and Mobile phones (both touch and keyboard supported).
- 🏆 **High Score Saving**: Automatically saves your best scores locally on your device.
- ⚡ **Smooth 60 FPS Gameplay**: Powered by React Native Reanimated for responsive, lag-free gameplay on 60Hz and 120Hz screens.
- 🎨 **Retro Pixel Aesthetics**: Classic arcade fonts, glowing neon borders, and atmospheric backgrounds.
- 📳 **Haptic Feedback**: Satisfying vibration feedback on mobile when eating, jumping, scoring, or crashing.

---

## 🚀 Quick Start Guide

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (version 18 or newer) installed on your computer.

### Step 1: Install Dependencies
Open your terminal inside the project folder and run:
```bash
npm install
```

### Step 2: Start the App
To open the games in your web browser:
```bash
npx expo start --web
```
*(Or run `npm run web`)*

### Step 3: Play on Your Phone (Optional)
1. Install the free **Expo Go** app from Google Play Store or Apple App Store.
2. Run `npx expo start` in your terminal.
3. Scan the QR code with your phone camera (iOS) or Expo Go app (Android).

---

## ⌨️ Universal Keyboard Controls

| Key | Action |
|---|---|
| **Arrow Keys** or **W / A / S / D** | Move / Steer / Navigate |
| **Spacebar** | Jump / Flap / Hard Drop / Action |
| **Enter** | Start Game / Resume / Restart / Hold Piece |
| **Escape** or **P** | Pause Game |

*(All games also support direct touch, tap, and swipe gestures on mobile and touchscreens!)*

---

## 📂 Project Structure

```
GameOn/
├── app/                      # Game screens & page routes (Expo Router)
│   ├── index.tsx             # Main Arcade Lobby (Game selection menu)
│   ├── snake.tsx             # Snake game
│   ├── dinojump.tsx          # Dino Jump game
│   ├── flappybird.tsx        # Flappy Bird game
│   ├── tetris.tsx            # Tetris game
│   ├── game2048.tsx          # 2048 game
│   ├── tomandjerry.tsx       # Tom & Jerry game
│   ├── connect4.tsx          # Connect 4 game
│   ├── blockoduko.tsx        # Blockoduko game
│   ├── tictactoe.tsx         # Tic Tac Toe game
│   └── sudoku.tsx            # Sudoku game
│
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── GameHeader.tsx    # Header with title, score, lobby & [? GUIDE] button
│   │   ├── HowToPlayModal.tsx # Universal popup guide for all games
│   │   ├── GameOverModal.tsx # End-game score card and restart dialog
│   │   ├── CyberBackground.tsx # Atmospheric animated background
│   │   └── PremiumGameCard.tsx # Arcade cabinet card in lobby
│   │
│   ├── engines/              # Independent game logic & physics engines
│   ├── theme/                # Colors, fonts, and retro arcade styling
│   ├── utils/
│   │   └── gameGuides.ts     # Rules, objectives, and pro tips for all 10 games
│   └── hooks/                # Keyboard & responsive layout hooks
```

---

## 🛠️ Built With

- **[Expo](https://expo.dev/)** & **[React Native](https://reactnative.dev/)** — Cross-platform web and mobile foundation
- **[Expo Router](https://docs.expo.dev/router/introduction/)** — Fast, URL-friendly screen navigation
- **[React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)** — Silky smooth 60 FPS animations
- **[Google Fonts (Press Start 2P)](https://fonts.google.com/specimen/Press+Start+2P)** — Retro 8-bit arcade typography
- **[AsyncStorage](https://react-native-async-storage.github.io/async-storage/)** — Local high score persistence
- **TypeScript** — Reliable, type-safe codebase

---

