import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { Server as HttpServer } from "http";
import { verifyToken } from "../utils/jwt";
import prisma from "../config/prisma";

const REDIS_URL = process.env.REDIS_URL;

let io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HttpServer, allowedOrigins: string[]): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Authentication required"));
      }
      const decoded = verifyToken(token);
      if (!decoded?.email) {
        return next(new Error("Invalid or expired token"));
      }
      const user = await prisma.user.findUnique({
        where: { email: decoded.email },
      });
      if (!user) {
        return next(new Error("User not found"));
      }
      socket.data.userId = user.id;
      socket.data.user = user;
      next();
    } catch {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] User ${socket.data.userId} connected (${socket.id})`);

    socket.on("disconnect", (reason) => {
      console.log(`[Socket] User ${socket.data.userId} disconnected (${reason})`);
    });
  });

  if (REDIS_URL) {
    try {
      const pubClient = new Redis(REDIS_URL);
      const subClient = pubClient.duplicate();
      io.adapter(createAdapter(pubClient, subClient));
      console.log("[Socket] Redis adapter initialized for multi-instance");
    } catch (err) {
      console.warn("[Socket] Redis adapter failed, running in single-instance mode");
    }
  }

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function emitToAll(event: string, data: Record<string, unknown>): void {
  if (io) {
    io.emit(event, data);
  }
}
