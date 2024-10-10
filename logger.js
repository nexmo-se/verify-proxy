import winston from 'winston';

const isDebugMode = process.env.NODE_ENV !== 'production';

const logger = winston.createLogger({
  level: isDebugMode ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    isDebugMode
      ? winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level}]: ${message}`;
          })
        )
      : winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

export default logger;
