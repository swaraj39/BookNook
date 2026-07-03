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

  function extractCookie(cookieHeader: string | undefined, name: string): string | null {
    if (!cookieHeader) return null;
    for (const pair of cookieHeader.split(";")) {
      const idx = pair.indexOf("=");
      if (idx === -1) continue;
      const key = pair.substring(0, idx).trim();
      const val = pair.substring(idx + 1).trim();
      if (key === name) return val;
    }
    return null;
  }

  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token;
      if (!token) {
        token = extractCookie(socket.handshake.headers.cookie, "token");
      }
      if (!token) {
        return next(new Error("Authentication required"));
      }
      const decoded = verifyToken(token);
      if (!decoded?.email) {
        console.warn("[Socket] Invalid token from", socket.handshake.headers.cookie ? "cookie" : "auth");
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
