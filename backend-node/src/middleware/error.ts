import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const status = err.status || 500;
  const message = err.message || "Something went wrong";

  // Log the error
  logger.error(
    `${req.method} ${req.originalUrl} | Status: ${status} | ${message}`
  );

  // Log the stack trace (if available)
  if (err.stack) {
    logger.error(err.stack);
  }

  res.status(status).json({
    message,
  });
};