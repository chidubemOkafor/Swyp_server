import express from "express";
import router from "./controllers/index";
import { initializeLogger } from "./middlewares/logger.middleware";
import cors from "cors"
import { Server } from "socket.io";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app)

export const origin = "*"

const io = new Server(httpServer, { 
  transports: ['websocket', 'polling'],
  cors: {
    origin,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin }))

app.use(express.json());
app.use(initializeLogger())

app.get("/ping", (req, res) => {
    res.send("pong");
  });
  
app.use("/api", router);

export { io, app, httpServer };
