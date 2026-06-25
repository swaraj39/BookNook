import winston from "winston";

const isProduction = process.env.NODE_ENV === "production";

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: isProduction
      ? winston.format.combine(
          winston.format.timestamp({
            format: "YYYY-MM-DD HH:mm:ss",
          }),
          winston.format.errors({ stack: true }),
          winston.format.printf(({ timestamp, level, message, stack }) => {
            return stack
              ? `[${timestamp}] ${level.toUpperCase()}: ${message}\n${stack}`
              : `[${timestamp}] ${level.toUpperCase()}: ${message}`;
          })
        )
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({
            format: "YYYY-MM-DD HH:mm:ss",
          }),
          winston.format.errors({ stack: true }),
          winston.format.printf(({ timestamp, level, message, stack }) => {
            return stack
              ? `[${timestamp}] ${level}: ${message}\n${stack}`
              : `[${timestamp}] ${level}: ${message}`;
          })
        ),
  }),
];

// Save logs to a file only during local development
if (!isProduction) {
  transports.push(
    new winston.transports.File({
      filename: "logs/app.log",
      level: "info",
    })
  );

  transports.push(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
    })
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  transports,
  exitOnError: false,
});

export default logger;