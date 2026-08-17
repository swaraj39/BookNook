import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "very-secret-key-that-should-be-at-least-thirty-two-characters-long";
const JWT_EXPIRATION: SignOptions["expiresIn"] = "24h"; // Equivalent to 86400000ms

export const generateToken = (payload: object, expiresIn: SignOptions["expiresIn"] = JWT_EXPIRATION): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export function verifyTokenDetailed(token: string): { payload: any; reason: "expired" | "invalid" | null } {
  try {
    return { payload: jwt.verify(token, JWT_SECRET), reason: null };
  } catch (error: any) {
    return {
      payload: null,
      reason: error?.name === "TokenExpiredError" ? "expired" : "invalid",
    };
  }
}
