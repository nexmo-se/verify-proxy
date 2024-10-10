import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { vcr } from '@vonage/vcr-sdk';
import profileRouter from './routes/rate-logic.js';
import filterRouter from './routes/whitelist.js';
import verifyRouter from './routes/verify.js';
import fakeverifyRouter from './routes/fakeverify.js';
import counter from './routes/counter.js';
import { sendVerify } from './services/sendVerify.js';
import { isNumberWhitelisted } from './filters/isWhitelisted.js';
import logger from './logger.js';
import { rateLimit } from './middleware/rateLimit.js';
import { handleAuth } from './handlers/auth.js';
import 'dotenv/config';
import { checkWhitelistMiddleware } from './middleware/whitelist.js';
// Initialize Express app
const app = express();

const dbState = vcr.getInstanceState();

// Middleware setup
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Health check endpoint
app.get('/_/health', async (req, res) => {
  res.sendStatus(200);
});

app.get('/_/metrics', async (req, res) => {
  return res.sendStatus(200);
});
// Register routes
app.use('/', handleAuth);
app.use('/verify', verifyRouter(rateLimit, checkWhitelistMiddleware));
app.use('/fakeverify', fakeverifyRouter(rateLimit, checkWhitelistMiddleware));
app.use('/whitelist', filterRouter());
app.use('/profiles', profileRouter(dbState));
app.use('/counter', counter(dbState));

app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}, TraceId: ${err.requestId || 'N/A'}`);

  const statusCode = err.status || 500;
  const errorResponse = {
    error: err.message || 'Internal Server Error',
    traceId: err.requestId || req.get('x-nexmo-trace-id') || 'N/A', // Include requestId in the response
  };

  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack; // Include stack trace in development
  }

  res.status(statusCode).send(errorResponse);
});

// Start the server
const port = process.env.NERU_APP_PORT || 3001;
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
