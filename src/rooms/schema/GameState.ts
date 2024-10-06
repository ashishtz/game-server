import { Schema, type, ArraySchema, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") name: string;
  @type("string") symbol: string;
  @type("number") won: number = 0;
  @type("string") sessionId: string; // Track player's sessionId
  @type("boolean") connected = true; // Tracks if the player is connected or disconnected

  setWon() {
    this.won += 1;
  }
}

export class GameState extends Schema {
  @type(["string"]) board = new ArraySchema<string>(
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    ""
  ); // 3x3 Tic-Tac-Toe board initialized with empty values

  @type("number") draws = 0;

  @type("string") currentTurn: string = ""; // Name of the current player whose turn it is
  @type("boolean") gameOver = false; // Tracks if the game is over
  @type("string") winner = ""; // Tracks the winner (name of the player)
  @type("string") winnerId = "";
  @type("boolean") restarted = false;

  @type({ map: Player }) players = new MapSchema<Player>(); // Track player details by sessionId

  // Check if a player move is valid
  isValidMove(index: number): boolean {
    return this.board[index] === ""; // Ensure the selected cell is empty
  }

  // Make a move on the board using the player's symbol
  makeMove(index: number, playerSessionId: string): boolean {
    const player = this.players.get(playerSessionId);
    if (this.isValidMove(index)) {
      this.board[index] = player.symbol; // Set the player's symbol on the board
      return true;
    }
    return false;
  }

  restart() {
    // Reset the board without reassigning a new array (to maintain reactivity)
    for (let i = 0; i < this.board.length; i++) {
      this.board[i] = "";
    }
  
    // Reset game-related state (but do it AFTER using winnerId in comparison)
    this.winner = "";
    this.gameOver = false;
  
    // Choose the player to start the next game (the player who didn't win the last round)
    const nonWinners = [...this.players.values()].filter(
      (player) => player.sessionId !== this.winnerId
    );
  
    // If there are non-winners (i.e., someone lost), pick the first non-winner to start
    if (nonWinners.length > 0) {
      this.currentTurn = nonWinners[0].sessionId;
    } else {
      // Otherwise, randomly select a starting player (e.g., if there was a draw or this is the first game)
      const randomPlayer = [...this.players.values()][
        Math.floor(Math.random() * this.players.size)
      ];
      this.currentTurn = randomPlayer.sessionId;
    }
  
    // Now reset the winnerId, since it is no longer needed in this round
    this.winnerId = "";
    this.restarted = true;
  
    // Optionally log the state after restart for debugging
    console.log("Game restarted. Current turn:", this.currentTurn);

    setTimeout(() => {
      this.restarted = false;
    }, 3000);
  }
   

  // Switch the currentTurn to the other player
  switchTurn() {
    const playerIds = Array.from(this.players.keys());
    const currentIndex = playerIds.indexOf(this.currentTurn);
    const nextIndex = (currentIndex + 1) % playerIds.length;
    this.currentTurn = this.players.get(playerIds[nextIndex]).sessionId;
  }

  // Check if there's a winning combination
  checkWinner() {
    const winPatterns = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    // Check for a winning pattern
    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (
        this.board[a] !== "" &&
        this.board[a] === this.board[b] &&
        this.board[a] === this.board[c]
      ) {
        // Find the player who owns the winning symbol
        for (const player of this.players.values()) {
          if (player.symbol === this.board[a]) {
            player.setWon();
            this.winner = player.name; // Set the winner's name
            this.winnerId = player.sessionId;
            this.gameOver = true; // Mark the game as over
            return;
          }
        }
      }
    }

    // Check for a draw (no empty spaces and no winner)
    if (!this.board.includes("") && this.winner === "") {
      this.gameOver = true; // Mark the game as over
      this.winner = "Draw"; // Set winner as "Draw" to indicate no winner
      this.draws += 1;
    }
  }
}
