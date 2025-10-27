import dotenv from "dotenv";
dotenv.config();
import express, { Express, Request, Response } from "express";
import { connectDatabase } from "./config/database";
import cors from "cors";
import { routesClientApi } from "./routes/clients/index.route";
import bodyParser from "body-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import { setupSocket } from "./socket/users.socket";
// Use

connectDatabase();

const app: Express = express();
app.use(cors({ origin: "*" }));
app.use((req, res, next) => {
  if (req.is("multipart/form-data")) {
    return next();
  }
  bodyParser.json()(req, res, next);
});
const port: number | string = process.env.PORT || 5000;
app.use(express.json());
// app.use(express.raw({ type: "application/json" })); // Cho webhook

routesClientApi(app);
const server = createServer(app);
const io = new Server(server , { cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },});
global._io = io

setupSocket(io);

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
