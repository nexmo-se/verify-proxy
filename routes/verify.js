import express from 'express';
import { sendVerify } from '../services/sendVerify.js';

const router = express.Router();

export default function Router(rateLimit, checkWhitelistMiddleware) {
  router.post('/', rateLimit, checkWhitelistMiddleware, async (req, res) => {
    try {
      const token = req.headers['authorization'];
      const { rateLimits, ...verifyBody } = req.body;
      const [{ to }] = verifyBody.workflow;
      const verifyResponse = await sendVerify(verifyBody, token);
      res.status(200).json({ message: `Verification request to ${to} has been processed`, verifyResponse });
      // res.status(200).json({ message: `Verification request to ${to} has been processed` });
    } catch (e) {
      if (e.response && e.response.data) {
        res.status(e.status).send(e.response.data);
      } else {
        res.status(500).send('something went wrong');
      }
    }
  });
  return router;
}
