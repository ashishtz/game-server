import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";
import basicAuth from "express-basic-auth";

/**
 * Import your Room files
 */
import { Game } from "./rooms/Game";

export default config({
  initializeGameServer: (gameServer) => {
    /**
     * Define your room handlers:
     */
    gameServer.define("tic_tac_toe", Game);
  },

  initializeExpress: (app) => {
    app.post("/create-room", (req, res) => {
      res.send("Define unique ID and setup a room");
    });

    app.post("/join-room", (req, res) => {
      res.send("Join a room with unique ID");
    });

    /**
     * Use @colyseus/playground
     * (It is not recommended to expose this route in a production environment)
     */
    if (process.env.NODE_ENV !== "production") {
      app.use("/", playground);
    }

    app.use(
      "/colyseus",
      process.env.NODE_ENV !== "production"
        ? monitor()
        : [
            basicAuth({
              users: { admin: process.env.REVIEW_PASS },
              challenge: true,
            }),
            monitor(),
          ]
    );
  },

  beforeListen: () => {
    /**
     * Before before gameServer.listen() is called.
     */
  },
});
