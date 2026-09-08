package backend;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * ============================================================================
 * GAME ON - BACKEND OOP ARCHITECTURE
 * ============================================================================
 * Demonstrating the 4 Pillars of Object-Oriented Programming:
 * 1. Abstraction: Playable, Scorable interfaces and abstract Game base class.
 * 2. Encapsulation: Private state with accessors, mutators, and business validation.
 * 3. Inheritance: Game -> SinglePlayerGame / MultiPlayerGame -> Concrete Games.
 * 4. Polymorphism: Polymorphic turn execution, lifecycle, and score recording.
 * 
 * Design Patterns Applied:
 * - Factory Pattern: GameFactory for instantiating games dynamically.
 * - Value Object: Score.
 * - Manager / Facade: Server / GameServer managing sessions and leaderboard.
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// ENUMS
// ----------------------------------------------------------------------------
enum GameType {
    GAME_2048("2048"),
    SNAKE("Snake"),
    TICTACTOE("Tic-Tac-Toe"),
    CONNECT4("Connect 4"),
    TETRIS("Tetris"),
    FLAPPY_BIRD("Flappy Bird"),
    SUDOKU("Sudoku"),
    DINO_JUMP("Dino Jump");

    private final String displayName;

    GameType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}

enum GameStatus {
    INITIALIZED,
    RUNNING,
    PAUSED,
    GAME_OVER
}

// ----------------------------------------------------------------------------
// INTERFACES (ABSTRACTION)
// ----------------------------------------------------------------------------
interface Playable {
    void start();
    void pause();
    void resume();
    void end();
    boolean isGameOver();
}

interface Scorable {
    int getScore();
    void addScore(int points);
    void resetScore();
}

// ----------------------------------------------------------------------------
// MODELS & VALUE OBJECTS (ENCAPSULATION)
// ----------------------------------------------------------------------------
class Score implements Comparable<Score> {
    private final String playerId;
    private final String playerName;
    private final GameType gameType;
    private final int value;
    private final LocalDateTime timestamp;

    public Score(String playerId, String playerName, GameType gameType, int value) {
        this.playerId = Objects.requireNonNull(playerId, "Player ID cannot be null");
        this.playerName = Objects.requireNonNull(playerName, "Player name cannot be null");
        this.gameType = Objects.requireNonNull(gameType, "Game type cannot be null");
        this.value = Math.max(0, value);
        this.timestamp = LocalDateTime.now();
    }

    public String getPlayerId() { return playerId; }
    public String getPlayerName() { return playerName; }
    public GameType getGameType() { return gameType; }
    public int getValue() { return value; }
    public LocalDateTime getTimestamp() { return timestamp; }

    @Override
    public int compareTo(Score other) {
        // Descending order for leaderboard rankings
        return Integer.compare(other.value, this.value);
    }

    @Override
    public String toString() {
        return String.format("[%s] %s: %d pts (%s)", 
            gameType.getDisplayName(), playerName, value, 
            timestamp.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));
    }
}

class Player {
    private final String id;
    private String name;
    private String email;
    private final Map<GameType, Integer> highScores;
    private int totalGamesPlayed;

    public Player(String id, String name, String email) {
        if (id == null || id.trim().isEmpty()) {
            throw new IllegalArgumentException("Player ID must not be empty");
        }
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Player name must not be empty");
        }
        this.id = id;
        this.name = name;
        this.email = email;
        this.highScores = new EnumMap<>(GameType.class);
        this.totalGamesPlayed = 0;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) {
        if (name != null && !name.trim().isEmpty()) {
            this.name = name;
        }
    }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public int getTotalGamesPlayed() { return totalGamesPlayed; }

    public void incrementGamesPlayed() {
        this.totalGamesPlayed++;
    }

    public int getHighScore(GameType gameType) {
        return highScores.getOrDefault(gameType, 0);
    }

    public boolean updateHighScore(GameType gameType, int score) {
        int current = getHighScore(gameType);
        if (score > current) {
            highScores.put(gameType, score);
            return true;
        }
        return false;
    }

    public Map<GameType, Integer> getHighScores() {
        return Collections.unmodifiableMap(highScores);
    }

    @Override
    public String toString() {
        return String.format("Player[id=%s, name=%s, gamesPlayed=%d]", id, name, totalGamesPlayed);
    }
}

class Leaderboard {
    private final Map<GameType, List<Score>> scoresByGame;
    private static final int MAX_ENTRIES_PER_GAME = 10;

    public Leaderboard() {
        this.scoresByGame = new EnumMap<>(GameType.class);
        for (GameType type : GameType.values()) {
            scoresByGame.put(type, new ArrayList<>());
        }
    }

    public synchronized void recordScore(Score score) {
        List<Score> scores = scoresByGame.get(score.getGameType());
        scores.add(score);
        Collections.sort(scores);
        if (scores.size() > MAX_ENTRIES_PER_GAME) {
            scores.remove(scores.size() - 1);
        }
    }

    public synchronized List<Score> getTopScores(GameType gameType) {
        return Collections.unmodifiableList(new ArrayList<>(scoresByGame.get(gameType)));
    }

    public void displayLeaderboard(GameType gameType) {
        System.out.println("=== LEADERBOARD: " + gameType.getDisplayName() + " ===");
        List<Score> scores = getTopScores(gameType);
        if (scores.isEmpty()) {
            System.out.println("  (No scores recorded yet)");
        } else {
            for (int i = 0; i < scores.size(); i++) {
                System.out.printf("  #%d. %s%n", i + 1, scores.get(i));
            }
        }
        System.out.println();
    }
}

// ----------------------------------------------------------------------------
// ABSTRACT BASE CLASS (INHERITANCE & POLYMORPHISM)
// ----------------------------------------------------------------------------
abstract class Game implements Playable, Scorable {
    private final String gameId;
    private final GameType gameType;
    private GameStatus status;
    private int score;
    private final LocalDateTime createdAt;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;

    public Game(GameType gameType) {
        this.gameId = UUID.randomUUID().toString().substring(0, 8);
        this.gameType = Objects.requireNonNull(gameType, "GameType cannot be null");
        this.status = GameStatus.INITIALIZED;
        this.score = 0;
        this.createdAt = LocalDateTime.now();
    }

    public String getGameId() { return gameId; }
    public GameType getGameType() { return gameType; }
    public GameStatus getStatus() { return status; }
    protected void setStatus(GameStatus status) { this.status = status; }

    @Override
    public int getScore() { return score; }

    @Override
    public void addScore(int points) {
        if (points > 0) {
            this.score += points;
        }
    }

    @Override
    public void resetScore() {
        this.score = 0;
    }

    @Override
    public void start() {
        if (status == GameStatus.INITIALIZED || status == GameStatus.GAME_OVER) {
            this.status = GameStatus.RUNNING;
            this.startedAt = LocalDateTime.now();
            initializeGame();
            System.out.printf("[%s #%s] Game started!%n", gameType.getDisplayName(), gameId);
        }
    }

    @Override
    public void pause() {
        if (status == GameStatus.RUNNING) {
            this.status = GameStatus.PAUSED;
            System.out.printf("[%s #%s] Game paused.%n", gameType.getDisplayName(), gameId);
        }
    }

    @Override
    public void resume() {
        if (status == GameStatus.PAUSED) {
            this.status = GameStatus.RUNNING;
            System.out.printf("[%s #%s] Game resumed.%n", gameType.getDisplayName(), gameId);
        }
    }

    @Override
    public void end() {
        if (status != GameStatus.GAME_OVER) {
            this.status = GameStatus.GAME_OVER;
            this.endedAt = LocalDateTime.now();
            onGameOver();
            System.out.printf("[%s #%s] Game ended! Final Score: %d%n", 
                gameType.getDisplayName(), gameId, score);
        }
    }

    @Override
    public boolean isGameOver() {
        return status == GameStatus.GAME_OVER;
    }

    // Template methods for polymorphic subclass customization
    protected abstract void initializeGame();
    protected abstract void onGameOver();
    public abstract void printGameState();
    public abstract boolean playTurn(Object... turnArgs);
}

// ----------------------------------------------------------------------------
// SINGLE-PLAYER GAME ABSTRACTION
// ----------------------------------------------------------------------------
abstract class SinglePlayerGame extends Game {
    private final Player player;

    public SinglePlayerGame(GameType gameType, Player player) {
        super(gameType);
        this.player = Objects.requireNonNull(player, "Player cannot be null");
    }

    public Player getPlayer() {
        return player;
    }

    @Override
    protected void onGameOver() {
        player.incrementGamesPlayed();
        boolean isNewHigh = player.updateHighScore(getGameType(), getScore());
        if (isNewHigh) {
            System.out.printf("  >> NEW HIGH SCORE for %s in %s: %d!%n", 
                player.getName(), getGameType().getDisplayName(), getScore());
        }
    }
}

// ----------------------------------------------------------------------------
// MULTI-PLAYER GAME ABSTRACTION
// ----------------------------------------------------------------------------
abstract class MultiPlayerGame extends Game {
    private final List<Player> players;
    private int currentTurnIndex;
    private Player winner;

    public MultiPlayerGame(GameType gameType, List<Player> players, int minPlayers, int maxPlayers) {
        super(gameType);
        if (players == null || players.size() < minPlayers || players.size() > maxPlayers) {
            throw new IllegalArgumentException(String.format(
                "Game %s requires between %d and %d players.", 
                gameType.getDisplayName(), minPlayers, maxPlayers));
        }
        this.players = new ArrayList<>(players);
        this.currentTurnIndex = 0;
        this.winner = null;
    }

    public List<Player> getPlayers() {
        return Collections.unmodifiableList(players);
    }

    public Player getCurrentPlayer() {
        return players.get(currentTurnIndex);
    }

    public void nextTurn() {
        currentTurnIndex = (currentTurnIndex + 1) % players.size();
    }

    public Player getWinner() {
        return winner;
    }

    protected void setWinner(Player winner) {
        this.winner = winner;
    }

    @Override
    protected void onGameOver() {
        for (Player p : players) {
            p.incrementGamesPlayed();
        }
        if (winner != null) {
            System.out.printf("  >> VICTORY: %s wins %s!%n", 
                winner.getName(), getGameType().getDisplayName());
            winner.updateHighScore(getGameType(), getScore());
        } else {
            System.out.printf("  >> MATCH DRAW in %s!%n", getGameType().getDisplayName());
        }
    }
}

// ----------------------------------------------------------------------------
// CONCRETE IMPLEMENTATIONS: SINGLE-PLAYER GAMES
// ----------------------------------------------------------------------------

/**
 * Game 2048: 4x4 Grid tile-merging game.
 */
class Game2048 extends SinglePlayerGame {
    private int[][] board;
    private static final int SIZE = 4;
    private int maxTile;

    public Game2048(Player player) {
        super(GameType.GAME_2048, player);
    }

    @Override
    protected void initializeGame() {
        this.board = new int[SIZE][SIZE];
        this.maxTile = 2;
        spawnRandomTile();
        spawnRandomTile();
    }

    private void spawnRandomTile() {
        List<int[]> emptyCells = new ArrayList<>();
        for (int r = 0; r < SIZE; r++) {
            for (int c = 0; c < SIZE; c++) {
                if (board[r][c] == 0) emptyCells.add(new int[]{r, c});
            }
        }
        if (!emptyCells.isEmpty()) {
            int[] cell = emptyCells.get(new Random().nextInt(emptyCells.size()));
            board[cell[0]][cell[1]] = (Math.random() < 0.9) ? 2 : 4;
        }
    }

    @Override
    public boolean playTurn(Object... turnArgs) {
        if (isGameOver() || turnArgs.length == 0) return false;
        String direction = turnArgs[0].toString().toUpperCase();
        System.out.printf("[%s] Player %s swiped %s%n", 
            getGameType().getDisplayName(), getPlayer().getName(), direction);

        int pointsGained = 16;
        addScore(pointsGained);
        maxTile = Math.max(maxTile, maxTile * 2);
        spawnRandomTile();

        if (maxTile >= 2048 || getScore() >= 2048) {
            System.out.println("  Reached 2048 milestone!");
            end();
        }
        return true;
    }

    @Override
    public void printGameState() {
        System.out.println("  Current 2048 Board (Max Tile: " + maxTile + ", Score: " + getScore() + "):");
        for (int r = 0; r < SIZE; r++) {
            System.out.print("   ");
            for (int c = 0; c < SIZE; c++) {
                System.out.printf("%5d", board[r][c]);
            }
            System.out.println();
        }
    }
}

/**
 * Snake Game: Grid-based food eating and length expansion.
 */
class SnakeGame extends SinglePlayerGame {
    private int snakeLength;
    private int foodX, foodY;
    private final int gridWidth = 20;
    private final int gridHeight = 20;

    public SnakeGame(Player player) {
        super(GameType.SNAKE, player);
    }

    @Override
    protected void initializeGame() {
        this.snakeLength = 3;
        spawnFood();
    }

    private void spawnFood() {
        Random rand = new Random();
        this.foodX = rand.nextInt(gridWidth);
        this.foodY = rand.nextInt(gridHeight);
    }

    @Override
    public boolean playTurn(Object... turnArgs) {
        if (isGameOver()) return false;
        String direction = (turnArgs.length > 0) ? turnArgs[0].toString() : "UP";
        System.out.printf("[%s] Snake moved %s. Ate food at (%d, %d)!%n", 
            getGameType().getDisplayName(), direction, foodX, foodY);

        snakeLength++;
        addScore(10);
        spawnFood();
        return true;
    }

    @Override
    public void printGameState() {
        System.out.printf("  Snake Game State: Length=%d, Score=%d, Next Food=(%d,%d)%n", 
            snakeLength, getScore(), foodX, foodY);
    }
}

// ----------------------------------------------------------------------------
// CONCRETE IMPLEMENTATIONS: MULTIPLAYER GAMES
// ----------------------------------------------------------------------------

/**
 * Tic-Tac-Toe: 2 Player 3x3 turn-based board game.
 */
class TicTacToeGame extends MultiPlayerGame {
    private char[][] board;
    private int movesCount;

    public TicTacToeGame(Player player1, Player player2) {
        super(GameType.TICTACTOE, Arrays.asList(player1, player2), 2, 2);
    }

    @Override
    protected void initializeGame() {
        this.board = new char[3][3];
        for (int r = 0; r < 3; r++) {
            Arrays.fill(board[r], '-');
        }
        this.movesCount = 0;
    }

    @Override
    public boolean playTurn(Object... turnArgs) {
        if (isGameOver() || turnArgs.length < 2) return false;
        int row = (int) turnArgs[0];
        int col = (int) turnArgs[1];

        if (row < 0 || row >= 3 || col < 0 || col >= 3 || board[row][col] != '-') {
            System.out.println("  Invalid move!");
            return false;
        }

        Player current = getCurrentPlayer();
        char symbol = (current == getPlayers().get(0)) ? 'X' : 'O';
        board[row][col] = symbol;
        movesCount++;

        System.out.printf("[%s] %s placed '%c' at (%d, %d)%n", 
            getGameType().getDisplayName(), current.getName(), symbol, row, col);

        if (checkWin(symbol)) {
            addScore(100);
            setWinner(current);
            end();
            return true;
        }

        if (movesCount == 9) {
            end(); // Draw
            return true;
        }

        nextTurn();
        return true;
    }

    private boolean checkWin(char s) {
        for (int i = 0; i < 3; i++) {
            if (board[i][0] == s && board[i][1] == s && board[i][2] == s) return true;
            if (board[0][i] == s && board[1][i] == s && board[2][i] == s) return true;
        }
        if (board[0][0] == s && board[1][1] == s && board[2][2] == s) return true;
        return board[0][2] == s && board[1][1] == s && board[2][0] == s;
    }

    @Override
    public void printGameState() {
        System.out.println("  Tic-Tac-Toe Board:");
        for (int r = 0; r < 3; r++) {
            System.out.printf("    %c | %c | %c%n", board[r][0], board[r][1], board[r][2]);
        }
    }
}

/**
 * Connect 4: 2 Player 6x7 vertical dropping board game.
 */
class Connect4Game extends MultiPlayerGame {
    private char[][] grid;
    private static final int ROWS = 6;
    private static final int COLS = 7;

    public Connect4Game(Player player1, Player player2) {
        super(GameType.CONNECT4, Arrays.asList(player1, player2), 2, 2);
    }

    @Override
    protected void initializeGame() {
        this.grid = new char[ROWS][COLS];
        for (int r = 0; r < ROWS; r++) {
            Arrays.fill(grid[r], '.');
        }
    }

    @Override
    public boolean playTurn(Object... turnArgs) {
        if (isGameOver() || turnArgs.length < 1) return false;
        int col = (int) turnArgs[0];
        if (col < 0 || col >= COLS) return false;

        Player current = getCurrentPlayer();
        char token = (current == getPlayers().get(0)) ? 'R' : 'Y';

        // Drop token to lowest open row
        for (int r = ROWS - 1; r >= 0; r--) {
            if (grid[r][col] == '.') {
                grid[r][col] = token;
                System.out.printf("[%s] %s dropped token into col %d%n", 
                    getGameType().getDisplayName(), current.getName(), col);
                addScore(25);
                nextTurn();
                return true;
            }
        }
        return false;
    }

    @Override
    public void printGameState() {
        System.out.println("  Connect 4 Grid (Top to Bottom):");
        for (int r = 0; r < ROWS; r++) {
            System.out.print("    ");
            for (int c = 0; c < COLS; c++) {
                System.out.print(grid[r][c] + " ");
            }
            System.out.println();
        }
    }
}

// ----------------------------------------------------------------------------
// FACTORY PATTERN (CREATIONAL DESIGN PATTERN)
// ----------------------------------------------------------------------------
class GameFactory {
    public static SinglePlayerGame createSinglePlayerGame(GameType type, Player player) {
        switch (type) {
            case GAME_2048:
                return new Game2048(player);
            case SNAKE:
                return new SnakeGame(player);
            default:
                throw new UnsupportedOperationException("Single-player game not implemented for: " + type);
        }
    }

    public static MultiPlayerGame createMultiPlayerGame(GameType type, Player p1, Player p2) {
        switch (type) {
            case TICTACTOE:
                return new TicTacToeGame(p1, p2);
            case CONNECT4:
                return new Connect4Game(p1, p2);
            default:
                throw new UnsupportedOperationException("Multi-player game not implemented for: " + type);
        }
    }
}

// ----------------------------------------------------------------------------
// SERVER / GAME MANAGER (FACADE & ORCHESTRATOR)
// ----------------------------------------------------------------------------
public class server {
    private final Map<String, Player> players;
    private final Map<String, Game> activeSessions;
    private final Leaderboard leaderboard;

    public server() {
        this.players = new HashMap<>();
        this.activeSessions = new HashMap<>();
        this.leaderboard = new Leaderboard();
    }

    public void registerPlayer(Player player) {
        players.put(player.getId(), player);
        System.out.printf("[Server] Registered player: %s (%s)%n", player.getName(), player.getId());
    }

    public Player getPlayer(String id) {
        return players.get(id);
    }

    public void registerActiveGame(Game game) {
        activeSessions.put(game.getGameId(), game);
    }

    public void completeGame(Game game) {
        if (!game.isGameOver()) {
            game.end();
        }
        // Save score to leaderboard
        if (game instanceof SinglePlayerGame) {
            SinglePlayerGame sp = (SinglePlayerGame) game;
            Score score = new Score(sp.getPlayer().getId(), sp.getPlayer().getName(), sp.getGameType(), sp.getScore());
            leaderboard.recordScore(score);
        } else if (game instanceof MultiPlayerGame) {
            MultiPlayerGame mp = (MultiPlayerGame) game;
            if (mp.getWinner() != null) {
                Score score = new Score(mp.getWinner().getId(), mp.getWinner().getName(), mp.getGameType(), mp.getScore());
                leaderboard.recordScore(score);
            }
        }
        activeSessions.remove(game.getGameId());
    }

    public Leaderboard getLeaderboard() {
        return leaderboard;
    }

    // ------------------------------------------------------------------------
    // MAIN DEMO (OOP ARCHITECTURE IN ACTION)
    // ------------------------------------------------------------------------
    public static void main(String[] args) {
        System.out.println("=================================================");
        System.out.println("       GAME ON - OOP BACKEND SERVER DEMO        ");
        System.out.println("=================================================\n");

        server gameServer = new server();

        // 1. Encapsulation: Registering Players
        Player alice = new Player("p1", "Alice", "alice@gameon.app");
        Player bob = new Player("p2", "Bob", "bob@gameon.app");
        gameServer.registerPlayer(alice);
        gameServer.registerPlayer(bob);
        System.out.println();

        // 2. Factory Pattern & Inheritance: Single-player Game (2048)
        System.out.println(">>> 1. DEMO: SINGLE-PLAYER (2048) <<<");
        Game game2048 = GameFactory.createSinglePlayerGame(GameType.GAME_2048, alice);
        gameServer.registerActiveGame(game2048);

        // Polymorphic lifecycle methods
        game2048.start();
        game2048.printGameState();
        game2048.playTurn("UP");
        game2048.playTurn("RIGHT");
        game2048.addScore(256);
        game2048.printGameState();
        gameServer.completeGame(game2048);
        System.out.println();

        // 3. Factory Pattern & Inheritance: Single-player Game (Snake)
        System.out.println(">>> 2. DEMO: SINGLE-PLAYER (SNAKE) <<<");
        Game snake = GameFactory.createSinglePlayerGame(GameType.SNAKE, alice);
        gameServer.registerActiveGame(snake);
        snake.start();
        snake.playTurn("RIGHT");
        snake.playTurn("DOWN");
        snake.printGameState();
        gameServer.completeGame(snake);
        System.out.println();

        // 4. Multiplayer Game: Polymorphism & Turn Rotation (Tic-Tac-Toe)
        System.out.println(">>> 3. DEMO: MULTIPLAYER (TIC-TAC-TOE) <<<");
        Game ttt = GameFactory.createMultiPlayerGame(GameType.TICTACTOE, alice, bob);
        gameServer.registerActiveGame(ttt);
        ttt.start();
        ttt.printGameState();

        // Turns: Alice (X), Bob (O)
        ttt.playTurn(0, 0); // Alice
        ttt.playTurn(1, 0); // Bob
        ttt.playTurn(0, 1); // Alice
        ttt.playTurn(1, 1); // Bob
        ttt.playTurn(0, 2); // Alice completes row 0 -> Wins!
        ttt.printGameState();
        gameServer.completeGame(ttt);
        System.out.println();

        // 5. Multiplayer Game: Connect 4
        System.out.println(">>> 4. DEMO: MULTIPLAYER (CONNECT 4) <<<");
        Game c4 = GameFactory.createMultiPlayerGame(GameType.CONNECT4, alice, bob);
        gameServer.registerActiveGame(c4);
        c4.start();
        c4.playTurn(3);
        c4.playTurn(3);
        c4.playTurn(4);
        c4.printGameState();
        gameServer.completeGame(c4);
        System.out.println();

        // 6. Abstraction & Encapsulation: Display Leaderboards & Stats
        System.out.println(">>> 5. DEMO: LEADERBOARDS & PLAYER STATS <<<");
        gameServer.getLeaderboard().displayLeaderboard(GameType.GAME_2048);
        gameServer.getLeaderboard().displayLeaderboard(GameType.SNAKE);
        gameServer.getLeaderboard().displayLeaderboard(GameType.TICTACTOE);

        System.out.println("Player Summary:");
        System.out.printf("  %s -> High Scores: %s, Total Games: %d%n", 
            alice.getName(), alice.getHighScores(), alice.getTotalGamesPlayed());
        System.out.printf("  %s -> High Scores: %s, Total Games: %d%n", 
            bob.getName(), bob.getHighScores(), bob.getTotalGamesPlayed());

        System.out.println("\n=================================================");
        System.out.println("       OOP DEMO COMPLETED SUCCESSFULLY           ");
        System.out.println("=================================================");
    }
}

