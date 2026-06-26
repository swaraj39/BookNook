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
  // Log the full error details to file
  logError(err);

  // Determine status code
  const status = err.status || err.statusCode || 500;
  let message = err.message || "Something went wrong";

  // For 500 errors, never expose internal details
  if (status >= 500) {
    message = "Something went wrong on our end. Our tech wizards have been alerted and are brewing a fix.";
  }
  // For 4xx, we can keep the message as is (they are often user-friendly),
  // but we can also sanitize if needed. For now we keep them.

  res.status(status).json({ message });
};