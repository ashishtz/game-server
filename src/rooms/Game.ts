import { Room, Client, Deferred } from "colyseus";
import { GameState, Player } from "./schema/GameState"; // Import the GameState schema

export type UserJoinedShape = {
  name: string;
};

export class Game extends Room<GameState> {
  maxClients: number = 2;

  onCreate(_options: any) {
    // Initialize the game state
    this.setState(new GameState());

    // When a player makes a move
    this.onMessage("make_move", (client, message) => {
      const { index } = message; // The board index where the player wants to make a move
      const playerSessionId = client.sessionId;

      // Ensure the game is not over
      if (this.state.gameOver) {
        client.send("error", { message: "Game is already over." });
        return;
      }

      // Ensure it's the current player's turn
      if (this.state.currentTurn !== playerSessionId) {
        client.send("error", { message: "It's not your turn." });
        return;
      }
      // If the current player is disconnected, assign turn to the current player
      if (!this.state.players.get(this.state.currentTurn)) {
        this.state.currentTurn = playerSessionId;
      }

      // Retrieve the player information using .get()
      const player = this.state.players.get(playerSessionId);

      // Make the move
      if (this.state.makeMove(index, playerSessionId)) {
        this.state.checkWinner(); // Check if the move caused a win or a draw

        if (!this.state.gameOver) {
          this.state.switchTurn(); // If the game is not over, switch the turn
        }
      } else {
        client.send("error", {
          message: "Invalid move. Try another position.",
        });
      }
    });

    this.onMessage("restart_game", (client) => {
      if (!this.state.winner) {
        client.send("error", { message: "The game is not completed yet." });
        return;
      }

      this.state.restart();
    });
  }

  onJoin(client: Client, options: UserJoinedShape) {
    if (this.clients.length > 2) {
      client.leave();
      return;
    }

    const list = [...this.state.players.values()];

    const symbol = list.some((rec) => rec.symbol === "X") ? "O" : "X";

    // Create a new player object and store it in the players map
    const newPlayer = new Player();
    newPlayer.name = options.name;
    newPlayer.sessionId = client.sessionId;
    newPlayer.connected = true;
    newPlayer.symbol = symbol;

    this.state.players.set(client.sessionId, newPlayer); // Use .set() to add player

    // If the first player is joining, set them as the current turn
    if (this.clients.length === 1) {
      this.state.currentTurn = client.sessionId;
    }

    console.log(`${options.name} joined`);
  }

  async onLeave(client: Client, consented: boolean) {
    // flag client as inactive for other users
    this.state.players.get(client.sessionId).connected = false;

    try {
      if (consented) {
        // Client intentionally left the game
        this.state.players.delete(client.sessionId);
        // Reset the score as a user already left the room
        this.state.draws = 0;
        this.state.players.forEach((player) => {
          player.won = 0;
        });
        this.state.restart();
        return;
      }
      // Allow disconnected client to reconnect into this room until 20 seconds
      await this.allowReconnection(client, 20);
      // client returned! let's re-activate it.
      this.state.players.get(client.sessionId).connected = true;
    } catch (e) {
      // 20 seconds expired. let's remove the client.
      this.state.players.delete(client.sessionId);

      // Reset the score  as a user already left the room
      this.state.draws = 0;
      this.state.players.forEach((player) => {
        player.won = 0;
      });
      this.state.restart();
    }
  }
}
