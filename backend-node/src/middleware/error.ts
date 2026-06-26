import { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";

// Ensure the log directory exists
const LOG_FILE = path.join(__dirname, "../../error-logged.txt");

function logError(err: any) {
  try {
    const timestamp = new Date().toISOString();
    const stack = err.stack || err.message || "No stack trace";
    const logEntry = `[${timestamp}] ${stack}\n\n`;
    
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
  logError(err);
  
  const status = err.status || err.statusCode || 500;
  let message = err.message || "Something went wrong";
  
  // Check if the error looks like a raw system crash, Prisma string, or database trace
  const isRawDatabaseError = message.includes("Prisma") || message.includes("SELECT") || message.includes("database") || message.includes("uid");

  if (status >= 500 || isRawDatabaseError) {
    // Completely mask any bizarre long system strings from leaving the server
    message = "The server dropped its giant stack of books. Our tech librarians are currently cleaning up the mess.";
  }
  
  res.status(status).json({ message });
};