import express from 'express';
import { sendVerify, checkVerify } from '../services/sendVerify.js';

const router = express.Router();

export default function Router(rateLimit, checkWhitelistMiddleware, dbState) {
  router.post('/', rateLimit, checkWhitelistMiddleware, async (req, res) => {
    try {
      const token = req.headers['authorization'];
      const onlyToken = token.split('Basic')[1];
      const [apiKey, secret] = Buffer.from(onlyToken, 'base64').toString('utf8').split(':');
      const { rateLimits, ...verifyBody } = req.body;
      const [{ to }] = verifyBody.workflow;
      const verifyResponse = await sendVerify(verifyBody, token);
      const verifyWithApiKey = { ...verifyResponse, apiKey };
      dbState.set(verifyResponse.request_id, apiKey);
      dbState.expire(verifyResponse.request_id, 7200);
      res.status(200).json({ message: `Verification request to ${to} has been processed`, verifyWithApiKey });
      // res.status(200).json({ message: `Verification request to ${to} has been processed` });
    } catch (e) {
      if (e.response && e.response.data) {
        res.status(e.status).send(e.response.data);
      } else {
        res.status(500).send('something went wrong');
      }
    }
  });
  router.post('/:requestId', async (req, res) => {
    try {
      let token = req.headers['authorization'];
      const reqId = req.params['requestId'];
      const body = req.body;
      if (!reqId || !body) res.status(500).send('request id is mandatory');
      const apiKey = dbState.get(reqId);
      if (apiKey === process.env.SECONDARY_KEY) {
        // req.headers['authorization'] =
        token = Buffer.from(`${process.env.SECONDARY_KEY}:${process.env.SECONDARY_SECRET}`).toString('base64');
      }

      const verifyResponse = await checkVerify(reqId, token, body);

      res.status(200).json(verifyResponse);
      // res.status(200).json({ message: `Verification request to ${to} has been processed` });
    } catch (e) {
      console.log(e);
      if (e.response && e.response.data) {
        res.status(e.status).send(e.response.data);
      } else {
        res.status(500).send('something went wrong');
      }
    }
  });
  return router;
}
