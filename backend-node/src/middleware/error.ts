import { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { getSafeErrorMessage, getStatusCode } from "../utils/app-error";

// Ensure the log directory exists
const LOG_FILE = path.join(__dirname, "../../error-logged.txt");

export function logError(err: any, req?: Request) {
  try {
    const timestamp = new Date().toISOString();
    const stack = err?.stack || err?.message || "No stack trace";
    const requestLine = req ? `${req.method} ${req.originalUrl}` : "No request context";
    const logEntry = `[${timestamp}] ${requestLine}\n${stack}\n\n`;
    
    // Append to file (creates file if it doesn't exist)
    fs.appendFileSync(LOG_FILE, logEntry);
    console.log(`Error logged to ${LOG_FILE}`);
  } catch (logError) {
    // If logging fails, at least log to console
    console.error("Failed to write to log file:", logError);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the full error details to file
  logError(err, req);

  const status = err.status || err.statusCode || getStatusCode(err) || 500;
  const message = getSafeErrorMessage(err);

  res.status(status).json({ message });
};
