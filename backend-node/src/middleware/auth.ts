import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import prisma from "../config/prisma";
import { getSafeErrorMessage, getStatusCode } from "../utils/app-error";
import { logError } from "./error";

export interface AuthRequest extends Request {
  user?: any;
  cookies: {
    token?: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.email) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const user = await prisma.user.findUnique({
      where: { email: decoded.email },
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error: any) {
    logError(error, req);
    return res.status(getStatusCode(error)).json({
      message: getSafeErrorMessage(error),
    });
  }
};
